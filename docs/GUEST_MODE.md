# Guest Mode

Visitors can browse the chat **without logging in**. Writing (post, reply, attach, interact) requires authentication.

## Behavior matrix

| Action | Guest | Logged in |
|--------|-------|-----------|
| Open site | Chat visible immediately | Chat visible |
| Pick State/LGA | Yes — feed loads when LGA is selected | From account / login |
| View messages | Yes (`GET /feed/public`, auto on LGA pick) | Yes (`GET /feed`) |
| Search messages | Yes (`GET /search/public`) | Yes (`GET /search`) |
| Live updates | Yes (socket `guest:join`) | Yes (socket auth) |
| Type / send / attach | No → opens login modal | Yes |
| Reply / share / delete | No → opens login modal | Yes |
| Profile / mybit | Hidden for guests | Full |

## Frontend modules

| File | Role |
|------|------|
| `public/js/app.js` | Bootstrap: guest default, auth if valid token |
| `public/js/session.js` | `GUEST` vs `AUTHENTICATED`, guest location in `sessionStorage` |
| `public/js/guest.js` | Read-only UI, feed load, write guards, guest socket |
| `public/js/modals.js` | Login/register overlay modals |
| `public/js/auth.js` | Login, register, forgot-password API calls |
| `public/js/locations.js` | Nigeria State/LGA data |
| `public/js/feed-view.js` | Shared message list rendering |
| `public/js/chat.js` | Authenticated chat only (`initAuthenticatedChat`) |

## Session storage

- `sessionStorage.guestLocation` — `{ state, lga }` for guest browsing
- `localStorage.token` / `localStorage.user` — authenticated session

## API (server)

- `GET /feed/public?state=&lga=` — location feed, no auth
- `GET /search/public?state=&lga=&q=` — search, no auth
- Socket: guest emits `guest:join` with `{ state, lga }` to receive live messages for that room

Write endpoints remain protected by JWT; guests cannot post even if they bypass the UI.

## Manual test checklist

1. Open site logged out → chat visible, guest badge shown
2. Select Lagos / Alimosho → Browse → messages load
3. Click message box → login modal opens
4. Log in → modal closes, can type and send
5. Logout → returns to guest mode, inputs disabled again
6. Search as guest → results for selected location only
