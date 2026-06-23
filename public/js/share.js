/**
 * Share messages to WhatsApp, X/Twitter, and Facebook with deep links
 * back to the location feed and highlighted main message.
 */
window.Share = (function () {
    let pendingDeepLink = null;
    let currentTarget = null;

    function buildShareUrl(state, lga, messageId) {
        const url = new URL(window.location.origin + window.location.pathname);
        url.searchParams.set('state', state);
        url.searchParams.set('lga', lga);
        url.searchParams.set('msg', String(messageId));
        return url.toString();
    }

    function buildShareText(messageText, state, lga) {
        const snippet = (messageText || '').trim().replace(/\s+/g, ' ').slice(0, 140);
        const suffix = (messageText || '').trim().length > 140 ? '…' : '';
        return `Action request on mybit.ng (${state} / ${lga}): ${snippet}${suffix}`;
    }

    function getRootMessageElement(item) {
        if (!item) return null;
        return item.classList.contains('message-item') ? item : item.closest('.message-item');
    }

    function resolveShareTarget(shareBtn) {
        const item = shareBtn.closest('.message-item, .reply-message');
        if (!item) return null;

        const root = getRootMessageElement(item);
        const state = item.dataset.state
            || root?.dataset.state
            || (window.LocationFeed && LocationFeed.getSelectedLocation().state)
            || '';
        const lga = item.dataset.lga
            || root?.dataset.lga
            || (window.LocationFeed && LocationFeed.getSelectedLocation().lga)
            || '';
        const messageId = root?.dataset.id || item.dataset.rootId || item.dataset.id;
        const messageText = shareBtn.dataset.message || '';

        return {
            state: state.trim(),
            lga: lga.trim(),
            messageId,
            messageText
        };
    }

    function openPlatformWindow(platform, shareUrl, shareText) {
        let href;
        switch (platform) {
            case 'whatsapp':
                href = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`;
                break;
            case 'twitter':
                href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
                break;
            case 'facebook':
                href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
                break;
            default:
                return;
        }
        window.open(href, '_blank', 'noopener,noreferrer,width=640,height=560');
    }

    async function recordShare(messageId) {
        if (!window.Session?.isAuthenticated?.()) return;
        const token = Session.getToken();
        if (!token || !messageId) return;
        try {
            await fetch('/interact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ messageId: Number(messageId), type: 'share' })
            });
        } catch (err) {
            console.warn('Share interaction not recorded:', err);
        }
    }

    function getModal() {
        return document.getElementById('share-modal');
    }

    function closeModal() {
        getModal()?.classList.add('hidden');
        currentTarget = null;
    }

    function openModal(target) {
        currentTarget = target;
        const modal = getModal();
        if (!modal) return;

        const preview = modal.querySelector('.share-modal-preview');
        const shareUrl = buildShareUrl(target.state, target.lga, target.messageId);
        const shareText = buildShareText(target.messageText, target.state, target.lga);

        if (preview) {
            preview.textContent = shareText;
        }
        modal.dataset.shareUrl = shareUrl;
        modal.dataset.shareText = shareText;
        modal.classList.remove('hidden');
    }

    function highlightMessage(messageId) {
        if (messageId == null || messageId === '') return false;

        const el = document.querySelector(
            `.message-item[data-id="${messageId}"], .reply-message[data-id="${messageId}"]`
        );
        const root = el?.classList.contains('message-item')
            ? el
            : el?.closest('.message-item') || document.querySelector(`.message-item[data-id="${messageId}"]`);

        if (!root) return false;

        root.querySelectorAll('.replies').forEach((node) => {
            node.style.display = 'block';
        });

        const focusEl = el || root;
        focusEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        focusEl.classList.add('highlight-flash');
        setTimeout(() => focusEl.classList.remove('highlight-flash'), 3000);
        return true;
    }

    function parseDeepLink() {
        const params = new URLSearchParams(window.location.search);
        const state = (params.get('state') || '').trim();
        const lga = (params.get('lga') || '').trim();
        const messageId = (params.get('msg') || '').trim();

        if (state && lga) {
            return { state, lga, messageId: messageId || null };
        }
        if (messageId) {
            return { resolve: true, messageId };
        }
        return null;
    }

    function clearDeepLinkFromUrl() {
        const url = new URL(window.location.href);
        if (!url.searchParams.has('state') && !url.searchParams.has('lga') && !url.searchParams.has('msg')) {
            return;
        }
        url.searchParams.delete('state');
        url.searchParams.delete('lga');
        url.searchParams.delete('msg');
        const next = url.pathname + (url.searchParams.toString() ? `?${url.searchParams}` : '');
        window.history.replaceState({}, '', next);
    }

    async function resolvePendingDeepLink() {
        if (!pendingDeepLink) return;

        if (pendingDeepLink.resolve) {
            try {
                const res = await fetch(`/share/${encodeURIComponent(pendingDeepLink.messageId)}`);
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                    console.warn('Share link resolve failed:', data.message);
                    pendingDeepLink = null;
                    return;
                }
                pendingDeepLink = {
                    state: data.state,
                    lga: data.lga,
                    messageId: String(data.messageId)
                };
            } catch (err) {
                console.warn('Share link resolve failed:', err);
                pendingDeepLink = null;
                return;
            }
        }

        if (pendingDeepLink.state && pendingDeepLink.lga && window.LocationFeed) {
            LocationFeed.setSelectedLocation(pendingDeepLink.state, pendingDeepLink.lga);
        }
    }

    function onFeedRendered() {
        if (!pendingDeepLink?.messageId) {
            if (pendingDeepLink) clearDeepLinkFromUrl();
            pendingDeepLink = null;
            return;
        }

        const messageId = pendingDeepLink.messageId;
        pendingDeepLink = null;
        clearDeepLinkFromUrl();

        setTimeout(() => highlightMessage(messageId), 350);
    }

    function bindModal() {
        const modal = getModal();
        if (!modal || modal.dataset.bound) return;
        modal.dataset.bound = '1';

        modal.querySelector('#close-share-modal')?.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        modal.querySelectorAll('.share-platform-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                if (!currentTarget) return;
                const shareUrl = modal.dataset.shareUrl;
                const shareText = modal.dataset.shareText;
                openPlatformWindow(btn.dataset.platform, shareUrl, shareText);
                recordShare(currentTarget.messageId);
                closeModal();
            });
        });

        modal.querySelector('#share-copy-link')?.addEventListener('click', async () => {
            const shareUrl = modal.dataset.shareUrl;
            if (!shareUrl) return;
            try {
                await navigator.clipboard.writeText(shareUrl);
                const btn = modal.querySelector('#share-copy-link');
                const prev = btn.textContent;
                btn.textContent = 'Link copied!';
                setTimeout(() => { btn.textContent = prev; }, 2000);
            } catch {
                window.prompt('Copy this link:', shareUrl);
            }
            if (currentTarget) recordShare(currentTarget.messageId);
        });
    }

    function bindShareButtons() {
        const box = document.getElementById('chat-messages');
        if (!box || box.dataset.shareBound) return;
        box.dataset.shareBound = '1';

        box.addEventListener('click', (e) => {
            const shareBtn = e.target.closest('.share-btn');
            if (!shareBtn) return;

            e.preventDefault();
            e.stopPropagation();

            const target = resolveShareTarget(shareBtn);
            if (!target?.state || !target?.lga || !target?.messageId) {
                alert('Could not build a share link for this message.');
                return;
            }
            openModal(target);
        });
    }

    function init() {
        pendingDeepLink = parseDeepLink();
        bindModal();
        bindShareButtons();
    }

    function applyMessageDatasets(element, msg, rootId) {
        if (!element || !msg) return;
        element.dataset.state = msg.state || '';
        element.dataset.lga = msg.lga || '';
        element.dataset.rootId = rootId != null ? String(rootId) : String(msg.id);
    }

    return {
        init,
        resolvePendingDeepLink,
        onFeedRendered,
        highlightMessage,
        buildShareUrl,
        applyMessageDatasets,
        getRootMessageElement
    };
})();
