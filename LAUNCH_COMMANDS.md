# Launch Commands (Copy/Paste)

## 1) Prepare local secrets
```bash
cp .env.example .env
# edit .env with strong keys (ADMIN_KEY, ADMIN_PASSWORD, SESSION_SECRET, INGEST_TOKEN)
```

## 2) Start backend
```bash
docker compose up -d --build
```

## 3) Export vars for smoke test
```bash
set -a
source .env
set +a
```

## 4) Smoke test backend
```bash
./scripts/smoke_test_backend.sh
```

## 5) Preflight project checks
```bash
./scripts/preflight_check.sh
```

## 6) Push to GitHub
```bash
git add .
git commit -m "Production-ready dashboard and deploy tooling"
git push
```

## 7) Netlify deploy
- Import GitHub repo
- Build command: (empty)
- Publish directory: `.`

## 8) After Netlify URL generated
- Update `robots.txt` and `sitemap.xml` with real domain
- Re-run `./scripts/preflight_check.sh`
- Commit + push
