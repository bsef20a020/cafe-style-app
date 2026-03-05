# Security Notes

## Do not commit secrets
- Keep backend secrets in `.env`.
- Never hardcode ingest token in git for production.

## Required secret changes before launch
- `NOFFELO_ADMIN_KEY` in `.env`
- `NOFFELO_ADMIN_PASSWORD` in `.env`
- `NOFFELO_ADMIN_SESSION_SECRET` in `.env`
- `NOFFELO_INGEST_TOKEN` in `.env`

## CORS
Set `NOFFELO_CORS_ORIGINS` to your real frontend origins only.

## API auth
`POST /ingest` requires Bearer token (`NOFFELO_INGEST_TOKEN`).

## Admin endpoint
- `POST /admin/login` requires correct admin password.
- `GET /admin/list` requires Bearer admin session token.

## Optional hardening
- Put backend behind reverse proxy with HTTPS.
- Add IP allowlist for admin route.
- Rotate keys periodically.
