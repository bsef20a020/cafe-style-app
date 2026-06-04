# NOFFELO MERN

Market-ready cafe and evening lounge project built with MongoDB, Express, React, Node, and Docker.

## What This Rebuild Includes

- React + Vite public cafe app
- Dynamic menu loaded from MongoDB
- Reservation form with booking reference and WhatsApp follow-up
- Express API with validation, rate limits, CORS, and JWT admin auth
- MongoDB models for menu items, reservations, admins, and analytics events
- Admin dashboard for reservations, status updates, menu items, and metrics
- Docker Compose for client, server, and MongoDB
- Seed script for starter menu data and admin login

## Project Structure

- `client/` React frontend
- `server/` Express + Mongoose API
- `server/src/models/` MongoDB models
- `server/src/routes/` API route modules
- `menu-data.json` legacy menu seed source
- `docker-compose.yml` local MERN stack
- `docs/superpowers/specs/` approved rebuild design

## Quick Start With Docker

1. Create local environment values:

```bash
cp .env.example .env
```

2. Start the full stack:

```bash
docker compose up --build
```

3. Seed MongoDB in another terminal:

```bash
docker compose exec server npm run seed
```

4. Open the app:

- Public site: `http://localhost:5173`
- Admin login: `http://localhost:5173/admin/login`
- API health: `http://localhost:5000/api/health`

Default local admin values are in `.env.example`. Change them before sharing or deploying.

## Local Development Without Docker

Install dependencies:

```bash
npm --prefix server install
npm --prefix client install
```

Run MongoDB locally, then seed and start both apps:

```bash
npm run seed
npm run server
npm run client
```

## Key API Routes

- `GET /api/health`
- `GET /api/menu`
- `POST /api/reservations`
- `POST /api/admin/login`
- `GET /api/admin/reservations`
- `PATCH /api/admin/reservations/:id`
- `GET /api/admin/analytics`
- `GET /api/admin/menu`
- `POST /api/admin/menu`
- `PATCH /api/admin/menu/:id`
- `DELETE /api/admin/menu/:id`

## Environment

Important values:

- `MONGO_URI`
- `JWT_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `CLIENT_ORIGINS`
- `WHATSAPP_NUMBER`
- `RESERVATION_SLOT_CAPACITY`
- `VITE_API_URL`

Never commit real production secrets.
