// Legacy entry for cached index.html that still references /script.js
(function loadLegacyScripts() {
    const scripts = [
        'js/locations.js?v=15',
        'js/session.js?v=15',
        'js/feed-view.js?v=15',
        'js/location-feed.js?v=15',
        'js/modals.js?v=15',
        'js/auth.js?v=15',
        'js/guest.js?v=15',
        'js/chat.js?v=15',
        'js/app.js?v=15'
    ];
    let index = 0;

    function loadNext() {
        if (index >= scripts.length) return;
        const script = document.createElement('script');
        script.src = scripts[index++];
        script.onload = loadNext;
        script.onerror = loadNext;
        document.head.appendChild(script);
    }

    loadNext();
})();
