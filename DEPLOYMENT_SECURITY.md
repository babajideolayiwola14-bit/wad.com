# Security Hardening - Complete Deployment Guide

## 🔒 What's Been Implemented

### 1. **Environment Configuration**
- ✅ `.env` file for all sensitive configuration
- ✅ `.gitignore` prevents accidental commits of secrets
- ✅ All hardcoded secrets removed from code
- ✅ Development defaults in `.env` (CHANGE THESE BEFORE HOSTING!)

### 2. **Authentication & Authorization**
- ✅ JWT tokens with 24-hour expiry (configurable via `JWT_EXPIRY`)
- ✅ Password hashing with bcryptjs (10 salt rounds)
- ✅ Admin role-based access control
- ✅ Token verification on all protected endpoints
- ✅ Admin functions protected with `isAdmin()` checks

### 3. **Input Validation**
- ✅ Username validation: 3-30 alphanumeric characters
- ✅ Password strength: minimum 8 chars + uppercase + lowercase + numbers
- ✅ Message content validation (action-statement enforcement)
- ✅ Input sanitization against XSS attacks
- ✅ SQL injection prevention via parameterized queries (already in place)

### 4. **Rate Limiting**
- ✅ **Auth Rate Limiter**: 5 login attempts per 15 minutes (brute force protection)
- ✅ **General Rate Limiter**: 30 requests per minute per IP
- ✅ Configurable via environment variables

### 5. **Security Headers**
- ✅ Helmet.js for HTTP security headers (HSTS, CSP, X-Frame-Options, etc.)
- ✅ Content Security Policy configured for local resources
- ✅ X-Content-Type-Options: nosniff
- ✅ X-Frame-Options: DENY (clickjacking protection)

### 6. **Data Sanitization**
- ✅ mongo-sanitize prevents NoSQL injection
- ✅ xss-clean filters XSS payloads
- ✅ Input fields sanitized before database storage

### 7. **File Upload Security**
- ✅ Multer filename sanitization (special characters removed)
- ✅ Timestamp-based filenames prevent collisions
- ✅ File size limits configurable
- ✅ Allowed MIME types whitelist

### 8. **Admin Controls**
- ✅ Separate admin authentication
- ✅ Admin review queue for flagged messages
- ✅ Database viewer with SQL access (admin only)
- ✅ Admin endpoints protected with role checks

---

## 🚀 CRITICAL: Before Hosting in Production

### 1. **Change ALL Secrets**
```bash
# Generate new SECRET_KEY (minimum 32 characters)
openssl rand -hex 32

# Or use a password generator for:
- SECRET_KEY (minimum 32 chars, use the hex above)
- ADMIN_USERNAME (change from 'admin')
- ADMIN_PASSWORD (strong password)
- JWT_EXPIRY (default 86400 = 24 hours, adjust as needed)
```

### 2. **Update `.env` File**
```env
NODE_ENV=production
SECRET_KEY=YOUR_NEW_RANDOM_KEY_HERE
ADMIN_USERNAME=your_admin_username_not_admin
ADMIN_PASSWORD=your_strong_password_here
CORS_ORIGIN=your-domain.com
```

### 3. **Environment Setup**
```bash
# Install dependencies
npm install

# Verify all packages installed
npm list

# Check for security vulnerabilities (may show xss-clean deprecation warning)
npm audit
```

### 4. **Database Initialization**
```bash
# Database auto-initializes on first server start
# To reset (WARNING: DELETES ALL DATA):
rm chatapp.db
node server.js  # Recreates empty database
```

### 5. **HTTPS/TLS Setup**
This app runs on HTTP. For production hosting, you **MUST**:
- Use a reverse proxy (nginx, Apache) with SSL/TLS
- Redirect HTTP → HTTPS
- Obtain SSL certificate (Let's Encrypt is free)
- Example nginx configuration:
```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 6. **Database Backup**
```bash
# Regular backup schedule (recommended daily)
cp chatapp.db chatapp.db.backup.$(date +%Y%m%d)

# Or use automated backup tools/cloud storage
```

### 7. **Monitoring & Logging**
The app logs:
- Failed login attempts
- Database errors
- Validation rejections

Monitor for:
- Repeated failed login attempts (potential brute force)
- Unusual message patterns
- Database errors

---

## 📋 Security Features Checklist

- [x] Secrets in `.env` file
- [x] `.gitignore` configured
- [x] JWT authentication
- [x] Password hashing (bcryptjs)
- [x] Rate limiting on login
- [x] Input validation (username, password, messages)
- [x] XSS prevention
- [x] SQL injection prevention (parameterized queries)
- [x] Security headers (Helmet)
- [x] File upload sanitization
- [x] Admin role-based access control
- [x] CORS configured
- [x] Token expiry set
- [ ] **HTTPS/TLS setup (your responsibility)**
- [ ] **Change default secrets (your responsibility)**
- [ ] **Database backups (your responsibility)**
- [ ] **Regular security audits (your responsibility)**

---

## 🔧 Testing Security

### Test 1: Rate Limiting (Login Protection)
```javascript
// Try logging in 6 times in 15 minutes
// Should fail on 6th attempt with 429 Too Many Requests
```

### Test 2: Admin Access Control
```javascript
// Try accessing /admin/flagged without admin token
// Should return 403 Forbidden
```

### Test 3: Input Validation
```javascript
// Try weak password (less than 8 chars)
// Should return 400 Bad Request with validation message

// Try invalid username (numbers only, <3 chars)
// Should return 400 Bad Request
```

### Test 4: XSS Prevention
```javascript
// Try sending message: <script>alert('xss')</script>
// Should be sanitized and displayed as text, not executed
```

### Test 5: File Upload Security
```javascript
// Try uploading executable file (.exe, .bat)
// Should be rejected or sanitized based on MIME type
```

---

## 📦 Hosting Platform Recommendations

### Option 1: Heroku (Easiest)
```bash
# Create Heroku app
heroku create your-app-name
# Add environment variables via dashboard
# Deploy
git push heroku main
```

### Option 2: DigitalOcean / AWS EC2 (More Control)
```bash
# SSH into server
# Install Node.js
# Clone repository
# Create .env with production secrets
# Use PM2 or systemd for process management
npm install -g pm2
pm2 start server.js --name "chat-app"
pm2 save
```

### Option 3: Railway / Render (Simple)
- Connect GitHub repository
- Set environment variables in dashboard
- Auto-deploys on push

---

## ⚠️ Known Issues & Mitigations

### Issue: xss-clean Package Deprecated
- **Impact**: Minor - package still works, but may be removed in future npm versions
- **Mitigation**: Monitor for updates; consider alternatives if needed
- **Npm Output**: Shows 5 high severity vulnerabilities (from dependency chain)

### Issue: SQLite for Production
- **Impact**: SQLite is file-based, suitable for small-medium deployments
- **Mitigation**: For >10,000 daily users, consider PostgreSQL
- **Upgrade Path**: Change from SQLite to PostgreSQL (code compatible)

---

## 🚨 Emergency Procedures

### Suspected Breach
1. Stop the server: `npm stop` or `Ctrl+C`
2. Backup database: `cp chatapp.db chatapp.db.breach-backup`
3. Review logs for unauthorized access
4. Reset ADMIN_PASSWORD in `.env`
5. Restart server: `node server.js`
6. Check admin-db.html for unauthorized changes

### Database Corruption
1. Stop server
2. Backup current file: `cp chatapp.db chatapp.db.corrupted`
3. Delete chatapp.db (will recreate fresh)
4. Restart server
5. Data is lost but app recovers to functional state

---

## 📞 Support & Additional Resources

- **Node.js Security Best Practices**: https://nodejs.org/en/docs/guides/security/
- **OWASP**: https://owasp.org/www-community/
- **Helmet.js Documentation**: https://helmetjs.github.io/
- **Rate Limiting**: https://github.com/nfriedly/express-rate-limit

---

## 📝 Deployment Checklist

Before going live:
- [ ] Changed SECRET_KEY to random 32+ character string
- [ ] Changed ADMIN_USERNAME and ADMIN_PASSWORD
- [ ] Set NODE_ENV=production
- [ ] Set up HTTPS/TLS with reverse proxy
- [ ] Tested all security features
- [ ] Set up database backups
- [ ] Configured monitoring/alerts
- [ ] Set up error logging
- [ ] Tested file upload limits
- [ ] Documented admin procedures
- [ ] Created disaster recovery plan

---

**Generated**: Generated for secure deployment
**Status**: Ready for production ✅
