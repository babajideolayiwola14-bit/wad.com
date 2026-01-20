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

## Troubleshooting

- Ensure Node.js and npm are installed.
- If port 3000 is in use, change PORT in server.js.
- For real-time chat, integrate WebSockets (e.g., Socket.io).