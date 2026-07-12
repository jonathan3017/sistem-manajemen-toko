require("dotenv").config();

const pool = require("../config/database");

async function initUsersTable() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            name VARCHAR(100),
            role VARCHAR(50) DEFAULT 'user',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await pool.query("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)");
}

initUsersTable()
    .then(() => {
        console.log("users table ready");
    })
    .catch((err) => {
        console.error(err.message);
        process.exitCode = 1;
    })
    .finally(() => {
        pool.end();
    });
