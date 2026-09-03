# SafeZone — preview run doc

## Reproduce the uncommitted artifacts a fresh checkout needs
- No secret env files exist for local development (there is no `.env.local`; only
  `.env.example` documents optional credentials). SafeZone runs with zero config:
  keyless dark map tiles, OSRM routing, OpenStreetMap hospital lookup,
  rule-based AI, and a file-backed store.
- Dependencies: `npm install` (lockfile: `package-lock.json`).
- The persistent store is created at runtime under `.data/` (gitignored); no
  manual step needed.
- Optional credentials (copy into `.env.local` or the environment) upgrade
  services — see `.env.example` for the full list:
  `NEXT_PUBLIC_MAPBOX_TOKEN`, `MAPBOX_ACCESS_TOKEN`, `AI_API_KEY` /
  `GEMINI_API_KEY`, `RESPONDER_API_URL` / `RESPONDER_API_KEY`,
  `HOSPITAL_API_URL`, `SAFEZONE_DB_DRIVER=supabase` + `SAFEZONE_SUPABASE_*`.

## Run the dev server
Preferred port 3000; if busy, pick a free port (e.g. `-p 3001`) and use it in
the URL.
```powershell
# From D:\SafeZone
powershell -NoProfile -Command "(Start-Process -FilePath 'npm.cmd' -ArgumentList 'run','dev' -RedirectStandardOutput '.freebuff\preview.log' -RedirectStandardError '.freebuff\preview.log.err' -WindowStyle Hidden -PassThru).Id"
```
Wait until `http://localhost:3000/` answers HTTP 200 before registering the
preview.
