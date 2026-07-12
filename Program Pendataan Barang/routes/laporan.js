const express = require("express");
const nodemailer = require("nodemailer");
const pool = require("../config/database");
const { generateReportPDF, formatCurrency, formatDateLong, formatMonth } = require("../utils/pdfTemplate");

const router = express.Router();

const MONTHS = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

function toNumber(value) {
    return Number(value) || 0;
}

function toDateInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function parseDate(value) {
    if (!value) return new Date();
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
}

function getDateRange(jenis, startDate, endDate) {
    const start = parseDate(startDate);
    if (!start) return null;

    if (jenis === "harian" || jenis === "kustom") {
        const end = parseDate(endDate) || start;
        return start <= end ? { start, end } : null;
    }

    if (jenis === "bulanan") {
        return {
            start: new Date(start.getFullYear(), start.getMonth(), 1),
            end: new Date(start.getFullYear(), start.getMonth() + 1, 0)
        };
    }

    if (jenis === "tahunan") {
        return {
            start: new Date(start.getFullYear(), 0, 1),
            end: new Date(start.getFullYear(), 11, 31)
        };
    }

    return null;
}

function buildReportId(jenis, start) {
    const year = start.getFullYear();
    const month = String(start.getMonth() + 1).padStart(2, "0");
    const day = String(start.getDate()).padStart(2, "0");

    if (jenis === "harian" || jenis === "kustom") return `LAP-H-${year}${month}${day}-001`;
    if (jenis === "bulanan") return `LAP-M-${year}${month}-001`;
    return `LAP-Y-${year}-001`;
}

function getPeriodeLabel(jenis, range) {
    if (jenis === "harian" || jenis === "kustom") return formatDateLong(range.start);
    if (jenis === "bulanan") return formatMonth(range.start);
    return String(range.start.getFullYear());
}

async function getTransaksiColumnNames() {
    const result = await pool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'transaksi'
    `);
    const columns = new Set(result.rows.map((row) => row.column_name));
    const dateColumn = columns.has("tanggal") ? "tanggal" : "tanggal_transaksi";
    const timeColumn = columns.has("waktu") ? "waktu" : "waktu_transaksi";

    if (!columns.has(dateColumn) || !columns.has(timeColumn)) {
        throw new Error("Kolom tanggal/waktu transaksi tidak ditemukan.");
    }

    return { dateColumn, timeColumn };
}

async function getTransactionRows(range) {
    const { dateColumn, timeColumn } = await getTransaksiColumnNames();
    const result = await pool.query(`
        SELECT
            t.id_transaksi,
            t.kode_pembeli,
            t.${dateColumn} AS tanggal,
            t.${timeColumn} AS waktu,
            t.total_item,
            t.total_harga,
            COALESCE(t.biaya_servis, 0) AS biaya_servis,
            d.id_detail,
            d.kode_barang,
            d.nama_barang,
            d.harga_jual,
            d.jumlah,
            d.subtotal,
            COALESCE(b.harga_beli, 0) AS harga_beli
        FROM transaksi t
        LEFT JOIN detail_transaksi d ON d.id_transaksi = t.id_transaksi
        LEFT JOIN barang b ON b.kode_barang = d.kode_barang
        WHERE t.${dateColumn} BETWEEN $1 AND $2
        ORDER BY t.${dateColumn} ASC, t.${timeColumn} ASC, t.id_transaksi ASC, d.id_detail ASC
    `, [toDateInput(range.start), toDateInput(range.end)]);

    return result.rows;
}

function buildTransactions(rows) {
    const map = new Map();

    rows.forEach((row) => {
        if (!map.has(row.id_transaksi)) {
            map.set(row.id_transaksi, {
                id_transaksi: row.id_transaksi,
                kode_pembeli: row.kode_pembeli,
                tanggal: row.tanggal,
                waktu: row.waktu,
                total_item: toNumber(row.total_item),
                total_harga: toNumber(row.total_harga),
                biaya_servis: toNumber(row.biaya_servis),
                modal: 0,
                items: []
            });
        }

        const trx = map.get(row.id_transaksi);
        if (row.id_detail) {
            const modal = toNumber(row.harga_beli) * toNumber(row.jumlah);
            trx.modal += modal;
            trx.items.push({
                kode_barang: row.kode_barang,
                nama_barang: row.nama_barang,
                harga_jual: toNumber(row.harga_jual),
                jumlah: toNumber(row.jumlah),
                subtotal: toNumber(row.subtotal),
                modal
            });
        }
    });

    return Array.from(map.values());
}

function summarizeTransactions(transactions) {
    let totalPendapatan = 0;
    let totalModal = 0;
    let totalBiayaServis = 0;
    let jumlahBarangTerjual = 0;
    const pembeli = new Set();

    transactions.forEach((trx) => {
        // Hitung subtotal dari detail barang (lebih akurat)
        let subtotalBarang = 0;
        trx.items.forEach((item) => {
            subtotalBarang += toNumber(item.subtotal);
        });
        
        // Jika tidak ada detail, pakai total_harga
        if (trx.items.length === 0) {
            totalPendapatan += toNumber(trx.total_harga);
            jumlahBarangTerjual += toNumber(trx.total_item);
        } else {
            totalPendapatan += subtotalBarang;
            jumlahBarangTerjual += trx.items.reduce((sum, item) => sum + toNumber(item.jumlah), 0);
        }
        
        totalModal += toNumber(trx.modal);
        totalBiayaServis += toNumber(trx.biaya_servis) || 0;
        if (trx.kode_pembeli) pembeli.add(trx.kode_pembeli);
    });

    return {
        jumlahBarangTerjual,
        jumlahPembeli: pembeli.size,
        totalModal,
        totalPendapatan,
        keuntungan: totalPendapatan - totalModal,
        totalBiayaServis,
        totalTransaksi: transactions.length,
        rataRataPenjualan: transactions.length > 0 ? totalPendapatan / transactions.length : 0
    };
}

function getTopProducts(transactions) {
    const products = new Map();

    transactions.forEach((trx) => {
        trx.items.forEach((item) => {
            const key = item.kode_barang || item.nama_barang;
            const current = products.get(key) || {
                nama_barang: item.nama_barang || key,
                jumlah: 0,
                pendapatan: 0
            };
            current.jumlah += toNumber(item.jumlah);
            current.pendapatan += toNumber(item.subtotal);
            products.set(key, current);
        });
    });

    return Array.from(products.values())
        .sort((a, b) => b.jumlah - a.jumlah || b.pendapatan - a.pendapatan)
        .slice(0, 5);
}

async function getRestockItems() {
    const result = await pool.query(`
        SELECT nama_barang, stok
        FROM barang
        WHERE stok <= 10
        ORDER BY stok ASC, nama_barang ASC
    `);

    return result.rows.map((row) => ({
        nama_barang: row.nama_barang,
        stok: toNumber(row.stok),
        status: toNumber(row.stok) <= 0 ? "Habis" : "Segera Restok"
    }));
}

function groupTransactionsByDate(transactions) {
    const map = new Map();
    transactions.forEach((trx) => {
        const key = toDateInput(new Date(trx.tanggal));
        const current = map.get(key) || [];
        current.push(trx);
        map.set(key, current);
    });
    return map;
}

function buildDailyRows(transactions, range) {
    const rows = [];
    const grouped = groupTransactionsByDate(transactions);

    for (let date = new Date(range.start); date <= range.end; date.setDate(date.getDate() + 1)) {
        const key = toDateInput(date);
        const dayTransactions = grouped.get(key) || [];
        const summary = summarizeTransactions(dayTransactions);
        rows.push({
            tanggal: new Date(date),
            transaksi: summary.totalTransaksi,
            itemTerjual: summary.jumlahBarangTerjual,
            pendapatan: summary.totalPendapatan,
            servis: summary.totalBiayaServis,
            keuntungan: summary.keuntungan
        });
    }

    return rows;
}

function buildMonthlyRows(transactions, year) {
    const grouped = new Map();

    transactions.forEach((trx) => {
        const monthIndex = new Date(trx.tanggal).getMonth();
        const current = grouped.get(monthIndex) || [];
        current.push(trx);
        grouped.set(monthIndex, current);
    });

    return MONTHS.map((monthName, index) => {
        const monthTransactions = grouped.get(index) || [];
        const summary = summarizeTransactions(monthTransactions);
        return {
            bulan: monthName,
            tahun: year,
            transaksi: summary.totalTransaksi,
            itemTerjual: summary.jumlahBarangTerjual,
            pendapatan: summary.totalPendapatan,
            servis: summary.totalBiayaServis,
            keuntungan: summary.keuntungan
        };
    });
}

function getHighestLowest(rows) {
    if (!rows.length) return { highest: null, lowest: null };
    const highest = rows.reduce((selected, row) => row.pendapatan > selected.pendapatan ? row : selected, rows[0]);
    const lowest = rows.reduce((selected, row) => row.pendapatan < selected.pendapatan ? row : selected, rows[0]);
    return { highest, lowest };
}

async function buildReportData(jenis, range) {
    const transactions = buildTransactions(await getTransactionRows(range));
    const summary = summarizeTransactions(transactions);
    let periodRows = [];

    if (jenis === "bulanan") {
        periodRows = buildDailyRows(transactions, range);
        const { highest, lowest } = getHighestLowest(periodRows);
        summary.hariTertinggi = highest;
        summary.hariTerendah = lowest;
        summary.rataRataHari = range.end.getDate() > 0 ? summary.totalPendapatan / range.end.getDate() : 0;
    }

    if (jenis === "tahunan") {
        periodRows = buildMonthlyRows(transactions, range.start.getFullYear());
        summary.rataRataBulan = 12 > 0 ? summary.totalPendapatan / 12 : 0;
    }

    if (jenis === "harian") {
        summary.rataRataHari = 1;
    }

    return {
        idLaporan: buildReportId(jenis, range.start),
        tanggalCetak: new Date(),
        summary,
        transactions,
        periodRows,
        topProducts: getTopProducts(transactions),
        restockItems: await getRestockItems()
    };
}

function createTransporter() {
    if (process.env.SMTP_HOST) {
        return nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT) || 587,
            secure: String(process.env.SMTP_SECURE || "false") === "true",
            auth: process.env.SMTP_USER ? {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            } : undefined
        });
    }

    return nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
}

router.get("/", async (req, res, next) => {
    try {
        const jenis = String(req.query.jenis || "harian").toLowerCase();
        const range = getDateRange(jenis, req.query.startDate, req.query.endDate);
        if (!range) return res.status(400).json({ message: "Periode laporan tidak valid." });

        const rows = await getTransactionRows(range);
        res.json(buildTransactions(rows));
    } catch (err) {
        next(err);
    }
});

router.get("/summary", async (req, res, next) => {
    try {
        const jenis = String(req.query.jenis || "harian").toLowerCase();
        const range = getDateRange(jenis, req.query.startDate, req.query.endDate);
        if (!range) return res.status(400).json({ message: "Periode laporan tidak valid." });

        const reportData = await buildReportData(jenis, range);
        res.json(reportData.summary);
    } catch (err) {
        next(err);
    }
});

router.post("/pdf", async (req, res, next) => {
    try {
        const email = String(req.body.email || "").trim();
        const jenis = String(req.body.jenis || "harian").trim().toLowerCase();

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ message: "Email tujuan wajib valid." });
        }

        if (!["harian", "bulanan", "tahunan", "kustom"].includes(jenis)) {
            return res.status(400).json({ message: "Jenis laporan wajib harian, bulanan, tahunan, atau kustom." });
        }

        if (!process.env.EMAIL_USER && !process.env.SMTP_HOST) {
            return res.status(500).json({
                message: "Konfigurasi email belum tersedia. Isi EMAIL_USER/EMAIL_PASS atau SMTP_HOST di .env."
            });
        }

        const normalizedJenis = jenis === "kustom" ? "harian" : jenis;
        const range = getDateRange(jenis, req.body.startDate, req.body.endDate);
        if (!range) return res.status(400).json({ message: "Periode laporan tidak valid." });

        const reportData = await buildReportData(normalizedJenis, range);
        const periode = { label: getPeriodeLabel(normalizedJenis, range) };
        const pdfBuffer = await generateReportPDF(reportData, periode, normalizedJenis);
        const fileName = `${reportData.idLaporan}.pdf`;
        const transporter = createTransporter();

        await transporter.sendMail({
            from: process.env.EMAIL_FROM || `"Sistem Toko Sepeda" <${process.env.EMAIL_USER || process.env.SMTP_USER}>`,
            to: email,
            subject: `${reportData.idLaporan} - ${periode.label}`,
            html: `
                <h2 style="color:#1f7a4d;margin:0 0 12px;">Laporan Penjualan</h2>
                <p><strong>Periode:</strong> ${periode.label}</p>
                <ul>
                    <li><strong>Total Transaksi:</strong> ${reportData.summary.totalTransaksi}</li>
                    <li><strong>Jumlah Barang Terjual:</strong> ${reportData.summary.jumlahBarangTerjual} Item</li>
                    <li><strong>Jumlah Pembeli:</strong> ${reportData.summary.jumlahPembeli} Orang</li>
                    <li><strong>Total Modal:</strong> ${formatCurrency(reportData.summary.totalModal)}</li>
                    <li><strong>Total Pendapatan:</strong> ${formatCurrency(reportData.summary.totalPendapatan)}</li>
                    <li><strong>Keuntungan:</strong> ${formatCurrency(reportData.summary.keuntungan)}</li>
                    <li><strong>Total Biaya Servis:</strong> ${formatCurrency(reportData.summary.totalBiayaServis)}</li>
                </ul>
                <p>File PDF terlampir.</p>
            `,
            attachments: [{
                filename: fileName,
                content: pdfBuffer,
                contentType: "application/pdf"
            }]
        });

        res.status(200).json({
            success: true,
            message: `Laporan berhasil dikirim ke ${email}.`,
            idLaporan: reportData.idLaporan
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;