(function () {
    "use strict";

    const API_BASE = 'http://localhost:3000';

    var keranjang = [];

    async function apiGet(url, body) {
        let queryString = "";
        if (body && Object.keys(body).length > 0) {
            queryString = "?" + new URLSearchParams(body).toString();
        }
        const response = await fetch(`${API_BASE}${url}${queryString}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });
        if (!response.ok) {
            const error = await response.json();
            if (response.status === 401) window.location.replace("/login.html");
            throw new Error(error.message || error.error || 'Terjadi kesalahan');
        }
        return response.json();
    }

    async function apiPost(url, body) {
        const response = await fetch(`${API_BASE}${url}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(body || {})
        });
        if (!response.ok) {
            const error = await response.json();
            if (response.status === 401) window.location.replace("/login.html");
            throw new Error(error.message || error.error || 'Terjadi kesalahan');
        }
        return response.json();
    }

    async function apiPatch(url, body) {
        const response = await fetch(`${API_BASE}${url}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(body || {})
        });
        if (!response.ok) {
            const error = await response.json();
            if (response.status === 401) window.location.replace("/login.html");
            throw new Error(error.message || error.error || 'Terjadi kesalahan');
        }
        return response.json();
    }

    function formatRupiah(value) {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            maximumFractionDigits: 0
        }).format(Number(value) || 0);
    }

    function formatTanggalInput(date) {
        var tahun = date.getFullYear();
        var bulan = String(date.getMonth() + 1).padStart(2, "0");
        var tanggal = String(date.getDate()).padStart(2, "0");
        return tahun + "-" + bulan + "-" + tanggal;
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function encodeInline(value) {
        return encodeURIComponent(String(value));
    }

    function emptyRow(colspan, message) {
        return "<tr><td colspan=\"" + colspan + "\">" + escapeHtml(message) + "</td></tr>";
    }

    function injectDynamicStyles() {
        if (document.getElementById("dynamic-modal-style")) return;

        var style = document.createElement("style");
        style.id = "dynamic-modal-style";
        style.textContent = [
            ".modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;z-index:9999;padding:18px}",
            ".modal-box{width:min(460px,100%);background:#fff;border-radius:8px;padding:22px;box-shadow:0 18px 50px rgba(0,0,0,.25);font-family:inherit}",
            ".modal-box h3{margin:0 0 14px}",
            ".modal-box label{display:block;margin:10px 0 6px;font-weight:600}",
            ".modal-box input{width:100%;box-sizing:border-box;padding:10px;border:1px solid #ddd;border-radius:6px;font-family:inherit}",
            ".modal-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:18px}",
            ".modal-actions button,.qty-button,.action-button{border:0;border-radius:6px;padding:8px 12px;cursor:pointer;font-family:inherit}",
            ".modal-save,.action-button{background:#1f7a4d;color:#fff}",
            ".modal-cancel{background:#e5e7eb;color:#111}",
            ".qty-control{display:inline-flex;align-items:center;gap:8px}",
            ".qty-button{min-width:32px;background:#e5e7eb;color:#111;font-weight:700}",
            ".stock-low{color:#c62828;font-weight:700}",
            ".stock-label{display:inline-block;margin-left:6px;padding:2px 6px;border-radius:999px;background:#ffe0e0;color:#b00020;font-size:12px;font-weight:700}",
            ".dynamic-table{width:100%;border-collapse:collapse;background:#fff}",
            ".dynamic-table th,.dynamic-table td{padding:12px;border-bottom:1px solid #e5e7eb;text-align:left}",
            ".dynamic-table th{font-weight:700}",
            ".modal-detail-list{margin:0;padding-left:18px;line-height:1.7}",
            ".modal-detail-total{margin-top:12px;font-weight:700}"
        ].join("");
        document.head.appendChild(style);
    }

    function openModal(title, fields, onSubmit) {
        injectDynamicStyles();
        var overlay = document.createElement("div");
        overlay.className = "modal-overlay";
        overlay.innerHTML = [
            "<div class=\"modal-box\" role=\"dialog\" aria-modal=\"true\">",
            "<h3>" + escapeHtml(title) + "</h3>",
            "<form>",
            fields.map(function (field) {
                return [
                    "<label for=\"" + escapeHtml(field.id) + "\">" + escapeHtml(field.label) + "</label>",
                    "<input id=\"" + escapeHtml(field.id) + "\" name=\"" + escapeHtml(field.name) + "\" type=\"" + escapeHtml(field.type || "text") + "\" value=\"" + escapeHtml(field.value || "") + "\" min=\"" + escapeHtml(field.min || "") + "\" required>"
                ].join("");
            }).join(""),
            "<div class=\"modal-actions\">",
            "<button type=\"button\" class=\"modal-cancel\">Batal</button>",
            "<button type=\"submit\" class=\"modal-save\">Simpan</button>",
            "</div>",
            "</form>",
            "</div>"
        ].join("");
        document.body.appendChild(overlay);
        var form = overlay.querySelector("form");
        var cancelButton = overlay.querySelector(".modal-cancel");
        function closeModal() { overlay.remove(); }
        cancelButton.addEventListener("click", closeModal);
        overlay.addEventListener("click", function (event) { if (event.target === overlay) closeModal(); });
        form.addEventListener("submit", async function (event) {
            event.preventDefault();
            var formData = new FormData(form);
            var values = {};
            fields.forEach(function (field) { values[field.name] = formData.get(field.name); });
            try { await onSubmit(values, closeModal); } catch (error) { alert(error.message); }
        });
        var firstInput = overlay.querySelector("input");
        if (firstInput) firstInput.focus();
    }

    function openInfoModal(title, contentHtml) {
        injectDynamicStyles();
        var overlay = document.createElement("div");
        overlay.className = "modal-overlay";
        overlay.innerHTML = [
            "<div class=\"modal-box\" role=\"dialog\" aria-modal=\"true\">",
            "<h3>" + escapeHtml(title) + "</h3>",
            contentHtml,
            "<div class=\"modal-actions\">",
            "<button type=\"button\" class=\"modal-cancel\">Tutup</button>",
            "</div>",
            "</div>"
        ].join("");
        document.body.appendChild(overlay);
        function closeModal() { overlay.remove(); }
        overlay.querySelector(".modal-cancel").addEventListener("click", closeModal);
        overlay.addEventListener("click", function (event) { if (event.target === overlay) closeModal(); });
    }

    async function initDashboard() {
        try {
            var data = await apiGet("/api/dashboard");
            
            console.log("Data dashboard:", data);
            
            // Update dengan ID langsung
            var barangTerjual = document.getElementById("barangTerjual");
            var jumlahPembeli = document.getElementById("jumlahPembeli");
            var pendapatan = document.getElementById("pendapatan");
            
            if (barangTerjual) {
                barangTerjual.textContent = data.barang_terjual + " Item";
            }
            if (jumlahPembeli) {
                jumlahPembeli.textContent = data.jumlah_pembeli + " Orang";
            }
            if (pendapatan) {
                pendapatan.textContent = formatRupiah(data.pendapatan);
            }
            
        } catch (error) {
            console.error("Dashboard error:", error);
        }
    }

    async function initTransaksiPembeli() {
        var kodePembeliInput = document.getElementById("kodePembeli");
        var namaBarangInput = document.getElementById("namaBarang");
        var jumlahBarangInput = document.getElementById("jumlahBarang");
        var btnTambahBarang = document.getElementById("btnTambahBarang");
        var tabelTransaksi = document.getElementById("tabelTransaksi");
        var totalHarga = document.getElementById("totalHarga");
        var btnSimpan = document.getElementById("btnSimpan");
        var datalist = document.getElementById("daftarBarang");
        var biayaServisInput = document.getElementById("biayaServis");
        var keteranganServisInput = document.getElementById("keteranganServis");

        if (!kodePembeliInput || !namaBarangInput || !jumlahBarangInput || !btnTambahBarang || !tabelTransaksi || !totalHarga || !btnSimpan) return;

        kodePembeliInput.style.display = "none";

        var daftarBarang = await apiGet("/api/barang");
        if (datalist) {
            datalist.innerHTML = daftarBarang.map(function (barang) { return "<option value=\"" + escapeHtml(barang.nama_barang) + "\"></option>"; }).join("");
        }

        function getBiayaServis() { return biayaServisInput ? Math.max(0, Number(biayaServisInput.value) || 0) : 0; }
        function getKeteranganServis() { return keteranganServisInput ? keteranganServisInput.value.trim() : ""; }
        function hitungTotalBarang() { return keranjang.reduce(function (total, item) { return total + item.subtotal; }, 0); }
        function hitungTotal() { return hitungTotalBarang() + getBiayaServis(); }

        function renderKeranjang() {
            var biayaServis = getBiayaServis();
            var keteranganServis = getKeteranganServis();
            var barisBiayaServis = (biayaServis > 0 || keteranganServis) ? "<tr><td colspan=\"3\" style=\"text-align: center;\"><strong>Biaya Servis</strong>" + (keteranganServis ? "<br><small>" + escapeHtml(keteranganServis) + "</small>" : "") + "</td><td style=\"text-align: center;\">" + formatRupiah(biayaServis) + "</td></tr>" : "";

            if (keranjang.length === 0) {
                tabelTransaksi.innerHTML = emptyRow(4, "Belum ada barang ditambahkan.") + barisBiayaServis;
                totalHarga.textContent = formatRupiah(hitungTotal());
                return;
            }

            tabelTransaksi.innerHTML = keranjang.map(function (item) {
                return "<tr><td style=\"text-align: left;\">" + escapeHtml(item.nama_barang) + "</td><td style=\"text-align: center;\"><span class=\"qty-control\"><button type=\"button\" class=\"qty-button\" onclick=\"ubahJumlahKeranjang(decodeURIComponent('" + encodeInline(item.kode_barang) + "'), -1)\">-</button><strong>" + item.jumlah + "</strong><button type=\"button\" class=\"qty-button\" onclick=\"ubahJumlahKeranjang(decodeURIComponent('" + encodeInline(item.kode_barang) + "'), 1)\">+</button></span></td><td style=\"text-align: center;\">" + formatRupiah(item.harga_jual) + "</td><td style=\"text-align: center;\">" + formatRupiah(item.subtotal) + "</td></tr>";
            }).join("") + barisBiayaServis;
            totalHarga.textContent = formatRupiah(hitungTotal());
        }

        window.ubahJumlahKeranjang = function (kodeBarang, perubahan) {
            var index = keranjang.findIndex(function (item) { return item.kode_barang === kodeBarang; });
            if (index === -1) return;
            keranjang[index].jumlah += perubahan;
            if (keranjang[index].jumlah <= 0) { keranjang.splice(index, 1); } 
            else { keranjang[index].subtotal = keranjang[index].jumlah * keranjang[index].harga_jual; }
            renderKeranjang();
        };

        btnTambahBarang.addEventListener("click", function () {
            var namaBarang = namaBarangInput.value.trim().toLowerCase();
            var jumlah = Number(jumlahBarangInput.value);
            var barang = daftarBarang.find(function (item) { return item.nama_barang.toLowerCase() === namaBarang; });
            if (!barang) { alert("Barang tidak ditemukan."); namaBarangInput.focus(); return; }
            if (!Number.isInteger(jumlah) || jumlah <= 0) { alert("Jumlah barang harus angka bulat lebih dari 0."); jumlahBarangInput.focus(); return; }
            
            // 🔥 VALIDASI STOK
            if (barang.stok < jumlah) {
                alert("Stok " + barang.nama_barang + " tidak mencukupi!\nTersisa: " + barang.stok);
                jumlahBarangInput.focus();
                return;
            }
            
            var itemAda = keranjang.find(function (item) { return item.kode_barang === barang.kode_barang; });
            if (itemAda) {
                var totalJumlah = itemAda.jumlah + jumlah;
                if (barang.stok < totalJumlah) {
                    alert("Total " + barang.nama_barang + " di keranjang melebihi stok!\nStok: " + barang.stok);
                    return;
                }
                itemAda.jumlah += jumlah;
                itemAda.subtotal = itemAda.jumlah * itemAda.harga_jual;
            } else {
                keranjang.push({ kode_barang: barang.kode_barang, nama_barang: barang.nama_barang, harga_jual: barang.harga_jual, jumlah: jumlah, subtotal: barang.harga_jual * jumlah });
            }
            namaBarangInput.value = "";
            jumlahBarangInput.value = "1";
            renderKeranjang();
        });

        btnSimpan.addEventListener("click", async function () {
            if (keranjang.length === 0 && getBiayaServis() === 0) { alert("Keranjang kosong dan tidak ada biaya servis."); return; }
            try {
                const result = await apiPost("/api/transaksi", {
                    total_item: keranjang.reduce(function (sum, item) { return sum + item.jumlah; }, 0),
                    total_harga: hitungTotal(),
                    biaya_servis: getBiayaServis(),
                    keterangan_servis: getKeteranganServis(),
                    items: keranjang
                });
                alert("Transaksi berhasil disimpan!\nKode Pembeli: " + result.kode_pembeli);
                kodePembeliInput.value = "";
                namaBarangInput.value = "";
                jumlahBarangInput.value = "1";
                if (biayaServisInput) biayaServisInput.value = "0";
                if (keteranganServisInput) keteranganServisInput.value = "";
                keranjang = [];
                renderKeranjang();
                daftarBarang = await apiGet("/api/barang");
            } catch (error) { alert(error.message); }
        });

        if (biayaServisInput) biayaServisInput.addEventListener("input", renderKeranjang);
        if (keteranganServisInput) keteranganServisInput.addEventListener("input", renderKeranjang);
        renderKeranjang();
    }

    async function initDataBarang() {
        var title = document.querySelector(".content h2");
        var existingTableBody = document.getElementById("tabelBarang");
        var isPage = existingTableBody || (title && title.textContent.trim().toLowerCase() === "data barang");
        if (!isPage) return;
        injectDynamicStyles();
        var addButton = Array.from(document.querySelectorAll(".btn-primary, .btn-view-menu")).find(function (button) { return button.textContent.trim().toLowerCase().includes("tambah barang"); });
        var tableBody = existingTableBody || createBarangTable();
        var filterControls = ensureBarangFilterControls();
        var searchInput = filterControls.searchInput;
        var filterSelect = filterControls.filterSelect;
        var resetFilterBtn = filterControls.resetFilterBtn;

        function renderBarangRows(rows, emptyMessage) {
            tableBody.innerHTML = rows.length ? rows.map(function (barang, index) {
                var stockWarning;
                if (barang.stok <= 0) {
                    stockWarning = "<span class=\"stock-empty\">Stok Habis</span>";
                } else if (barang.stok < 10) {
                    stockWarning = "<span class=\"stock-low\">" + barang.stok + "</span><span class=\"stock-label\">Stok Menipis</span>";
                } else {
                    stockWarning = barang.stok;
                }
                return "<tr><td style=\"text-align: center;\">" + (index+1) + "</td><td style=\"text-align: left;\">" + escapeHtml(barang.kode_barang) + "</td><td style=\"text-align: left;\">" + escapeHtml(barang.nama_barang) + "</td><td style=\"text-align: center;\">" + stockWarning + "</td><td style=\"text-align: right;\">" + formatRupiah(barang.harga_beli) + "</td><td style=\"text-align: right;\">" + formatRupiah(barang.harga_jual) + "</td><td style=\"text-align: center;\"><button type=\"button\" class=\"action-button\" onclick=\"bukaModalEditStok(decodeURIComponent('" + encodeInline(barang.kode_barang) + "'))\">Edit Stok</button></td></tr>";
            }).join("") : emptyRow(7, emptyMessage);
        }

        async function renderBarang() {
            var rows = await apiGet("/api/barang");
            var searchQuery = searchInput ? searchInput.value.trim().toLowerCase() : "";
            var filterValue = filterSelect ? filterSelect.value : "semua";

            var filteredRows = rows.filter(function (barang) {
                var kodeBarang = String(barang.kode_barang || "").toLowerCase();
                var namaBarang = String(barang.nama_barang || "").toLowerCase();
                var matchSearch = !searchQuery || kodeBarang.includes(searchQuery) || namaBarang.includes(searchQuery);
                var stok = Number(barang.stok) || 0;
                var matchFilter = filterValue === "semua" ||
                    (filterValue === "stok_menipis" && stok > 0 && stok < 10) ||
                    (filterValue === "stok_habis" && stok <= 0);
                return matchSearch && matchFilter;
            });

            var emptyMessage = rows.length ? "Tidak ada barang yang sesuai dengan pencarian." : "Belum ada data barang.";
            renderBarangRows(filteredRows, emptyMessage);
        }

        function ensureBarangFilterControls() {
            var currentSearchInput = document.getElementById("searchBarang");
            var currentFilterSelect = document.getElementById("filterStok");
            var currentResetFilterBtn = document.getElementById("btnResetFilter");
            if (!currentSearchInput || !currentFilterSelect || !currentResetFilterBtn) {
                var wrapper = document.createElement("div");
                wrapper.className = "search-filter-box";
                wrapper.innerHTML = [
                    "<div class=\"search-filter-field search-filter-field-wide\">",
                    "<input type=\"text\" id=\"searchBarang\" placeholder=\"Cari nama atau kode barang...\">",
                    "</div>",
                    "<div class=\"search-filter-field\">",
                    "<select id=\"filterStok\">",
                    "<option value=\"semua\">Semua Barang</option>",
                    "<option value=\"stok_menipis\">Stok Menipis</option>",
                    "<option value=\"stok_habis\">Stok Habis</option>",
                    "</select>",
                    "</div>",
                    "<button type=\"button\" id=\"btnResetFilter\" class=\"btn-reset-filter\">Reset</button>"
                ].join("");

                var tableWrapper = tableBody.closest(".table-wrapper");
                if (tableWrapper && tableWrapper.parentNode) {
                    tableWrapper.parentNode.insertBefore(wrapper, tableWrapper);
                } else {
                    tableBody.parentNode.insertBefore(wrapper, tableBody);
                }

                currentSearchInput = document.getElementById("searchBarang");
                currentFilterSelect = document.getElementById("filterStok");
                currentResetFilterBtn = document.getElementById("btnResetFilter");
            }

            return {
                searchInput: currentSearchInput,
                filterSelect: currentFilterSelect,
                resetFilterBtn: currentResetFilterBtn
            };
        }

        function createBarangTable() {
            var target = document.querySelector(".menu-section .menu-items") || document.querySelector(".menu-section") || document.body;
            target.innerHTML = "<div class=\"table-wrapper\"><table class=\"dynamic-table\"><thead><tr><th style=\"text-align: center;\">No</th><th>Kode Barang</th><th>Nama Barang</th><th style=\"text-align: center;\">Stok</th><th>Harga Beli</th><th>Harga Jual</th><th>Aksi</th></tr></thead><tbody id=\"tabelBarang\"></tbody></table></div>";
            return document.getElementById("tabelBarang");
        }

        window.bukaModalEditStok = async function (kodeBarang) {
            var rows = await apiGet("/api/barang");
            var barang = rows.find(function (item) { return item.kode_barang === kodeBarang; });
            if (!barang) { alert("Barang tidak ditemukan."); return; }
            openModal("Edit Stok - " + barang.nama_barang, [{ id: "tambahStok", name: "tambah_stok", label: "Tambahan Stok", type: "number", min: "1" }], async function (values, closeModal) {
                var tambahan = Number(values.tambah_stok);
                if (!Number.isInteger(tambahan) || tambahan <= 0) throw new Error("Tambahan stok harus angka bulat lebih dari 0.");
                await apiPatch("/api/barang/stok", { kode_barang: kodeBarang, tambah_stok: tambahan });
                closeModal();
                await renderBarang();
                alert("Stok berhasil diperbarui.");
            });
        };

        if (addButton) {
            addButton.addEventListener("click", function (event) {
                event.preventDefault();
                openModal("Tambah Barang", [
                    { id: "kodeBarang", name: "kode_barang", label: "Kode Barang" },
                    { id: "namaBarangModal", name: "nama_barang", label: "Nama Barang" },
                    { id: "stokAwal", name: "stok", label: "Stok Awal", type: "number", min: "0" },
                    { id: "hargaBeli", name: "harga_beli", label: "Harga Beli", type: "number", min: "0" },
                    { id: "hargaJual", name: "harga_jual", label: "Harga Jual", type: "number", min: "0" }
                ], async function (values, closeModal) {
                    var payload = {
                        kode_barang: String(values.kode_barang || "").trim().toUpperCase(),
                        nama_barang: String(values.nama_barang || "").trim(),
                        stok: Number(values.stok),
                        harga_beli: Number(values.harga_beli),
                        harga_jual: Number(values.harga_jual)
                    };
                    if (!payload.kode_barang || !payload.nama_barang || payload.stok < 0 || payload.harga_beli <= 0 || payload.harga_jual <= 0) throw new Error("Semua field wajib diisi dengan nilai yang valid.");
                    await apiPost("/api/barang", payload);
                    closeModal();
                    await renderBarang();
                    alert("Barang berhasil ditambahkan.");
                });
            });
        }
        if (searchInput) searchInput.addEventListener("input", renderBarang);
        if (filterSelect) filterSelect.addEventListener("change", renderBarang);
        if (resetFilterBtn) {
            resetFilterBtn.addEventListener("click", function () {
                if (searchInput) searchInput.value = "";
                if (filterSelect) filterSelect.value = "semua";
                renderBarang();
            });
        }
        await renderBarang();
    }

    async function initRiwayatTransaksi() {
        var tableBody = document.querySelector(".history-page table tbody");
        var dateInput = document.querySelector(".filter-box input[type='date']");
        var filterButton = document.querySelector(".filter-box .btn-primary");
        if (!tableBody || !dateInput || !filterButton) return;

        async function renderHistory(tanggal) {
            var params = {};
            if (tanggal && tanggal !== "") { params.tanggal = tanggal; }
            var rows = await apiGet("/api/transaksi", params);
            if (rows.length === 0) {
                tableBody.innerHTML = emptyRow(6, "Tidak ada transaksi pada tanggal " + (tanggal || "hari ini"));
                return;
            }
            tableBody.innerHTML = rows.map(function (trx, index) {
                var waktuFormatted = trx.waktu ? trx.waktu.substring(0, 8) : "-";
                return "<tr><td style=\"text-align: center;\">" + (index+1) + "</td><td style=\"text-align: left;\">" + escapeHtml(trx.kode_pembeli) + "</td><td style=\"text-align: center;\">" + trx.total_item + "</td><td style=\"text-align: right;\">" + formatRupiah(trx.total_harga) + "</td><td style=\"text-align: center;\">" + escapeHtml(waktuFormatted) + "</td><td style=\"text-align: center;\"><button type=\"button\" class=\"btn-detail\" onclick=\"lihatDetailTransaksi(" + Number(trx.id_transaksi) + ")\">Detail</button></td></tr>";
            }).join("");
        }

        window.lihatDetailTransaksi = async function (idTransaksi) {
            try {
                const response = await fetch(`${API_BASE}/api/transaksi/${idTransaksi}`, {
                    credentials: 'include'
                });
                const transaksi = await response.json();
                
                var detail = await apiGet("/api/transaksi/" + idTransaksi + "/detail");
                
                var totalBarang = detail.reduce(function (sum, item) {
                    return sum + (Number(item.subtotal) || 0);
                }, 0);
                
                var total = totalBarang;
                var content = "";
                
                if (detail.length > 0) {
                    content += "<ol class=\"modal-detail-list\">";
                    content += detail.map(function (item) {
                        return "<li>" + escapeHtml(item.nama_barang) +
                            " - " + item.jumlah +
                            " x " + formatRupiah(item.harga_jual) +
                            " = " + formatRupiah(item.subtotal) + "</li>";
                    }).join("");
                    content += "</ol>";
                }
                
                var biayaServis = transaksi ? Number(transaksi.biaya_servis) : 0;
                
                if (biayaServis > 0) {
                    content += "<hr style='margin: 15px 0; border-top: 1px solid #ddd;'>";
                    content += "<div><strong>Biaya Servis:</strong> " + formatRupiah(biayaServis);
                    if (transaksi.keterangan_servis) {
                        content += "<br><small>Keterangan: " + escapeHtml(transaksi.keterangan_servis) + "</small>";
                    }
                    content += "</div>";
                    total = totalBarang + biayaServis;
                }
                
                content += "<div class=\"modal-detail-total\" style=\"margin-top: 15px; font-weight: bold;\">Total: " + formatRupiah(total) + "</div>";
                
                openInfoModal("Detail Transaksi #" + idTransaksi, content);
                
            } catch (error) {
                console.error(error);
                alert("Gagal memuat detail: " + error.message);
            }
        };

        filterButton.addEventListener("click", function () { renderHistory(dateInput.value); });
        await renderHistory();
    }

    document.addEventListener("DOMContentLoaded", async function () {
        try {
            if (document.querySelector(".banner-section")) await initDashboard();
            await initTransaksiPembeli();
            await initDataBarang();
            await initRiwayatTransaksi();
        } catch (error) {
            console.error(error);
            alert("Terjadi kesalahan saat memuat data: " + error.message);
        }
    });
})();
