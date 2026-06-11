/**
 * mybits — activity sidebar, mobile drawer, and cross-location notifications.
 * Authenticated users only.
 */
window.Mybits = (function () {
    const STORAGE_KEY = 'mybitsUnseen';
    const MOBILE_MQ = window.matchMedia('(max-width: 768px)');

    let interactedLocations = new Set();
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

    function setInteractedLocations(interactions) {
        interactedLocations.clear();
        (interactions || []).forEach((item) => {
            if (item.state && item.lga) {
                interactedLocations.add(locKey(item.state, item.lga));
            }
        });
        updateBadges();
    }

    function isViewingLocation(state, lga) {
        if (typeof LocationFeed === 'undefined') return false;
        const sel = LocationFeed.getSelectedLocation();
        return locKey(sel.state, sel.lga) === locKey(state, lga);
    }

    function handleActivity(state, lga, fromSelf) {
        if (!document.body.classList.contains('authenticated')) return;
        if (!state || !lga || fromSelf) return;
        if (!interactedLocations.has(locKey(state, lga))) return;
        if (isViewingLocation(state, lga)) return;

        unseenCount += 1;
        saveCount();
        updateBadges();
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
        });

        $('mybits-tab-btn')?.classList.toggle('has-activity', show);
        $('mybits-sidebar-heading')?.classList.toggle('has-activity', show);

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

    function bindEvents() {
        const tabBtn = $('mybits-tab-btn');
        const overlay = $('profile-overlay');
        const interactions = $('profile-interactions');

        if (tabBtn && !tabBtn.dataset.bound) {
            tabBtn.dataset.bound = '1';
            tabBtn.addEventListener('click', togglePanel);
        }

        if (overlay && !overlay.dataset.bound) {
            overlay.dataset.bound = '1';
            overlay.addEventListener('click', closePanel);
        }

        if (interactions && !interactions.dataset.mybitsBound) {
            interactions.dataset.mybitsBound = '1';
            interactions.addEventListener('click', onInteractionsClick);
        }

        if (!mediaQueryBound) {
            mediaQueryBound = true;
            MOBILE_MQ.addEventListener('change', updateBadges);
        }
    }

    function init() {
        bindEvents();
        loadCount();
        updateBadges();
    }

    function teardown() {
        closePanel();
        interactedLocations.clear();
        unseenCount = 0;
        saveCount();
        updateBadges();
    }

    function onAuthenticated() {
        init();
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
        setInteractedLocations,
        clearBadge,
        updateBadges
    };
})();
