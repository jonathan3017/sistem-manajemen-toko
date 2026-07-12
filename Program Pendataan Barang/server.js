require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/auth");
const barangRoutes = require("./routes/barang");
const transaksiRoutes = require("./routes/transaksi");
const dashboardRoutes = require("./routes/dashboard");
const laporanRoutes = require("./routes/laporan");
const authenticateUser = require("./middleware/authenticateUser");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// 🔥 TAMBAHKAN INI 🔥
app.use(express.static(__dirname));

app.get("/", (req, res) => {
    res.redirect("/login.html");
});

app.use("/api/auth", authRoutes);
app.use("/api/barang", authenticateUser, barangRoutes);
app.use("/api/transaksi", authenticateUser, transaksiRoutes);
app.use("/api/dashboard", authenticateUser, dashboardRoutes);
app.use("/api/laporan", laporanRoutes);

app.use((req, res) => {
    res.status(404).json({
        message: "Endpoint tidak ditemukan."
    });
});

app.use((err, req, res, next) => {
    console.error(err);

    res.status(err.statusCode || 500).json({
        message: err.message || "Terjadi kesalahan pada server."
    });
});

// ✅ UNTUK VERCEL
module.exports = app;

// ✅ UNTUK LOCALHOST
if (require.main === module) {
    app.listen(port, () => {
        console.log(`Server berjalan di http://localhost:${port}`);
    });
}
