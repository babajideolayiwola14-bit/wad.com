const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const http = require('http');
const socketIo = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
require('dotenv').config();

// Security modules
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('mongo-sanitize');
const xss = require('xss-clean');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3001",
    methods: ["GET", "POST"]
  }
});
const PORT = process.env.PORT || 3001;
const SECRET_KEY = process.env.SECRET_KEY || 'your-secret-key-change-this-in-production';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Validate critical environment variables in production
if (NODE_ENV === 'production') {
  if (!process.env.SECRET_KEY || process.env.SECRET_KEY.length < 32) {
    console.error('ERROR: SECRET_KEY must be set and at least 32 characters long');
    process.exit(1);
  }
  if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
    console.error('ERROR: ADMIN_USERNAME and ADMIN_PASSWORD must be set');
    process.exit(1);
  }
}

// Database (SQLite) – file-based, no setup needed
const db = new sqlite3.Database('./chatapp.db', (err) => {
  if (err) {
    console.error('Failed to open database:', err);
  } else {
    console.log('Connected to SQLite database');
    ensureSchema();
  }
});

// Helper to promisify db.run and db.all
function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

async function ensureSchema() {
  const createMessagesTable = `
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      state TEXT,
      lga TEXT,
      message TEXT NOT NULL,
      parent_id INTEGER,
      attachment_url TEXT,
      attachment_type TEXT,
      deleted_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;
  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      username TEXT PRIMARY KEY,
      password_hash TEXT,
      state TEXT,
      lga TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;
  const createInteractionsTable = `
    CREATE TABLE IF NOT EXISTS interactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
      message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;
  const createFlaggedMessagesTable = `
    CREATE TABLE IF NOT EXISTS flagged_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      message TEXT NOT NULL,
      rejection_reason TEXT,
      state TEXT,
      lga TEXT,
      status TEXT DEFAULT 'pending',
      reviewed_by TEXT,
      reviewed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;
  
  try {
    await dbRun(createMessagesTable);
    await dbRun(createUsersTable);
    await dbRun(createInteractionsTable);
    await dbRun(createFlaggedMessagesTable);

    // Backward-compatible column additions
    try {
      await dbRun('ALTER TABLE messages ADD COLUMN attachment_url TEXT');
    } catch (e) {
      // ignore if exists
    }
    try {
      await dbRun('ALTER TABLE messages ADD COLUMN attachment_type TEXT');
    } catch (e) {
      // ignore if exists
    }
    try {
      await dbRun('ALTER TABLE messages ADD COLUMN deleted_at DATETIME');
    } catch (e) {
      // ignore if exists
    }
    console.log('Database schema initialized successfully');
  } catch (err) {
    console.error('Failed to ensure schema:', err);
  }
}

// Validate if message is action-oriented (improved for edge cases)
function isActionStatement(message) {
  if (!message || message.trim().length < 5) {
    return { valid: false, reason: 'Message too short. Please describe what you want done.', uncertain: false };
  }
  
  const text = message.toLowerCase().trim();
  
  // Action keywords that indicate a request/need
  const requestKeywords = [
    'want', 'need', 'looking for', 'seeking', 'hire', 'required', 'require',
    'help', 'assist', 'find', 'get', 'searching for', 'in need of',
    'request', 'requesting', 'could use', 'urgently'
  ];
  
  // Service/action verbs (can be requests or offers - UNCERTAIN)
  const actionVerbs = [
    'fix', 'repair', 'build', 'create', 'deliver', 'install', 'design',
    'make', 'clean', 'paint', 'move', 'transport', 'teach', 'maintain',
    'setup', 'configure', 'service'
  ];
  
  // Question patterns that indicate requests
  const questionWords = ['how can i', 'where can i', 'who can', 'anyone', 'can someone'];
  const hasQuestion = questionWords.some(word => text.includes(word)) || 
    (text.includes('?') && (text.includes('where') || text.includes('who') || text.includes('how')));
  
  // Offering patterns (should be rejected)
  const offerPatterns = [
    /offering/i, /i can (help|fix|repair|build)/i, /i (do|offer|provide) /i,
    /available for/i, /selling/i, /for sale/i
  ];
  const isOffer = offerPatterns.some(pattern => pattern.test(text));
  
  // Check if it's too conversational (greetings, casual chat)
  const casualPhrases = [
    /^hi+$/i, /^hello+$/i, /^hey+$/i, /^good morning$/i, /^good evening$/i,
    /^how are you/i, /^what's up/i, /^lol+$/i, /^ok+$/i, /^thanks+$/i,
    /^thank you/i, /^bye+$/i, /^see you/i
  ];
  const isCasual = casualPhrases.some(pattern => pattern.test(text));
  
  if (isCasual) {
    return { 
      valid: false, 
      reason: 'Please post action requests only. Example: "I want to hire a plumber" or "Looking for a tutor"',
      uncertain: false
    };
  }
  
  if (isOffer) {
    return { 
      valid: false, 
      reason: 'Please post what you need, not what you offer. Example: "I need a plumber" instead of "I offer plumbing services"',
      uncertain: false
    };
  }
  
  // Strong request indicators
  const hasRequestKeyword = requestKeywords.some(keyword => text.includes(keyword));
  
  if (hasRequestKeyword || hasQuestion) {
    return { valid: true, uncertain: false };
  }
  
  // Edge case: Just action verb + noun ("Plumber needed", "Carpenter?")
  const hasActionVerb = actionVerbs.some(verb => text.includes(verb));
  const endsWithNeeded = /needed$/i.test(text) || /required$/i.test(text);
  const veryShort = text.split(/\s+/).length <= 3;
  
  if ((hasActionVerb && veryShort) || endsWithNeeded) {
    // UNCERTAIN - could be request or offer, flag for review
    return { 
      valid: true, 
      uncertain: true,
      confidence: 'low'
    };
  }
  
  // If no clear action indicators, suggest reframing
  return { 
    valid: false, 
    reason: 'Your message should clearly state what you want done. Try starting with "I want...", "I need...", or "Looking for..."',
    uncertain: false
  };
}

function verifyHttpToken(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ message: 'No token provided' });
  const token = auth.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

// Security helper functions
function isValidUsername(username) {
  // 3-30 alphanumeric characters and underscores only
  return /^[a-zA-Z0-9_]{3,30}$/.test(username);
}

function isValidPassword(password) {
  // At least 8 characters with uppercase, lowercase, and numbers
  return password.length >= 8 && 
         /[A-Z]/.test(password) && 
         /[a-z]/.test(password) && 
         /[0-9]/.test(password);
}

function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  // Remove dangerous characters
  return input.replace(/[<>\"']/g, '').trim();
}

function isAdmin(req) {
  return req.user && req.user.role === 'admin';
}

// Rate limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per window
  standardHeaders: true,
  legacyHeaders: false
});

// Middleware
app.use(helmet());
app.use(cors());
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "style-src 'self' 'unsafe-inline' http://gc.kis.v2.scr.kaspersky-labs.com https://gc.kis.v2.scr.kaspersky-labs.com",
      "script-src 'self' 'unsafe-inline' http://gc.kis.v2.scr.kaspersky-labs.com https://gc.kis.v2.scr.kaspersky-labs.com",
      "connect-src 'self' ws://localhost:3001 http://localhost:3001 http://gc.kis.v2.scr.kaspersky-labs.com https://gc.kis.v2.scr.kaspersky-labs.com ws://gc.kis.v2.scr.kaspersky-labs.com wss://gc.kis.v2.scr.kaspersky-labs.com"
    ].join('; ')
  );
  next();
});
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));
if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
  fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });
}
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// File upload setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_');
    cb(null, `${timestamp}_${safeName}`);
  }
});
const upload = multer({ storage });

// In-memory user store (for demo purposes - auto-registration on first login)
const users = [];
let nextUserId = 1;

// Login endpoint (auto-registers new users) with security
app.post('/login', authLimiter, async (req, res) => {
  const { username, password, state, lga } = req.body;

  // Validate inputs
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  if (!isValidUsername(username)) {
    return res.status(400).json({ message: 'Invalid username format (3-30 alphanumeric characters)' });
  }

  // Check if trying to login as admin
  if (username === process.env.ADMIN_USERNAME) {
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword || password !== adminPassword) {
      // Log failed admin login
      console.warn(`Failed admin login attempt for user: ${username}`);
      return res.status(401).json({ message: 'Invalid username or password' });
    }
    // Admin login successful
    const token = jwt.sign(
      { username, role: 'admin', state: 'Admin', lga: 'Admin' },
      SECRET_KEY,
      { expiresIn: process.env.JWT_EXPIRY || 86400 }
    );
    return res.status(200).json({
      auth: true,
      token: token,
      user: { username, role: 'admin', state: 'Admin', lga: 'Admin' }
    });
  }

  // Regular user registration/login
  let user = users.find(u => u.username === username);
  
  if (!user) {
    // Auto-register with password strength requirement
    if (!isValidPassword(password)) {
      return res.status(400).json({ 
        message: 'Password must be at least 8 characters with uppercase, lowercase, and numbers' 
      });
    }
    const hashedPassword = bcrypt.hashSync(password, 10);
    user = {
      id: nextUserId++,
      username: username,
      password: hashedPassword,
      role: 'user'
    };
    users.push(user);
    console.log('New user registered:', username);
  } else {
    // Verify password for existing user
    const passwordIsValid = bcrypt.compareSync(password, user.password);
    if (!passwordIsValid) {
      console.warn(`Failed login attempt for user: ${username}`);
      return res.status(401).json({ message: 'Invalid username or password' });
    }
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role || 'user', state, lga },
    SECRET_KEY,
    { expiresIn: process.env.JWT_EXPIRY || 86400 }
  );

  // Upsert user profile in database
  const upsertUser = async () => {
    try {
      await dbRun(
        `INSERT OR REPLACE INTO users (username, password_hash, state, lga, created_at)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [user.username, user.password, state || null, lga || null]
      );
    } catch (err) {
      console.error('Failed to upsert user profile:', err);
    }
  };
  upsertUser();

  res.status(200).json({
    auth: true,
    token: token,
    user: { id: user.id, username: user.username, role: user.role || 'user', state, lga }
  });
});

// Record an interaction (share, reply already captured in sockets, but share uses HTTP)
app.post('/interact', verifyHttpToken, async (req, res) => {
  const { messageId, type } = req.body;
  if (!messageId || !type) {
    return res.status(400).json({ message: 'messageId and type are required' });
  }
  try {
    await dbRun(
      'INSERT INTO interactions (username, message_id, type) VALUES (?, ?, ?)',
      [req.user.username, messageId, type]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Failed to record interaction:', err);
    res.status(500).json({ message: 'Failed to record interaction' });
  }
});

// Get profile with interacted messages
app.get('/profile', verifyHttpToken, async (req, res) => {
  try {
    const profile = await dbAll(
      'SELECT username, state, lga, created_at FROM users WHERE username = ? LIMIT 1',
      [req.user.username]
    );

    const interactions = await dbAll(
      `SELECT i.id, i.type, i.created_at, m.id as message_id, m.message, m.username as author, m.state, m.lga, m.parent_id
       FROM interactions i
       JOIN messages m ON m.id = i.message_id
       WHERE i.username = ?
         AND m.parent_id IS NULL
       ORDER BY i.created_at DESC
       LIMIT 100`,
      [req.user.username]
    );

    res.json({ profile: profile[0] || null, interactions });
  } catch (err) {
    console.error('Failed to fetch profile:', err);
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
});

// Get location-based feed
app.get('/feed', verifyHttpToken, async (req, res) => {
  try {
    const state = req.user.state;
    const lga = req.user.lga;
    
    console.log('Feed request for user:', req.user.username, 'State:', state, 'LGA:', lga);
    
    // Fetch all messages from the same state and lga, ordered by creation time
    const messages = await dbAll(
      `SELECT id, username, state, lga, message, parent_id, attachment_url, attachment_type, created_at
       FROM messages
       WHERE state = ? AND lga = ?
       ORDER BY created_at ASC
       LIMIT 500`,
      [state, lga]
    );

    console.log('Feed returned', messages.length, 'messages');
    console.log('First 3 messages:', messages.slice(0, 3));
    res.json({ messages });
  } catch (err) {
    console.error('Failed to fetch feed:', err);
    res.status(500).json({ message: 'Failed to fetch feed' });
  }
});

// Search messages in user's location
app.get('/search', verifyHttpToken, async (req, res) => {
  try {
    const state = req.user.state;
    const lga = req.user.lga;
    const query = req.query.q || '';
    
    console.log('Search request for user:', req.user.username, 'Query:', query);
    
    if (!query.trim()) {
      return res.json({ messages: [] });
    }
    
    // Search only main messages (parent_id IS NULL) in user's location
    const messages = await dbAll(
      `SELECT id, username, state, lga, message, parent_id, attachment_url, attachment_type, created_at
       FROM messages
       WHERE state = ? AND lga = ? AND parent_id IS NULL AND message LIKE ?
       ORDER BY created_at DESC
       LIMIT 100`,
      [state, lga, `%${query}%`]
    );

    console.log('Search returned', messages.length, 'messages');
    res.json({ messages });
  } catch (err) {
    console.error('Failed to search messages:', err);
    res.status(500).json({ message: 'Failed to search messages' });
  }
});

// Report false rejection
app.post('/report-rejection', verifyHttpToken, async (req, res) => {
  try {
    const { message, reason } = req.body;
    if (!message) {
      return res.status(400).json({ message: 'Message text required' });
    }
    await dbRun(
      'INSERT INTO flagged_messages (username, message, rejection_reason, state, lga, status) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.username, message, reason || 'User reported false rejection', req.user.state, req.user.lga, 'pending']
    );
    res.json({ ok: true, message: 'Your report has been submitted for review' });
  } catch (err) {
    console.error('Failed to report rejection:', err);
    res.status(500).json({ message: 'Failed to submit report' });
  }
});

// Admin: Get flagged messages for review (admin only)
app.get('/admin/flagged', verifyHttpToken, async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  try {
    // In production, add admin role check here
    const flagged = await dbAll(
      `SELECT id, username, message, rejection_reason, state, lga, status, created_at 
       FROM flagged_messages 
       WHERE status = 'pending' 
       ORDER BY created_at DESC 
       LIMIT 100`
    );
    res.json({ flagged });
  } catch (err) {
    console.error('Failed to fetch flagged messages:', err);
    res.status(500).json({ message: 'Failed to fetch flagged messages' });
  }
});

// Admin: Approve flagged message
app.post('/admin/approve/:id', verifyHttpToken, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const flagged = await dbAll('SELECT * FROM flagged_messages WHERE id = ?', [id]);
    if (!flagged || flagged.length === 0) {
      return res.status(404).json({ message: 'Flagged message not found' });
    }
    const msg = flagged[0];
    // Post the message
    const result = await dbRun(
      'INSERT INTO messages (username, state, lga, message, parent_id) VALUES (?, ?, ?, ?, ?)',
      [msg.username, msg.state, msg.lga, msg.message, null]
    );
    // Mark as approved
    await dbRun(
      'UPDATE flagged_messages SET status = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['approved', req.user.username, id]
    );
    // Broadcast to room
    const room = `${msg.state}_${msg.lga}`;
    io.to(room).emit('chat message', {
      id: result.lastID,
      username: msg.username,
      message: msg.message,
      attachmentUrl: null,
      attachmentType: null,
      parentId: null,
      timestamp: new Date().toISOString()
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('Failed to approve message:', err);
    res.status(500).json({ message: 'Failed to approve message' });
  }
});

// Admin: Reject flagged message
app.post('/admin/reject/:id', verifyHttpToken, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await dbRun(
      'UPDATE flagged_messages SET status = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['rejected', req.user.username, id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Failed to reject message:', err);
    res.status(500).json({ message: 'Failed to reject message' });
  }
});

// Admin: View all database tables
app.get('/admin/db/messages', verifyHttpToken, async (req, res) => {
  try {
    const data = await dbAll('SELECT * FROM messages ORDER BY created_at DESC LIMIT 500');
    res.json({ data });
  } catch (err) {
    console.error('Failed to fetch messages:', err);
    res.status(500).json({ message: 'Failed to fetch data' });
  }
});

app.get('/admin/db/users', verifyHttpToken, async (req, res) => {
  try {
    const data = await dbAll('SELECT username, state, lga, created_at FROM users ORDER BY created_at DESC');
    res.json({ data });
  } catch (err) {
    console.error('Failed to fetch users:', err);
    res.status(500).json({ message: 'Failed to fetch data' });
  }
});

app.get('/admin/db/interactions', verifyHttpToken, async (req, res) => {
  try {
    const data = await dbAll('SELECT * FROM interactions ORDER BY created_at DESC LIMIT 500');
    res.json({ data });
  } catch (err) {
    console.error('Failed to fetch interactions:', err);
    res.status(500).json({ message: 'Failed to fetch data' });
  }
});

// Admin: Run custom SQL query (read-only)
app.post('/admin/query', verifyHttpToken, async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ message: 'Query is required' });
    }

    // Security: Only allow SELECT queries
    const trimmedQuery = query.trim().toLowerCase();
    if (!trimmedQuery.startsWith('select')) {
      return res.status(403).json({ message: 'Only SELECT queries are allowed' });
    }

    // Additional security: Block dangerous keywords
    const forbidden = ['drop', 'delete', 'insert', 'update', 'alter', 'create', 'truncate'];
    if (forbidden.some(word => trimmedQuery.includes(word))) {
      return res.status(403).json({ message: 'Query contains forbidden keywords' });
    }

    const results = await dbAll(query);
    res.json({ results, count: results.length });
  } catch (err) {
    console.error('Query execution failed:', err);
    res.status(500).json({ message: err.message || 'Query failed' });
  }
});

// Upload attachment (documents/images/videos)
app.post('/upload', verifyHttpToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const url = `/uploads/${req.file.filename}`;
    const type = req.file.mimetype;
    res.json({ url, type, name: req.file.originalname });
  } catch (err) {
    console.error('Failed to upload file:', err);
    res.status(500).json({ message: 'Upload failed' });
  }
});

// Socket.io authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }
  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) {
      return next(new Error('Authentication error'));
    }
    socket.user = decoded;
    next();
  });
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log('User connected:', socket.user.username);

  // Join location-based room (state_lga)
  const locationRoom = `${socket.user.state}_${socket.user.lga}`;
  socket.join(locationRoom);
  console.log('User joined room:', locationRoom);

  // Listen for chat messages
  socket.on('chat message', async (data) => {
    const message = typeof data === 'string' ? data : data.message;
    const attachmentUrl = data && data.attachmentUrl ? data.attachmentUrl : null;
    const attachmentType = data && data.attachmentType ? data.attachmentType : null;
    const parentId = (data && data.parentId) ? Number(data.parentId) : null;
    const username = socket.user.username;
    const state = socket.user.state || null;
    const lga = socket.user.lga || null;
    const now = new Date();

    // Validate main messages (not replies) for action statements
    if (!parentId) {
      const validation = isActionStatement(message);
      if (!validation.valid) {
        console.log('Message rejected for', username, ':', validation.reason);
        socket.emit('message rejected', { 
          reason: validation.reason,
          message: message 
        });
        return;
      }
      // Flag uncertain messages for admin review
      if (validation.uncertain) {
        try {
          await dbRun(
            'INSERT INTO flagged_messages (username, message, rejection_reason, state, lga, status) VALUES (?, ?, ?, ?, ?, ?)',
            [username, message, 'Low confidence - needs review', state, lga, 'pending']
          );
          console.log('Flagged uncertain message from', username);
        } catch (err) {
          console.error('Failed to flag message:', err);
        }
      }
    }

    // Persist to database first
    try {
      console.log('Saving message from:', username, 'State:', state, 'LGA:', lga);
      const result = await dbRun(
        'INSERT INTO messages (username, state, lga, message, parent_id, attachment_url, attachment_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [username, state, lga, message, parentId, attachmentUrl, attachmentType]
      );
      const messageId = result.lastID;
      console.log('Message saved with ID:', messageId);
      
      // Record interaction for replies
      if (parentId) {
        try {
          await dbRun(
            'INSERT INTO interactions (username, message_id, type) VALUES (?, ?, ?)',
            [username, parentId, 'reply']
          );
        } catch (err) {
          console.error('Failed to log reply interaction:', err);
        }
      }
      
      // Emit message with real DB id to location-based room
      io.to(locationRoom).emit('chat message', {
        id: messageId,
        username,
        message,
        attachmentUrl,
        attachmentType,
        parentId,
        timestamp: now.toISOString()
      });
    } catch (err) {
      console.error('Failed to persist message:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.user.username);
  });
});

// Delete a message (soft delete)
app.delete('/messages/:id', verifyHttpToken, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id || Number.isNaN(id)) {
      return res.status(400).json({ message: 'Invalid message id' });
    }
    const rows = await dbAll('SELECT id, username, state, lga, parent_id, attachment_url FROM messages WHERE id = ?', [id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: 'Message not found' });
    }
    const msg = rows[0];
    if (msg.username !== req.user.username) {
      return res.status(403).json({ message: 'Not authorized to delete this message' });
    }
    // Hard delete - remove completely from database
    await dbRun('DELETE FROM messages WHERE id = ?', [id]);
    // Also delete any replies to this message
    await dbRun('DELETE FROM messages WHERE parent_id = ?', [id]);
    if (msg.attachment_url) {
      try {
        const uploadPath = path.join(__dirname, msg.attachment_url.replace('/uploads/', 'uploads/'));
        if (fs.existsSync(uploadPath)) {
          fs.unlinkSync(uploadPath);
        }
      } catch (e) {
        console.warn('Failed to remove attachment file:', e.message);
      }
    }
    const room = `${msg.state}_${msg.lga}`;
    io.to(room).emit('message deleted', { id });
    res.json({ ok: true });
  } catch (err) {
    console.error('Failed to delete message:', err);
    res.status(500).json({ message: 'Failed to delete message' });
  }
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});