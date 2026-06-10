/**
 * Admin-only auth — uses sessionStorage so it does not conflict with the main app login.
 */
window.AdminAuth = (function () {
    const TOKEN_KEY = 'adminToken';
    const USER_KEY = 'adminUser';

    function getToken() {
        return sessionStorage.getItem(TOKEN_KEY);
    }

    function getUser() {
        try {
            return JSON.parse(sessionStorage.getItem(USER_KEY) || 'null');
        } catch {
            return null;
        }
    }

    function isLoggedIn() {
        const user = getUser();
        return !!(getToken() && user && user.role === 'admin');
    }

    function logout() {
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(USER_KEY);
        window.location.href = '/admin';
    }

    async function login(username, password) {
        const res = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, state: 'Admin', lga: 'Admin' })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            throw new Error(data.message || 'Login failed');
        }
        if (data.user?.role !== 'admin') {
            throw new Error('This account is not an admin.');
        }
        sessionStorage.setItem(TOKEN_KEY, data.token);
        sessionStorage.setItem(USER_KEY, JSON.stringify(data.user));
        return data;
    }

    function authHeaders() {
        const token = getToken();
        return token ? { Authorization: `Bearer ${token}` } : {};
    }

    async function fetchApi(url, options = {}) {
        const res = await fetch(url, {
            ...options,
            headers: { ...authHeaders(), ...(options.headers || {}) }
        });
        if (res.status === 401 || res.status === 403) {
            logout();
        }
        return res;
    }

    function renderNav(container, active) {
        if (!container) return;
        const user = getUser();
        container.innerHTML = `
            <div class="admin-nav-inner">
                <a href="/admin" class="admin-nav-brand">Admin</a>
                <a href="/admin/review" class="admin-nav-link${active === 'review' ? ' active' : ''}">Review Queue</a>
                <a href="/admin-db" class="admin-nav-link${active === 'db' ? ' active' : ''}">Database</a>
                <a href="/" class="admin-nav-link">Main site</a>
                <span class="admin-nav-user">${user?.username || ''}</span>
                <button type="button" class="admin-nav-logout" id="admin-logout-btn">Logout</button>
            </div>
        `;
        container.querySelector('#admin-logout-btn')?.addEventListener('click', logout);
    }

    function renderLoginForm(container, onSuccess) {
        if (!container) return;
        container.innerHTML = `
            <div class="admin-login-card">
                <h2>Admin sign in</h2>
                <p>Use your admin credentials from Render environment variables (<code>ADMIN_USERNAME</code> / <code>ADMIN_PASSWORD</code>).</p>
                <form id="admin-login-form">
                    <label>
                        Username
                        <input type="text" name="username" autocomplete="username" required>
                    </label>
                    <label>
                        Password
                        <input type="password" name="password" autocomplete="current-password" required>
                    </label>
                    <p class="admin-login-error hidden" id="admin-login-error"></p>
                    <button type="submit">Sign in</button>
                </form>
            </div>
        `;
        const form = container.querySelector('#admin-login-form');
        const errorEl = container.querySelector('#admin-login-error');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorEl.classList.add('hidden');
            const fd = new FormData(form);
            try {
                await login(fd.get('username'), fd.get('password'));
                onSuccess();
            } catch (err) {
                errorEl.textContent = err.message || 'Login failed';
                errorEl.classList.remove('hidden');
            }
        });
    }

    /**
     * @param {{ loginEl: string, contentEl: string, navEl?: string, active?: string, onReady: Function }} opts
     */
    function initPage(opts) {
        const loginEl = document.getElementById(opts.loginEl);
        const contentEl = document.getElementById(opts.contentEl);
        const navEl = opts.navEl ? document.getElementById(opts.navEl) : null;

        function showApp() {
            if (loginEl) loginEl.style.display = 'none';
            if (contentEl) contentEl.style.display = '';
            if (navEl) renderNav(navEl, opts.active);
            opts.onReady();
        }

        if (isLoggedIn()) {
            showApp();
        } else {
            if (contentEl) contentEl.style.display = 'none';
            renderLoginForm(loginEl, showApp);
        }
    }

    return {
        getToken,
        getUser,
        isLoggedIn,
        logout,
        login,
        authHeaders,
        fetchApi,
        initPage
    };
})();
