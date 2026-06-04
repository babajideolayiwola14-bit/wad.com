/**
 * Session state: guest vs authenticated.
 * @see docs/GUEST_MODE.md
 */
window.Session = (function () {
    const MODES = { GUEST: 'guest', AUTHENTICATED: 'authenticated' };
    const GUEST_LOCATION_KEY = 'guestLocation';

    function getToken() {
        return localStorage.getItem('token');
    }

    function getSessionMode() {
        return getToken() ? MODES.AUTHENTICATED : MODES.GUEST;
    }

    function isAuthenticated() {
        return getSessionMode() === MODES.AUTHENTICATED;
    }

    function getUser() {
        try {
            return JSON.parse(localStorage.getItem('user') || 'null');
        } catch {
            return null;
        }
    }

    function getGuestLocation() {
        try {
            const raw = sessionStorage.getItem(GUEST_LOCATION_KEY);
            return raw ? JSON.parse(raw) : { state: '', lga: '' };
        } catch {
            return { state: '', lga: '' };
        }
    }

    function setGuestLocation(state, lga) {
        sessionStorage.setItem(GUEST_LOCATION_KEY, JSON.stringify({
            state: state || '',
            lga: lga || ''
        }));
    }

    function setAuthenticatedSession(token, user) {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        if (user?.state) localStorage.setItem('state', user.state);
        if (user?.lga) localStorage.setItem('lga', user.lga);
    }

    function clearSession() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('state');
        localStorage.removeItem('lga');
    }

    async function resumeSession() {
        const token = getToken();
        if (!token) return false;

        try {
            const res = await fetch('/profile', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Session expired');
            const data = await res.json();
            if (data.profile) {
                localStorage.setItem('user', JSON.stringify(data.profile));
            }
            return true;
        } catch (err) {
            console.log('Session resume failed:', err);
            clearSession();
            return false;
        }
    }

    return {
        MODES,
        getToken,
        getSessionMode,
        isAuthenticated,
        getUser,
        getGuestLocation,
        setGuestLocation,
        setAuthenticatedSession,
        clearSession,
        resumeSession
    };
})();
