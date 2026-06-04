// Legacy entry for cached index.html that still references /script.js
(function loadLegacyScripts() {
    const scripts = [
        'js/locations.js?v=12',
        'js/session.js?v=12',
        'js/feed-view.js?v=12',
        'js/location-feed.js?v=12',
        'js/modals.js?v=12',
        'js/auth.js?v=12',
        'js/guest.js?v=12',
        'js/chat.js?v=12',
        'js/app.js?v=12'
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
