import pg from 'pg';
const { Pool } = pg;

export const dbConnector = new Pool({
    host: "aws-0-eu-north-1.pooler.supabase.com",
    port: 5432,
    database: "postgres",
    user: "postgres.sgkpesnyjnoknlcqshbq",
    password: "ksZsHW6dhOcCgE6g",
    ssl: { rejectUnauthorized: false },
    idleTimeoutMillis: 30000,       // close idle clients after 30s
    connectionTimeoutMillis: 5000,  // fail a connection after 5s timeout
    keepAlive: true                 // keep TCP connection alive to avoid timeouts
});

// catch pool-level errors so they don’t crash your app
dbConnector.on('error', (err) => {
    console.error('Postgres pool error:', err);
    // optionally trigger reconnection or alert
});