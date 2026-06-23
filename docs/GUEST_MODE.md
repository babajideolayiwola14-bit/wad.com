# Guest Mode

Visitors can browse the chat **without logging in**. Writing (post, reply, attach, interact) requires authentication.

## Behavior matrix

| Action | Guest | Logged in |
|--------|-------|-----------|
| Open site | Chat visible immediately | Chat visible |
| Pick State/LGA | Yes — feed loads when LGA is selected | Same dropdowns drive the feed |
| View messages | Yes (`GET /feed/public`) | Yes (`GET /feed/public` via dropdowns) |
| Search messages | Enter in search box (`GET /search/public`) | Search button + Enter |
| Live updates | Yes (socket `guest:join`) | Yes (socket `location:join`) |
| Type / send / attach | No → opens login modal | Yes (posts to selected dropdown location) |
| Reply / share / delete | Share yes; reply & delete need login | Yes |
| Profile / mybit | Hidden for guests | Sidebar shortcuts to past locations |

## Frontend modules

| File | Role |
|------|------|
| `public/js/app.js` | Bootstrap: guest default, auth if valid token |
| `public/js/location-feed.js` | State/LGA dropdowns and feed loading for everyone |
| `public/js/session.js` | `GUEST` vs `AUTHENTICATED`, view location in `sessionStorage` |
| `public/js/guest.js` | Write guards and guest header chrome |
| `public/js/modals.js` | Login/register overlay modals |
| `public/js/auth.js` | Login, register, forgot-password API calls |
| `public/js/locations.js` | Nigeria State/LGA data |
| `public/js/feed-view.js` | Message list rendering for guests |
| `public/js/chat.js` | Authenticated chat (`initAuthenticatedChat`) |

## Session storage

- `sessionStorage.guestLocation` — `{ state, lga }` for current view location (guests and logged-in users)
- `localStorage.token` / `localStorage.user` — authenticated session

## API (server)

- `GET /feed/public?state=&lga=` — location feed, no auth
- `GET /search/public?state=&lga=&q=` — search, no auth
- Socket guest: `guest:join` with `{ state, lga }`
- Socket authenticated: `location:join` with `{ state, lga }`; posts include `{ state, lga }` in payload

## Sidebar (mybit)

The sidebar lists locations the user has **engaged with**. Clicking an item sets the dropdowns and loads that location’s feed — it does not replace the dropdowns as the primary navigation.
