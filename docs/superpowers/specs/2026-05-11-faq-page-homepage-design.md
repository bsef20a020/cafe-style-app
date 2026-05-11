# NOFFELO FAQ Page And Homepage Preview Design

Date: 2026-05-11

## Goal

Add a guest-facing FAQ experience to NOFFELO in two places:

- A compact FAQ preview on the homepage before the reservation form
- A complete FAQ page at `/faq`

The FAQ should answer practical guest questions before they reserve, order, or contact staff.

## Current Context

The app already has:

- React Router routes configured in `client/src/App.jsx`
- Public pages for home, menu, story, reservations, order status, and account auth
- Shared `Navigation`, `Footer`, `SeoMeta`, and `ReservationForm` components
- Shared visual patterns in `client/src/styles.css`

The app does not currently have:

- A public FAQ route
- FAQ links in navigation or footer
- Reusable FAQ content

## Scope

This change will add:

- A reusable FAQ content/component layer
- A homepage FAQ preview with four high-value questions
- A full `/faq` page with the complete FAQ list
- FAQ navigation and footer links
- SEO metadata for `/faq`
- Responsive styling that follows the current NOFFELO visual system

Out of scope:

- Admin-managed FAQ editing
- Database storage for FAQ items
- Search/filtering inside the FAQ page
- Backend API changes

## Recommended Approach

Use a shared FAQ component and shared FAQ data.

The homepage and FAQ page should render from the same content source, so future copy edits only happen in one place. The homepage will pass a compact limit, and the full page will render the complete list.

## Content

The full FAQ page will include these topics:

- Opening hours and cafe/lounge timing
- Reservations and confirmation
- Editing or cancelling a reservation
- Walk-ins
- Online ordering
- Pickup and delivery details
- Payment methods
- Finding order status or contacting staff

The homepage preview will show the most decision-helpful questions:

- Opening hours
- Reservation confirmation
- Online ordering
- Changing a booking

Copy should be concise, guest-facing, and aligned with the existing polished cafe tone.

## Frontend Design

Add `FAQSection` as a reusable public component.

Expected behavior:

- Renders FAQ items as semantic disclosure controls using native `details` and `summary`
- Supports a compact homepage variant
- Supports an optional heading/action area
- Keeps answers readable without adding complex state

Add `FAQPage`.

Expected behavior:

- Uses `page-section` and `page-intro` patterns already used by menu/reserve pages
- Shows the full FAQ list
- Includes calls to action for reservations and WhatsApp/contact where useful

Update homepage:

- Place the compact FAQ section after the story section and before `ReservationForm`
- Include a `View all FAQs` link to `/faq`

Update navigation/footer:

- Add a `FAQ` link to the public nav
- Add a `FAQ` link to the footer grid

## Routing And SEO

Update `client/src/App.jsx`:

- Import `FAQPage`
- Add a `/faq` route inside `SiteFrame`
- Add route metadata:
  - Title: `FAQ — NOFFELO`
  - Description: practical questions about NOFFELO hours, reservations, online ordering, payment, and guest support

## Styling

Use the existing design language:

- 8px radius
- `var(--cream)` panels
- `var(--line)` borders
- `var(--moss)` accent color
- Responsive single-column behavior on mobile

The FAQ list should not feel like a nested card layout. It should be a clean section with individual disclosure rows.

## Accessibility

Use native disclosure elements where possible:

- `details`
- `summary`

This gives keyboard and screen-reader support without custom interaction code.

Links and buttons should keep accessible text and use existing button/link styles.

## Testing And Verification

Minimum verification:

- `/faq` route renders inside the public site frame
- Homepage shows the compact FAQ before the reservation form
- Navigation and footer FAQ links work
- FAQ disclosure rows open and close with mouse and keyboard
- Mobile layout stays readable without text overflow
- Build or lint command passes if available

