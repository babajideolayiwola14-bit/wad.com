/**
 * Shared message feed rendering for guest and authenticated modes.
 * @see docs/GUEST_MODE.md
 */
window.FeedView = (function () {
    function normalizeMessageId(id) {
        if (id == null || id === '') return null;
        const n = Number(id);
        return Number.isNaN(n) ? null : n;
    }

    function isTopLevelMessage(m) {
        return normalizeMessageId(m.parent_id) === null;
    }

    function getAttachmentMarkup(url, type) {
        if (!url) return '';
        if (type && type.startsWith('image')) {
            return `<div class="attachment"><img src="${url}" alt="attachment" style="max-width:200px;border-radius:6px;margin-top:6px;"></div>`;
        }
        if (type && type.startsWith('video')) {
            return `<div class="attachment"><video controls style="max-width:220px;border-radius:6px;margin-top:6px;"><source src="${url}" type="${type}">Your browser does not support the video tag.</video></div>`;
        }
        return `<div class="attachment" style="margin-top:6px;"><a href="${url}" target="_blank" rel="noopener" style="color:#000;">📎 View attachment</a></div>`;
    }

    function buildActionsHtml(msg, currentUsername, readOnly) {
        if (readOnly) {
            return `<button class="reply-btn guest-action" data-username="${msg.username}" title="Log in to reply">💬</button>`;
        }
        const own = msg.username === currentUsername;
        return `<button class="reply-btn" data-username="${msg.username}" title="Reply">💬</button> <button class="share-btn" data-message="${msg.message}" data-id="${msg.id}" title="Share">↗</button>${own ? ` <button class="delete-btn" data-id="${msg.id}" title="Delete">🗑️</button>` : ''}`;
    }

    function render(messages, options) {
        const {
            container,
            currentUsername = null,
            readOnly = false
        } = options;

        if (!container) return;

        sessionStorage.setItem('feedMessages', JSON.stringify(messages));
        container.innerHTML = '';

        const topLevelMessages = messages.filter(isTopLevelMessage);
        if (topLevelMessages.length === 0 && messages.length === 0) {
            container.innerHTML = '<p class="feed-hint">No messages yet in this location.</p>';
            return;
        }

        topLevelMessages.forEach(msg => {
            const messageElement = document.createElement('div');
            messageElement.classList.add('message-item');
            messageElement.dataset.id = normalizeMessageId(msg.id);
            const actionsHtml = buildActionsHtml(msg, currentUsername, readOnly);
            messageElement.innerHTML = `
                <div style="display:flex;align-items:center;width:100%;gap:8px;">
                    <div class="message-text"><strong>${msg.username}:</strong> ${msg.message} <small>(${new Date(msg.created_at).toLocaleTimeString()})</small> <span class="reply-count" style="display:none"></span></div>
                    <div class="message-actions">${actionsHtml}</div>
                </div>
                ${getAttachmentMarkup(msg.attachment_url, msg.attachment_type)}
                <div class="replies" style="display:none"></div>
            `;
            container.appendChild(messageElement);
        });

        const replyMap = {};
        messages.filter(m => !isTopLevelMessage(m)).forEach(msg => {
            const pid = normalizeMessageId(msg.parent_id);
            if (pid == null) return;
            if (!replyMap[pid]) replyMap[pid] = [];
            replyMap[pid].push(msg);
        });

        function renderRepliesRecursive(parentId, parentElement) {
            const pid = normalizeMessageId(parentId);
            const replies = replyMap[pid];
            if (!replies || replies.length === 0) return;

            const repliesDiv = parentElement.querySelector(':scope > .replies');
            if (!repliesDiv) return;

            replies.forEach(msg => {
                const replyItem = document.createElement('div');
                replyItem.classList.add('reply-message');
                replyItem.dataset.id = normalizeMessageId(msg.id);
                const cleanMessage = msg.message.replace(/^@\w+\s*/, '');
                const actionsHtml = buildActionsHtml({ ...msg, message: cleanMessage }, currentUsername, readOnly);
                replyItem.innerHTML = `
                    <div style="display:flex;align-items:center;width:100%;gap:8px;">
                        <div class="message-text"><strong>${msg.username}:</strong> ${cleanMessage} <small>(${new Date(msg.created_at).toLocaleTimeString()})</small></div>
                        <div class="message-actions">${actionsHtml}</div>
                    </div>
                    ${getAttachmentMarkup(msg.attachment_url, msg.attachment_type)}
                    <div class="replies" style="display:none"></div>
                `;
                repliesDiv.appendChild(replyItem);
                renderRepliesRecursive(normalizeMessageId(msg.id), replyItem);
            });
        }

        topLevelMessages.forEach(msg => {
            const item = container.querySelector(`.message-item[data-id="${normalizeMessageId(msg.id)}"]`);
            if (item) renderRepliesRecursive(normalizeMessageId(msg.id), item);
        });

        finalizeThreads(container, readOnly);
    }

    function finalizeThreads(container, readOnly) {
        container.querySelectorAll('.message-item, .reply-message').forEach(item => {
            const repliesDiv = item.querySelector(':scope > .replies');
            if (!repliesDiv || repliesDiv.children.length === 0) return;

            const replyCount = item.querySelector('.reply-count');
            if (replyCount) {
                replyCount.innerHTML = `<span style="font-size:16px;margin-right:4px;">\uD83D\uDCAC</span>${repliesDiv.children.length}`;
                replyCount.style.display = readOnly ? 'none' : 'inline';
            }

            if (readOnly) {
                repliesDiv.style.display = 'block';
            }
        });
    }

    return { render, getAttachmentMarkup, normalizeMessageId, isTopLevelMessage };
})();
