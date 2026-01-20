# 🔒 Security Hardening Checklist for Hosting

## ✅ What's Been Implemented

### 1. **Environment Variables** 
- Moved all secrets to `.env` file (copy from `.env.example`)
- SECRET_KEY must be 32+ characters
- Admin credentials protected

### 2. **Input Validation & Sanitization**
- Username format validation (3-30 alphanumeric)
- Password strength requirements (8+ chars, uppercase, lowercase, numbers)
- XSS protection via `xss-clean`
- NoSQL injection prevention via `mongo-sanitize`

### 3. **Authentication & Authorization**
- JWT tokens with expiration
- Admin role-based access control
- Rate limiting on login (5 attempts per 15 minutes)
- Failed login attempt logging

### 4. **Security Headers**
- Helmet.js for HTTP security headers
- HSTS (HTTP Strict Transport Security) in production
- CSP (Content Security Policy)
- No server info leakage (X-Powered-By removed)

### 5. **Rate Limiting**
- General: 100 requests per 15 minutes
- Auth: 5 login attempts per 15 minutes
- Configurable via .env

### 6. **Data Protection**
- Bcrypt password hashing (10 rounds)
- SQLite with parameterized queries (SQL injection prevention)
- Read-only SQL queries for admin panel
- No password hashes in API responses

---

## 📦 Required Npm Packages

Install these before deploying:

```bash
npm install dotenv helmet express-rate-limit mongo-sanitize xss-clean
```

Your `package.json` should include:
```json
{
  "dependencies": {
    "express": "^4.18.0",
    "socket.io": "^4.5.0",
    "bcryptjs": "^2.4.0",
    "jsonwebtoken": "^9.0.0",
    "sqlite3": "^5.1.0",
    "cors": "^2.8.0",
    "body-parser": "^1.20.0",
    "multer": "^1.4.5",
    "dotenv": "^16.0.0",
    "helmet": "^7.0.0",
    "express-rate-limit": "^6.7.0",
    "mongo-sanitize": "^2.1.0",
    "xss-clean": "^0.1.1"
  }
}
```

---

## 🚀 Pre-Deployment Checklist

### 1. **Environment Setup**
- [ ] Copy `.env.example` to `.env`
- [ ] Generate a strong SECRET_KEY (32+ random characters)
- [ ] Set ADMIN_USERNAME and ADMIN_PASSWORD
- [ ] Set NODE_ENV=production
- [ ] Set appropriate CORS_ORIGIN (your domain, not localhost)

### 2. **HTTPS/SSL**
- [ ] Obtain SSL certificate (use Let's Encrypt, AWS ACM, etc.)
- [ ] Configure Node.js or reverse proxy (Nginx/Apache) for HTTPS
- [ ] Enable HSTS header (already in code)
- [ ] Redirect all HTTP to HTTPS

### 3. **Database Security**
- [ ] Ensure chatapp.db is not in git (added to .gitignore)
- [ ] Set proper file permissions on database (chmod 600)
- [ ] Regular backups of database
- [ ] Don't expose database file in uploads/static directories

### 4. **File Upload Security**
- [ ] Validate file types (check ALLOWED_UPLOAD_TYPES in .env)
- [ ] Limit file size (MAX_FILE_SIZE in .env = 10MB default)
- [ ] Store uploads outside webroot or in restricted directory
- [ ] Scan uploads for malware (optional: use ClamAV)
- [ ] Don't allow .exe, .sh, .bat, etc.

### 5. **Application Security**
- [ ] All dependencies up-to-date (npm audit)
- [ ] No debug logging in production
- [ ] Monitor failed login attempts
- [ ] Log all admin actions
- [ ] Implement request logging (Winston/Morgan)

### 6. **Server Security**
- [ ] Firewall: Only open ports 80 (HTTP) and 443 (HTTPS)
- [ ] Run app as non-root user
- [ ] Use process manager (PM2) to auto-restart on crash
- [ ] Monitor memory/CPU usage
- [ ] Keep Node.js updated

### 7. **Data Privacy**
- [ ] Privacy policy for data collection
- [ ] GDPR compliance (if EU users)
- [ ] Data deletion requests capability
- [ ] Audit logs (who accessed what)

---

## 🔐 Security Settings in `.env`

```env
# CRITICAL - Change these!
SECRET_KEY=your-super-secret-key-min-32-chars-long-change-this!!!
ADMIN_USERNAME=admin
ADMIN_PASSWORD=YourStrongPassword123!

# Production settings
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://yourdomain.com

# Rate limiting
AUTH_RATE_LIMIT_MAX_REQUESTS=5      # Login attempts per window
RATE_LIMIT_MAX_REQUESTS=100          # General requests per window

# File upload
MAX_FILE_SIZE=10485760               # 10MB
ALLOWED_UPLOAD_TYPES=image/jpeg,image/png,image/gif,video/mp4,application/pdf
```

---

## 🛡️ Runtime Security

### Using PM2 (Production Process Manager)

```bash
npm install -g pm2
pm2 start server.js --name "chat-app" --env production
pm2 logs
pm2 save
pm2 startup
```

### Nginx Reverse Proxy (Recommended)

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Limit upload size
        client_max_body_size 10M;
    }

    location /socket.io {
        proxy_pass http://localhost:3001/socket.io;
        proxy_http_version 1.1;
        proxy_buffering off;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'Upgrade';
        proxy_set_header Host $host;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

---

## 📊 Monitoring & Logging

### Recommended Tools
- **PM2 Monitoring**: `pm2 plus`
- **Logging**: Winston or Bunyan
- **APM**: New Relic or DataDog
- **Error Tracking**: Sentry

### Add Basic Logging
```javascript
const log = (level, message) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${level}: ${message}`);
  // Log to file in production
};
```

---

## 🚨 Incident Response

**If you suspect a breach:**
1. Stop the server immediately
2. Review logs for suspicious activity
3. Reset all passwords and secrets
4. Notify affected users
5. Audit database changes
6. Restore from clean backup if needed
7. Redeploy with new secrets

---

## 📝 Admin Credentials

**Your admin account:**
- Username: Set in `ADMIN_USERNAME` env var
- Password: Set in `ADMIN_PASSWORD` env var
- This account can:
  - Access `/admin-db.html` (database viewer)
  - Access `/admin.html` (review queue)
  - Run SQL queries
  - Approve/reject flagged messages

**Change credentials regularly!** Update .env and restart.

---

## ❌ Do NOT Do

- Don't commit `.env` file to git
- Don't use the same password everywhere
- Don't disable HTTPS
- Don't ignore npm audit warnings
- Don't log passwords or tokens
- Don't allow direct database access
- Don't run as root user

---

Generated: January 20, 2026
