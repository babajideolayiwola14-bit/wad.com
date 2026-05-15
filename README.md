# Web Chat Application

This is a simple web chat application with backend authentication.

## Setup

1. Install Node.js from https://nodejs.org/ if not already installed.
2. Run `npm install` to install dependencies.

## Usage

1. Start the server: `npm start` or `npm run dev` for development.
2. Open your browser to `http://localhost:3000`.
3. Login with username: `user1` and password: `password1` (or user2/password2).
4. After login, you'll be redirected to the chat page.

## Files

- `index.html`: Login page.
- `chat.html`: Chat interface.
- `style.css`: CSS for styling.
- `script.js`: Login form handling.
- `chat.js`: Chat functionality (placeholder).
- `server.js`: Express server with authentication.
- `package.json`: Dependencies.

## Features

- User authentication with JWT tokens.
- Real-time chat using Socket.io.
- Messages are broadcasted to all connected users in the 'general' room.

## Password reset & email

The application includes a "forgot password" flow.  When a user requests a reset, the server will generate a temporary token and **send an email** containing a link to `/reset.html`.

Until you have a working SMTP service, the server can run in development mode and simply log the reset token instead of attempting delivery (set `DEV_SHOW_RESET_TOKEN=true`).  That’s how the flow was developed initially.

To send real mail you need SMTP credentials.  A convenient option on Heroku is **SendGrid**:

1. Provision the add‑on:
   ```bash
   heroku addons:create sendgrid:starter
   ```
2. Grab the API key the add‑on creates:
   ```bash
   heroku config:get SENDGRID_API_KEY
   ```
3. Configure the SMTP environment variables used by the app:
   ```bash
   heroku config:set \
     SMTP_HOST=smtp.sendgrid.net \
     SMTP_PORT=587 \
     SMTP_USER=apikey \
     SMTP_PASS=$(heroku config:get SENDGRID_API_KEY) \
     SMTP_SECURE=false \
     SMTP_FROM=you@yourdomain.com \
     APP_URL=https://your-app.herokuapp.com
   ```
   Adjust `SMTP_FROM` and `APP_URL` to match your email address and the public URL of the app.

The code already reads these vars and uses `nodemailer` to dispatch messages.  Once they’re set, the reset flow will email users instead of printing tokens to the log.

You can also use any other SMTP provider; just set the corresponding `SMTP_*` variables.

## Troubleshooting

- Ensure Node.js and npm are installed.
- If port 3000 is in use, change PORT in server.js.
- For real-time chat, integrate WebSockets (e.g., Socket.io).