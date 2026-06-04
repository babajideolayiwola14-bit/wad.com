/**
 * Application bootstrap: guest by default, authenticated when token valid.
 * @see docs/GUEST_MODE.md
 */
window.App = (function () {
    function showChatShell() {
        const chat = document.getElementById('chat-container');
        if (chat) chat.style.display = 'block';
    }

    function setupAuthenticatedChrome(user) {
        document.getElementById('auth-actions-guest')?.classList.add('hidden');
        document.getElementById('guest-location-bar')?.classList.add('hidden');
        document.getElementById('user-info')?.classList.remove('hidden');
        document.getElementById('logout')?.classList.remove('hidden');
        document.getElementById('toggle-profile')?.classList.remove('hidden');

        const currentUserEl = document.getElementById('current-user');
        if (currentUserEl && user?.username) {
            currentUserEl.textContent = user.username;
        }

        Guest.setWriteControlsDisabled(false);

        const profileUsername = document.getElementById('profile-username');
        const profileLocation = document.getElementById('profile-location');
        if (profileUsername) profileUsername.textContent = user?.username || '';
        if (profileLocation) {
            profileLocation.textContent = user?.state && user?.lga ? `${user.state} / ${user.lga}` : '';
        }
    }

    async function enterGuestMode() {
        Guest.teardown();
        window.chatLoaded = false;
        showChatShell();
        Guest.init();
    }

    async function enterAuthenticatedMode() {
        Guest.teardown();
        window.chatLoaded = false;

        const user = Session.getUser();
        showChatShell();
        setupAuthenticatedChrome(user);

        if (typeof window.initAuthenticatedChat === 'function') {
            window.initAuthenticatedChat();
        }
    }

    async function bootstrap() {
        Modals.init();
        Auth.bindForms();
        showChatShell();

        const token = Session.getToken();
        if (token && (await Session.resumeSession())) {
            await enterAuthenticatedMode();
        } else {
            await enterGuestMode();
        }
    }

    return {
        bootstrap,
        enterGuestMode,
        enterAuthenticatedMode
    };
})();

document.addEventListener('DOMContentLoaded', () => {
    App.bootstrap();
});
