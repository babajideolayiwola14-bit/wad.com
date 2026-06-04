/**
 * Login and register modal overlays.
 * @see docs/GUEST_MODE.md
 */
window.Modals = (function () {
    function getEl(id) {
        return document.getElementById(id);
    }

    function clearFormError(el) {
        if (!el) return;
        el.textContent = '';
        el.classList.remove('show');
        el.style.display = '';
    }

    function showFormError(el, message, isSuccess) {
        if (!el) return;
        el.textContent = message;
        el.style.color = isSuccess ? 'green' : 'red';
        el.classList.add('show');
        el.style.display = 'block';
    }

    function openLoginModal(prefill) {
        closeRegisterModal();
        const modal = getEl('login-modal');
        if (modal) modal.classList.remove('hidden');

        const form = getEl('login-form');
        if (form) form.reset();

        if (prefill?.username) {
            const u = getEl('login-username');
            if (u) u.value = prefill.username;
        }
        if (prefill?.state) {
            const s = getEl('login-state');
            if (s) {
                Locations.fillStateSelect(s, prefill.state);
                Locations.fillLgaSelect(prefill.state, getEl('login-lga'), prefill.lga || '');
            }
        }

        clearFormError(getEl('login-error'));
        getEl('login-username')?.focus();
    }

    function closeLoginModal() {
        getEl('login-modal')?.classList.add('hidden');
    }

    function openRegisterModal(prefill) {
        closeLoginModal();
        const modal = getEl('register-modal');
        if (modal) modal.classList.remove('hidden');

        const form = getEl('register-form');
        if (form) form.reset();

        const state = prefill?.state || '';
        const lga = prefill?.lga || '';
        Locations.fillStateSelect(getEl('register-state'), state);
        Locations.fillLgaSelect(state, getEl('register-lga'), lga);

        clearFormError(getEl('register-error'));
        getEl('reg-username')?.focus();
    }

    function closeRegisterModal() {
        getEl('register-modal')?.classList.add('hidden');
    }

    function bindPasswordToggle(toggleId, inputId) {
        const toggle = getEl(toggleId);
        const pwInput = getEl(inputId);
        if (!toggle || !pwInput) return;
        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            pwInput.type = pwInput.type === 'password' ? 'text' : 'password';
            toggle.textContent = pwInput.type === 'password' ? '👁️' : '🙈';
        });
    }

    function init() {
        Locations.fillStateSelect(getEl('login-state'));
        Locations.fillStateSelect(getEl('register-state'));

        getEl('close-modal')?.addEventListener('click', closeLoginModal);
        getEl('close-register-modal')?.addEventListener('click', closeRegisterModal);
        getEl('toggle-register')?.addEventListener('click', (e) => {
            e.preventDefault();
            openRegisterModal(Session.getGuestLocation());
        });
        getEl('toggle-login')?.addEventListener('click', (e) => {
            e.preventDefault();
            openLoginModal(Session.getGuestLocation());
        });
        getEl('forgot-link')?.addEventListener('click', (e) => {
            e.preventDefault();
            Auth.handleForgotPassword(e);
        });

        bindPasswordToggle('toggle-login-password', 'login-password');
        bindPasswordToggle('toggle-reg-password', 'reg-password');
        Locations.wireStateLga(getEl('login-state'), getEl('login-lga'));
        Locations.wireStateLga(getEl('register-state'), getEl('register-lga'));

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeLoginModal();
                closeRegisterModal();
            }
        });

        [getEl('login-modal'), getEl('register-modal')].forEach(modal => {
            modal?.addEventListener('click', (e) => {
                if (e.target === modal) modal.classList.add('hidden');
            });
        });
    }

    return {
        init,
        openLoginModal,
        closeLoginModal,
        openRegisterModal,
        closeRegisterModal,
        showFormError,
        clearFormError
    };
})();
