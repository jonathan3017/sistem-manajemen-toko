# sistem-manajemen-toko
# Sistem Manajemen Stok & Keuangan Toko

Sistem berbasis web untuk mengelola stok barang, transaksi penjualan, dan laporan keuangan toko. Dibangun untuk membantu **toko keluarga** beralih dari pencatatan manual ke sistem digital.

---

## Teknologi

| **Frontend** | **Backend** | **Database** | **Autentikasi** | **Laporan** |
| :--- | :--- | :--- | :--- | :--- |
| HTML, CSS, Vanilla JS | Node.js, Express.js | PostgreSQL | JWT, bcrypt, Cookie | PDFKit, Nodemailer |

---

## Fitur Utama

- **Dashboard** — Ringkasan penjualan hari ini (barang terjual, jumlah pembeli, pendapatan)
- **Manajemen Data Barang** — Tambah, edit, lihat stok & harga, notifikasi stok menipis
- **Transaksi Pembeli** — Cari barang, keranjang belanja, biaya servis, simpan transaksi
- **Riwayat Transaksi** — Lihat transaksi per tanggal & detailnya
- **Laporan PDF** — Generate laporan harian & kirim via email

---

## Cara Menjalankan (Localhost)

1. Clone repositori ini
2. Jalankan `npm install`
3. Buat file `.env` dan isi konfigurasi database & email
4. Jalankan `node server.js`
5. Buka `http://localhost:3000`

---

## Status

Sistem sudah selesai dibangun dan semua fitur berfungsi dengan baik. Saat ini dalam proses pengisian data barang sebelum digunakan sepenuhnya di toko.

---

## Screenshot

**Lihat semua screenshot dalam satu file PDF:**  
[Download / Lihat Screenshot Sistem Toko](screenshot-sistem-toko.pdf)
