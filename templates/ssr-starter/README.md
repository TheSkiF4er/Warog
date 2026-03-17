# Warog SSR starter

Files in this starter:
- `app.tsx` — shared UI tree
- `server.tsx` — `renderToString(...)` entry
- `client.tsx` — `hydrate(...)` entry

This starter is intentionally minimal and mirrors the Month 3 runtime contract:
- server renders plain HTML
- client hydrates with diagnostics
- controlled inputs restore user state on hydration fallback
