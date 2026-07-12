CREATE DATABASE toko_kasir;

\c toko_kasir;

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100),
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS barang (
    kode_barang VARCHAR(30) PRIMARY KEY,
    nama_barang VARCHAR(150) NOT NULL,
    stok INTEGER NOT NULL DEFAULT 0 CHECK (stok >= 0),
    harga_beli NUMERIC(14, 2) NOT NULL CHECK (harga_beli >= 0),
    harga_jual NUMERIC(14, 2) NOT NULL CHECK (harga_jual >= 0)
);

CREATE TABLE IF NOT EXISTS transaksi (
    id_transaksi SERIAL PRIMARY KEY,
    kode_pembeli VARCHAR(100) NOT NULL,
    tanggal_transaksi DATE NOT NULL DEFAULT CURRENT_DATE,
    waktu_transaksi TIME NOT NULL DEFAULT CURRENT_TIME,
    total_item INTEGER NOT NULL CHECK (total_item > 0),
    total_harga NUMERIC(14, 2) NOT NULL CHECK (total_harga >= 0),
    biaya_servis NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (biaya_servis >= 0),
    keterangan_servis TEXT
);

CREATE TABLE IF NOT EXISTS detail_transaksi (
    id_detail SERIAL PRIMARY KEY,
    id_transaksi INTEGER NOT NULL REFERENCES transaksi(id_transaksi) ON DELETE CASCADE,
    kode_barang VARCHAR(30) NOT NULL REFERENCES barang(kode_barang),
    nama_barang VARCHAR(150) NOT NULL,
    harga_jual NUMERIC(14, 2) NOT NULL CHECK (harga_jual >= 0),
    jumlah INTEGER NOT NULL CHECK (jumlah > 0),
    subtotal NUMERIC(14, 2) NOT NULL CHECK (subtotal >= 0)
);

CREATE INDEX IF NOT EXISTS idx_transaksi_tanggal ON transaksi(tanggal_transaksi);
CREATE INDEX IF NOT EXISTS idx_detail_transaksi_id_transaksi ON detail_transaksi(id_transaksi);

INSERT INTO barang (kode_barang, nama_barang, stok, harga_beli, harga_jual)
VALUES
    ('BRG001', 'Bolpoin', 50, 1500, 2000),
    ('BRG002', 'Buku Tulis', 30, 3500, 5000)
ON CONFLICT (kode_barang) DO NOTHING;
