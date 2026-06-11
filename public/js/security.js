/**
 * Client-side HTML escaping for user-generated content.
 */
window.Security = (function () {
    function escapeHtml(text) {
        if (text == null) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /** Only allow attachment paths served from /uploads/ */
    function safeUploadUrl(url) {
        if (!url || typeof url !== 'string') return '';
        const trimmed = url.trim();
        if (!trimmed.startsWith('/uploads/')) return '';
        if (/[\s"'<>]/.test(trimmed)) return '';
        return escapeHtml(trimmed);
    }

    return { escapeHtml, safeUploadUrl };
})();
