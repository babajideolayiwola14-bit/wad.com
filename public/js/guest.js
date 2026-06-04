/**
 * Guest write guards — login modal when guests try to post or interact.
 * @see docs/GUEST_MODE.md
 */
window.Guest = (function () {
    function setWriteControlsDisabled(disabled) {
        const messageInput = document.getElementById('message');
        const sendBtn = document.getElementById('send-btn');
        const attachBtn = document.getElementById('attach-btn');
        const attachmentInput = document.getElementById('attachment-input');

        if (messageInput) {
            messageInput.contentEditable = disabled ? 'false' : 'true';
            messageInput.classList.toggle('guest-disabled', disabled);
            messageInput.setAttribute('data-placeholder', 'What do you want done?');
        }
        if (sendBtn) sendBtn.disabled = disabled;
        if (attachBtn) attachBtn.disabled = disabled;
        if (attachmentInput) attachmentInput.disabled = disabled;
    }

    function promptLogin(reason) {
        Modals.openLoginModal({
            ...Session.getGuestLocation(),
            reason
        });
    }

    function bindOnce(el, event, handler) {
        if (!el || el.dataset[`bound_${event}`]) return;
        el.dataset[`bound_${event}`] = '1';
        el.addEventListener(event, handler);
    }

    function bindWriteGuards() {
        const guard = (e) => {
            if (Session.isAuthenticated()) return;
            e.preventDefault();
            e.stopPropagation();
            promptLogin('Sign in to post and reply.');
        };

        ['message', 'send-btn', 'attach-btn'].forEach(id => {
            const el = document.getElementById(id);
            ['mousedown', 'click'].forEach(evt => bindOnce(el, evt, guard));
            bindOnce(el, 'focus', guard);
        });

        const messages = document.getElementById('chat-messages');
        bindOnce(messages, 'click', (e) => {
            if (Session.isAuthenticated()) return;
            if (e.target.closest('.guest-action, .reply-btn, .share-btn, .delete-btn')) {
                e.preventDefault();
                promptLogin('Sign in to interact with messages.');
            }
        });
    }

    function init() {
        LocationFeed.setGuestHeaderChrome();
        setWriteControlsDisabled(true);
        bindWriteGuards();
    }

    function teardown() {
        LocationFeed.teardownGuestSocket();
    }

    return {
        init,
        teardown,
        setWriteControlsDisabled
    };
})();
