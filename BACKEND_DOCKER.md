# Docker Backend (NOFFELO)

## 1) Configure env
```bash
cp .env.example .env
```
Edit `.env` and set strong values:
- `NOFFELO_ADMIN_KEY`
- `NOFFELO_INGEST_TOKEN`
- optional CORS/rate-limit values

## 2) Run
```bash
docker compose up -d --build
```

## 3) Health
```bash
curl http://127.0.0.1:8787/health
```

## Endpoints
- `POST /ingest` for analytics/reservations
- `GET /health`
- `GET /admin/list?key=YOUR_ADMIN_KEY`

## Security
- `POST /ingest` requires Bearer token from `NOFFELO_INGEST_TOKEN`
- CORS restricted by `NOFFELO_CORS_ORIGINS`
- Rate limit controlled by `NOFFELO_RATE_LIMIT_RPM`

## Frontend hookup
In `index.html`:
- `backendEndpoint = "http://127.0.0.1:8787/ingest"`
- `backendIngestToken` should match `NOFFELO_INGEST_TOKEN`

## Quick ingest test
```bash
curl -X POST http://127.0.0.1:8787/ingest \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_INGEST_TOKEN' \
  -d '{"type":"analytics_event","data":{"event":"smoke_test","page":"/","ts":"2026-03-05T00:00:00Z"}}'
```

## Stop
```bash
docker compose down
```
