// Legacy entry for cached index.html that still references /script.js
(function loadLegacyScripts() {
    const scripts = [
        'js/locations.js?v=13',
        'js/session.js?v=13',
        'js/feed-view.js?v=13',
        'js/location-feed.js?v=13',
        'js/modals.js?v=13',
        'js/auth.js?v=13',
        'js/guest.js?v=13',
        'js/chat.js?v=13',
        'js/app.js?v=13'
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
