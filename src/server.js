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
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const { PUBLIC_DIR, UPLOADS_DIR } = require('./paths');
const { dbRun, dbAll, initDb } = require('./db');

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

initDb().catch((err) => {
  console.error('Database initialization failed:', err);
  process.exit(1);
});

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
const MIN_PASSWORD_LENGTH = 4;

function isValidUsername(username) {
  // 3-30 alphanumeric characters and underscores only
  return /^[a-zA-Z0-9_]{3,30}$/.test(username);
}

function isValidPassword(password) {
  return typeof password === 'string' && password.length >= MIN_PASSWORD_LENGTH;
}

function passwordRequirementMessage() {
  return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
}

function verifyPassword(plainPassword, storedHash) {
  if (!storedHash) return false;
  if (/^\$2[aby]\$/.test(storedHash)) {
    return bcrypt.compareSync(plainPassword, storedHash);
  }
  // Legacy rows that stored plain text before bcrypt migration
  return plainPassword === storedHash;
}

async function upgradePasswordHash(username, plainPassword) {
  const hashedPassword = bcrypt.hashSync(plainPassword, 10);
  await dbRun('UPDATE users SET password_hash = ? WHERE username = ?', [hashedPassword, username]);
}

function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  // Remove dangerous characters
  return input.replace(/[<>\"']/g, '').trim();
}

function isAdmin(req) {
  return req.user && req.user.role === 'admin';
}

function requireAdmin(req, res, next) {
  if (!isAdmin(req)) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
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

// Trust reverse proxy (Render, etc.) for correct client IP
app.set('trust proxy', 1);

app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'admin', 'dashboard.html'));
});

app.get('/admin-db', (req, res) => {
  res.redirect(301, '/admin#messages');
});

app.get('/admin/review', (req, res) => {
  res.redirect(301, '/admin#review');
});

app.use(express.static(PUBLIC_DIR));

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
app.use('/uploads', express.static(UPLOADS_DIR));

// File upload setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_');
    cb(null, `${timestamp}_${safeName}`);
  }
});
const upload = multer({ storage });

// In-memory user store (legacy — users are persisted in PostgreSQL)
const users = [];
let nextUserId = 1;

// Health check endpoint - tests database connectivity
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    let tableExists = false;
    let errorMsg = null;
    
    try {
      const result = await dbAll(
        "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'users') as exists",
        []
      );
      tableExists = result[0]?.exists === true;
    } catch (tableErr) {
      errorMsg = tableErr.message;
    }
    
    res.json({
      ok: true,
      database: 'PostgreSQL',
      tablesReady: tableExists,
      error: errorMsg
    });
  } catch (err) {
    console.error('Health check failed:', err.message);
    res.status(500).json({
      ok: false,
      error: err.message
    });
  }
});

// Registration endpoint
app.post('/register', authLimiter, async (req, res) => {
  const { username, password, email, state, lga } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  if (email && !/^[\w.+\-]+@[\w\-]+\.[A-Za-z]{2,}$/.test(email)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }

  if (!isValidUsername(username)) {
    return res.status(400).json({ message: 'Invalid username format (3-30 alphanumeric characters)' });
  }

  if (!isValidPassword(password)) {
    return res.status(400).json({ message: passwordRequirementMessage() });
  }

  try {
    const trimmedUsername = String(username).trim();
    const normalizedState = state ? String(state).trim() : null;
    const normalizedLga = lga ? String(lga).trim() : null;

    // Check if user already exists (case-insensitive)
    const existing = await dbAll('SELECT username FROM users WHERE LOWER(username) = LOWER(?) LIMIT 1', [trimmedUsername]);

    if (existing && existing.length > 0) {
      return res.status(400).json({
        message: 'Username already exists. Log in, or use Forgot password to reset your password.'
      });
    }

    if (!normalizedState || !normalizedLga) {
      return res.status(400).json({ message: 'State and LGA are required' });
    }

    // Hash password and create user
    const hashedPassword = bcrypt.hashSync(password, 10);
    
    await dbRun(
      'INSERT INTO users (username, password_hash, email, state, lga, created_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
      [trimmedUsername, hashedPassword, email || null, normalizedState, normalizedLga]
    );

    console.log('New user registered:', trimmedUsername);
    res.status(200).json({ message: 'Registration successful' });
  } catch (err) {
    console.error('Registration failed:', err.message || err);
    console.error('Stack:', err.stack);
    res.status(500).json({ message: 'Registration failed', error: err.message });
  }
});

// allow existing users to add/update email address
app.post('/update-email', verifyHttpToken, async (req, res) => {
  const { email } = req.body;
  if (!email || !/^[\w.+\-]+@[\w\-]+\.[A-Za-z]{2,}$/.test(email)) {
    return res.status(400).json({ message: 'Valid email required' });
  }
  try {
    // ensure uniqueness
    const conflict = await dbAll('SELECT username FROM users WHERE email = ? AND username != ?', [email, req.user.username]);
    if (conflict && conflict.length > 0) {
      return res.status(400).json({ message: 'Email already in use' });
    }
    await dbRun('UPDATE users SET email = ? WHERE username = ?', [email, req.user.username]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Failed to update email:', err);
    res.status(500).json({ message: 'Could not update email' });
  }
});

// Login endpoint — existing users only (register separately)
app.post('/login', authLimiter, async (req, res) => {
  console.log('=== LOGIN REQUEST RECEIVED ===');
  console.log('Request body:', JSON.stringify(req.body));
  
  const { username, password, state, lga } = req.body;

  // Validate inputs
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  if (!isValidUsername(username)) {
    return res.status(400).json({ message: 'Invalid username format (3-30 alphanumeric characters)' });
  }

  const trimmedUsername = String(username).trim();

  // Normalize location input to reduce casing/spacing mismatches
  let normalizedState = state ? String(state).trim() : null;
  let normalizedLga = lga ? String(lga).trim() : null;

  try {
    // Check database first so regular users are not blocked by ADMIN_USERNAME env match
    const dbUsers = await dbAll(
      'SELECT username, password_hash, email, state, lga, role, banned FROM users WHERE LOWER(username) = LOWER(?) LIMIT 1',
      [trimmedUsername]
    );

    let user = dbUsers && dbUsers.length > 0 ? dbUsers[0] : null;

    if (user) {
      user.role = user.role || 'user';
      user.banned = user.banned || 0;

      const passwordIsValid = verifyPassword(password, user.password_hash);
      if (!passwordIsValid) {
        console.warn(`Failed login attempt for user: ${user.username}`);
        return res.status(401).json({ message: 'Invalid username or password' });
      }

      if (!/^\$2[aby]\$/.test(user.password_hash || '')) {
        await upgradePasswordHash(user.username, password);
      }

      if (user.banned === 1) {
        return res.status(403).json({ message: 'Your account has been banned. Contact admin.' });
      }

      if (!normalizedState && user.state) {
        normalizedState = String(user.state).trim();
      }
      if (!normalizedLga && user.lga) {
        normalizedLga = String(user.lga).trim();
      }
    } else if (trimmedUsername === process.env.ADMIN_USERNAME) {
      const adminPassword = process.env.ADMIN_PASSWORD;
      if (!adminPassword || password !== adminPassword) {
        console.warn(`Failed admin login attempt for user: ${trimmedUsername}`);
        return res.status(401).json({ message: 'Invalid username or password' });
      }

      const token = jwt.sign(
        { username: trimmedUsername, role: 'admin', state: 'Admin', lga: 'Admin' },
        SECRET_KEY,
        { expiresIn: process.env.JWT_EXPIRY || '30d' }
      );
      return res.status(200).json({
        auth: true,
        token,
        user: { username: trimmedUsername, role: 'admin', state: 'Admin', lga: 'Admin' }
      });
    } else {
      return res.status(401).json({
        message: 'Invalid username or password. Use Register if you do not have an account yet.'
      });
    }

    if (normalizedState && normalizedLga) {
      await dbRun('UPDATE users SET state = ?, lga = ? WHERE username = ?', [normalizedState, normalizedLga, user.username]);
    }

    const token = jwt.sign(
      { username: user.username, role: user.role || 'user', state: normalizedState, lga: normalizedLga },
      SECRET_KEY,
      { expiresIn: process.env.JWT_EXPIRY || '30d' }
    );

    let email = null;
    try {
      const emailRec = await dbAll('SELECT email FROM users WHERE username = ? LIMIT 1', [user.username]);
      if (emailRec && emailRec[0]) email = emailRec[0].email || null;
    } catch (e) {
      console.error('Error fetching email for login response', e);
    }

    res.status(200).json({
      auth: true,
      token,
      user: { username: user.username, role: user.role || 'user', state: normalizedState, lga: normalizedLga, email }
    });
  } catch (err) {
    console.error('=== LOGIN ERROR ===');
    console.error('Message:', err.message);
    console.error('Stack:', err.stack);
    console.error('Full error:', err);
    res.status(500).json({ 
      message: 'Login failed', 
      error: err.message,
      details: process.env.NODE_ENV === 'production' ? 'See server logs' : err.stack
    });
  }
});

// Request password reset (requires username) - sends email if configured
app.post('/auth/request-reset', async (req, res) => {
  // allow supplying an email for users who don't have one yet
  const { username, email: suppliedEmail } = req.body || {};
  if (!username) return res.status(400).json({ message: 'Username required' });
  try {
    const trimmedUsername = String(username).trim();
    const rows = await dbAll('SELECT username, email FROM users WHERE LOWER(username) = LOWER(?) LIMIT 1', [trimmedUsername]);
    if (!rows || rows.length === 0) {
      // Do not reveal whether username exists
      return res.json({ message: 'If that account exists an email will be sent' });
    }
    const user = rows[0];

    // if no email on record, see if caller provided one
    if (!user.email) {
      if (suppliedEmail) {
        // update the user row before proceeding
        await dbRun('UPDATE users SET email = ? WHERE username = ?', [suppliedEmail, user.username]);
        user.email = suppliedEmail;
      } else {
        // tell the client to supply an email or log in and add one
        return res.status(400).json({ message: 'No email on file. Please provide one or login to add it.', requireEmail: true });
      }
    }

    // Generate reset token and store in database
    const token = require('crypto').randomBytes(32).toString('hex');
    const expiresIn = new Date(Date.now() + 3600000); // 1 hour from now
    
    await dbRun('UPDATE users SET reset_token = ?, reset_expires = ? WHERE username = ?', [token, expiresIn, user.username]);

    const smtpConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);

    // Send email if SMTP configured
    if (smtpConfigured) {
      const appUrl = (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
      const resetLink = `${appUrl}/reset.html?token=${token}`;
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });
        await transporter.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: user.email,
          subject: 'Password reset for your account',
          text: `You requested a password reset. Visit: ${resetLink}\nThis link expires in 1 hour. If you did not request this, ignore.`,
          html: `<p>You requested a password reset. Click <a href="${resetLink}">here</a> to reset your password. This link expires in 1 hour.</p>`
        });
        return res.json({ message: 'If that account exists an email will be sent' });
      } catch (err) {
        console.error('Failed to send reset email:', err);
        // Token is already saved — still let the user reset in the browser
        return res.json({
          message: 'Email could not be sent, but you can reset your password on the next page.',
          token,
          resetUrl: resetLink,
          emailFailed: true
        });
      }
    }

    // If SMTP not configured, optionally show token in dev mode
    if (process.env.DEV_SHOW_RESET_TOKEN === 'true') {
      return res.json({ message: 'DEV token', token });
    }

    return res.status(503).json({
      message: 'Password reset email is not configured on this server yet. Ask the site admin to set up SMTP, or contact them for help resetting your password.',
      smtpNotConfigured: true
    });
  } catch (err) {
    console.error('Request reset failed:', err);
    res.status(500).json({ message: 'Failed to request reset' });
  }
});

// Verify reset token validity
app.get('/auth/verify-reset', async (req, res) => {
  const token = req.query.token;
  if (!token) return res.status(400).json({ valid: false });
  try {
    const rows = await dbAll('SELECT username, reset_expires FROM users WHERE reset_token = ? LIMIT 1', [token]);
    if (!rows || rows.length === 0) return res.json({ valid: false });
    const rec = rows[0];
    const expires = rec.reset_expires ? new Date(rec.reset_expires) : null;
    if (!expires || expires < new Date()) return res.json({ valid: false });
    res.json({ valid: true, username: rec.username });
  } catch (err) {
    console.error('Verify reset failed:', err);
    res.status(500).json({ valid: false });
  }
});

// Perform password reset
app.post('/auth/reset', async (req, res) => {
  const { token, password } = req.body || {};
  if (!token || !password) return res.status(400).json({ message: 'Token and password required' });
  if (!isValidPassword(password)) return res.status(400).json({ message: passwordRequirementMessage() });
  try {
    const rows = await dbAll('SELECT username, reset_expires FROM users WHERE reset_token = ? LIMIT 1', [token]);
    if (!rows || rows.length === 0) return res.status(400).json({ message: 'Invalid or expired token' });
    const rec = rows[0];
    const expires = rec.reset_expires ? new Date(rec.reset_expires) : null;
    if (!expires || expires < new Date()) return res.status(400).json({ message: 'Invalid or expired token' });

    const hashed = bcrypt.hashSync(password, 10);
    await dbRun(
      'UPDATE users SET password_hash = ?, reset_token = NULL, reset_expires = NULL WHERE username = ?',
      [hashed, rec.username]
    );

    const token = jwt.sign(
      { username: rec.username, role: 'user', state: null, lga: null },
      SECRET_KEY,
      { expiresIn: process.env.JWT_EXPIRY || '30d' }
    );

    res.json({ ok: true, token, username: rec.username, message: 'Password updated. You are now signed in.' });
  } catch (err) {
    console.error('Reset failed:', err);
    res.status(500).json({ message: 'Failed to reset password' });
  }
});

// Record an interaction (share, reply already captured in sockets, but share uses HTTP)
app.post('/interact', verifyHttpToken, async (req, res) => {
  const { messageId, type } = req.body;
  if (!messageId || !type) {
    return res.status(400).json({ message: 'messageId and type are required' });
  }
  try {
    // Check if interaction already exists (prevent duplicates)
    const existing = await dbAll(
      'SELECT id FROM interactions WHERE username = ? AND message_id = ? AND type = ? LIMIT 1',
      [req.user.username, messageId, type]
    );
    
    if (existing && existing.length > 0) {
      console.log('Interaction already exists, skipping duplicate:', req.user.username, messageId, type);
      // Get the message location for response
      const messageLocation = await dbAll(
        'SELECT state, lga FROM messages WHERE id = ? LIMIT 1',
        [messageId]
      );
      return res.json({ ok: true, duplicate: true, newLocation: messageLocation[0] || null });
    }
    
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
    // If it's a unique constraint violation, treat as duplicate
    if (err.message && err.message.includes('unique')) {
      return res.json({ ok: true, duplicate: true });
    }
    res.status(500).json({ message: 'Failed to record interaction' });
  }
});

// Get profile with interacted messages
app.get('/profile', verifyHttpToken, async (req, res) => {
  try {
    const profile = await dbAll(
      'SELECT username, email, state, lga, created_at FROM users WHERE username = ? LIMIT 1',
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

// Get all messages (unauthenticated endpoint for read-only viewing)
app.get('/messages', async (req, res) => {
  try {
    const messages = await dbAll(
      `SELECT id, username, state, lga, message, parent_id, attachment_url, attachment_type, created_at
       FROM messages
       WHERE parent_id IS NULL
       ORDER BY created_at ASC
       LIMIT 1000`,
      []
    );
    
    res.json({ messages });
  } catch (err) {
    console.error('Failed to fetch messages:', err);
    res.status(500).json({ message: 'Failed to fetch messages' });
  }
});

// Send message (authenticated endpoint)
app.post('/send-message', verifyHttpToken, async (req, res) => {
  const { message } = req.body;
  
  if (!message || !message.trim()) {
    return res.status(400).json({ message: 'Message cannot be empty' });
  }
  
  try {
    const username = req.user.username;
    const state = req.user.state || '';
    const lga = req.user.lga || '';
    
    // Validate message is action-oriented
    const validation = isActionStatement(message);
    if (!validation.valid) {
      return res.status(400).json({ message: validation.reason });
    }
    
    // Insert message
    const result = await dbRun(
      `INSERT INTO messages (username, message, state, lga)
       VALUES (?, ?, ?, ?)`,
      [username, message.trim(), state, lga]
    );
    
    // Emit via socket.io
    const messageId = result && result.lastID ? result.lastID : 0;
    const newMsg = {
      id: messageId,
      username,
      message: message.trim(),
      state,
      lga,
      created_at: new Date().toISOString()
    };
    
    if (state && lga) {
      io.to(`${state}_${lga}`).emit('new-message', newMsg);
    }
    
    res.json({ success: true, message: newMsg });
  } catch (err) {
    console.error('Failed to send message:', err);
    res.status(500).json({ message: 'Failed to send message' });
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

// Get location-based feed (public read-only for guests)
app.get('/feed/public', async (req, res) => {
  try {
    const state = (req.query.state || '').trim();
    const lga = (req.query.lga || '').trim();

    if (!state || !lga) {
      return res.status(400).json({ message: 'State and LGA are required' });
    }

    const messages = await dbAll(
      `SELECT id, username, state, lga, message, parent_id, attachment_url, attachment_type, created_at
       FROM messages
       WHERE LOWER(TRIM(state)) = LOWER(TRIM(?)) AND LOWER(TRIM(lga)) = LOWER(TRIM(?))
       ORDER BY created_at ASC
       LIMIT 500`,
      [state, lga]
    );

    res.json({ messages, state, lga });
  } catch (err) {
    console.error('Failed to fetch public feed:', err);
    res.status(500).json({ message: 'Failed to fetch feed' });
  }
});

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

// Search messages in a location (public read-only for guests)
app.get('/search/public', async (req, res) => {
  try {
    const state = (req.query.state || '').trim();
    const lga = (req.query.lga || '').trim();
    const query = req.query.q || '';

    if (!state || !lga) {
      return res.status(400).json({ message: 'State and LGA are required' });
    }

    if (!query.trim()) {
      return res.json({ messages: [] });
    }

    const messages = await dbAll(
      `SELECT id, username, state, lga, message, parent_id, attachment_url, attachment_type, created_at
       FROM messages
       WHERE LOWER(TRIM(state)) = LOWER(TRIM(?)) AND LOWER(TRIM(lga)) = LOWER(TRIM(?))
         AND parent_id IS NULL AND LOWER(message) LIKE LOWER(?)
       ORDER BY created_at DESC
       LIMIT 100`,
      [state, lga, `%${query}%`]
    );

    res.json({ messages });
  } catch (err) {
    console.error('Failed to search public messages:', err);
    res.status(500).json({ message: 'Failed to search messages' });
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
    // Show all flagged messages (pending, rejected, approved, etc.)
    const flagged = await dbAll(
      `SELECT id, username, message, rejection_reason, state, lga, status, created_at 
       FROM flagged_messages 
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
app.post('/admin/approve/:id', verifyHttpToken, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const flagged = await dbAll('SELECT * FROM flagged_messages WHERE id = ?', [id]);
    if (!flagged || flagged.length === 0) {
      return res.status(404).json({ message: 'Flagged message not found' });
    }
    const msg = flagged[0];
    // Post the message
    const result = await dbRun('INSERT INTO messages (username, state, lga, message, parent_id) VALUES (?, ?, ?, ?, ?)', [msg.username, msg.state, msg.lga, msg.message, null]);
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
      state: msg.state,
      lga: msg.lga,
      timestamp: new Date().toISOString()
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('Failed to approve message:', err);
    res.status(500).json({ message: 'Failed to approve message' });
  }
});

// Admin: Reject flagged message
app.post('/admin/reject/:id', verifyHttpToken, requireAdmin, async (req, res) => {
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

// Test endpoint: Check flagged_messages table health
app.get('/admin/test-flagged', verifyHttpToken, async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  try {
    // Check if table exists and get structure
    const tableInfo = await dbAll(`
        SELECT column_name as name, data_type as type
        FROM information_schema.columns
        WHERE table_name = 'flagged_messages'
        ORDER BY ordinal_position
      `);
    
    const count = await dbAll('SELECT COUNT(*) as count FROM flagged_messages');
    const recent = await dbAll('SELECT * FROM flagged_messages ORDER BY created_at DESC LIMIT 5');
    
    res.json({
      tableExists: tableInfo.length > 0,
      columns: tableInfo.map(col => ({ name: col.name, type: col.type })),
      totalRecords: count[0].count,
      recentRecords: recent
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: View all database tables
app.get('/admin/db/messages', verifyHttpToken, requireAdmin, async (req, res) => {
  try {
    const data = await dbAll('SELECT * FROM messages ORDER BY created_at DESC LIMIT 500');
    res.json({ data });
  } catch (err) {
    console.error('Failed to fetch messages:', err);
    res.status(500).json({ message: 'Failed to fetch data' });
  }
});

app.get('/admin/db/users', verifyHttpToken, requireAdmin, async (req, res) => {
  try {
    const data = await dbAll('SELECT username, state, lga, created_at FROM users ORDER BY created_at DESC');
    res.json({ data });
  } catch (err) {
    console.error('Failed to fetch users:', err);
    res.status(500).json({ message: 'Failed to fetch data' });
  }
});

app.get('/admin/db/interactions', verifyHttpToken, requireAdmin, async (req, res) => {
  try {
    const data = await dbAll('SELECT * FROM interactions ORDER BY created_at DESC LIMIT 500');
    res.json({ data });
  } catch (err) {
    console.error('Failed to fetch interactions:', err);
    res.status(500).json({ message: 'Failed to fetch data' });
  }
});

app.get('/admin/db/flagged', verifyHttpToken, requireAdmin, async (req, res) => {
  try {
    const data = await dbAll('SELECT * FROM flagged_messages ORDER BY created_at DESC LIMIT 500');
    res.json({ data });
  } catch (err) {
    console.error('Failed to fetch flagged messages:', err);
    res.status(500).json({ message: 'Failed to fetch data' });
  }
});

// Admin: Remove duplicate interactions
app.post('/admin/remove-duplicate-interactions', verifyHttpToken, requireAdmin, async (req, res) => {
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
      const deleteQuery = `DELETE FROM interactions
           WHERE username = ? AND message_id = ? AND type = ?
           AND id NOT IN (
             SELECT MIN(id) FROM interactions
             WHERE username = ? AND message_id = ? AND type = ?
           )`;
      const params = [dup.username, dup.message_id, dup.type, dup.username, dup.message_id, dup.type];
      
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
app.post('/admin/remove-duplicate-messages', verifyHttpToken, requireAdmin, async (req, res) => {
  try {
    // Find duplicate messages (same username, message text, state, lga)
    const duplicates = await dbAll(`
          SELECT username, message, state, lga,
                 MIN(id) as keep_id,
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
      const deleteQuery = `DELETE FROM messages WHERE username = ? AND message = ? AND state = ? AND lga = ? AND id != ?`;
      
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
app.post('/admin/auto-track-sent-messages', verifyHttpToken, requireAdmin, async (req, res) => {
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
app.post('/admin/normalize-locations', verifyHttpToken, requireAdmin, async (req, res) => {
  try {
    // Trim all state/lga in messages table
    const messages = await dbAll('SELECT id, state, lga FROM messages');
    let messagesUpdated = 0;
    for (const msg of messages) {
      const trimmedState = (msg.state || '').trim();
      const trimmedLga = (msg.lga || '').trim();
      if (trimmedState !== msg.state || trimmedLga !== msg.lga) {
        await dbRun(
          'UPDATE messages SET state = ?, lga = ? WHERE id = ?', [trimmedState, trimmedLga, msg.id]
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
          'UPDATE users SET state = ?, lga = ? WHERE username = ?', [trimmedState, trimmedLga, user.username]
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
app.post('/admin/query', verifyHttpToken, requireAdmin, async (req, res) => {
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

    // Additional security: Block dangerous keywords (using word boundaries)
    const forbidden = ['\\bdrop\\b', '\\bdelete\\b', '\\binsert\\b', '\\bupdate\\b', '\\balter\\b', '\\bcreate\\b', '\\btruncate\\b'];
    const forbiddenRegex = new RegExp(forbidden.join('|'), 'i');
    if (forbiddenRegex.test(trimmedQuery)) {
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
app.get('/admin/check-user/:username', verifyHttpToken, requireAdmin, async (req, res) => {
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
app.post('/admin/ban-user', verifyHttpToken, requireAdmin, async (req, res) => {
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
app.post('/admin/unban-user', verifyHttpToken, requireAdmin, async (req, res) => {
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
app.delete('/admin/delete-user/:username', verifyHttpToken, requireAdmin, async (req, res) => {
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
app.post('/admin/bulk-delete-messages', verifyHttpToken, requireAdmin, async (req, res) => {
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
app.get('/admin/analytics', verifyHttpToken, requireAdmin, async (req, res) => {
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

// Socket.io authentication middleware - allow unauthenticated connections for read-only access
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    // Allow unauthenticated connections (read-only mode)
    socket.user = null;
    return next();
  }
  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) {
      // Invalid token, but allow as guest
      socket.user = null;
      return next();
    }
    socket.user = decoded;
    next();
  });
});

// Socket.io connection with user tracking to prevent multiple connections
const userSockets = new Map(); // Track active sockets per username

io.on('connection', (socket) => {
  try {
    const isGuest = !socket.user || !socket.user.username;
    
    if (isGuest) {
      console.log('Guest connected from', socket.handshake.address);
      socket.isGuest = true;

      socket.on('guest:join', ({ state, lga }) => {
        try {
          const normalizedState = (state || '').trim();
          const normalizedLga = (lga || '').trim();
          if (!normalizedState || !normalizedLga) return;

          if (socket.guestRoom) {
            socket.leave(socket.guestRoom);
          }
          const room = `${normalizedState}_${normalizedLga}`;
          socket.guestRoom = room;
          socket.join(room);
          console.log('Guest joined room:', room);
        } catch (err) {
          console.error('Guest join room failed:', err.message);
        }
      });

      socket.on('disconnect', () => {
        console.log('Guest disconnected');
      });
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

    socket.on('location:join', ({ state, lga }) => {
      try {
        const normalizedState = (state || '').trim();
        const normalizedLga = (lga || '').trim();
        if (!normalizedState || !normalizedLga) return;

        if (socket.locationRoom) {
          socket.leave(socket.locationRoom);
        }
        socket.locationRoom = `${normalizedState}_${normalizedLga}`;
        socket.viewState = normalizedState;
        socket.viewLga = normalizedLga;
        socket.join(socket.locationRoom);
        console.log('User', username, 'joined view room:', socket.locationRoom);
      } catch (err) {
        console.error('Authenticated location join failed:', err.message);
      }
    });

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
      const state = (data.state || socket.viewState || socket.user.state || '').trim();
      const lga = (data.lga || socket.viewLga || socket.user.lga || '').trim();
      const messageRoom = state && lga ? `${state}_${lga}` : null;
      const now = new Date();

    // Validate main messages (not replies) for action statements
    if (!parentId) {
      const validation = isActionStatement(message);
      if (!validation.valid) {
        console.log('=== MESSAGE REJECTED ===');
        console.log('User:', username);
        console.log('Location:', state, '/', lga);
        console.log('Reason:', validation.reason);
        console.log('Message:', message);
        console.log('========================');
        
        // Store rejected message for admin review and analytics
        try {
          const result = await dbRun(
            'INSERT INTO flagged_messages (username, message, rejection_reason, state, lga, status) VALUES (?, ?, ?, ?, ?, ?)',
            [username, message, validation.reason, state, lga, 'rejected']
          );
          console.log('✓ Rejected message stored successfully. Insert ID:', result ? result.lastID : 'N/A');
          
          // Verify it was stored
          const verify = await dbAll('SELECT COUNT(*) as count FROM flagged_messages WHERE username = ?', [username]);
          console.log('Total flagged messages for user', username, ':', verify[0].count);
        } catch (err) {
          console.error('✗ FAILED to store rejected message!');
          console.error('Error details:', err.message);
          console.error('Stack:', err.stack);
        }
        
        socket.emit('message rejected', { 
          reason: validation.reason,
          message: message 
        });
        return;
      }
      // Flag uncertain messages for admin review
      if (validation.uncertain) {
        console.log('=== MESSAGE FLAGGED (Uncertain) ===');
        console.log('User:', username, 'Location:', state, '/', lga);
        console.log('Message:', message);
        console.log('===================================');
        try {
          await dbRun(
            'INSERT INTO flagged_messages (username, message, rejection_reason, state, lga, status) VALUES (?, ?, ?, ?, ?, ?)',
            [username, message, 'Low confidence - needs review', state, lga, 'pending']
          );
          console.log('✓ Uncertain message flagged successfully');
        } catch (err) {
          console.error('✗ Failed to flag uncertain message:', err.message);
        }
      }
    }

    // Persist to database first
    try {
      console.log('Saving message from:', username, 'State:', state, 'LGA:', lga, parentId ? `(Reply to: ${parentId})` : '(Main message)');
      const result = await dbRun(
        'INSERT INTO messages (username, state, lga, message, parent_id, attachment_url, attachment_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [username, state, lga, message, parentId, attachmentUrl, attachmentType]
      );
      const messageId = result.lastID;
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
        state,
        lga,
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
        const uploadPath = path.join(UPLOADS_DIR, path.basename(msg.attachment_url));
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