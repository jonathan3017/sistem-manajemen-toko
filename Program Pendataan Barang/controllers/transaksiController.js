const pool = require("../config/database");

// Fungsi auto generate kode_pembeli format: P2026060001
async function generateKodePembeli() {
    const now = new Date();
    const tahun = now.getFullYear();
    const bulan = String(now.getMonth() + 1).padStart(2, '0');
    
    const result = await pool.query(
        `SELECT kode_pembeli FROM transaksi 
         WHERE kode_pembeli LIKE $1 
         ORDER BY id_transaksi DESC LIMIT 1`,
        [`P${tahun}${bulan}%`]
    );
    
    let nextNum = 1;
    if (result.rows.length > 0) {
        const lastKode = result.rows[0].kode_pembeli;
        const lastNum = parseInt(lastKode.slice(-4));
        nextNum = lastNum + 1;
    }
    
    const urutan = String(nextNum).padStart(4, '0');
    return `P${tahun}${bulan}${urutan}`;
}

// GET semua transaksi (bisa filter tanggal)
const getAllTransaksi = async (req, res) => {
    try {
        const { tanggal } = req.query;
        let query = `SELECT * FROM transaksi`;
        let params = [];

        if (tanggal && tanggal !== "") {
            query += ` WHERE tanggal = $1`;
            params = [tanggal];
        } else {
            query += ` WHERE tanggal = CURRENT_DATE`;
        }

        query += ` ORDER BY id_transaksi DESC`;
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

// GET transaksi by ID (untuk detail popup)
const getTransaksiById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`SELECT * FROM transaksi WHERE id_transaksi = $1`, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Transaksi tidak ditemukan" });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

// POST transaksi baru (dengan validasi stok)
const createTransaksi = async (req, res) => {
    const client = await pool.connect();
    try {
        const kodePembeli = await generateKodePembeli();
        const { total_item, total_harga, biaya_servis, keterangan_servis, items } = req.body;
        
        if (!total_item || !total_harga || !items || items.length === 0) {
            return res.status(400).json({ error: "Data transaksi tidak lengkap" });
        }
        
        // 🔥 VALIDASI STOK SEBELUM TRANSAKSI
        for (const item of items) {
            const cekStok = await client.query(
                `SELECT stok FROM barang WHERE kode_barang = $1`,
                [item.kode_barang]
            );
            
            if (cekStok.rows.length === 0) {
                throw new Error(`Barang dengan kode ${item.kode_barang} tidak ditemukan`);
            }
            
            const stokTersedia = cekStok.rows[0].stok;
            if (stokTersedia < item.jumlah) {
                throw new Error(`Stok ${item.nama_barang} tidak mencukupi (tersisa ${stokTersedia})`);
            }
        }
        
        await client.query('BEGIN');
        
        // INSERT TRANSAKSI
        const insertTransaksi = await client.query(
            `INSERT INTO transaksi 
             (kode_pembeli, total_item, total_harga, biaya_servis, keterangan_servis, tanggal, waktu) 
             VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, CURRENT_TIME) 
             RETURNING id_transaksi, kode_pembeli`,
            [kodePembeli, total_item, total_harga, biaya_servis || 0, keterangan_servis || null]
        );
        
        const idTransaksi = insertTransaksi.rows[0].id_transaksi;
        const kodePembeliGenerated = insertTransaksi.rows[0].kode_pembeli;
        
        // INSERT DETAIL TRANSAKSI & UPDATE STOK
        for (const item of items) {
            await client.query(
                `INSERT INTO detail_transaksi 
                 (id_transaksi, kode_barang, nama_barang, harga_jual, jumlah, subtotal) 
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [idTransaksi, item.kode_barang, item.nama_barang, item.harga_jual, item.jumlah, item.subtotal]
            );
            
            // UPDATE STOK (kurangi)
            await client.query(
                `UPDATE barang SET stok = stok - $1 WHERE kode_barang = $2`,
                [item.jumlah, item.kode_barang]
            );
        }
        
        await client.query('COMMIT');
        
        res.status(201).json({ 
            success: true, 
            id_transaksi: idTransaksi,
            kode_pembeli: kodePembeliGenerated
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
};

// GET detail transaksi
const getDetailTransaksi = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `SELECT * FROM detail_transaksi WHERE id_transaksi = $1 ORDER BY id_detail ASC`,
            [id]
        );
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getAllTransaksi,
    createTransaksi,
    getDetailTransaksi,
    getTransaksiById
};