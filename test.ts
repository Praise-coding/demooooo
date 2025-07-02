import { dbConnector } from "./src/utilities/dbConnector"

await dbConnector.run(`
    create table User(
        id  INTEGER PRIMARY KEY AUTOINCREMENT,
        Email        TEXT    NOT NULL,
        UserName TEXT NOT NULL,
        Password TEXT NOT NULL
    )`)