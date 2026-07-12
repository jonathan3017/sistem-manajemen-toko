(function () {
    "use strict";

    async function checkAuth() {
        try {
            const response = await fetch("/api/auth/me", {
                credentials: "include"
            });

            if (!response.ok) {
                window.location.replace("/login.html");
                return;
            }

            const data = await response.json();
            injectLogoutButton(data.user);
        } catch (error) {
            window.location.replace("/login.html");
        }
    }

    function injectLogoutButton(user) {
        // Cari navbar ul
        let navList = document.querySelector(".navbar ul");
        
        // Jika tidak ada ul di navbar, buat sendiri
        if (!navList) {
            const navbar = document.querySelector(".navbar");
            if (!navbar) return;
            
            navList = document.createElement("ul");
            navbar.appendChild(navList);
            
            // Tambahkan menu Home
            const homeLi = document.createElement("li");
            const homeA = document.createElement("a");
            homeA.href = "main.html";
            homeA.textContent = "Home";
            homeLi.appendChild(homeA);
            navList.appendChild(homeLi);
            
            // Tambahkan menu Data Barang
            const barangLi = document.createElement("li");
            const barangA = document.createElement("a");
            barangA.href = "item_data.html";
            barangA.textContent = "Data Barang";
            barangLi.appendChild(barangA);
            navList.appendChild(barangLi);
            
            // Tambahkan menu Riwayat Transaksi
            const riwayatLi = document.createElement("li");
            const riwayatA = document.createElement("a");
            riwayatA.href = "transaction_history.html";
            riwayatA.textContent = "Riwayat Transaksi";
            riwayatLi.appendChild(riwayatA);
            navList.appendChild(riwayatLi);
            
            // Tambahkan menu Laporan
            const laporanLi = document.createElement("li");
            const laporanA = document.createElement("a");
            laporanA.href = "report.html";
            laporanA.textContent = "Laporan";
            laporanLi.appendChild(laporanA);
            navList.appendChild(laporanLi);
        }

        // Cek apakah sudah ada logout button
        if (document.getElementById("logoutButton")) return;

        // Buat tombol logout
        const item = document.createElement("li");
        const button = document.createElement("button");
        button.id = "logoutButton";
        button.className = "nav-logout";
        button.type = "button";
        button.textContent = "Logout";

        button.addEventListener("click", async function () {
            await fetch("/api/auth/logout", {
                method: "POST",
                credentials: "include"
            });
            window.location.replace("/login.html");
        });

        item.appendChild(button);
        navList.appendChild(item);
    }

    document.addEventListener("DOMContentLoaded", checkAuth);
})();