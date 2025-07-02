import sqlite3 from "sqlite3";
import {open} from "sqlite";


export const dbConnector = await open({
    filename: './src/db/database.sqlite',
    driver: sqlite3.Database
});
