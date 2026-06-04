// Legacy entry for cached index.html that still references /script.js
(function loadLegacyScripts() {
    const scripts = ['js/auth.js?v=6', 'js/chat.js?v=6'];
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
