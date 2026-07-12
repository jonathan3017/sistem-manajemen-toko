const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../config/database");

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const tokenCookieName = process.env.AUTH_COOKIE_NAME || "auth_token";
const jwtSecret = process.env.JWT_SECRET || "ganti_secret_ini_di_env";
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || "1d";
const cookieMaxAge = Number(process.env.AUTH_COOKIE_MAX_AGE_MS) || 24 * 60 * 60 * 1000;

function isProduction() {
    return process.env.NODE_ENV === "production";
}

function isCookieSecure() {
    if (process.env.COOKIE_SECURE) {
        return String(process.env.COOKIE_SECURE).toLowerCase() === "true";
    }
    return isProduction();
}

function sanitizeUser(user) {
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
    };
}

function createToken(user) {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            role: user.role
        },
        jwtSecret,
        { expiresIn: jwtExpiresIn }
    );
}

function setAuthCookie(res, token) {
    res.cookie(tokenCookieName, token, {
        httpOnly: true,
        secure: isCookieSecure(),
        sameSite: "lax",
        maxAge: cookieMaxAge
    });
}

function clearAuthCookie(res) {
    res.clearCookie(tokenCookieName, {
        httpOnly: true,
        secure: isCookieSecure(),
        sameSite: "lax"
    });
}

function validateCredentials(email, password) {
    if (!emailRegex.test(email)) {
        return "Email tidak valid.";
    }
    if (!password || password.length < 6) {
        return "Password minimal 6 karakter.";
    }
    return null;
}

// ==========================================
// REGISTER
// ==========================================
exports.register = async (req, res, next) => {
    try {
        const email = String(req.body.email || "").trim().toLowerCase();
        const password = String(req.body.password || "");
        const name = String(req.body.name || "").trim();
        const role = String(req.body.role || "user").trim() || "user";
        const validationError = validateCredentials(email, password);

        if (validationError) {
            return res.status(400).json({ message: validationError });
        }

        const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
        if (existing.rowCount > 0) {
            return res.status(409).json({ message: "Email sudah terdaftar." });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const result = await pool.query(`
            INSERT INTO users (email, password, name, role)
            VALUES ($1, $2, $3, $4)
            RETURNING id, email, name, role
        `, [email, hashedPassword, name || null, role]);

        const user = result.rows[0];
        const token = createToken(user);
        setAuthCookie(res, token);

        res.status(201).json({
            message: "Registrasi berhasil.",
            user: sanitizeUser(user)
        });
    } catch (err) {
        next(err);
    }
};

// ==========================================
// LOGIN
// ==========================================
exports.login = async (req, res, next) => {
    try {
        console.log("📧 Email yang dimasukkan:", req.body.email);
        console.log("🔑 Password yang dimasukkan:", req.body.password);

        const email = String(req.body.email || "").trim().toLowerCase();
        const password = String(req.body.password || "");

        if (!email || !password) {
            return res.status(400).json({ message: "Email dan password wajib diisi." });
        }

        const result = await pool.query(
            "SELECT id, email, password, name, role FROM users WHERE email = $1",
            [email]
        );

        console.log("👤 User ditemukan:", result.rows.length > 0);

        if (result.rowCount === 0) {
            return res.status(401).json({ message: "Email atau password salah." });
        }

        const user = result.rows[0];
        const passwordMatches = await bcrypt.compare(password, user.password);

        console.log("✅ Password match:", passwordMatches);

        if (!passwordMatches) {
            return res.status(401).json({ message: "Email atau password salah." });
        }

        const token = createToken(user);
        setAuthCookie(res, token);

        res.status(200).json({
            message: "Login berhasil.",
            user: sanitizeUser(user)
        });
    } catch (err) {
        console.error("❌ Login error:", err);
        next(err);
    }
};

// ==========================================
// ME (Check Session)
// ==========================================
exports.me = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ 
                authenticated: false,
                message: "Unauthorized" 
            });
        }

        res.status(200).json({
            authenticated: true,
            user: sanitizeUser(req.user)
        });
    } catch (err) {
        console.error("❌ Me error:", err);
        res.status(500).json({ 
            authenticated: false,
            message: "Terjadi kesalahan" 
        });
    }
};

// ==========================================
// LOGOUT
// ==========================================
exports.logout = async (req, res) => {
    try {
        clearAuthCookie(res);
        res.status(200).json({ 
            success: true,
            message: "Logout berhasil." 
        });
    } catch (err) {
        console.error("❌ Logout error:", err);
        res.status(500).json({ message: "Terjadi kesalahan" });
    }
};