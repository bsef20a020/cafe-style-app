# QA Checklist

## Core flow
- [ ] Homepage loads without console errors.
- [ ] Menu cards render from `menu-data.json`.
- [ ] Reservation submit opens WhatsApp with full message.
- [ ] Booking reference is shown and copy button works.
- [ ] Analytics events are recorded locally.

## Admin
- [ ] Admin unlock works with custom password.
- [ ] Reservation filters (date/venue) work.
- [ ] CSV exports download valid files.
- [ ] Backend pull works with valid URL/key.

## Backend (Docker)
- [ ] `GET /health` returns `{ ok: true }`.
- [ ] `POST /ingest` requires token.
- [ ] Rate limit triggers on abusive requests.
- [ ] `/admin/list` requires admin key.

## UX
- [ ] Mobile menu opens/closes and locks body scroll.
- [ ] Hero CTA stacking is clean on mobile.
- [ ] Modal closes on ESC/backdrop/close button.

## Accessibility
- [ ] Keyboard tab order is logical.
- [ ] Focus ring visible on controls.
- [ ] Form errors focus invalid field.
- [ ] Skip link works.

## Deployment
- [ ] Netlify deploy works from GitHub.
- [ ] `robots.txt` and `sitemap.xml` use real domain.
