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
        LocationFeed.setSessionChrome(true);
        closeMybitPanel();

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
        window.renderAuthenticatedFeed = null;
        closeMybitPanel();
        showChatShell();
        LocationFeed.setSessionChrome(false);
        LocationFeed.initControls();
        Guest.init();
    }

    async function enterAuthenticatedMode() {
        Guest.teardown();
        window.chatLoaded = false;

        const user = Session.getUser();
        showChatShell();
        LocationFeed.seedFromUser(user);
        setupAuthenticatedChrome(user);

        if (typeof window.initAuthenticatedChat === 'function') {
            window.initAuthenticatedChat();
        }

        LocationFeed.initControls();
    }

    async function bootstrap() {
        Modals.init();
        Auth.bindForms();
        initMybitMobileToggle();
        showChatShell();

        const token = Session.getToken();
        if (token && (await Session.resumeSession())) {
            await enterAuthenticatedMode();
        } else {
            await enterGuestMode();
        }
    }

    function closeMybitPanel() {
        document.getElementById('profile-panel')?.classList.remove('show');
        document.getElementById('profile-overlay')?.classList.remove('show');
    }

    function initMybitMobileToggle() {
        const btn = document.getElementById('mybit-mobile-toggle');
        const panel = document.getElementById('profile-panel');
        const overlay = document.getElementById('profile-overlay');
        if (!btn || btn.dataset.bound) return;
        btn.dataset.bound = '1';

        btn.addEventListener('click', () => {
            panel?.classList.toggle('show');
            overlay?.classList.toggle('show');
        });

        overlay?.addEventListener('click', () => {
            closeMybitPanel();
        });
    }

    return {
        bootstrap,
        enterGuestMode,
        enterAuthenticatedMode,
        closeMybitPanel
    };
})();

document.addEventListener('DOMContentLoaded', () => {
    App.bootstrap();
});
