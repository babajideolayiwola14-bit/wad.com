/**
 * mybits — activity sidebar, mobile drawer, and cross-location reply notifications.
 * Authenticated users only.
 */
window.Mybits = (function () {
    const STORAGE_KEY = 'mybitsUnseen';
    const MOBILE_MQ = window.matchMedia('(max-width: 768px)');

    let interactedLocations = new Set();
    let interactedMessageIds = new Set();
    let interactedLocationList = [];
    let unseenCount = 0;
    let mediaQueryBound = false;

    function $(id) {
        return document.getElementById(id);
    }

    function locKey(state, lga) {
        return `${String(state || '').trim()}_${String(lga || '').trim()}`.toLowerCase();
    }

    function isMobile() {
        return MOBILE_MQ.matches;
    }

    function isPanelOpen() {
        return $('profile-panel')?.classList.contains('show');
    }

    function loadCount() {
        unseenCount = Number(sessionStorage.getItem(STORAGE_KEY) || 0);
    }

    function saveCount() {
        sessionStorage.setItem(STORAGE_KEY, String(unseenCount));
    }

    function syncWatchRooms() {
        const socket = window.activeSocket;
        if (!socket?.connected || !document.body.classList.contains('authenticated')) return;
        socket.emit('mybits:watch', { locations: interactedLocationList });
    }

    function setInteractedFromProfile(interactions) {
        interactedLocations.clear();
        interactedMessageIds.clear();
        interactedLocationList = [];
        const locMap = new Map();

        (interactions || []).forEach((item) => {
            const messageId = Number(item.message_id);
            if (!Number.isNaN(messageId)) {
                interactedMessageIds.add(messageId);
            }
            if (item.state && item.lga) {
                const key = locKey(item.state, item.lga);
                interactedLocations.add(key);
                if (!locMap.has(key)) {
                    locMap.set(key, {
                        state: String(item.state).trim(),
                        lga: String(item.lga).trim()
                    });
                }
            }
        });

        interactedLocationList = Array.from(locMap.values());
        syncWatchRooms();
        updateBadges();
    }

    /** @deprecated use setInteractedFromProfile */
    function setInteractedLocations(interactions) {
        setInteractedFromProfile(interactions);
    }

    function isViewingLocation(state, lga) {
        if (typeof LocationFeed === 'undefined') return false;
        const sel = LocationFeed.getSelectedLocation();
        return locKey(sel.state, sel.lga) === locKey(state, lga);
    }

    function showBrowserNotification(username, message, state, lga) {
        if (!('Notification' in window) || Notification.permission !== 'granted') return;
        const snippet = String(message || '').replace(/\s+/g, ' ').trim().slice(0, 100);
        try {
            new Notification('New reply on mybit', {
                body: `${username || 'Someone'} replied in ${state} / ${lga}: ${snippet}`,
                tag: `mybits-${locKey(state, lga)}-${Date.now()}`,
                renotify: true
            });
        } catch {
            // Some browsers reject renotify or tag reuse
            new Notification('New reply on mybit', {
                body: `${username || 'Someone'} replied in ${state} / ${lga}`
            });
        }
    }

    function handleIncomingMessage(payload) {
        if (!document.body.classList.contains('authenticated')) return;
        if (!payload || payload.fromSelf) return;

        const state = (payload.state || '').trim();
        const lga = (payload.lga || '').trim();
        if (!state || !lga) return;

        const parentId = payload.parentId != null ? Number(payload.parentId) : null;
        const rootId = payload.rootId != null ? Number(payload.rootId) : null;
        if (parentId == null && rootId == null) return;

        const relevantIds = [parentId, rootId].filter((id) => id != null && !Number.isNaN(id));
        const isRelevantReply = relevantIds.some((id) => interactedMessageIds.has(id));
        if (!isRelevantReply) return;
        if (isViewingLocation(state, lga)) return;

        unseenCount += 1;
        saveCount();
        updateBadges();
        showBrowserNotification(payload.username, payload.message, state, lga);
    }

    /** Legacy signature — forwards to handleIncomingMessage */
    function handleActivity(state, lga, fromSelf, extra) {
        handleIncomingMessage({
            state,
            lga,
            fromSelf,
            parentId: extra?.parentId,
            rootId: extra?.rootId,
            messageId: extra?.messageId,
            username: extra?.username,
            message: extra?.message
        });
    }

    function updateBadges() {
        if (!document.body.classList.contains('authenticated')) return;

        const countLabel = unseenCount > 99 ? '99+' : String(unseenCount);
        const show = unseenCount > 0;

        ['mybits-badge', 'mybits-sidebar-badge'].forEach((id) => {
            const el = $(id);
            if (!el) return;
            el.textContent = show ? countLabel : '';
            el.classList.toggle('hidden', !show);
            el.setAttribute('aria-label', show ? `${unseenCount} new ${unseenCount === 1 ? 'reply' : 'replies'}` : '');
        });

        $('mybits-tab-btn')?.classList.toggle('has-activity', show);
        $('mybits-sidebar-heading')?.classList.toggle('has-activity', show);

        const hint = $('mybits-activity-hint');
        if (hint) {
            hint.textContent = show
                ? `${unseenCount} new ${unseenCount === 1 ? 'reply' : 'replies'} in your locations`
                : '';
            hint.classList.toggle('hidden', !show);
        }

        const tabBtn = $('mybits-tab-btn');
        if (tabBtn) {
            tabBtn.setAttribute(
                'aria-label',
                show ? `Open mybits, ${unseenCount} new` : 'Open mybits'
            );
        }
    }

    function clearBadge() {
        unseenCount = 0;
        saveCount();
        updateBadges();
    }

    function openPanel() {
        $('profile-panel')?.classList.add('show');
        $('profile-overlay')?.classList.add('show');
        clearBadge();
    }

    function closePanel() {
        $('profile-panel')?.classList.remove('show');
        $('profile-overlay')?.classList.remove('show');
    }

    function togglePanel() {
        if (isPanelOpen()) {
            closePanel();
        } else {
            openPanel();
        }
    }

    function onInteractionsClick(event) {
        if (event.target.closest('.profile-interaction-item, .state-group-header, .lga-group-header')) {
            clearBadge();
        }
    }

    function onSidebarHeadingClick() {
        if (!isMobile()) clearBadge();
    }

    function requestNotificationPermission() {
        if (!('Notification' in window)) return;
        if (Notification.permission === 'default') {
            Notification.requestPermission().catch(() => {});
        }
    }

    function bindEvents() {
        const tabBtn = $('mybits-tab-btn');
        const overlay = $('profile-overlay');
        const interactions = $('profile-interactions');
        const heading = $('mybits-sidebar-heading');

        if (tabBtn && !tabBtn.dataset.bound) {
            tabBtn.dataset.bound = '1';
            tabBtn.addEventListener('click', togglePanel);
        }

        if (overlay && !overlay.dataset.bound) {
            overlay.dataset.bound = '1';
            overlay.addEventListener('click', closePanel);
        }

        if (heading && !heading.dataset.bound) {
            heading.dataset.bound = '1';
            heading.addEventListener('click', onSidebarHeadingClick);
        }

        if (interactions && !interactions.dataset.mybitsBound) {
            interactions.dataset.mybitsBound = '1';
            interactions.addEventListener('click', onInteractionsClick);
        }

        if (!mediaQueryBound) {
            mediaQueryBound = true;
            MOBILE_MQ.addEventListener('change', updateBadges);
        }

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && document.body.classList.contains('authenticated')) {
                syncWatchRooms();
            }
        });
    }

    function init() {
        bindEvents();
        loadCount();
        updateBadges();
    }

    function teardown() {
        closePanel();
        interactedLocations.clear();
        interactedMessageIds.clear();
        interactedLocationList = [];
        unseenCount = 0;
        saveCount();
        updateBadges();
        const socket = window.activeSocket;
        if (socket?.connected) {
            socket.emit('mybits:watch', { locations: [] });
        }
    }

    function onAuthenticated() {
        init();
        requestNotificationPermission();
        updateBadges();
    }

    function onGuest() {
        teardown();
    }

    return {
        init,
        teardown,
        onAuthenticated,
        onGuest,
        openPanel,
        closePanel,
        handleActivity,
        handleIncomingMessage,
        setInteractedLocations,
        setInteractedFromProfile,
        syncWatchRooms,
        clearBadge,
        updateBadges,
        locKey
    };
})();
