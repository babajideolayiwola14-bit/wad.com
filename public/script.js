// Legacy entry for cached index.html that still references /script.js
(function loadLegacyScripts() {
    const scripts = [
        'js/locations.js?v=16',
        'js/session.js?v=16',
        'js/feed-view.js?v=16',
        'js/location-feed.js?v=16',
        'js/modals.js?v=16',
        'js/auth.js?v=16',
        'js/guest.js?v=16',
        'js/chat.js?v=16',
        'js/app.js?v=16'
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
