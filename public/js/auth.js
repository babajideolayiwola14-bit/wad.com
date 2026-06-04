/**
 * Authentication API handlers (login, register, password reset).
 * @see docs/GUEST_MODE.md
 */
window.Auth = (function () {
    async function handleLogin(e) {
        e.preventDefault();

        const username = document.getElementById('login-username')?.value.trim() || '';
        const password = document.getElementById('login-password')?.value || '';
        const state = document.getElementById('login-state')?.value || '';
        const lga = document.getElementById('login-lga')?.value || '';
        const errorEl = document.getElementById('login-error');

        Modals.clearFormError(errorEl);

        if (!username || !password) {
            Modals.showFormError(errorEl, 'Please enter username and password.');
            return;
        }
        if (!state || !lga) {
            Modals.showFormError(errorEl, 'Please select your State and Local Government.');
            return;
        }

        try {
            const res = await fetch('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, state, lga })
            });

            const raw = await res.text();
            let data = {};
            try {
                data = raw ? JSON.parse(raw) : {};
            } catch {
                throw new Error('Server error. Please try again.');
            }

            if (!res.ok) {
                throw new Error(data.message || 'Login failed');
            }

            Session.setAuthenticatedSession(data.token, data.user);
            Modals.closeLoginModal();
            await App.enterAuthenticatedMode();
        } catch (err) {
            Modals.showFormError(errorEl, err.message || 'Login failed.');
        }
    }

    async function handleRegister(e) {
        e.preventDefault();

        const username = document.getElementById('reg-username')?.value.trim() || '';
        const password = document.getElementById('reg-password')?.value.trim() || '';
        const state = document.getElementById('register-state')?.value || '';
        const lga = document.getElementById('register-lga')?.value || '';
        const email = document.getElementById('reg-email')?.value.trim() || '';
        const errorEl = document.getElementById('register-error');

        Modals.clearFormError(errorEl);

        if (!state || !lga) {
            Modals.showFormError(errorEl, 'Please select your State and Local Government.');
            return;
        }
        if (password.length < 4) {
            Modals.showFormError(errorEl, 'Password must be at least 4 characters.');
            return;
        }

        try {
            const res = await fetch('/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, state, lga, email: email || undefined })
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data.message || 'Registration failed');
            }

            Modals.showFormError(errorEl, 'Registration successful! Log in below.', true);
            setTimeout(() => {
                Modals.openLoginModal({ state, lga, username });
            }, 1200);
        } catch (err) {
            Modals.showFormError(errorEl, err.message || 'Registration failed.');
        }
    }

    async function handleForgotPassword(e) {
        e.preventDefault();
        const suggested = document.getElementById('login-username')?.value.trim() || '';
        const username = prompt('Enter your username to request a password reset:', suggested);
        if (!username) return;
        await requestPasswordReset(username.trim());
    }

    async function requestPasswordReset(username, email) {
        try {
            const body = { username };
            if (email) body.email = email;

            const res = await fetch('/auth/request-reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await res.json().catch(() => ({}));

            if (res.status === 400 && data.requireEmail) {
                const suppliedEmail = prompt('No email is saved for this account. Enter your email address:');
                if (!suppliedEmail) return;
                return requestPasswordReset(username, suppliedEmail.trim());
            }

            if (data.token) {
                window.location.href = `/reset.html?token=${encodeURIComponent(data.token)}`;
                return;
            }

            alert(data.message || 'If that account exists, reset instructions were sent.');
        } catch (err) {
            console.error('Request reset failed', err);
            alert('Failed to request password reset. Try again later.');
        }
    }

    function bindForms() {
        document.getElementById('login-form')?.addEventListener('submit', handleLogin);
        document.getElementById('register-form')?.addEventListener('submit', handleRegister);
    }

    return {
        bindForms,
        handleLogin,
        handleRegister,
        handleForgotPassword
    };
})();
