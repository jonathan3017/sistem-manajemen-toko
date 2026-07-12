(function () {
    "use strict";

    const API_BASE = "http://localhost:3000";

    function getJenis(value) {
        const text = String(value || "").toLowerCase();
        if (text.includes("bulanan")) return "bulanan";
        if (text.includes("tahunan")) return "tahunan";
        return "harian";
    }

    function todayInput() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const day = String(today.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    function setStatus(form, message, type) {
        let status = document.getElementById("reportStatus");
        if (!status) {
            status = document.createElement("p");
            status.id = "reportStatus";
            status.style.marginTop = "12px";
            status.style.fontWeight = "600";
            form.appendChild(status);
        }

        status.textContent = message;
        status.style.color = type === "error" ? "#c62828" : type === "success" ? "#1f7a4d" : "#333333";
    }

    async function postReport(payload) {
        const response = await fetch(`${API_BASE}/api/laporan/pdf`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(payload)
        });

        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(result.message || result.error || "Gagal mengirim laporan.");
        }

        return result;
    }

    document.addEventListener("DOMContentLoaded", function () {
        const title = document.querySelector(".content h2");
        const form = document.querySelector(".menu-item form");
        if (!form || !title || title.textContent.trim().toLowerCase() !== "laporan penjualan") return;

        const select = form.querySelector("select");
        const emailInput = form.querySelector("input[type='email']");
        const submitButton = form.querySelector("button");

        form.addEventListener("submit", async function (event) {
            event.preventDefault();

            const originalText = submitButton.textContent;
            const payload = {
                email: emailInput.value.trim(),
                jenis: getJenis(select.value),
                startDate: todayInput(),
                endDate: todayInput()
            };

            submitButton.disabled = true;
            submitButton.textContent = "Mengirim...";
            setStatus(form, "Sedang membuat PDF dan mengirim email...", "loading");

            try {
                const result = await postReport(payload);
                setStatus(form, `${result.message} ID: ${result.idLaporan}`, "success");
            } catch (error) {
                setStatus(form, error.message, "error");
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = originalText;
            }
        });
    });
})();
