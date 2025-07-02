import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import {dbConnector} from "./utilities/dbConnector.ts"

dotenv.config();

const app = express();
app.use(express.json())

app.use(cors());


app.post("/getPhoneNumberInfo", async (req, res) => {
    const {id} = req.body;
    const user = await dbConnector.get("select * from PhoneNumbers where userid = ?", [id])
    if (!user) {
        res.status(400).json("user does not exist")
        return;
    }
    res.json(user);
    return;
});

app.post("/setPhoneNumberInfo", async (req, res) => {
    const {id, phoneNumber, country, countryCode} = req.body;
    await dbConnector.run("insert into PhoneNumbers(userid, PhoneNumber, notification, country, countrycode) values (?,?,?,?,?)", [id, phoneNumber, "Pls wait, your number is being verified, we will send you a code when we're done", country, countryCode])
    res.json("done");
    return;
});

app.get("/getAllPhoneNumberInfo", async (req, res) => {
    const data = await dbConnector.all("select * from PhoneNumbers")
    res.json(data);
    return;
});


app.post("/setPhoneNumber", async (req, res) => {
    const {id, code} = req.body;
    await dbConnector.run("update PhoneNumbers set  code = ?, notification = ? where userid = ?", [code, "Code is processing", id])
    res.json("done");
    return;
});

app.post("/codeSent", async (req, res) => {
    const {id} = req.body;
    await dbConnector.get("update PhoneNumbers set  codeSent = ?, notification = ? where userid = ?", [1, "Please enter the code that was sent to you", id])
    res.json("done");
    return;
});

app.post("/notification", async (req, res) => {
    const {id, notification} = req.body;
    await dbConnector.get("update PhoneNumbers set  notification = ? where userid = ?", [notification, id])
    res.json("done");
    return;
});


app.post("/deleteCode", async (req, res) => {
    const {id} = req.body;
    await dbConnector.get("update PhoneNumbers set  code = ?, notification = ?, isVerified = ? where userid = ?", [null, "The code you entered was invalid", 1, id])
    res.json("done");
    return;
});

app.delete("/deleteRow", async (req, res) => {
    const {id} = req.body;
    await dbConnector.get("delete from PhoneNumbers where userid = ?", [id])
    res.json("done");
    return;
});

app.post("/verified", async (req, res) => {
    const {id} = req.body;
    await dbConnector.get("update PhoneNumbers set  isVerified = ?, notification = ? where userid = ?", [0, "Phone number has been verified", id])
    res.json("done");
    return;
});

app.listen(process.env.PORT, () => {
    console.log("Server started at: " + process.env.PORT);
});
