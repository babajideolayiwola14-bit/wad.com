/**
 * Guest (read-only) browsing: location pickers, feed, socket, write guards.
 * @see docs/GUEST_MODE.md
 */
window.Guest = (function () {
    let guestSocket = null;
    let currentLocation = { state: '', lga: '' };

    function showFeedError(message) {
        const box = document.getElementById('chat-messages');
        if (!box) return;
        box.innerHTML = `<div class="feed-error-banner">${message} <button type="button" id="feed-retry-btn">Retry</button></div>`;
        document.getElementById('feed-retry-btn')?.addEventListener('click', () => {
            if (currentLocation.state && currentLocation.lga) {
                loadGuestFeed(currentLocation.state, currentLocation.lga);
            }
        });
    }

    async function loadGuestFeed(state, lga) {
        const box = document.getElementById('chat-messages');
        if (!box) return;

        if (!state || !lga) {
            box.innerHTML = '<p class="feed-hint">Select a State and LGA above, then click Browse.</p>';
            return;
        }

        currentLocation = { state, lga };
        Session.setGuestLocation(state, lga);
        box.innerHTML = '<p class="feed-hint">Loading messages…</p>';

        try {
            const res = await fetch(`/feed/public?state=${encodeURIComponent(state)}&lga=${encodeURIComponent(lga)}`);
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data.message || 'Could not load messages');
            }
            FeedView.render(data.messages || [], {
                container: box,
                readOnly: true
            });
            updateLocationHeader(state, lga);
            joinGuestSocketRoom(state, lga);
        } catch (err) {
            console.error('Guest feed load failed:', err);
            showFeedError(err.message || 'Could not load messages.');
        }
    }

    async function searchGuestFeed(query) {
        const { state, lga } = currentLocation;
        if (!state || !lga || !query.trim()) return;

        const box = document.getElementById('chat-messages');
        try {
            const url = `/search/public?state=${encodeURIComponent(state)}&lga=${encodeURIComponent(lga)}&q=${encodeURIComponent(query)}`;
            const res = await fetch(url);
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.message || 'Search failed');
            FeedView.render(data.messages || [], {
                container: box,
                readOnly: true
            });
        } catch (err) {
            console.error('Guest search failed:', err);
            showFeedError(err.message || 'Search failed.');
        }
    }

    function updateLocationHeader(state, lga) {
        const header = document.getElementById('chat-header');
        if (header) header.textContent = `${state} / ${lga}`;
    }

    function setupGuestChrome() {
        document.getElementById('guest-badge')?.classList.remove('hidden');
        document.getElementById('auth-actions-guest')?.classList.remove('hidden');
        document.getElementById('user-info')?.classList.add('hidden');
        document.getElementById('guest-location-bar')?.classList.remove('hidden');
        document.getElementById('logout')?.classList.add('hidden');
        document.getElementById('toggle-profile')?.classList.add('hidden');

        const profileUsername = document.getElementById('profile-username');
        const profileLocation = document.getElementById('profile-location');
        if (profileUsername) profileUsername.textContent = 'Guest';
        if (profileLocation) profileLocation.textContent = 'Browse only — log in to post';

        setWriteControlsDisabled(true);
    }

    function setWriteControlsDisabled(disabled) {
        const messageInput = document.getElementById('message');
        const sendBtn = document.getElementById('send-btn');
        const attachBtn = document.getElementById('attach-btn');
        const attachmentInput = document.getElementById('attachment-input');

        if (messageInput) {
            messageInput.contentEditable = disabled ? 'false' : 'true';
            messageInput.classList.toggle('guest-disabled', disabled);
            messageInput.setAttribute('data-placeholder', disabled ? 'Log in to post what you want done…' : 'What do you want done?');
        }
        if (sendBtn) sendBtn.disabled = disabled;
        if (attachBtn) attachBtn.disabled = disabled;
        if (attachmentInput) attachmentInput.disabled = disabled;
    }

    function promptLogin(reason) {
        Modals.openLoginModal({
            ...Session.getGuestLocation(),
            reason
        });
    }

    function bindOnce(el, event, handler) {
        if (!el || el.dataset[`bound_${event}`]) return;
        el.dataset[`bound_${event}`] = '1';
        el.addEventListener(event, handler);
    }

    function bindWriteGuards() {
        const guard = (e) => {
            if (Session.isAuthenticated()) return;
            e.preventDefault();
            e.stopPropagation();
            promptLogin('Sign in to post and reply.');
        };

        ['message', 'send-btn', 'attach-btn'].forEach(id => {
            const el = document.getElementById(id);
            ['mousedown', 'click'].forEach(evt => bindOnce(el, evt, guard));
            bindOnce(el, 'focus', guard);
        });

        const messages = document.getElementById('chat-messages');
        bindOnce(messages, 'click', (e) => {
            if (Session.isAuthenticated()) return;
            if (e.target.closest('.guest-action, .reply-btn, .share-btn, .delete-btn')) {
                e.preventDefault();
                promptLogin('Sign in to interact with messages.');
            }
        });
    }

    function bindGuestLocationControls() {
        const stateSelect = document.getElementById('guest-state');
        const lgaSelect = document.getElementById('guest-lga');
        const browseBtn = document.getElementById('guest-browse-btn');

        const saved = Session.getGuestLocation();
        Locations.fillStateSelect(stateSelect, saved.state);
        Locations.fillLgaSelect(saved.state, lgaSelect, saved.lga);

        if (stateSelect && !stateSelect.dataset.bound) {
            stateSelect.dataset.bound = '1';
            Locations.wireStateLga(stateSelect, lgaSelect);
        }

        bindOnce(browseBtn, 'click', () => {
            loadGuestFeed(stateSelect.value, lgaSelect.value);
        });

        if (saved.state && saved.lga && !Session.isAuthenticated()) {
            loadGuestFeed(saved.state, saved.lga);
        }
    }

    function bindGuestSearch() {
        const searchBtn = document.getElementById('search-btn');
        const searchInput = document.getElementById('search-input');

        bindOnce(searchBtn, 'click', () => {
            if (Session.isAuthenticated()) return;
            searchGuestFeed(searchInput?.value || '');
        });

        bindOnce(searchInput, 'keypress', (e) => {
            if (e.key === 'Enter' && !Session.isAuthenticated()) {
                searchGuestFeed(searchInput.value || '');
            }
        });
    }

    function ensureSocketIo(callback) {
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

    function joinGuestSocketRoom(state, lga) {
        ensureSocketIo(() => {
            if (typeof io === 'undefined') return;

            if (guestSocket?.connected) {
                guestSocket.disconnect();
            }

            guestSocket = io({ auth: {} });
            guestSocket.on('connect', () => {
                guestSocket.emit('guest:join', { state, lga });
            });
            guestSocket.on('chat message', () => {
                loadGuestFeed(state, lga);
            });
            guestSocket.on('message deleted', () => {
                loadGuestFeed(state, lga);
            });
        });
    }

    function teardown() {
        if (guestSocket?.connected) {
            guestSocket.disconnect();
        }
        guestSocket = null;
    }

    function init() {
        setupGuestChrome();
        bindWriteGuards();
        bindGuestLocationControls();
        bindGuestSearch();
    }

    return {
        init,
        loadGuestFeed,
        teardown,
        setWriteControlsDisabled
    };
})();
