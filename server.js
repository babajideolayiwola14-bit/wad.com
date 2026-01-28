const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
require('dotenv').config();

// Database modules
const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');

// Security modules
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('mongo-sanitize');
const xss = require('xss-clean');

// Global error handlers to prevent crashes
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! Shutting down gracefully...', err.message, err.stack);
  // Don't exit immediately, let existing connections finish
  setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! Details:', err);
  // Log but don't crash - this is often recoverable
});

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

// Database setup - use PostgreSQL on Heroku, SQLite locally
const USE_POSTGRES = !!process.env.DATABASE_URL;
let db, pool;

if (USE_POSTGRES) {
  // PostgreSQL for production (Heroku)
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  console.log('Using PostgreSQL database');
  ensureSchema();
} else {
  // SQLite for local development
  db = new sqlite3.Database('./chatapp.db', (err) => {
    if (err) {
      console.error('Failed to open database:', err);
    } else {
      console.log('Using SQLite database');
      ensureSchema();
    }
  });
}

// Helper to promisify db.run and db.all - works for both databases
async function dbRun(sql, params = []) {
  if (USE_POSTGRES) {
    // Convert ? to $1, $2, etc for PostgreSQL
    let pgSql = sql;
    let count = 0;
    pgSql = pgSql.replace(/\?/g, () => `$${++count}`);
    const client = await pool.connect();
    try {
      const result = await client.query(pgSql, params);
      return { lastID: result.rows[0]?.id, changes: result.rowCount, rows: result.rows };
    } finally {
      client.release();
    }
  } else {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }
}

async function dbAll(sql, params = []) {
  if (USE_POSTGRES) {
    // Convert ? to $1, $2, etc for PostgreSQL
    let pgSql = sql;
    let count = 0;
    pgSql = pgSql.replace(/\?/g, () => `$${++count}`);
    const client = await pool.connect();
    try {
      const result = await client.query(pgSql, params);
      return result.rows || [];
    } finally {
      client.release();
    }
  } else {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }
}

async function ensureSchema() {
  const isPostgres = USE_POSTGRES;
  
  const createMessagesTable = isPostgres ? `
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL,
      state TEXT,
      lga TEXT,
      message TEXT NOT NULL,
      parent_id INTEGER,
      attachment_url TEXT,
      attachment_type TEXT,
      deleted_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  ` : `
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
  
  const createUsersTable = isPostgres ? `
    CREATE TABLE IF NOT EXISTS users (
      username TEXT PRIMARY KEY,
      password_hash TEXT,
      state TEXT,
      lga TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  ` : `
    CREATE TABLE IF NOT EXISTS users (
      username TEXT PRIMARY KEY,
      password_hash TEXT,
      state TEXT,
      lga TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;
  
  const createInteractionsTable = isPostgres ? `
    CREATE TABLE IF NOT EXISTS interactions (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
      message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  ` : `
    CREATE TABLE IF NOT EXISTS interactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
      message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;
  
  const createFlaggedMessagesTable = isPostgres ? `
    CREATE TABLE IF NOT EXISTS flagged_messages (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL,
      message TEXT NOT NULL,
      rejection_reason TEXT,
      state TEXT,
      lga TEXT,
      status TEXT DEFAULT 'pending',
      reviewed_by TEXT,
      reviewed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  ` : `
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
  if (!auth) {
    console.log('No authorization header in request to:', req.path);
    return res.status(401).json({ message: 'No token provided' });
  }
  const token = auth.replace('Bearer ', '');
  console.log('Verifying HTTP token for:', req.path, '- first 20 chars:', token.substring(0, 20));
  console.log('Token length:', token.length);
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    console.log('Token verified successfully for user:', decoded.username, 'exp:', new Date(decoded.exp * 1000).toISOString());
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Token verification failed for:', req.path);
    console.error('Error type:', err.name);
    console.error('Error message:', err.message);
    if (err.name === 'TokenExpiredError') {
      console.error('Token expired at:', new Date(err.expiredAt).toISOString());
      return res.status(401).json({ message: 'Token expired', expired: true });
    }
    return res.status(401).json({ message: 'Invalid token', error: err.name });
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
  max: 30, // 30 requests per window
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

// Trust Heroku proxy for proper IP detection
app.set('trust proxy', 1);

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

// Registration endpoint
app.post('/register', authLimiter, async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  if (!isValidUsername(username)) {
    return res.status(400).json({ message: 'Invalid username format (3-30 alphanumeric characters)' });
  }

  if (!isValidPassword(password)) {
    return res.status(400).json({ 
      message: 'Password must be at least 8 characters with uppercase, lowercase, and numbers' 
    });
  }

  try {
    // Check if user already exists
    const existing = await dbAll(
      'SELECT username FROM users WHERE username = ? LIMIT 1',
      [username]
    );

    if (existing && existing.length > 0) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Hash password and create user
    const hashedPassword = bcrypt.hashSync(password, 10);
    
    await dbRun(
      USE_POSTGRES
        ? 'INSERT INTO users (username, password_hash, created_at) VALUES ($1, $2, CURRENT_TIMESTAMP)'
        : 'INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
      [username, hashedPassword]
    );

    // Add to in-memory store
    users.push({
      id: nextUserId++,
      username: username,
      password: hashedPassword,
      role: 'user'
    });

    console.log('New user registered:', username);
    res.status(200).json({ message: 'Registration successful' });
  } catch (err) {
    console.error('Registration failed:', err);
    res.status(500).json({ message: 'Registration failed' });
  }
});

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
      { expiresIn: process.env.JWT_EXPIRY || '30d' }
    );
    return res.status(200).json({
      auth: true,
      token: token,
      user: { username, role: 'admin', state: 'Admin', lga: 'Admin' }
    });
  }

  // Regular user registration/login
  if (!state || !lga) {
    return res.status(400).json({ message: 'State and LGA are required to login' });
  }

  // Normalize location input to reduce casing/spacing mismatches
  const normalizedState = String(state).trim();
  const normalizedLga = String(lga).trim();

  let user = users.find(u => u.username === username);
  let finalState = normalizedState;
  let finalLga = normalizedLga;
  
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

    // Check if user is banned
    const dbUser = await dbAll('SELECT banned FROM users WHERE username = ? LIMIT 1', [username]);
    if (dbUser.length > 0 && dbUser[0].banned === 1) {
      return res.status(403).json({ message: 'Your account has been banned. Contact admin.' });
    }
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role || 'user', state: finalState, lga: finalLga },
    SECRET_KEY,
    { expiresIn: process.env.JWT_EXPIRY || '30d' }
  );

  // Upsert user profile in database with current location
  const upsertUser = async () => {
    try {
      if (USE_POSTGRES) {
        await dbRun(
          `INSERT INTO users (username, password_hash, state, lga, created_at)
           VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
           ON CONFLICT (username) 
           DO UPDATE SET state = $3, lga = $4`,
          [user.username, user.password, finalState || null, finalLga || null]
        );
      } else {
        await dbRun(
          `INSERT OR REPLACE INTO users (username, password_hash, state, lga, created_at)
           VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [user.username, user.password, finalState || null, finalLga || null]
        );
      }
    } catch (err) {
      console.error('Failed to upsert user profile:', err);
    }
  };
  upsertUser();

  res.status(200).json({
    auth: true,
    token: token,
    user: { id: user.id, username: user.username, role: user.role || 'user', state: finalState, lga: finalLga }
  });
});

// Record an interaction (share, reply already captured in sockets, but share uses HTTP)
app.post('/interact', verifyHttpToken, async (req, res) => {
  const { messageId, type } = req.body;
  if (!messageId || !type) {
    return res.status(400).json({ message: 'messageId and type are required' });
  }
  try {
    // Get the message's location
    const messageLocation = await dbAll(
      'SELECT state, lga FROM messages WHERE id = ? LIMIT 1',
      [messageId]
    );
    
    if (messageLocation && messageLocation.length > 0) {
      const { state, lga } = messageLocation[0];
      
      // Update user's location to the message's location
      await dbRun(
        'UPDATE users SET state = ?, lga = ? WHERE username = ?',
        [state, lga, req.user.username]
      );
      
      // Update the in-memory user object
      req.user.state = state;
      req.user.lga = lga;
      
      console.log('User', req.user.username, 'location updated to', state, lga, 'via interaction');
    }
    
    // Record the interaction
    await dbRun(
      'INSERT INTO interactions (username, message_id, type) VALUES (?, ?, ?)',
      [req.user.username, messageId, type]
    );
    res.json({ ok: true, newLocation: messageLocation[0] || null });
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

// Update user location
app.post('/update-location', verifyHttpToken, async (req, res) => {
  const { state, lga } = req.body;
  
  if (!state || !lga) {
    return res.status(400).json({ message: 'State and LGA are required' });
  }
  
  try {
    await dbRun(
      'UPDATE users SET state = ?, lga = ? WHERE username = ?',
      [state.trim(), lga.trim(), req.user.username]
    );
    console.log(`Updated location for ${req.user.username} to ${state}/${lga}`);
    res.json({ ok: true });
  } catch (err) {
    console.error('Failed to update location:', err);
    res.status(500).json({ message: 'Failed to update location' });
  }
});

// Get location-based feed
// Get location-based feed
app.get('/feed', verifyHttpToken, async (req, res) => {
  try {
    // Get user's current location from database (not from token)
    const userLocation = await dbAll(
      'SELECT state, lga FROM users WHERE username = ? LIMIT 1',
      [req.user.username]
    );
    
    const state = userLocation && userLocation[0] ? (userLocation[0].state || '').trim() : '';
    const lga = userLocation && userLocation[0] ? (userLocation[0].lga || '').trim() : '';
    
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
    const state = (req.user.state || '').trim();
    const lga = (req.user.lga || '').trim();
    const query = req.query.q || '';
    
    console.log('Search request for user:', req.user.username, 'Query:', query);
    
    if (!query.trim()) {
      return res.json({ messages: [] });
    }
    
    // Search only main messages (parent_id IS NULL) in user's location
    // Use LOWER() for case-insensitive search
    const messages = await dbAll(
      `SELECT id, username, state, lga, message, parent_id, attachment_url, attachment_type, created_at
       FROM messages
       WHERE state = ? AND lga = ? AND parent_id IS NULL AND LOWER(message) LIKE LOWER(?)
       ORDER BY created_at DESC
       LIMIT 100`,
      [state, lga, `%${query}%`]
    );

    console.log('Search returned', messages.length, 'messages for query:', query);
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
      USE_POSTGRES 
        ? 'INSERT INTO messages (username, state, lga, message, parent_id) VALUES (?, ?, ?, ?, ?) RETURNING id'
        : 'INSERT INTO messages (username, state, lga, message, parent_id) VALUES (?, ?, ?, ?, ?)',
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
      id: USE_POSTGRES ? result.rows[0].id : result.lastID,
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

// Admin: Remove duplicate interactions
app.post('/admin/remove-duplicate-interactions', verifyHttpToken, async (req, res) => {
  try {
    // First, get all duplicates
    const duplicates = await dbAll(`
      SELECT username, message_id, type, COUNT(*) as count
      FROM interactions
      GROUP BY username, message_id, type
      HAVING COUNT(*) > 1
    `);
    
    if (duplicates.length === 0) {
      return res.json({ message: 'No duplicates found', removed: 0 });
    }
    
    // For each duplicate group, keep only the first one (lowest id)
    let totalRemoved = 0;
    for (const dup of duplicates) {
      const deleteQuery = USE_POSTGRES
        ? `DELETE FROM interactions 
           WHERE username = $1 AND message_id = $2 AND type = $3 
           AND id NOT IN (
             SELECT MIN(id) FROM interactions 
             WHERE username = $1 AND message_id = $2 AND type = $3
           )`
        : `DELETE FROM interactions 
           WHERE username = ? AND message_id = ? AND type = ? 
           AND id NOT IN (
             SELECT MIN(id) FROM interactions 
             WHERE username = ? AND message_id = ? AND type = ?
           )`;
      
      const params = USE_POSTGRES 
        ? [dup.username, dup.message_id, dup.type]
        : [dup.username, dup.message_id, dup.type, dup.username, dup.message_id, dup.type];
      
      await dbRun(deleteQuery, params);
      totalRemoved += (dup.count - 1); // Remove all but one
    }
    
    res.json({ 
      message: 'Duplicates removed successfully', 
      duplicateGroups: duplicates.length,
      removed: totalRemoved 
    });
  } catch (err) {
    console.error('Failed to remove duplicates:', err);
    res.status(500).json({ message: 'Failed to remove duplicates', error: err.message });
  }
});

// Admin: Remove duplicate messages
app.post('/admin/remove-duplicate-messages', verifyHttpToken, async (req, res) => {
  try {
    // Find duplicate messages (same username, message text, state, lga)
    const duplicates = USE_POSTGRES
      ? await dbAll(`
          SELECT username, message, state, lga, 
                 MIN(id) as keep_id,
                 COUNT(*) as count
          FROM messages
          GROUP BY username, message, state, lga
          HAVING COUNT(*) > 1
        `)
      : await dbAll(`
          SELECT username, message, state, lga, 
                 MIN(id) as keep_id,
                 GROUP_CONCAT(id) as all_ids,
                 COUNT(*) as count
          FROM messages
          GROUP BY username, message, state, lga
          HAVING COUNT(*) > 1
        `);
    
    if (duplicates.length === 0) {
      return res.json({ message: 'No duplicate messages found', removed: 0 });
    }
    
    let totalRemoved = 0;
    for (const dup of duplicates) {
      // Delete all duplicates except the first one (lowest id)
      const deleteQuery = USE_POSTGRES
        ? `DELETE FROM messages WHERE username = $1 AND message = $2 AND state = $3 AND lga = $4 AND id != $5`
        : `DELETE FROM messages WHERE username = ? AND message = ? AND state = ? AND lga = ? AND id != ?`;
      
      const params = [dup.username, dup.message, dup.state, dup.lga, dup.keep_id];
      await dbRun(deleteQuery, params);
      totalRemoved += (dup.count - 1);
      console.log(`Removed ${dup.count - 1} duplicates for user ${dup.username}, keeping id ${dup.keep_id}`);
    }
    
    res.json({ 
      message: 'Duplicate messages removed successfully', 
      duplicateGroups: duplicates.length,
      removed: totalRemoved 
    });
  } catch (err) {
    console.error('Failed to remove duplicate messages:', err);
    res.status(500).json({ message: 'Failed to remove duplicate messages', error: err.message });
  }
});

// Admin: Auto-track all existing user messages as 'sent' interactions
app.post('/admin/auto-track-sent-messages', verifyHttpToken, async (req, res) => {
  try {
    // Get all main messages (not replies) from all users
    const messages = await dbAll(`
      SELECT id, username 
      FROM messages 
      WHERE parent_id IS NULL
    `);
    
    let added = 0;
    let skipped = 0;
    
    for (const msg of messages) {
      // Check if interaction already exists
      const existing = await dbAll(
        `SELECT id FROM interactions WHERE username = ? AND message_id = ? AND type = 'sent'`,
        [msg.username, msg.id]
      );
      
      if (existing.length === 0) {
        // Add the interaction
        await dbRun(
          `INSERT INTO interactions (username, message_id, type) VALUES (?, ?, 'sent')`,
          [msg.username, msg.id]
        );
        added++;
      } else {
        skipped++;
      }
    }
    
    res.json({ 
      message: 'Auto-tracking completed', 
      totalMessages: messages.length,
      added,
      skipped
    });
  } catch (err) {
    console.error('Failed to auto-track messages:', err);
    res.status(500).json({ message: 'Failed to auto-track messages', error: err.message });
  }
});

// Temporary: Trim all location data in database
app.post('/admin/normalize-locations', async (req, res) => {
  try {
    // Trim all state/lga in messages table
    const messages = await dbAll('SELECT id, state, lga FROM messages');
    let messagesUpdated = 0;
    for (const msg of messages) {
      const trimmedState = (msg.state || '').trim();
      const trimmedLga = (msg.lga || '').trim();
      if (trimmedState !== msg.state || trimmedLga !== msg.lga) {
        await dbRun(
          USE_POSTGRES 
            ? 'UPDATE messages SET state = $1, lga = $2 WHERE id = $3'
            : 'UPDATE messages SET state = ?, lga = ? WHERE id = ?',
          USE_POSTGRES ? [trimmedState, trimmedLga, msg.id] : [trimmedState, trimmedLga, msg.id]
        );
        messagesUpdated++;
      }
    }
    
    // Trim all state/lga in users table
    const users = await dbAll('SELECT username, state, lga FROM users');
    let usersUpdated = 0;
    for (const user of users) {
      const trimmedState = (user.state || '').trim();
      const trimmedLga = (user.lga || '').trim();
      if (trimmedState !== user.state || trimmedLga !== user.lga) {
        await dbRun(
          USE_POSTGRES 
            ? 'UPDATE users SET state = $1, lga = $2 WHERE username = $3'
            : 'UPDATE users SET state = ?, lga = ? WHERE username = ?',
          USE_POSTGRES ? [trimmedState, trimmedLga, user.username] : [trimmedState, trimmedLga, user.username]
        );
        usersUpdated++;
      }
    }
    
    res.json({ 
      message: 'Locations normalized successfully', 
      messagesUpdated,
      usersUpdated
    });
  } catch (err) {
    console.error('Failed to normalize locations:', err);
    res.status(500).json({ message: 'Failed to normalize locations', error: err.message });
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

// Quick check endpoint for specific user messages
app.get('/admin/check-user/:username', verifyHttpToken, async (req, res) => {
  try {
    const messages = await dbAll(
      `SELECT id, username, state, lga, message, created_at 
       FROM messages 
       WHERE username = ? 
       ORDER BY created_at DESC 
       LIMIT 10`,
      [req.params.username]
    );
    res.json({ messages, count: messages.length });
  } catch (err) {
    console.error('Failed to check user messages:', err);
    res.status(500).json({ message: 'Failed to check messages' });
  }
});

// Admin: Ban user
app.post('/admin/ban-user', verifyHttpToken, async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) {
      return res.status(400).json({ message: 'Username is required' });
    }

    // Add banned column if it doesn't exist (migration)
    try {
      await dbRun('ALTER TABLE users ADD COLUMN banned INTEGER DEFAULT 0');
    } catch (err) {
      // Column might already exist
    }

    await dbRun('UPDATE users SET banned = 1 WHERE username = ?', [username]);
    res.json({ message: `User ${username} has been banned` });
  } catch (err) {
    console.error('Failed to ban user:', err);
    res.status(500).json({ message: 'Failed to ban user', error: err.message });
  }
});

// Admin: Unban user
app.post('/admin/unban-user', verifyHttpToken, async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) {
      return res.status(400).json({ message: 'Username is required' });
    }

    await dbRun('UPDATE users SET banned = 0 WHERE username = ?', [username]);
    res.json({ message: `User ${username} has been unbanned` });
  } catch (err) {
    console.error('Failed to unban user:', err);
    res.status(500).json({ message: 'Failed to unban user', error: err.message });
  }
});

// Admin: Delete user and all their data
app.delete('/admin/delete-user/:username', verifyHttpToken, async (req, res) => {
  try {
    const { username } = req.params;

    // Delete interactions (CASCADE should handle this, but manual for safety)
    await dbRun('DELETE FROM interactions WHERE username = ?', [username]);
    
    // Delete messages
    await dbRun('DELETE FROM messages WHERE username = ?', [username]);
    
    // Delete user
    await dbRun('DELETE FROM users WHERE username = ?', [username]);
    
    res.json({ message: `User ${username} and all their data has been deleted` });
  } catch (err) {
    console.error('Failed to delete user:', err);
    res.status(500).json({ message: 'Failed to delete user', error: err.message });
  }
});

// Admin: Bulk delete messages
app.post('/admin/bulk-delete-messages', verifyHttpToken, async (req, res) => {
  try {
    const { messageIds } = req.body;
    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ message: 'Message IDs array is required' });
    }

    const placeholders = messageIds.map(() => '?').join(',');
    await dbRun(`DELETE FROM messages WHERE id IN (${placeholders})`, messageIds);
    
    res.json({ message: `Deleted ${messageIds.length} messages`, count: messageIds.length });
  } catch (err) {
    console.error('Failed to bulk delete messages:', err);
    res.status(500).json({ message: 'Failed to bulk delete messages', error: err.message });
  }
});

// Admin: Get analytics
app.get('/admin/analytics', verifyHttpToken, async (req, res) => {
  try {
    const [users, messages, interactions] = await Promise.all([
      dbAll('SELECT COUNT(*) as count FROM users'),
      dbAll('SELECT COUNT(*) as count FROM messages'),
      dbAll('SELECT COUNT(*) as count FROM interactions')
    ]);

    const [messagesByDay, topUsers, topLocations, interactionsByType] = await Promise.all([
      dbAll(`
        SELECT DATE(created_at) as date, COUNT(*) as count 
        FROM messages 
        GROUP BY DATE(created_at) 
        ORDER BY DATE(created_at) DESC 
        LIMIT 30
      `),
      dbAll(`
        SELECT username, COUNT(*) as message_count 
        FROM messages 
        GROUP BY username 
        ORDER BY message_count DESC 
        LIMIT 10
      `),
      dbAll(`
        SELECT state, lga, COUNT(*) as count 
        FROM messages 
        GROUP BY state, lga 
        ORDER BY count DESC 
        LIMIT 10
      `),
      dbAll(`
        SELECT type, COUNT(*) as count 
        FROM interactions 
        GROUP BY type
      `)
    ]);

    res.json({
      totals: {
        users: users[0].count,
        messages: messages[0].count,
        interactions: interactions[0].count
      },
      messagesByDay,
      topUsers,
      topLocations,
      interactionsByType
    });
  } catch (err) {
    console.error('Failed to get analytics:', err);
    res.status(500).json({ message: 'Failed to get analytics', error: err.message });
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

// Socket.io connection with user tracking to prevent multiple connections
const userSockets = new Map(); // Track active sockets per username

io.on('connection', (socket) => {
  try {
    if (!socket.user || !socket.user.username) {
      console.error('Socket connected without valid user data');
      socket.disconnect(true);
      return;
    }
    
    const username = socket.user.username;
    console.log('User connected:', username);
    
    // Check if user already has an active connection
    if (userSockets.has(username)) {
      const existingSocket = userSockets.get(username);
      console.log('User', username, 'already has active connection. Closing old connection.');
      try {
        existingSocket.disconnect(true);
      } catch (e) {
        console.error('Error disconnecting old socket:', e.message);
      }
    }
    
    // Store new connection
    userSockets.set(username, socket);

    // Join location-based room (state_lga) - normalize by trimming
    const normalizedState = (socket.user.state || '').trim();
    const normalizedLga = (socket.user.lga || '').trim();
    const locationRoom = `${normalizedState}_${normalizedLga}`;
    socket.join(locationRoom);
    console.log('User joined room:', locationRoom);

  // Listen for chat messages
  socket.on('chat message', async (data) => {
    try {
      if (!socket.user || !socket.user.username) {
        console.error('Chat message from socket without user data');
        return;
      }
      
      const message = typeof data === 'string' ? data : data.message;
      const attachmentUrl = data && data.attachmentUrl ? data.attachmentUrl : null;
      const attachmentType = data && data.attachmentType ? data.attachmentType : null;
      const parentId = (data && data.parentId) ? Number(data.parentId) : null;
      const username = socket.user.username;
      const state = (socket.user.state || '').trim();
      const lga = (socket.user.lga || '').trim();
      const messageRoom = state && lga ? `${state}_${lga}` : null;
      const now = new Date();

    // Validate main messages (not replies) for action statements
    if (!parentId) {
      const validation = isActionStatement(message);
      if (!validation.valid) {
        console.log('Message rejected for', username, 'in', state, lga, ':', validation.reason);
        console.log('Rejected message text:', message);
        
        // Store rejected message for admin review and analytics
        try {
          await dbRun(
            'INSERT INTO flagged_messages (username, message, rejection_reason, state, lga, status) VALUES (?, ?, ?, ?, ?, ?)',
            [username, message, validation.reason, state, lga, 'rejected']
          );
          console.log('Stored rejected message from', username, 'in flagged_messages');
        } catch (err) {
          console.error('Failed to store rejected message:', err);
        }
        
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
      console.log('Saving message from:', username, 'State:', state, 'LGA:', lga, parentId ? `(Reply to: ${parentId})` : '(Main message)');
      const result = await dbRun(
        USE_POSTGRES
          ? 'INSERT INTO messages (username, state, lga, message, parent_id, attachment_url, attachment_type) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id'
          : 'INSERT INTO messages (username, state, lga, message, parent_id, attachment_url, attachment_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [username, state, lga, message, parentId, attachmentUrl, attachmentType]
      );
      const messageId = USE_POSTGRES ? result.rows[0].id : result.lastID;
      console.log('Message saved with ID:', messageId, parentId ? '(Reply)' : '(Main)');
      console.log('Broadcasting to room:', messageRoom, 'Users in room:', io.sockets.adapter.rooms.get(messageRoom)?.size || 0);
      
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
      io.to(messageRoom).emit('chat message', {
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
    } catch (err) {
      console.error('Error in chat message handler:', err.message, err.stack);
    }
  });

  socket.on('disconnect', () => {
    try {
      if (!socket.user || !socket.user.username) {
        console.error('Socket disconnected without valid user data');
        return;
      }
      
      const username = socket.user.username;
      console.log('User disconnected:', username);
      
      // Only remove from map if this is the current socket for this user
      if (userSockets.get(username) === socket) {
        userSockets.delete(username);
        console.log('Removed socket for', username);
      }
    } catch (err) {
      console.error('Error in disconnect handler:', err.message);
    }
  });
} catch (err) {
  console.error('Error in socket connection handler:', err.message, err.stack);
  try {
    socket.disconnect(true);
  } catch (e) {
    console.error('Error disconnecting socket:', e.message);
  }
}
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