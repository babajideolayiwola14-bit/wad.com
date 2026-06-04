/**
 * Shared message feed rendering for guest and authenticated modes.
 * @see docs/GUEST_MODE.md
 */
window.FeedView = (function () {
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

        const topLevelMessages = messages.filter(m => !m.parent_id);
        topLevelMessages.forEach(msg => {
            const messageElement = document.createElement('div');
            messageElement.classList.add('message-item');
            messageElement.dataset.id = msg.id;
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
        messages.filter(m => m.parent_id).forEach(msg => {
            if (!replyMap[msg.parent_id]) replyMap[msg.parent_id] = [];
            replyMap[msg.parent_id].push(msg);
        });

        function renderRepliesRecursive(parentId, parentElement) {
            const replies = replyMap[parentId];
            if (!replies || replies.length === 0) return;

            const repliesDiv = parentElement.querySelector(':scope > .replies');
            if (!repliesDiv) return;

            replies.forEach(msg => {
                const replyItem = document.createElement('div');
                replyItem.classList.add('reply-message');
                replyItem.dataset.id = msg.id;
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
                renderRepliesRecursive(msg.id, replyItem);
            });
        }

        topLevelMessages.forEach(msg => {
            const item = container.querySelector(`.message-item[data-id="${msg.id}"]`);
            if (item) renderRepliesRecursive(msg.id, item);
        });
    }

    return { render, getAttachmentMarkup };
})();
