(function () {
    "use strict";

    const form = document.getElementById("loginForm");
    const alertBox = document.getElementById("loginAlert");
    const button = document.getElementById("loginButton");

    function showAlert(message, type) {
        alertBox.textContent = message;
        alertBox.className = "login-alert is-visible " + (type || "error");
    }

    function setLoading(isLoading) {
        button.disabled = isLoading;
        button.classList.toggle("is-loading", isLoading);
    }

    async function checkSession() {
        try {
            const response = await fetch("/api/auth/me", {
                credentials: "include"
            });

            if (response.ok) {
                window.location.replace("/main.html");
            }
        } catch (error) {
            console.warn("Session check skipped:", error.message);
        }
    }

    async function login(event) {
        event.preventDefault();

        const email = String(form.email.value || "").trim();
        const password = String(form.password.value || "");

        if (!email || !password) {
            showAlert("Email dan password wajib diisi.");
            return;
        }

        if (password.length < 6) {
            showAlert("Password minimal 6 karakter.");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ email, password })
            });
            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data.message || "Login gagal. Periksa kembali email dan password.");
            }

            showAlert("Login berhasil. Mengalihkan ke dashboard...", "success");
            window.location.replace("/main.html");
        } catch (error) {
            showAlert(error.message);
        } finally {
            setLoading(false);
        }
    }

    if (form) {
        form.addEventListener("submit", login);
        checkSession();
    }
})();
