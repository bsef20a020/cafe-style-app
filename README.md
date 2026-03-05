# NOFFELO Studio

Premium cafe + lounge website with booking flow, analytics, and admin dashboard.

## Features
- Luxury landing page with responsive UI
- Reservation form with WhatsApp handoff + booking reference
- Admin dashboard with filters, KPIs, export CSV, status updates
- JSON-driven menu (`menu-data.json`)
- Optional backend API (Python + SQLite via Docker)
- Optional Google Sheets pipeline (`google-apps-script.gs`)

## Project Structure
- `index.html` frontend site
- `admin.html` admin dashboard
- `menu-editor.html` menu update tool
- `menu-data.json` menu source data
- `backend/server.py` ingest + admin list API
- `docker-compose.yml` local backend orchestration
- `config.runtime.example.js` runtime config template

## Quick Start (Local)
1. Install a static server (or use VS Code Live Server).
2. Copy runtime config:
```bash
cp config.runtime.example.js config.runtime.js
```
3. Open `config.runtime.js` and set values.
4. Serve project root and open:
- `http://127.0.0.1:5500/index.html`
- `http://127.0.0.1:5500/admin.html`

## Admin Login
Admin password is verified on backend via:
- `POST /admin/login` with `{ "password": "..." }`
- Response returns short-lived bearer token
- `GET /admin/list` requires `Authorization: Bearer <token>`

## Backend (Docker)
1. Create env file:
```bash
cp .env.example .env
```
2. Set strong values in `.env`:
- `NOFFELO_ADMIN_KEY`
- `NOFFELO_ADMIN_PASSWORD`
- `NOFFELO_ADMIN_SESSION_SECRET`
- `NOFFELO_INGEST_TOKEN`
- `NOFFELO_CORS_ORIGINS`
3. Start backend:
```bash
docker compose up -d --build
```
4. Check health:
```bash
curl http://127.0.0.1:8787/health
```
5. Run checks:
```bash
bash scripts/preflight_check.sh
bash scripts/smoke_test_backend.sh
```

## Frontend Runtime Config
Create `config.runtime.js` (already gitignored) and set:
```js
window.__NOFFELO_BACKEND_ENDPOINT__ = "https://your-backend-domain/ingest";
window.__NOFFELO_INGEST_TOKEN__ = "your-ingest-token";
window.__NOFFELO_MAP_PIN__ = "https://maps.google.com/?q=MM+Alam+Road+Lahore";
window.__NOFFELO_OPENING_HOURS__ = "Cafe 9am-9pm, Lounge 6pm-11pm";
```

## Deploy (Free Hosting)
### Frontend (Netlify)
1. Push repo to GitHub.
2. Import repo in Netlify.
3. Build command: none.
4. Publish directory: project root.
5. Add custom domain or use Netlify subdomain.

### Backend (Render/Railway/Fly)
1. Deploy `backend/` as a web service.
2. Expose port `8787`.
3. Set env vars from `.env`.
4. Add your Netlify domain to `NOFFELO_CORS_ORIGINS`.
5. Put backend ingest URL into `config.runtime.js`.

## Google Apps Script (Optional)
If you do not want Docker backend:
- Deploy `google-apps-script.gs` as web app
- Follow `GOOGLE_SHEETS_SETUP.md`
- Use that endpoint in frontend ingest flow

## Pre Go-Live Checklist
- Replace `example.com` in `robots.txt` and `sitemap.xml`
- Use strong admin password and rotate periodically
- Keep `.env` and `config.runtime.js` private
- Verify reservation, WhatsApp, analytics, and admin pull flow
- Run `QA_CHECKLIST.md`

## Security Notes
- Never commit secrets
- Restrict CORS to known domains only
- Keep ingest token private
- Change keys immediately if leaked

See also:
- `BACKEND_DOCKER.md`
- `SECURITY_NOTES.md`
- `LAUNCH_COMMANDS.md`
