/**
 * State/LGA dropdowns and location-based feed for guests and logged-in users.
 * @see docs/GUEST_MODE.md
 */
window.LocationFeed = (function () {
    let guestSocket = null;
    let controlsBound = false;
    let currentLocation = { state: '', lga: '' };
    let onLocationChange = null;

    function getStateSelect() {
        return document.getElementById('guest-state');
    }

    function getLgaSelect() {
        return document.getElementById('guest-lga');
    }

    function getSelectedLocation() {
        return {
            state: getStateSelect()?.value?.trim() || '',
            lga: getLgaSelect()?.value?.trim() || ''
        };
    }

    function setSelectedLocation(state, lga) {
        const stateSelect = getStateSelect();
        const lgaSelect = getLgaSelect();
        Locations.fillStateSelect(stateSelect, state);
        Locations.fillLgaSelect(state, lgaSelect, lga);
        Session.setGuestLocation(state, lga);
    }

    function showFeedHint(message) {
        const box = document.getElementById('chat-messages');
        if (box) box.innerHTML = `<p class="feed-hint">${message}</p>`;
    }

    function showFeedError(message) {
        const box = document.getElementById('chat-messages');
        if (!box) return;
        box.innerHTML = `<div class="feed-error-banner">${message} <button type="button" id="feed-retry-btn">Retry</button></div>`;
        document.getElementById('feed-retry-btn')?.addEventListener('click', () => {
            tryLoadFromDropdowns();
        });
    }

    function renderMessages(messages) {
        const box = document.getElementById('chat-messages');
        if (!box) return;

        if (Session.isAuthenticated() && typeof window.renderAuthenticatedFeed === 'function') {
            window.renderAuthenticatedFeed(messages);
            return;
        }

        FeedView.render(messages || [], {
            container: box,
            readOnly: !Session.isAuthenticated()
        });
    }

    async function loadFeed(state, lga) {
        if (!state || !lga) {
            showFeedHint('Select a State and LGA to view messages.');
            return;
        }

        currentLocation = { state, lga };
        Session.setGuestLocation(state, lga);
        showFeedHint('Loading messages…');

        try {
            const res = await fetch(
                `/feed/public?state=${encodeURIComponent(state)}&lga=${encodeURIComponent(lga)}`
            );
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data.message || 'Could not load messages');
            }

            renderMessages(data.messages || []);
            joinSocketRoom(state, lga);
            if (onLocationChange) onLocationChange(state, lga);
        } catch (err) {
            console.error('Location feed load failed:', err);
            showFeedError(err.message || 'Could not load messages.');
        }
    }

    async function searchCurrentLocation(query) {
        const { state, lga } = getSelectedLocation();
        if (!state || !lga || !query.trim()) return;

        try {
            const url = `/search/public?state=${encodeURIComponent(state)}&lga=${encodeURIComponent(lga)}&q=${encodeURIComponent(query)}`;
            const res = await fetch(url);
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.message || 'Search failed');
            renderMessages(data.messages || []);
        } catch (err) {
            console.error('Location search failed:', err);
            showFeedError(err.message || 'Search failed.');
        }
    }

    function tryLoadFromDropdowns() {
        const { state, lga } = getSelectedLocation();
        if (state && lga) {
            loadFeed(state, lga);
        } else {
            showFeedHint('Select a State and LGA to view messages.');
        }
    }

    function seedFromUser(user) {
        const saved = Session.getGuestLocation();
        if (saved.state && saved.lga) return;

        if (user?.state && user?.lga) {
            setSelectedLocation(user.state, user.lga);
        }
    }

    function ensureGuestSocketIo(callback) {
        if (typeof io !== 'undefined') {
            callback();
            return;
        }
        const s = document.createElement('script');
        s.src = '/socket.io/socket.io.js';
        s.onload = callback;
        s.onerror = callback;
        document.head.appendChild(s);
    }

    function joinSocketRoom(state, lga) {
        if (Session.isAuthenticated()) {
            if (window.activeSocket?.connected) {
                window.activeSocket.emit('location:join', { state, lga });
            }
            return;
        }

        ensureGuestSocketIo(() => {
            if (typeof io === 'undefined') return;

            if (guestSocket?.connected) {
                guestSocket.disconnect();
            }

            guestSocket = io({ auth: {} });
            guestSocket.on('connect', () => {
                guestSocket.emit('guest:join', { state, lga });
            });
            guestSocket.on('chat message', () => {
                loadFeed(state, lga);
            });
            guestSocket.on('message deleted', () => {
                loadFeed(state, lga);
            });
        });
    }

    function teardownGuestSocket() {
        if (guestSocket?.connected) {
            guestSocket.disconnect();
        }
        guestSocket = null;
    }

    function showLocationBar() {
        document.getElementById('guest-location-bar')?.classList.remove('hidden');
    }

    function setGuestHeaderChrome() {
        document.getElementById('search-btn')?.classList.add('hidden');
        document.getElementById('user-info')?.classList.add('hidden');
        document.getElementById('logout')?.classList.add('hidden');
        document.getElementById('toggle-profile')?.classList.add('hidden');
    }

    function setAuthenticatedHeaderChrome() {
        document.getElementById('search-btn')?.classList.remove('hidden');
        document.getElementById('user-info')?.classList.remove('hidden');
        document.getElementById('logout')?.classList.remove('hidden');
        document.getElementById('toggle-profile')?.classList.remove('hidden');
    }

    function initControls() {
        showLocationBar();

        const saved = Session.getGuestLocation();
        Locations.fillStateSelect(getStateSelect(), saved.state);
        Locations.fillLgaSelect(saved.state, getLgaSelect(), saved.lga);

        if (!controlsBound) {
            controlsBound = true;

            const stateSelect = getStateSelect();
            const lgaSelect = getLgaSelect();
            Locations.wireStateLga(stateSelect, lgaSelect);

            stateSelect?.addEventListener('change', () => {
                if (!getLgaSelect()?.value) {
                    showFeedHint('Select a State and LGA to view messages.');
                }
            });

            lgaSelect?.addEventListener('change', () => {
                tryLoadFromDropdowns();
            });

            const searchInput = document.getElementById('search-input');
            searchInput?.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !Session.isAuthenticated()) {
                    searchCurrentLocation(searchInput.value || '');
                }
            });
        }

        tryLoadFromDropdowns();
    }

    function setOnLocationChange(callback) {
        onLocationChange = callback;
    }

    return {
        initControls,
        getSelectedLocation,
        setSelectedLocation,
        loadFeed,
        tryLoadFromDropdowns,
        searchCurrentLocation,
        seedFromUser,
        teardownGuestSocket,
        setGuestHeaderChrome,
        setAuthenticatedHeaderChrome,
        setOnLocationChange
    };
})();
