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
    
    // Check token persistence on mobile
    console.log('Token retrieved from localStorage:', token ? 'exists' : 'missing');
    console.log('Token length:', token ? token.length : 0);
    
    // Verify token is being stored correctly
    if (token) {
        // Re-save to ensure persistence on mobile browsers
        localStorage.setItem('token', token);
        console.log('Token re-saved for mobile persistence');
    }
    
    // Close any existing socket connection before creating new one
    if (window.activeSocket && window.activeSocket.connected) {
        console.log('Closing existing socket connection');
        window.activeSocket.disconnect();
    }
    
    const socket = io({
        auth: {
            token: token
        }
    });
    
    // Store in global for cleanup
    window.activeSocket = socket;

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
    const profileOverlay = document.getElementById('profile-overlay');
    
    if (toggleProfileBtn && profilePanel) {
        toggleProfileBtn.addEventListener('click', () => {
            profilePanel.classList.toggle('show');
            if (profileOverlay) {
                profileOverlay.classList.toggle('show');
            }
        });
    }
    
    // Close profile when clicking overlay
    if (profileOverlay && profilePanel) {
        profileOverlay.addEventListener('click', () => {
            profilePanel.classList.remove('show');
            profileOverlay.classList.remove('show');
        });
    }

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }

    // Strip HTML formatting on paste for main message input
    if (messageInput) {
        messageInput.addEventListener('paste', (e) => {
            e.preventDefault();
            const text = (e.clipboardData || window.clipboardData).getData('text/plain');
            document.execCommand('insertText', false, text);
        });
    }

    // Store user's interacted message IDs for notification checking
    let userInteractedMessageIds = new Set();

    async function fetchProfile() {
        const currentToken = localStorage.getItem('token');
        if (!currentToken) {
            console.error('No token for profile fetch');
            return;
        }
        
        try {
            console.log('Fetching profile with token length:', currentToken.length);
            const res = await fetch('/profile', {
                headers: { 'Authorization': `Bearer ${currentToken}` }
            });
            
            if (!res.ok) {
                console.error('Profile fetch failed with status:', res.status);
                const errorData = await res.json().catch(() => ({}));
                console.error('Error details:', errorData);
                
                if (res.status === 401) {
                    console.error('Token invalid for profile fetch - forcing re-login');
                    alert('Authentication failed. Please login again.');
                    // Redirect to login
                    const chatContainer = document.getElementById('chat-container');
                    const loginContainer = document.getElementById('login-container');
                    if (chatContainer) chatContainer.style.display = 'none';
                    if (loginContainer) loginContainer.style.display = 'block';
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                }
                return;
            }
            
            const data = await res.json();
            console.log('Profile fetched successfully');
            renderProfile(data);
        } catch (err) {
            console.error('Failed to fetch profile', err);
        }
    }

    // Track pending interactions to prevent duplicates
    const pendingInteractions = new Set();
    
    async function recordInteraction(messageId, type) {
        const numericId = Number(messageId);
        if (!numericId || Number.isNaN(numericId)) {
            console.log('Invalid messageId for interaction:', messageId);
            return;
        }
        
        // Prevent duplicate interactions
        const key = `${numericId}-${type}`;
        if (pendingInteractions.has(key)) {
            console.log('Interaction already in progress, skipping:', key);
            return;
        }
        pendingInteractions.add(key);
        
        // Get fresh token from localStorage
        const currentToken = localStorage.getItem('token');
        if (!currentToken) {
            console.error('No token found in localStorage');
            alert('Session expired. Please log in again.');
            pendingInteractions.delete(key);
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
        } finally {
            // Remove from pending after a short delay to prevent rapid duplicates
            setTimeout(() => pendingInteractions.delete(key), 1000);
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
                userInteractedMessageIds.clear();
                return;
            }
            
            // Filter out replies - only show main messages in My Repo
            const mainMessageInteractions = data.interactions.filter(item => !item.parent_id);
            
            if (mainMessageInteractions.length === 0) {
                profileInteractions.textContent = 'No interactions yet.';
                userInteractedMessageIds.clear();
                return;
            }
            
            // Update interacted message IDs for notification checking
            userInteractedMessageIds.clear();
            mainMessageInteractions.forEach(item => {
                userInteractedMessageIds.add(item.message_id);
            });
            
            // Store all messages for filtering
            const allFeedMessages = JSON.parse(sessionStorage.getItem('feedMessages') || '[]');
            window.allMessages = mainMessageInteractions.map(item => ({ id: item.message_id, message: item.message }));
            
            // Create View All button once
            let viewAllBtn = document.getElementById('view-all-btn');
            if (!viewAllBtn && allFeedMessages.length > 0) {
                viewAllBtn = document.createElement('button');
                viewAllBtn.id = 'view-all-btn';
                viewAllBtn.textContent = 'View All Messages';
                viewAllBtn.style.cssText = 'padding:8px 12px; margin-bottom:10px; background:#007bff; color:white; border:none; border-radius:4px; cursor:pointer;';
                messagesDiv.parentElement.insertBefore(viewAllBtn, messagesDiv);
                viewAllBtn.addEventListener('click', () => {
                    // Show all hidden messages
                    const allMessages = Array.from(messagesDiv.children);
                    allMessages.forEach(msg => {
                        msg.style.display = 'flex';
                    });
                });
            }
            
            // Group interactions by state first, then by LGA
            const stateGroups = {};
            mainMessageInteractions.forEach(item => {
                if (!stateGroups[item.state]) {
                    stateGroups[item.state] = {
                        state: item.state,
                        lgas: {},
                        latestTime: new Date(item.created_at)
                    };
                }
                
                if (!stateGroups[item.state].lgas[item.lga]) {
                    stateGroups[item.state].lgas[item.lga] = {
                        lga: item.lga,
                        interactions: [],
                        latestTime: new Date(item.created_at)
                    };
                }
                
                stateGroups[item.state].lgas[item.lga].interactions.push(item);
                const itemTime = new Date(item.created_at);
                
                if (itemTime > stateGroups[item.state].lgas[item.lga].latestTime) {
                    stateGroups[item.state].lgas[item.lga].latestTime = itemTime;
                }
                if (itemTime > stateGroups[item.state].latestTime) {
                    stateGroups[item.state].latestTime = itemTime;
                }
            });
            
            // Sort states by most recent interaction
            const sortedStates = Object.values(stateGroups).sort((a, b) => b.latestTime - a.latestTime);
            
            // Render each state group
            sortedStates.forEach(stateGroup => {
                // Create state header
                const stateHeader = document.createElement('div');
                stateHeader.className = 'state-group-header';
                const totalInteractions = Object.values(stateGroup.lgas).reduce((sum, lga) => sum + lga.interactions.length, 0);
                stateHeader.style.cssText = 'padding:10px; background:#007bff; color:white; cursor:pointer; font-weight:bold; border-radius:4px; margin-bottom:5px; display:flex; justify-content:space-between; align-items:center;';
                stateHeader.innerHTML = `
                    <span><span class="state-toggle-icon">▶</span> ${stateGroup.state}</span>
                    <span style="font-size:12px; opacity:0.9;">${totalInteractions} interaction${totalInteractions !== 1 ? 's' : ''}</span>
                `;
                
                // Create container for LGAs in this state
                const lgasContainer = document.createElement('div');
                lgasContainer.className = 'state-lgas-container';
                lgasContainer.style.cssText = 'margin-bottom:15px; padding-left:10px; display:none;';
                
                // Sort LGAs by most recent interaction
                const sortedLgas = Object.values(stateGroup.lgas).sort((a, b) => b.latestTime - a.latestTime);
                
                // Add each LGA group
                sortedLgas.forEach(lgaGroup => {
                    // LGA header
                    const lgaHeader = document.createElement('div');
                    lgaHeader.className = 'lga-group-header';
                    lgaHeader.style.cssText = 'padding:8px; background:#f0f0f0; cursor:pointer; font-weight:600; border-radius:4px; margin:5px 0; display:flex; justify-content:space-between; align-items:center;';
                    lgaHeader.innerHTML = `
                        <span><span class="lga-toggle-icon">▶</span> ${lgaGroup.lga}</span>
                        <span style="font-size:11px; color:#666;">${lgaGroup.interactions.length} interaction${lgaGroup.interactions.length !== 1 ? 's' : ''}</span>
                    `;
                    
                    // LGA interactions container
                    const lgaInteractionsContainer = document.createElement('div');
                    lgaInteractionsContainer.className = 'lga-interactions';
                    lgaInteractionsContainer.style.cssText = 'padding-left:15px; display:none;';
                    
                    // Add interactions (limit to 10 initially)
                    const displayLimit = 10;
                    lgaGroup.interactions.slice(0, displayLimit).forEach(item => {
                        const div = document.createElement('div');
                        div.className = 'profile-interaction-item';
                        div.dataset.messageId = item.message_id;
                        div.dataset.state = item.state;
                        div.dataset.lga = item.lga;
                        div.style.cssText = 'padding:8px; margin:5px 0; background:#fff; border-left:3px solid #007bff; cursor:pointer;';
                        div.innerHTML = `
                            <div class="profile-interaction-meta" style="font-size:11px; color:#666;">${item.type} • ${new Date(item.created_at).toLocaleString()}</div>
                            <div class="profile-interaction-text" style="font-size:13px; margin-top:4px;">${item.message.substring(0, 80)}${item.message.length > 80 ? '...' : ''}</div>
                        `;
                        lgaInteractionsContainer.appendChild(div);
                    });
                    
                    // Add "Show more" button if there are more interactions
                    if (lgaGroup.interactions.length > displayLimit) {
                        const showMoreBtn = document.createElement('button');
                        showMoreBtn.textContent = `Show ${lgaGroup.interactions.length - displayLimit} more`;
                        showMoreBtn.style.cssText = 'padding:5px 10px; margin:5px 0; background:#e0e0e0; border:none; border-radius:3px; cursor:pointer; font-size:12px;';
                        showMoreBtn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            lgaGroup.interactions.slice(displayLimit).forEach(item => {
                                const div = document.createElement('div');
                                div.className = 'profile-interaction-item';
                                div.dataset.messageId = item.message_id;
                                div.dataset.state = item.state;
                                div.dataset.lga = item.lga;
                                div.style.cssText = 'padding:8px; margin:5px 0; background:#fff; border-left:3px solid #007bff; cursor:pointer;';
                                div.innerHTML = `
                                    <div class="profile-interaction-meta" style="font-size:11px; color:#666;">${item.type} • ${new Date(item.created_at).toLocaleString()}</div>
                                    <div class="profile-interaction-text" style="font-size:13px; margin-top:4px;">${item.message.substring(0, 80)}${item.message.length > 80 ? '...' : ''}</div>
                                `;
                                lgaInteractionsContainer.insertBefore(div, showMoreBtn);
                            });
                            showMoreBtn.remove();
                        });
                        lgaInteractionsContainer.appendChild(showMoreBtn);
                    }
                    
                    // Toggle LGA dropdown
                    lgaHeader.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const toggleIcon = lgaHeader.querySelector('.lga-toggle-icon');
                        if (lgaInteractionsContainer.style.display === 'none' || !lgaInteractionsContainer.style.display) {
                            lgaInteractionsContainer.style.display = 'block';
                            toggleIcon.textContent = '▼';
                        } else {
                            lgaInteractionsContainer.style.display = 'none';
                            toggleIcon.textContent = '▶';
                        }
                    });
                    
                    lgasContainer.appendChild(lgaHeader);
                    lgasContainer.appendChild(lgaInteractionsContainer);
                });
                
                // Toggle state dropdown
                stateHeader.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const toggleIcon = stateHeader.querySelector('.state-toggle-icon');
                    if (lgasContainer.style.display === 'none' || !lgasContainer.style.display) {
                        lgasContainer.style.display = 'block';
                        toggleIcon.textContent = '▼';
                    } else {
                        lgasContainer.style.display = 'none';
                        toggleIcon.textContent = '▶';
                    }
                });
                
                profileInteractions.appendChild(stateHeader);
                profileInteractions.appendChild(lgasContainer);
            });
        }
    }

    fetchProfile();

    // Event delegation for profile interactions - single listener
    if (profileInteractions) {
        profileInteractions.addEventListener('click', async (event) => {
            const item = event.target.closest('.profile-interaction-item');
            if (!item) return;
            
            console.log('Interaction item clicked');
            
            const messageId = Number(item.dataset.messageId);
            const messageState = item.dataset.state;
            const messageLga = item.dataset.lga;
            
            console.log('Message ID:', messageId, 'State:', messageState, 'LGA:', messageLga);
            
            if (!messageId) return;
            
            // Close profile panel on mobile so user can see the chatbox
            if (profilePanel && profilePanel.classList.contains('show')) {
                profilePanel.classList.remove('show');
                if (profileOverlay) {
                    profileOverlay.style.display = 'none';
                }
                console.log('Profile panel closed');
            }
            
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
                
                // Wait for reconnection with timeout fallback
                let reconnectHandled = false;
                
                const handleReconnect = async () => {
                    if (reconnectHandled) return;
                    reconnectHandled = true;
                    
                    console.log('Reconnected to new location');
                    await fetchFeed();
                    
                    // Don't filter - show all messages in new location including conversation thread
                    // Just scroll to and highlight the clicked message
                    setTimeout(() => {
                        const messageElement = document.querySelector(`[data-id="${messageId}"]`);
                        if (messageElement) {
                            messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            messageElement.style.backgroundColor = '#fff3cd';
                            messageElement.style.border = '2px solid #ffc107';
                            setTimeout(() => {
                                messageElement.style.backgroundColor = '';
                                messageElement.style.border = '';
                            }, 3000);
                        }
                    }, 200);
                };
                
                socket.once('connect', handleReconnect);
                
                // Fallback if socket doesn't reconnect within 2 seconds
                setTimeout(() => {
                    if (!reconnectHandled) {
                        console.log('Socket reconnect timeout, loading feed anyway');
                        handleReconnect();
                    }
                }, 2000);
            } else {
                // Same location, fetch feed to ensure messages are loaded
                console.log('Same location, fetching feed...');
                await fetchFeed();
                console.log('Feed fetched, looking for message:', messageId);
                
                // Don't filter - show all messages so user can see full conversation thread
                // Just scroll to and highlight the clicked message
                setTimeout(() => {
                    const messageElement = document.querySelector(`[data-id="${messageId}"]`);
                    console.log('Message element found:', !!messageElement);
                    if (messageElement) {
                        console.log('Scrolling to message:', messageId);
                        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        messageElement.style.backgroundColor = '#fff3cd';
                        messageElement.style.border = '2px solid #ffc107';
                        setTimeout(() => {
                            messageElement.style.backgroundColor = '';
                            messageElement.style.border = '';
                        }, 3000);
                    } else {
                        console.error('Message not found in DOM:', messageId);
                        // Try again after a longer delay
                        setTimeout(() => {
                            const retryElement = document.querySelector(`[data-id="${messageId}"]`);
                            if (retryElement) {
                                console.log('Found on retry, scrolling to message:', messageId);
                                retryElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                retryElement.style.backgroundColor = '#fff3cd';
                                retryElement.style.border = '2px solid #ffc107';
                                setTimeout(() => {
                                    retryElement.style.backgroundColor = '';
                                    retryElement.style.border = '';
                                }, 3000);
                            } else {
                                console.error('Message still not found after retry:', messageId);
                            }
                        }, 1000);
                    }
                }, 500);
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
            console.log('Searching for:', query);
            const res = await fetch(`/search?q=${encodeURIComponent(query)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) {
                console.error('Search request failed:', res.status);
                return;
            }
            const data = await res.json();
            console.log('Search results:', data.messages.length, 'messages found');
            if (data.messages.length === 0) {
                console.log('No messages found for query:', query);
            }
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
                <div style="display: flex; align-items: center; width: 100%; gap: 8px;">
                    <div class="message-text"><strong>${msg.username}:</strong> ${msg.message} <small>(${new Date(msg.created_at).toLocaleTimeString()})</small> <span class="reply-count" style="display:none"></span></div>
                    <div class="message-actions">${actionsHtml}</div>
                </div>
                ${getAttachmentMarkup(msg.attachment_url, msg.attachment_type)}
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
        
        // Optimized nested reply rendering with O(n) complexity
        // Group replies by parent_id for efficient lookup
        const replyMap = {};
        messages.filter(m => m.parent_id).forEach(msg => {
            if (!replyMap[msg.parent_id]) replyMap[msg.parent_id] = [];
            replyMap[msg.parent_id].push(msg);
        });
        
        // Recursive function to render replies
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
                const own = msg.username === currentUsername;
                const actionsHtml = `<button class="reply-btn" data-username="${msg.username}" title="Reply">\uD83D\uDCAC</button> <button class="share-btn" data-message="${cleanMessage}" data-id="${msg.id}" title="Share">\u2197</button>${own ? ` <button class="delete-btn" data-id="${msg.id}" title="Delete">🗑️</button>` : ''}`;
                replyItem.innerHTML = `
                    <div style="display: flex; align-items: center; width: 100%; gap: 8px;">
                        <div class="message-text"><strong>${msg.username}:</strong> ${cleanMessage} <small>(${new Date(msg.created_at).toLocaleTimeString()})</small> <span class="reply-count" style="display:none"></span></div>
                        <div class="message-actions">${actionsHtml}</div>
                    </div>
                    ${getAttachmentMarkup(msg.attachment_url, msg.attachment_type)}
                    <div class="replies" style="display:none"></div>
                `;
                repliesDiv.appendChild(replyItem);
                
                // Recursively render nested replies
                renderRepliesRecursive(msg.id, replyItem);
                
                // Update reply count for this message
                const nestedReplies = replyItem.querySelector(':scope > .replies');
                if (nestedReplies && nestedReplies.children.length > 0) {
                    const replyCount = replyItem.querySelector('.reply-count');
                    if (replyCount) {
                        replyCount.innerHTML = `<span style="font-size:16px;margin-right:4px;">\uD83D\uDCAC</span>${nestedReplies.children.length}`;
                        replyCount.style.display = 'inline';
                    }
                }
            });
        }
        
        // Render replies for all top-level messages
        document.querySelectorAll('.message-item').forEach(item => {
            const messageId = parseInt(item.dataset.id);
            renderRepliesRecursive(messageId, item);
            
            // Update reply count for top-level messages
            const repliesDiv = item.querySelector(':scope > .replies');
            if (repliesDiv && repliesDiv.children.length > 0) {
                const replyCount = item.querySelector('.reply-count');
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
            // Disconnect socket and wait before redirecting
            if (socket && socket.connected) {
                socket.disconnect();
                // Wait 500ms for socket to fully disconnect
                setTimeout(() => {
                    window.location.reload();
                }, 500);
            } else {
                window.location.reload();
            }
        });
    }

    const currentUser = currentUsername;

    // Listen for message rejection
    socket.on('message rejected', (data) => {
        console.log('Message was rejected:', data.reason);
        console.log('Rejected message:', data.message);
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
        // If this is user's own message, automatically track it
        if (data.username === currentUsername && !data.parentId) {
            // Auto-record as "sent" interaction
            recordInteraction(data.id, 'sent');
        }
        
        // Check if this is a reply to user's interacted message
        if (data.parentId && userInteractedMessageIds.has(data.parentId) && data.username !== currentUsername) {
            // Show notification
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('New Reply', {
                    body: `${data.username} replied to your message`,
                    icon: '/icon.png', // Add icon if you have one
                    tag: `reply-${data.id}`
                });
            }
        }
        
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
            <div style="display: flex; align-items: center; width: 100%; gap: 8px;">
                <div class="message-text"><strong>${data.username}:</strong> ${data.message} <small>(${new Date(data.timestamp).toLocaleTimeString()})</small> <span class="reply-count" style="display:none"></span></div>
                <div class="message-actions">${actionsHtml}</div>
            </div>
            ${getAttachmentMarkup(data.attachmentUrl, data.attachmentType)}
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
                    <div style="display: flex; align-items: center; width: 100%; gap: 8px;">
                        <div class="message-text"><strong>${data.username}:</strong> ${cleanMessage} <small>(${new Date(data.timestamp).toLocaleTimeString()})</small> <span class="reply-count" style="display:none"></span></div>
                        <div class="message-actions">${replyActions}</div>
                    </div>
                    ${getAttachmentMarkup(data.attachmentUrl, data.attachmentType)}
                    <div class="replies" style="display:none"></div>
                `;
                repliesDiv.appendChild(replyItem);
                
                // Update reply count for the immediate parent
                const replyCount = parentElement.querySelector('.reply-count');
                const currentCount = repliesDiv.children.length;
                if (replyCount) {
                    replyCount.innerHTML = `<span style="font-size:16px;margin-right:4px;">\uD83D\uDCAC</span>${currentCount}`;
                    replyCount.style.display = 'inline';
                    replyCount.style.cursor = 'pointer';
                }
                
                // If parent is itself a reply, update its parent's count too (for nested replies)
                if (parentElement.classList.contains('reply-message')) {
                    const grandparent = parentElement.parentElement.closest('.message-item, .reply-message');
                    if (grandparent) {
                        const grandparentReplies = grandparent.querySelector(':scope > .replies');
                        const grandparentCount = grandparentReplies ? grandparentReplies.children.length : 0;
                        const grandparentReplyCount = grandparent.querySelector('.reply-count');
                        if (grandparentReplyCount && grandparentCount > 0) {
                            grandparentReplyCount.innerHTML = `<span style="font-size:16px;margin-right:4px;">\uD83D\uDCAC</span>${grandparentCount}`;
                            grandparentReplyCount.style.display = 'inline';
                            grandparentReplyCount.style.cursor = 'pointer';
                        }
                    }
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
                    const replyCount = parent.querySelector('.reply-count');
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
        console.log('messagesDiv click:', event.target, 'classList:', event.target.classList);
        
        // Check if clicked element or its parent is a reply button
        const replyBtn = event.target.closest('.reply-btn');
        if (replyBtn) {
            console.log('Reply button clicked!', 'username:', replyBtn.dataset.username);
            const username = replyBtn.dataset.username;
            const messageItem = replyBtn.closest('.message-item, .reply-message');
            console.log('Found messageItem:', messageItem);
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
            
            // Strip HTML formatting on paste
            replyInput.addEventListener('paste', (e) => {
                e.preventDefault();
                const text = (e.clipboardData || window.clipboardData).getData('text/plain');
                document.execCommand('insertText', false, text);
            });
            
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
        }
        
        const shareBtn = event.target.closest('.share-btn');
        if (shareBtn) {
            const message = shareBtn.dataset.message;
            const messageItem = shareBtn.closest('.message-item, .reply-message');
            navigator.clipboard.writeText(message).then(() => alert('Message copied to clipboard!'));
            if (messageItem && messageItem.dataset.id) {
                recordInteraction(messageItem.dataset.id, 'share');
            }
            return;
        }
        
        const deleteBtn = event.target.closest('.delete-btn');
        if (deleteBtn) {
            const item = deleteBtn.closest('.message-item, .reply-message');
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
            return;
        }
        
        const replySendBtn = event.target.closest('.reply-send-btn');
        if (replySendBtn) {
            if (isReplying) return;
            const replyForm = replySendBtn.closest('.reply-form');
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
            return;
        }
        
        const replyCancelBtn = event.target.closest('.reply-cancel-btn');
        if (replyCancelBtn) {
            replyCancelBtn.closest('.reply-form').remove();
            return;
        }
        
        if (event.target.classList.contains('reply-count') || event.target.closest('.reply-count')) {
            const replyCountElement = event.target.classList.contains('reply-count') ? event.target : event.target.closest('.reply-count');
            const messageItem = replyCountElement.closest('.message-item, .reply-message');
            const repliesDiv = messageItem.querySelector(':scope > .replies');
            if (repliesDiv) {
                if (repliesDiv.style.display === 'none' || !repliesDiv.style.display) {
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
        console.log('Token still in localStorage:', !!localStorage.getItem('token'));
        console.log('Attempting to diagnose auth issue...');
        
        // Check if token exists
        const currentToken = localStorage.getItem('token');
        if (!currentToken) {
            console.error('No token found in localStorage');
            alert('Authentication failed. Please login again.');
            // Hide chat, show login
            const chatContainer = document.getElementById('chat-container');
            const loginContainer = document.getElementById('login-container');
            if (chatContainer) chatContainer.style.display = 'none';
            if (loginContainer) loginContainer.style.display = 'block';
            localStorage.removeItem('user');
            localStorage.removeItem('state');
            localStorage.removeItem('lga');
        } else {
            console.error('Token exists but connection failed. Error:', error.message);
            // Don't immediately log out - might be network issue
            if (error.message.includes('authentication') || error.message.includes('jwt')) {
                alert('Authentication expired. Please login again.');
                const chatContainer = document.getElementById('chat-container');
                const loginContainer = document.getElementById('login-container');
                if (chatContainer) chatContainer.style.display = 'none';
                if (loginContainer) loginContainer.style.display = 'block';
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                localStorage.removeItem('state');
                localStorage.removeItem('lga');
            }
        }
    });
})();