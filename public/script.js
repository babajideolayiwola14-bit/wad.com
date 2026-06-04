// Legacy entry for cached index.html that still references /script.js
(function loadLegacyScripts() {
    const scripts = [
        'js/locations.js?v=10',
        'js/session.js?v=10',
        'js/feed-view.js?v=10',
        'js/modals.js?v=10',
        'js/auth.js?v=10',
        'js/guest.js?v=10',
        'js/chat.js?v=10',
        'js/app.js?v=10'
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
