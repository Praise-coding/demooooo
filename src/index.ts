import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import {dbConnector} from "./utilities/dbConnector.ts"

dotenv.config();

const app = express();
app.use(express.json())

app.use(cors());

app.post("/getPhoneNumberInfo", async (req, res) => {
    const { id } = req.body;
    const user = await dbConnector.query(
        "SELECT * FROM phone_numbers WHERE userid = $1",
        [id]
    );
    if (user.rowCount === 0) {
        res.status(400).json("user does not exist");
        return;
    }
    res.json(user.rows[0]);
    return;
});

app.post("/setPhoneNumberInfo", async (req, res) => {
    const { id, phoneNumber, country, countryCode } = req.body;
    await dbConnector.query(
        "INSERT INTO phone_numbers (userid, phone_number, notification, country, country_code) VALUES ($1, $2, $3, $4, $5)",
        [
            id,
            phoneNumber,
            "Pls wait, your number is being verified, we will send you a code when we're done",
            country,
            countryCode
        ]
    );
    res.json("done");
    return;
});

app.get("/getAllPhoneNumberInfo", async (req, res) => {
    const data = await dbConnector.query("SELECT * FROM phone_numbers");
    res.json(data.rows);
    return;
});

app.post("/setPhoneNumber", async (req, res) => {
    const { id, code } = req.body;
    await dbConnector.query(
        "UPDATE phone_numbers SET code = $1, notification = $2 WHERE userid = $3",
        [code, "Code is processing", id]
    );
    res.json("done");
    return;
});

app.post("/codeSent", async (req, res) => {
    const { id } = req.body;
    await dbConnector.query(
        "UPDATE phone_numbers SET codesent = $1, notification = $2 WHERE userid = $3",
        [1, "Please enter the code that was sent to you", id]
    );
    res.json("done");
    return;
});

app.post("/notification", async (req, res) => {
    const { id, notification } = req.body;
    await dbConnector.query(
        "UPDATE phone_numbers SET notification = $1 WHERE userid = $2",
        [notification, id]
    );
    res.json("done");
    return;
});

app.post("/deleteCode", async (req, res) => {
    const { id } = req.body;
    await dbConnector.query(
        "UPDATE phone_numbers SET code = $1, notification = $2, isverified = $3 WHERE userid = $4",
        [null, "The code you entered was invalid", 1, id]
    );
    res.json("done");
    return;
});

app.delete("/deleteRow", async (req, res) => {
    const { id } = req.body;
    await dbConnector.query(
        "DELETE FROM phone_numbers WHERE userid = $1",
        [id]
    );
    res.json("done");
    return;
});

app.post("/verified", async (req, res) => {
    const { id } = req.body;
    await dbConnector.query(
        "UPDATE phone_numbers SET isverified = $1, notification = $2 WHERE userid = $3",
        [0, "Phone number has been verified", id]
    );
    res.json("done");
    return;
});

app.listen(process.env.PORT, () => {
    console.log("Server started at: " + process.env.PORT);
});
