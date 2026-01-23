// Check if user is logged in - removed since loaded after login

(function() {
    if (window.chatLoaded) return;
    window.chatLoaded = true;

    // Check if this is a reply page
    const urlParams = new URLSearchParams(window.location.search);
    const replyTo = urlParams.get('replyTo');
    const isReplyPage = !!replyTo;

    // Initialize socket.io with authentication
    const token = localStorage.getItem('token');
    const socket = io({
        auth: {
            token: token
        }
    });

    // Track if we've loaded the feed yet
    let feedLoaded = false;

    // Wait for socket connection before fetching feed
    socket.on('connect', () => {
        console.log('Socket connected, fetching feed...');
        if (!feedLoaded) {
            feedLoaded = true;
            // Small delay to ensure DOM is ready
            setTimeout(() => {
                fetchFeed();
            }, 100);
        }
    });

    const messagesDiv = document.getElementById('chat-messages');
    const messageForm = document.getElementById('message-form');
    const messageInput = document.getElementById('message');
    const attachmentInput = document.getElementById('attachment-input');
    const attachBtn = document.getElementById('attach-btn');
    const attachmentName = document.getElementById('attachment-name');
    const profileUsername = document.getElementById('profile-username');
    const profileLocation = document.getElementById('profile-location');
    const profileInteractions = document.getElementById('profile-interactions');
    const currentUserObj = JSON.parse(localStorage.getItem('user') || '{}');
    const currentUsername = currentUserObj.username;
    const hintText = document.getElementById('hint-text');

    // Real-time hint as user types
    if (messageInput && hintText) {
        messageInput.addEventListener('input', () => {
            const text = messageInput.textContent.trim().toLowerCase();
            if (!text) {
                hintText.textContent = '';
                return;
            }
            const actionKeywords = ['want', 'need', 'looking for', 'seeking', 'hire', 'buy', 'sell', 'help', 'find', 'get'];
            const hasAction = actionKeywords.some(k => text.includes(k));
            const hasQuestion = text.includes('?') || text.includes('how') || text.includes('where');
            
            if (hasAction || hasQuestion) {
                hintText.textContent = '✓ Good! Your request is clear';
                hintText.style.color = '#28a745';
            } else if (text.length > 5) {
                hintText.textContent = '💡 Tip: Start with "I want..." or "I need..." to make your request clearer';
                hintText.style.color = '#ffc107';
            } else {
                hintText.textContent = '';
            }
        });
    }

    // Mobile profile toggle
    const toggleProfileBtn = document.getElementById('toggle-profile');
    const profilePanel = document.getElementById('profile-panel');
    if (toggleProfileBtn) {
        toggleProfileBtn.addEventListener('click', () => {
            profilePanel.classList.toggle('show');
        });
    }

    async function fetchProfile() {
        const currentToken = localStorage.getItem('token');
        if (!currentToken) {
            console.error('No token for profile fetch');
            return;
        }
        
        try {
            const res = await fetch('/profile', {
                headers: { 'Authorization': `Bearer ${currentToken}` }
            });
            
            if (!res.ok) {
                console.error('Profile fetch failed:', res.status);
                if (res.status === 401) {
                    console.error('Token invalid for profile fetch');
                }
                return;
            }
            
            const data = await res.json();
            renderProfile(data);
        } catch (err) {
            console.error('Failed to fetch profile', err);
        }
    }

    async function recordInteraction(messageId, type) {
        const numericId = Number(messageId);
        if (!numericId || Number.isNaN(numericId)) {
            console.log('Invalid messageId for interaction:', messageId);
            return;
        }
        
        // Get fresh token from localStorage
        const currentToken = localStorage.getItem('token');
        if (!currentToken) {
            console.error('No token found in localStorage');
            alert('Session expired. Please log in again.');
            return;
        }
        
        console.log('Recording interaction:', type, 'for message:', numericId);
        console.log('Token (first 20 chars):', currentToken.substring(0, 20) + '...');
        
        try {
            const res = await fetch('/interact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentToken}`
                },
                body: JSON.stringify({ messageId: numericId, type })
            });
            
            if (!res.ok) {
                const errorText = await res.text();
                console.error('Interaction failed:', res.status, errorText);
                if (res.status === 401) {
                    alert('Session expired. Please log in again.');
                }
                return;
            }
            
            const data = await res.json();
            console.log('Interaction recorded:', data);
            
            // If location changed, update user object and reload feed
            if (data.newLocation) {
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                user.state = data.newLocation.state;
                user.lga = data.newLocation.lga;
                localStorage.setItem('user', JSON.stringify(user));
                console.log('User location updated to:', data.newLocation.state, data.newLocation.lga);
                fetchFeed(); // Reload feed for new location
            }
            
            console.log('Fetching profile after interaction...');
            await fetchProfile();
        } catch (err) {
            console.error('Failed to record interaction', err);
        }
    }

    function renderProfile(data) {
        if (!data) return;
        if (profileUsername) profileUsername.textContent = data.profile?.username || '';
        if (profileLocation) profileLocation.textContent = data.profile ? `${data.profile.state || ''} ${data.profile.lga || ''}`.trim() : '';
        if (profileInteractions) {
            profileInteractions.innerHTML = '';
            if (!data.interactions || data.interactions.length === 0) {
                profileInteractions.textContent = 'No interactions yet.';
                return;
            }
            // Store all messages for filtering
            const allFeedMessages = JSON.parse(sessionStorage.getItem('feedMessages') || '[]');
            window.allMessages = data.interactions.map(item => ({ id: item.message_id, message: item.message }));
            
            // Create View All button once
            let viewAllBtn = document.getElementById('view-all-btn');
            if (!viewAllBtn && allFeedMessages.length > 0) {
                viewAllBtn = document.createElement('button');
                viewAllBtn.id = 'view-all-btn';
                viewAllBtn.textContent = 'View All Messages';
                viewAllBtn.style.cssText = 'padding:8px 12px; margin-bottom:10px; background:#007bff; color:white; border:none; border-radius:4px; cursor:pointer;';
                messagesDiv.parentElement.insertBefore(viewAllBtn, messagesDiv);
                viewAllBtn.addEventListener('click', () => {
                    // Fetch fresh messages from current location
                    fetchFeed();
                });
            }
            
            data.interactions.forEach(item => {
                const div = document.createElement('div');
                div.className = 'profile-interaction-item';
                div.dataset.messageId = item.message_id;
                div.dataset.state = item.state;
                div.dataset.lga = item.lga;
                div.innerHTML = `
                    <div class="profile-interaction-meta">${item.type} • ${new Date(item.created_at).toLocaleString()}</div>
                    <div class="profile-interaction-text">${item.message} <small>(${item.state}, ${item.lga})</small></div>
                `;
                profileInteractions.appendChild(div);
            });
        }
    }

    fetchProfile();

    // Event delegation for profile interactions - single listener
    if (profileInteractions) {
        profileInteractions.addEventListener('click', async (event) => {
            const item = event.target.closest('.profile-interaction-item');
            if (!item) return;
            
            const messageId = Number(item.dataset.messageId);
            const messageState = item.dataset.state;
            const messageLga = item.dataset.lga;
            
            if (!messageId) return;
            
            // Get current user's location
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const currentState = user.state;
            const currentLga = user.lga;
            
            // Check if message is from a different location
            if (messageState !== currentState || messageLga !== currentLga) {
                // Switch to the message's location
                console.log(`Switching from ${currentState}/${currentLga} to ${messageState}/${messageLga}`);
                
                // Update user location in localStorage
                user.state = messageState;
                user.lga = messageLga;
                localStorage.setItem('user', JSON.stringify(user));
                
                // Update header if it exists
                const chatHeader = document.getElementById('chat-header');
                if (chatHeader) {
                    chatHeader.textContent = `${messageState}, ${messageLga}`;
                }
                
                // Update location in database via server
                const currentToken = localStorage.getItem('token');
                try {
                    await fetch('/update-location', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${currentToken}`
                        },
                        body: JSON.stringify({ state: messageState, lga: messageLga })
                    });
                    console.log('Database location updated');
                } catch (err) {
                    console.error('Failed to update location in database:', err);
                }
                
                // Reconnect socket to new location room
                socket.disconnect();
                socket.auth.token = currentToken; // Refresh token
                socket.connect();
                
                // Wait for reconnection
                socket.once('connect', async () => {
                    console.log('Reconnected to new location');
                    await fetchFeed();
                    
                    // Wait a bit for rendering, then scroll
                    setTimeout(() => {
                        const messageElement = document.querySelector(`[data-id="${messageId}"]`);
                        if (messageElement) {
                            messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            messageElement.style.backgroundColor = '#fff3cd';
                            setTimeout(() => {
                                messageElement.style.backgroundColor = '';
                            }, 2000);
                        }
                    }, 200);
                });
            } else {
                // Same location, just scroll to the message
                const messageElement = document.querySelector(`[data-id="${messageId}"]`);
                if (messageElement) {
                    messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    messageElement.style.backgroundColor = '#fff3cd';
                    setTimeout(() => {
                        messageElement.style.backgroundColor = '';
                    }, 2000);
                }
            }
        });
    }

    async function fetchFeed() {
        if (!token) return;
        try {
            const res = await fetch('/feed', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) return;
            const data = await res.json();
            console.log('Feed data received:', data);
            console.log('Number of messages:', data.messages ? data.messages.length : 0);
            renderFeed(data.messages || []);
        } catch (err) {
            console.error('Failed to fetch feed', err);
        }
    }

    async function searchMessages(query) {
        if (!token) return;
        try {
            const res = await fetch(`/search?q=${encodeURIComponent(query)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) return;
            const data = await res.json();
            console.log('Search results:', data.messages.length, 'messages');
            renderFeed(data.messages || []);
            
            // Show the View All button after search
            const btn = document.getElementById('view-all-btn');
            if (btn) btn.style.display = 'block';
        } catch (err) {
            console.error('Failed to search messages', err);
        }
    }

    // Search functionality
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');

    let pendingAttachmentFile = null;
    if (attachBtn && attachmentInput) {
        attachBtn.addEventListener('click', () => {
            attachmentInput.click();
        });
        attachmentInput.addEventListener('change', () => {
            if (attachmentInput.files && attachmentInput.files[0]) {
                pendingAttachmentFile = attachmentInput.files[0];
                if (attachmentName) attachmentName.textContent = pendingAttachmentFile.name;
            } else {
                pendingAttachmentFile = null;
                if (attachmentName) attachmentName.textContent = '';
            }
        });
    }
    
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            const query = searchInput.value.trim();
            if (query) {
                searchMessages(query);
            }
        });
    }
    
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = searchInput.value.trim();
                if (query) {
                    searchMessages(query);
                }
            }
        });
    }

    async function uploadAttachment(file) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/upload', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        if (!res.ok) {
            throw new Error('Upload failed');
        }
        return res.json();
    }

    function getAttachmentMarkup(url, type) {
        if (!url) return '';
        if (type && type.startsWith('image')) {
            return `<div class="attachment"><img src="${url}" alt="attachment" style="max-width:200px; border-radius:6px; margin-top:6px;"></div>`;
        }
        if (type && type.startsWith('video')) {
            return `<div class="attachment"><video controls style="max-width:220px; border-radius:6px; margin-top:6px;"><source src="${url}" type="${type}">Your browser does not support the video tag.</video></div>`;
        }
        return `<div class="attachment" style="margin-top:6px;"><a href="${url}" target="_blank" rel="noopener" style="color:#007bff;">📎 View attachment</a></div>`;
    }

    function renderFeed(messages) {
        console.log('renderFeed called with', messages.length, 'messages');
        console.log('messagesDiv:', messagesDiv);
        // Store messages in sessionStorage for filtering
        sessionStorage.setItem('feedMessages', JSON.stringify(messages));
        
        if (!messagesDiv) {
            console.error('messagesDiv is null!');
            return;
        }
        messagesDiv.innerHTML = '';
        console.log('Cleared messagesDiv');
        
        // First render all top-level messages
        const topLevelMessages = messages.filter(m => !m.parent_id);
        console.log('Top-level messages:', topLevelMessages.length);
        console.log('Top-level message details:', topLevelMessages);
        topLevelMessages.forEach(msg => {
            console.log('Rendering message:', msg.id, msg.username, msg.message);
            const messageElement = document.createElement('div');
            messageElement.classList.add('message-item');
            messageElement.dataset.id = msg.id;
            const own = msg.username === currentUsername;
            const actionsHtml = `<button class="reply-btn" data-username="${msg.username}" title="Reply">\uD83D\uDCAC</button> <button class="share-btn" data-message="${msg.message}" data-id="${msg.id}" title="Share">\u2197</button>${own ? ` <button class="delete-btn" data-id="${msg.id}" title="Delete">🗑️</button>` : ''}`;
            messageElement.innerHTML = `
                <div class="message-text"><strong>${msg.username}:</strong> ${msg.message} <small>(${new Date(msg.created_at).toLocaleTimeString()})</small> <span class="reply-count" style="display:none"></span></div>
                ${getAttachmentMarkup(msg.attachment_url, msg.attachment_type)}
                <div class="message-actions">${actionsHtml}</div>
                <div class="replies" style="display:none"></div>
            `;
            messagesDiv.appendChild(messageElement);
            console.log('Appended message to messagesDiv');
        });
        console.log('messagesDiv.children.length:', messagesDiv.children.length);
        console.log('messagesDiv computed style:', window.getComputedStyle(messagesDiv));
        console.log('messagesDiv height:', messagesDiv.offsetHeight);
        console.log('messagesDiv scrollHeight:', messagesDiv.scrollHeight);
        console.log('First message element:', messagesDiv.children[0]);
        if (messagesDiv.children[0]) {
            console.log('First message offsetHeight:', messagesDiv.children[0].offsetHeight);
            console.log('First message display:', window.getComputedStyle(messagesDiv.children[0]).display);
        }
        
        // Then render all replies
        const replyMessages = messages.filter(m => m.parent_id);
        replyMessages.forEach(msg => {
            const parentElement = document.querySelector(`[data-id="${msg.parent_id}"]`);
            if (parentElement) {
                const repliesDiv = parentElement.querySelector('.replies');
                if (repliesDiv) {
                    const replyItem = document.createElement('div');
                    replyItem.classList.add('reply-message');
                    replyItem.dataset.id = msg.id;
                    const cleanMessage = msg.message.replace(/^@\w+\s*/, '');
                    const own = msg.username === currentUsername;
                    const actionsHtml = `<button class="reply-btn" data-username="${msg.username}" title="Reply">\uD83D\uDCAC</button> <button class="share-btn" data-message="${cleanMessage}" data-id="${msg.id}" title="Share">\u2197</button>${own ? ` <button class="delete-btn" data-id="${msg.id}" title="Delete">🗑️</button>` : ''}`;
                    replyItem.innerHTML = `
                        <div class="message-text"><strong>${msg.username}:</strong> ${cleanMessage} <small>(${new Date(msg.created_at).toLocaleTimeString()})</small> <span class="reply-count" style="display:none"></span></div>
                        ${getAttachmentMarkup(msg.attachment_url, msg.attachment_type)}
                        <div class="message-actions">${actionsHtml}</div>
                        <div class="replies" style="display:none"></div>
                    `;
                    repliesDiv.appendChild(replyItem);
                }
            }
        });
        
        // Update reply counts
        document.querySelectorAll('.message-item').forEach(item => {
            const repliesDiv = item.querySelector(':scope > .replies');
            if (repliesDiv && repliesDiv.children.length > 0) {
                const replyCount = item.querySelector(':scope > .message-text > .reply-count');
                if (replyCount) {
                    replyCount.innerHTML = `<span style="font-size:16px;margin-right:4px;">\uD83D\uDCAC</span>${repliesDiv.children.length}`;
                    replyCount.style.display = 'inline';
                }
            }
        });
        
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    // fetchFeed() is now called when socket connects (see socket.on('connect') above)

    // Update header if reply page
    if (isReplyPage) {
        const header = document.getElementById('chat-header');
        if (header) header.textContent = `Replying to ${replyTo}`;
    }

    // Logout handler (only if logout button exists)
    const logoutBtn = document.getElementById('logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('state');
            localStorage.removeItem('lga');
            // Reset chat loaded flags
            window.chatLoaded = false;
            window.chatScriptsLoading = false;
            feedLoaded = false;
            // Hide chat, show login
            const chatContainer = document.getElementById('chat-container');
            const loginContainer = document.getElementById('login-container');
            if (chatContainer) chatContainer.style.display = 'none';
            if (loginContainer) loginContainer.style.display = 'block';
            if (messagesDiv) messagesDiv.innerHTML = '';
            // Disconnect socket
            socket.disconnect();
        });
    }

    const currentUser = currentUsername;

    // Listen for message rejection
    socket.on('message rejected', (data) => {
        // Show modal/alert with rejection reason
        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:9999;';
        modal.innerHTML = `
            <div style="background:white; padding:24px; border-radius:8px; max-width:500px; box-shadow:0 4px 12px rgba(0,0,0,0.3);">
                <h3 style="margin-top:0; color:#dc3545;">Message Not Posted</h3>
                <p style="color:#333; line-height:1.6;">${data.reason}</p>
                <p style="color:#666; font-size:14px; margin-top:12px;">Remember: This platform is for action requests only. State clearly what you need done.</p>
                <div style="margin-top:16px; display:flex; gap:10px;">
                    <button id="report-btn" style="padding:10px 20px; background:#ffc107; color:#000; border:none; border-radius:4px; cursor:pointer; font-size:14px;">Report Incorrect</button>
                    <button onclick="this.closest('div[style*=fixed]').remove()" style="padding:10px 20px; background:#007bff; color:white; border:none; border-radius:4px; cursor:pointer; font-size:14px;">Got it</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
        
        // Handle report button
        const reportBtn = modal.querySelector('#report-btn');
        if (reportBtn) {
            reportBtn.addEventListener('click', async () => {
                try {
                    const res = await fetch('/report-rejection', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ message: data.message, reason: data.reason })
                    });
                    if (res.ok) {
                        alert('Thank you! Your report has been submitted for admin review.');
                        modal.remove();
                    } else {
                        alert('Failed to submit report. Please try again.');
                    }
                } catch (err) {
                    console.error('Report failed:', err);
                    alert('Failed to submit report. Please try again.');
                }
            });
        }
    });

    // Listen for incoming messages
    socket.on('chat message', (data) => {
        // On reply page, only show messages related to the conversation
        if (isReplyPage) {
            const isFromCurrent = data.username === currentUser;
            const isFromReplyTo = data.username === replyTo;
            const isReplyToCurrent = data.message.startsWith(`@${currentUser}`);
            const isReplyToReplyTo = data.message.startsWith(`@${replyTo}`);
            if (!isFromCurrent && !isFromReplyTo && !isReplyToCurrent && !isReplyToReplyTo) {
                return; // Skip this message
            }
        }
        const messageElement = document.createElement('div');
        messageElement.classList.add('message-item');
        messageElement.dataset.id = data.id;
        const own = data.username === currentUsername;
        const actionsHtml = `<button class="reply-btn" data-username="${data.username}" title="Reply">\uD83D\uDCAC</button> <button class="share-btn" data-message="${data.message}" data-id="${data.id}" title="Share">\u2197</button>${own ? ` <button class="delete-btn" data-id="${data.id}" title="Delete">🗑️</button>` : ''}`;
        messageElement.innerHTML = `
            <div class="message-text"><strong>${data.username}:</strong> ${data.message} <small>(${new Date(data.timestamp).toLocaleTimeString()})</small> <span class="reply-count" style="display:none"></span></div>
            ${getAttachmentMarkup(data.attachmentUrl, data.attachmentType)}
            <div class="message-actions">${actionsHtml}</div>
            <div class="replies" style="display:none"></div>
        `;
        
        if (data.parentId) {
            // It's a reply, add to parent's replies
            const parentElement = document.querySelector(`[data-id="${data.parentId}"]`);
            if (parentElement) {
                const repliesDiv = parentElement.querySelector('.replies');
                const replyItem = document.createElement('div');
                replyItem.classList.add('reply-message');
                replyItem.dataset.id = data.id;
                const cleanMessage = data.message.replace(/^@\w+\s*/, ''); // Remove @username from display
                const ownReply = data.username === currentUsername;
                const replyActions = `<button class="reply-btn" data-username="${data.username}" title="Reply">\uD83D\uDCAC</button> <button class="share-btn" data-message="${cleanMessage}" data-id="${data.id}" title="Share">\u2197</button>${ownReply ? ` <button class="delete-btn" data-id="${data.id}" title="Delete">🗑️</button>` : ''}`;
                replyItem.innerHTML = `
                    <div class="message-text"><strong>${data.username}:</strong> ${cleanMessage} <small>(${new Date(data.timestamp).toLocaleTimeString()})</small> <span class="reply-count" style="display:none"></span></div>
                    ${getAttachmentMarkup(data.attachmentUrl, data.attachmentType)}
                    <div class="message-actions">${replyActions}</div>
                    <div class="replies" style="display:none"></div>
                `;
                repliesDiv.appendChild(replyItem);
                // Keep replies collapsed - don't auto-show
                // Update count
                const replyCount = parentElement.querySelector(':scope > .message-text > .reply-count');
                const currentCount = repliesDiv.children.length;
                if (replyCount) {
                    replyCount.innerHTML = `<span style="font-size:16px;margin-right:4px;">\uD83D\uDCAC</span>${currentCount}`;
                    replyCount.style.display = 'inline';
                    replyCount.style.cursor = 'pointer';
                }
            }
        } else {
            // Regular message
            messagesDiv.appendChild(messageElement);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
    });

    // Listen for deletions
    socket.on('message deleted', ({ id }) => {
        const item = document.querySelector(`.message-item[data-id="${id}"], .reply-message[data-id="${id}"]`);
        if (item) {
            const isMainMessage = item.classList.contains('message-item');
            if (isMainMessage) {
                // If it's a main message, remove it completely (includes all replies)
                item.remove();
            } else {
                // If it's a reply, update the parent's reply count
                const parent = item.closest('.message-item');
                item.remove();
                if (parent) {
                    const repliesDiv = parent.querySelector(':scope > .replies');
                    const replyCount = parent.querySelector(':scope > .message-text > .reply-count');
                    if (repliesDiv && replyCount) {
                        const currentCount = repliesDiv.children.length;
                        if (currentCount > 0) {
                            replyCount.innerHTML = `<span style="font-size:16px;margin-right:4px;">\uD83D\uDCAC</span>${currentCount}`;
                            replyCount.style.display = 'inline';
                        } else {
                            replyCount.style.display = 'none';
                        }
                    }
                }
            }
        }
    });

    // Event delegation for reply and share buttons
    let isReplying = false;
    messagesDiv.addEventListener('click', (event) => {
        if (event.target.classList.contains('reply-btn')) {
            const username = event.target.dataset.username;
            const messageItem = event.target.closest('.message-item, .reply-message');
            // Check if reply form already exists
            if (messageItem.querySelector(':scope > .reply-form')) return;
            // Create reply form
            const replyForm = document.createElement('div');
            replyForm.classList.add('reply-form');
            replyForm.innerHTML = `
                <div class="reply-input" contenteditable="true" placeholder="Reply to @${username}..." data-reply-to="${username}"></div>
                <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                    <button class="reply-attach-btn" type="button" style="padding:6px 10px; border:1px solid #ccc; border-radius:4px; background:#f7f7f7; cursor:pointer;">📎</button>
                    <span class="reply-attachment-name" style="font-size:12px; color:#555;"></span>
                    <input type="file" class="reply-attachment-input" style="display:none" accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt" />
                    <button class="reply-send-btn">Reply</button>
                    <button class="reply-cancel-btn">Cancel</button>
                </div>
            `;
            messageItem.appendChild(replyForm);
            const replyInput = replyForm.querySelector('.reply-input');
            replyInput.focus();
            const replyAttachBtn = replyForm.querySelector('.reply-attach-btn');
            const replyAttachInput = replyForm.querySelector('.reply-attachment-input');
            const replyAttachName = replyForm.querySelector('.reply-attachment-name');
            if (replyAttachBtn && replyAttachInput) {
                replyAttachBtn.addEventListener('click', () => replyAttachInput.click());
                replyAttachInput.addEventListener('change', () => {
                    if (replyAttachInput.files && replyAttachInput.files[0]) {
                        replyAttachInput.dataset.hasFile = '1';
                        if (replyAttachName) replyAttachName.textContent = replyAttachInput.files[0].name;
                    } else {
                        delete replyAttachInput.dataset.hasFile;
                        if (replyAttachName) replyAttachName.textContent = '';
                    }
                });
            }
        } else if (event.target.classList.contains('share-btn')) {
            const message = event.target.dataset.message;
            const messageItem = event.target.closest('.message-item, .reply-message');
            navigator.clipboard.writeText(message).then(() => alert('Message copied to clipboard!'));
            if (messageItem && messageItem.dataset.id) {
                recordInteraction(messageItem.dataset.id, 'share');
            }
        } else if (event.target.classList.contains('delete-btn')) {
            const item = event.target.closest('.message-item, .reply-message');
            const id = item ? item.dataset.id : null;
            if (!id) return;
            (async () => {
                try {
                    const res = await fetch(`/messages/${id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (!res.ok) {
                        alert('Failed to delete message');
                        return;
                    }
                    // Local removal happens via socket broadcast as well
                } catch (err) {
                    console.error('Delete failed', err);
                    alert('Failed to delete message');
                }
            })();
        } else if (event.target.classList.contains('reply-send-btn')) {
            if (isReplying) return;
            const replyForm = event.target.closest('.reply-form');
            const replyInput = replyForm.querySelector('.reply-input');
            const message = replyInput.textContent.trim();
            const replyAttachInput = replyForm.querySelector('.reply-attachment-input');
            const replyTo = replyInput.dataset.replyTo;
            const parentItem = replyForm.closest('.message-item, .reply-message');
            const parentId = parentItem ? parentItem.dataset.id : null;
            if (message || (replyAttachInput && replyAttachInput.files && replyAttachInput.files[0])) {
                isReplying = true;
                (async () => {
                    let attachmentUrl = null;
                    let attachmentType = null;
                    try {
                        if (replyAttachInput && replyAttachInput.files && replyAttachInput.files[0]) {
                            const uploaded = await uploadAttachment(replyAttachInput.files[0]);
                            attachmentUrl = uploaded.url;
                            attachmentType = uploaded.type;
                        }
                        const payloadMessage = message ? `@${replyTo} ${message}` : `@${replyTo}`;
                        socket.emit('chat message', { message: payloadMessage, parentId, attachmentUrl, attachmentType });
                        if (parentId) {
                            console.log('Reply sent, recording interaction for parent:', parentId);
                            await recordInteraction(parentId, 'reply');
                        }
                        replyForm.remove();
                    } catch (err) {
                        console.error('Reply send failed', err);
                        alert('Failed to send reply with attachment');
                    } finally {
                        setTimeout(() => { isReplying = false; }, 300);
                    }
                })();
            }
        } else if (event.target.classList.contains('reply-cancel-btn')) {
            event.target.closest('.reply-form').remove();
        } else if (event.target.classList.contains('reply-count')) {
            const messageItem = event.target.closest('.message-item, .reply-message');
            const repliesDiv = messageItem.querySelector(':scope > .replies');
            if (repliesDiv) {
                if (repliesDiv.style.display === 'none') {
                    repliesDiv.style.display = 'block';
                } else {
                    repliesDiv.style.display = 'none';
                }
            }
        }
    });

    // Handle send button click
    const sendBtn = document.getElementById('send-btn');
    let isSending = false;
    if (sendBtn) {
        sendBtn.addEventListener('click', async () => {
            if (isSending) return;
            let message = messageInput.textContent.trim();
            let attachmentUrl = null;
            let attachmentType = null;
            try {
                if (!message && !pendingAttachmentFile) return;
                isSending = true;
                if (pendingAttachmentFile) {
                    const uploaded = await uploadAttachment(pendingAttachmentFile);
                    attachmentUrl = uploaded.url;
                    attachmentType = uploaded.type;
                }
                if (!message) message = '[attachment]';
                if (isReplyPage && message) {
                    message = `@${replyTo} ${message}`;
                }
                socket.emit('chat message', { message, parentId: null, attachmentUrl, attachmentType });
                messageInput.textContent = '';
                if (attachmentName) attachmentName.textContent = '';
                if (attachmentInput) attachmentInput.value = '';
                pendingAttachmentFile = null;
            } catch (err) {
                console.error('Send failed', err);
                alert('Failed to send message with attachment');
            } finally {
                isSending = false;
            }
        });
    }

    // Handle back button if on reply page
    if (isReplyPage) {
        const backBtn = document.getElementById('back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                window.close(); // Close the reply window/tab
            });
        }
    }
    socket.on('connect_error', (error) => {
        console.error('Connection error:', error.message);
        alert('Authentication failed. Please login again.');
        // Hide chat, show login
        const chatContainer = document.getElementById('chat-container');
        const loginContainer = document.getElementById('login-container');
        if (chatContainer) chatContainer.style.display = 'none';
        if (loginContainer) loginContainer.style.display = 'block';
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('state');
        localStorage.removeItem('lga');
    });
})();