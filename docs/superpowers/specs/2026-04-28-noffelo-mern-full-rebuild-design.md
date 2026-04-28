# NOFFELO MERN Full Rebuild Design

Date: 2026-04-28

## Goal

Rebuild the current static NOFFELO cafe project into a dynamic, portfolio-quality MERN application with Docker support. The rebuilt project should feel market-ready: a polished public cafe website, a practical admin dashboard, real API persistence, and a clear local/deployment story.

## Current Context

The repository currently contains static HTML pages (`index.html`, `admin.html`, `404.html`), JSON menu data, a Python backend, Docker support for that Python backend, and project docs. The rebuild will create a MERN structure while keeping the current static files as reference material until the new app is stable.

There are existing uncommitted edits in `index.html` and `admin.html` changing the WhatsApp/phone number. The rebuild must not revert those changes.

## Scope

The first implementation should deliver a market-ready MVP foundation:

- React + Vite frontend in `client/`
- Express + Node backend in `server/`
- MongoDB persistence using Mongoose
- Docker Compose for client, server, and MongoDB
- Full UI rebuild for a market-ready cafe/lounge product, not a visual copy of the old static site
- Public cafe experience with home, menu, reservations, contact/location, and 404
- Admin experience with login, dashboard, reservations, menu management, and analytics
- Seed data based on the current menu/content where useful
- Basic security, validation, and error states

Out of scope for the first implementation:

- Online payments
- Third-party authentication
- Real email/SMS integrations
- Production hosting setup beyond Docker-ready configuration and docs

## Architecture

The app will use a standard MERN split:

- `client/`: React + Vite single page app
- `server/`: Express API service
- `server/src/models/`: Mongoose schemas
- `server/src/routes/`: API route modules
- `server/src/controllers/`: request handlers
- `server/src/middleware/`: auth, validation, errors, rate limiting
- `server/src/config/`: environment and database connection
- `docker-compose.yml`: MongoDB, API, and frontend services

The current static files and Python backend remain in the repo during the rebuild as reference material. The new MERN app and Docker Compose stack become the primary implementation after verification.

## Frontend And UI Direction

The frontend will be a fresh UI rebuild rather than a direct HTML port. The old static pages are reference material for brand/content only. The final visual direction should be discussed and approved before detailed UI implementation so the project can feel like a credible market-side cafe product, not just a converted template.

The new UI should keep the NOFFELO premium cafe/lounge identity while improving the product feel:

- Strong first viewport with brand, booking action, and cafe/lounging atmosphere
- Dynamic menu sections loaded from the API
- Reservation form with validation, success state, booking reference, and WhatsApp handoff
- Contact/location section driven by configuration
- Admin route group with authenticated dashboard
- Responsive layout for mobile and desktop
- Clean loading, empty, and error states

The UI discussion should cover visual personality, color palette, typography, section structure, admin dashboard density, mobile behavior, and the kind of market positioning NOFFELO should communicate.

Frontend state should stay simple. API data can be loaded through small service modules and React hooks. Avoid adding a large state library unless the app clearly needs one.

## Backend Design

The Express API will provide:

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

Admin routes require a signed JWT. Public reservation submission should validate input, store the reservation, and return a booking reference.

## Data Model

Initial MongoDB collections:

- `MenuItem`: name, category, description, price, tags, image, featured, available, sortOrder
- `Reservation`: name, phone, date, time, guests, occasion, message, status, reference, source, createdAt
- `AdminUser`: name, email, passwordHash, role, createdAt
- `AnalyticsEvent`: type, path, metadata, createdAt

Menu and admin seed scripts should make the app usable immediately after Docker startup.

## Data Flow

Public visitor flow:

1. React loads menu and site content from the API.
2. Visitor submits reservation form.
3. API validates and stores the reservation in MongoDB.
4. API returns a reference.
5. Frontend shows confirmation with a clear WhatsApp follow-up button.

Admin flow:

1. Admin logs in with email/password.
2. API returns JWT.
3. React stores the token for the session.
4. Admin dashboard fetches reservations, menu items, and analytics.
5. Admin can update reservation status and manage menu items.

## Error Handling

Backend:

- Central error middleware returns consistent JSON errors.
- Validation errors return `400`.
- Auth failures return `401` or `403`.
- Missing resources return `404`.
- Unexpected errors return `500` without leaking internals.

Frontend:

- Forms show inline validation messages.
- API failures show helpful retry states.
- Admin expired-session errors redirect to login.
- Empty lists show practical empty states rather than blank screens.

## Security

- Store secrets in environment variables.
- Never commit real credentials.
- Hash admin passwords with bcrypt.
- Use JWT for admin sessions.
- Add basic rate limiting to auth and reservation endpoints.
- Configure CORS through environment variables.
- Validate all request payloads.

## Docker

Docker Compose should run:

- `mongo`: MongoDB with persistent volume
- `server`: Express API
- `client`: Vite/React app

The project should include `.env.example` files and clear commands for local startup, seeding, and testing.

## Testing And Verification

Minimum verification for the first implementation:

- Backend health endpoint works
- MongoDB connection succeeds
- Seed script creates admin user and menu items
- Public menu loads from API
- Reservation form creates a database record
- Admin login works
- Admin can view and update reservations
- Admin can manage menu items
- Docker Compose starts all services cleanly
- Frontend is checked in desktop and mobile viewports

## Implementation Notes

Use existing content, menu data, and brand direction as source material, but do not force the old static layout into React unchanged. The goal is a polished, dynamic MERN project that looks credible as a market-ready cafe/lounging product and as a strong developer portfolio project.
