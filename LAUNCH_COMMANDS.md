# Launch Commands

## Prepare Local Env

```bash
cp .env.example .env
```

Edit `.env` with strong admin and JWT values.

## Start MERN Stack

```bash
docker compose up --build
```

## Seed Database

```bash
docker compose exec server npm run seed
```

## Open App

- `http://localhost:5173`
- `http://localhost:5173/admin/login`
- `http://localhost:5000/api/health`

## Local Non-Docker Mode

```bash
npm --prefix server install
npm --prefix client install
npm run seed
npm run server
npm run client
```

## Smoke Check

```bash
bash scripts/smoke_test_mern.sh
```
