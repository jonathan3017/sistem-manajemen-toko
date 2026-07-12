const pool = require("../config/database");

exports.getDashboardSummary = async (req, res, next) => {
    try {
        // Hanya mengambil transaksi HARI INI
        const result = await pool.query(`
            SELECT
                COALESCE(SUM(total_item), 0) AS barang_terjual,
                COUNT(DISTINCT kode_pembeli) AS jumlah_pembeli,
                COALESCE(SUM(total_harga), 0) AS pendapatan
            FROM transaksi
            WHERE tanggal = CURRENT_DATE
        `);

        const row = result.rows[0];

        res.status(200).json({
            barang_terjual: Number(row.barang_terjual),
            jumlah_pembeli: Number(row.jumlah_pembeli),
            pendapatan: Number(row.pendapatan)
        });
    } catch (err) {
        next(err);
    }
};