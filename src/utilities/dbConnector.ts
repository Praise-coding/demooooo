import pg from 'pg';

const {Pool} = pg;

export const dbConnector = new Pool({
    host: "aws-0-eu-north-1.pooler.supabase.com",

    port: 5432,

    database: "postgres",

    user: "postgres.sgkpesnyjnoknlcqshbq",

    password: "ksZsHW6dhOcCgE6g",
    ssl: {
        rejectUnauthorized: false
    }
});