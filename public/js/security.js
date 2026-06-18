/**
 * Client-side HTML escaping and message formatting.
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

    /** Read plain text from a contenteditable, preserving line breaks from Enter/paste. */
    function getEditablePlainText(el) {
        if (!el) return '';
        const raw = typeof el.innerText === 'string' ? el.innerText : el.textContent || '';
        return raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    }

    /** Escape HTML, keep paragraph breaks, preserve indentation, linkify URLs. */
    function formatMessageText(text) {
        if (text == null) return '';
        let safe = escapeHtml(String(text));
        safe = safe.replace(/\n/g, '<br>');
        safe = safe.replace(
            /(https?:\/\/[^\s<]+[^\s<.,;:!?)])/gi,
            '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
        );
        return safe;
    }

    /** Only allow attachment paths served from /uploads/ */
    function safeUploadUrl(url) {
        if (!url || typeof url !== 'string') return '';
        const trimmed = url.trim();
        if (!trimmed.startsWith('/uploads/')) return '';
        if (/[\s"'<>]/.test(trimmed)) return '';
        return escapeHtml(trimmed);
    }

    return { escapeHtml, getEditablePlainText, formatMessageText, safeUploadUrl };
})();
