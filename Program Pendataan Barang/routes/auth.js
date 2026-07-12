const express = require("express");
const rateLimit = require("express-rate-limit");
const authController = require("../controllers/authController");
const authenticateUser = require("../middleware/authenticateUser");

const router = express.Router();

const loginLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message: "Terlalu banyak percobaan login. Coba lagi dalam 1 menit."
    },
    skipSuccessfulRequests: true
});

router.post("/login", loginLimiter, authController.login);
router.post("/register", authController.register);
router.get("/me", authenticateUser, authController.me);
router.post("/logout", authenticateUser, authController.logout);

module.exports = router;