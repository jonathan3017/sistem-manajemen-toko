const pool = require("../config/database");

function toNumberRow(row) {
    return {
        ...row,
        stok: Number(row.stok),
        harga_beli: Number(row.harga_beli),
        harga_jual: Number(row.harga_jual)
    };
}

exports.getAllBarang = async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT kode_barang, nama_barang, stok, harga_beli, harga_jual
            FROM barang
            ORDER BY kode_barang ASC
        `);

        res.status(200).json(result.rows.map(toNumberRow));
    } catch (err) {
        next(err);
    }
};

exports.createBarang = async (req, res, next) => {
    try {
        const kode_barang = String(req.body.kode_barang || "").trim().toUpperCase();
        const nama_barang = String(req.body.nama_barang || "").trim();
        const stok = Number(req.body.stok);
        const harga_beli = Number(req.body.harga_beli);
        const harga_jual = Number(req.body.harga_jual);

        if (!kode_barang || !nama_barang || !Number.isInteger(stok) || stok < 0 || harga_beli < 0 || harga_jual < 0) {
            return res.status(400).json({
                message: "Kode barang, nama barang, stok, harga beli, dan harga jual wajib valid."
            });
        }

        const existing = await pool.query(
            "SELECT kode_barang FROM barang WHERE kode_barang = $1",
            [kode_barang]
        );

        if (existing.rowCount > 0) {
            return res.status(409).json({
                message: "Kode barang sudah terdaftar."
            });
        }

        const result = await pool.query(`
            INSERT INTO barang (kode_barang, nama_barang, stok, harga_beli, harga_jual)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING kode_barang, nama_barang, stok, harga_beli, harga_jual
        `, [kode_barang, nama_barang, stok, harga_beli, harga_jual]);

        res.status(201).json(toNumberRow(result.rows[0]));
    } catch (err) {
        next(err);
    }
};

exports.addStokBarang = async (req, res, next) => {
    try {
        const kode_barang = String(req.body.kode_barang || "").trim().toUpperCase();
        const tambah_stok = Number(req.body.tambah_stok);

        if (!kode_barang || !Number.isInteger(tambah_stok) || tambah_stok <= 0) {
            return res.status(400).json({
                message: "Kode barang dan tambahan stok wajib valid."
            });
        }

        const result = await pool.query(`
            UPDATE barang
            SET stok = stok + $1
            WHERE kode_barang = $2
            RETURNING kode_barang, nama_barang, stok, harga_beli, harga_jual
        `, [tambah_stok, kode_barang]);

        if (result.rowCount === 0) {
            return res.status(404).json({
                message: "Barang tidak ditemukan."
            });
        }

        res.status(200).json(toNumberRow(result.rows[0]));
    } catch (err) {
        next(err);
    }
};
