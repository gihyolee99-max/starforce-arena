# AI Agent Instructions for starforce-arena

## Purpose
Provide AI coding agents with the key architecture, build commands, and project conventions for this repository.

## Project layout
- `client/` – React + Vite frontend.
- `server/` – Express + Socket.io backend.
- Root package scripts orchestrate client/server development and client production build.

## Key commands
- `npm run dev:client` — starts the frontend dev server from `client/`.
- `npm run dev:server` — starts the backend dev server from `server/`.
- `npm run build:client` — builds the frontend into `client/dist`.
- `cd client && npm run lint` — lint the frontend code.

## Backend notes
- Entry file: `server/index.js`.
- Uses ES modules (`type: module`).
- Uses `express`, `cors`, and `socket.io`.
- Environment variables:
  - `PORT` — backend HTTP port (default `3001`).
  - `CLIENT_ORIGIN` — comma-separated allowed client origins.
  - `RAILWAY_STATIC_URL` — optional, adds Railway origin automatically.
  - `NODE_ENV` / `SERVE_STATIC` — control static client serving.
- If `SERVE_STATIC=1` or `NODE_ENV=production`, backend serves `client/dist`.
- Game logic lives in `server/enhanceEngine.js`.

## Frontend notes
- Entry file: `client/src/main.jsx`.
- Uses React 19 + Vite.
- Socket interactions are central; the app communicates with the backend using Socket.io events.
- Do not assume TypeScript is available; the frontend is JavaScript.

## Important runtime behavior
- The server keeps an in-memory `players` map and broadcasts real-time updates.
- Socket events include:
  - `player:join`
  - `chat:send`
  - `enhance:request`
  - `ranking:update`
  - `users:update`
  - `chat:system`
  - `chat:message`
  - `enhance:broadcast`
- The backend validates nickname length and chat message length.

## Agent conventions
- Preserve the existing `client/README.md` content; use it as a reference for frontend setup.
- Avoid adding duplicate documentation in the repository.
- For frontend changes, prefer working within `client/src/` and `client/package.json`.
- For backend changes, prefer `server/index.js`, `server/enhanceEngine.js`, and `server/package.json`.
- Keep fixes minimal and aligned with the existing React/Vite + Socket.io architecture.

## References
- `client/README.md` — frontend template notes and ESLint guidance.
- `server/index.js` — backend entry and socket event flow.
- `server/enhanceEngine.js` — game enhancement mechanics.
