const jwt = require("jsonwebtoken");
const pool = require("../config/database");

const tokenCookieName = process.env.AUTH_COOKIE_NAME || "auth_token";
const jwtSecret = process.env.JWT_SECRET || "ganti_secret_ini_di_env";

async function authenticateUser(req, res, next) {
    try {
        const token = req.cookies ? req.cookies[tokenCookieName] : null;

        if (!token) {
            return res.status(401).json({ 
                authenticated: false,
                message: "Unauthorized. Silakan login terlebih dahulu." 
            });
        }

        const payload = jwt.verify(token, jwtSecret);
        const result = await pool.query(
            "SELECT id, email, name, role FROM users WHERE id = $1",
            [payload.id]
        );

        if (result.rowCount === 0) {
            return res.status(401).json({ 
                authenticated: false,
                message: "Unauthorized. User tidak ditemukan." 
            });
        }

        req.user = result.rows[0];
        next();
    } catch (err) {
        return res.status(401).json({ 
            authenticated: false,
            message: "Unauthorized. Sesi tidak valid atau sudah kedaluwarsa." 
        });
    }
}

module.exports = authenticateUser;