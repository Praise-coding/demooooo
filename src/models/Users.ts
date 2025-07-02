import {dbConnector} from "../utilities/dbConnector.ts";
import {NextFunction, Request, Response} from "express"
import {createUserSchema, updateUserSchema, userLoginValidationSchema} from "../zodSchemas/schemas.ts";
import {zodErrorGetter} from "../utilities/zodErrorGetter.ts";
import {errorHandler} from "../utilities/errorHandler.ts";
import {SendEmail} from "../utilities/SendEmail.ts";
import {updateHelperFunc} from "../utilities/updateHelperFunc.ts";
import {authorizationHeaderDecoder} from "../utilities/authorizationHeaderDecoder.ts";
import {requestBodyChecker} from "../utilities/requestBodyChecker.ts";
import {hashPassword} from "../utilities/hashPassword.ts";
import bcrypt from "bcryptjs";
import {toZonedTime} from 'date-fns-tz';
import {uploadImage} from "../utilities/supabaseConfig.ts";


export async function createUser(req: Request, res: Response) {
    try {
        const userData = createUserSchema.safeParse(req?.body)

        if (userData.error) {
            const errorMessage = zodErrorGetter(userData)
            errorHandler(res, 409, "ICD", errorMessage || "")
            return;
        }

        const existingUser = await dbConnector.get("SELECT * FROM User WHERE Email = ?", [userData.data?.Email]);
        if (existingUser?.Email) {
            errorHandler(res, 500, "UAE", "user already exists")
            return;
        }
        const hashedPass = await hashPassword(userData.data?.UserPassword)
        await dbConnector.run("insert into User(FirstName, LastName, PhoneNumber, Country, userPassword, Email, Timezone, DateJoined) values (?,?,?,?,?,?,?,?)", [userData.data?.FirstName, userData.data?.LastName, userData.data?.PhoneNumber, userData.data?.Country, hashedPass, userData?.data?.Email, userData?.data?.Timezone, userData?.data?.DateJoined])

        res.json({message: "user created successfully"})
        await SendEmail(process.env.EMAIL_SENDER || "", "New User", "A new user just created an account. Email: " + userData.data?.Email + "\n Go to the dashboard for more info.\n" + process.env.WEBSITE_URL)
        await SendEmail(userData.data?.Email || "", "Welcome", "You're welcome to out platform")

        return;
    } catch
        (err) {
        console.error(err)
        errorHandler(res, 500, "ERR", "An error occurred")
        return;
    }
}

export async function updateUser(req: Request, res: Response) {
    try {
        const decoded = await authorizationHeaderDecoder(req, res)
        if (!decoded) {
            return
        }
        if (req.file && Object.keys(req.body).length === 0) {
            req.body = {dummy: true}; // or { dummy: true } if your checker needs a non-empty body
        }
        const reqBody = requestBodyChecker(req, res)
        if (!reqBody) {
            return
        }
        const userData = updateUserSchema.safeParse(reqBody)
        if (userData.error) {
            const errorMessage = zodErrorGetter(userData)
            errorHandler(res, 409, "ICD", errorMessage || "")
            return;
        }
        if (userData.data?.Email) {
            const checkForUser = await dbConnector.get("SELECT * FROM User WHERE Email = ?", [userData.data?.Email]);
            if (checkForUser?.Email) {
                errorHandler(res, 409, "EAE", "email already exists")
                return;
            }
            await dbConnector.run("update User set  emailVerified = ? where userID = ?", ["unverified", decoded.userID])
        }

        const {keysWithEquals, sqlQuery} = updateHelperFunc(userData.data, decoded.userID)

        if (keysWithEquals.length > 0) {
            await dbConnector.run(`update User
                                   set ${keysWithEquals.toString()}
                                   WHERE userID = ? `, sqlQuery);
        }


        res.json({message: "user updated successfully"})
        if (req.file) {
            const url = await uploadImage(req.file, userData.data?.Email!)
            await dbConnector.run(`update User
                                   set ProfilePicture = ?
                                   WHERE userID = ? `, [url, decoded.userID]);
        }
        return;


    } catch
        (err) {
        console.error(err)
        errorHandler(res, 500, "ERR", "An error occurred")
        return;
    }
}

export async function getUserInfo(req: Request, res: Response, next: NextFunction) {
    try {
        const decoded = await authorizationHeaderDecoder(req, res)
        if (!decoded) {
            return;
        }

        let user = await dbConnector.get("SELECT * FROM User where userID = ?", [decoded.userID])
        if (!user) {
            const retry = await dbConnector.get("SELECT * FROM User where Email = ?", [decoded.email])
            if (!retry) {
                errorHandler(res, 400, "UDE", "user does not exist")
                return;
            }
            user = retry
        }
        const transactions = await dbConnector.all("SELECT * FROM Transactions where userID = ?", [decoded.userID])
        const notifications = await dbConnector.get("SELECT * FROM UserNotification where userID = ?", [decoded.userID])
        const wallets = await dbConnector.all("SELECT * FROM Wallets where userID = ?", [decoded.userID])
        const balance = await dbConnector.get("SELECT * FROM UserAccountInfo where userID = ?", [decoded.userID])
        const session = await dbConnector.get("SELECT * FROM Session where userID = ?", [decoded.userID])

        res.json({
            success: true,
            data: {
                User: user,
                UserBalance: balance,
                Transactions: transactions,
                Wallets: wallets,
                Notification: notifications,
                Session: session
            }
        })
        return;

    } catch (err) {
        console.error(err)
        errorHandler(res, 500, "ERR", "An error occurred")
        return;
    }
}

export async function userLoginValidation(req: Request, res: Response) {
    try {
        const reqBody = requestBodyChecker(req, res)
        if (!reqBody) {
            return;
        }
        const schema = userLoginValidationSchema.safeParse(reqBody)
        if (schema.error) {
            const errorMessage = zodErrorGetter(schema)
            errorHandler(res, 409, 'ICD', errorMessage || "")
            return;
        }
        const user = await dbConnector.get("select Email, userID, userPassword from User where Email = ?", [schema.data?.Email])
        if (!user) {
            errorHandler(res, 400, 'UNF', "User not found")
            return;
        }
        const responseBool = await bcrypt.compare(schema.data?.Password!, user.userPassword)
        if (!responseBool) {
            errorHandler(res, 400, 'INC', "Password is incorrect")
            return;
        }
        if (user.isBlocked == 1) {
            errorHandler(res, 409, 'BAN', "This account has been banned")
            return;
        }
        const checkPrevSession = await dbConnector.get("select * from Session where userID = ?", [user.userID])
        const date = new Date();
        const userTime = toZonedTime(date, user.Timezone); // from date-fns-tz
        const randomSessionId = crypto.randomUUID();
        const expiresAt = new Date(userTime.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days later
        if (checkPrevSession) {
            await dbConnector.run("update Session set sessionId = ?, expiryDate = ? where userID = ?", [randomSessionId, expiresAt, user.userID])
            res.json({success: true, sessionInfo: {sessionID: randomSessionId, expiresAt: expiresAt}})
            return
        }
        await dbConnector.run("insert into Session(sessionId, userID, expiryDate) values (?,?,?)", [randomSessionId, user.userID, expiresAt])
        res.json({success: true, sessionInfo: {sessionID: randomSessionId, expiresAt: expiresAt}})
        return;
    } catch (err) {
        console.error(err)
        errorHandler(res, 500, "ERR", "An error occurred")
        return;
    }
}

export async function userLogsOut(req: Request, res: Response) {
    try {
        const decoded = await authorizationHeaderDecoder(req, res)
        if (!decoded) {
            return
        }
        await dbConnector.run("delete from Session where sessionId = ?", [decoded.sessionID])
        res.json({success: true})
        return;
    } catch (err) {
        console.error(err + "dd")
        errorHandler(res, 500, "ERR", "An hh error occurred")
        return;
    }
}