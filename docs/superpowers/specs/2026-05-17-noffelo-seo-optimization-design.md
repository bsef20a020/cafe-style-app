# NOFFELO SEO Optimization Design

Date: 2026-05-17

## Goal

Improve NOFFELO's technical SEO for public guest pages while keeping the visible website unchanged.

The update should make search and social crawlers understand the cafe, key public routes, FAQ content, menu preview, and canonical production URL more reliably.

## Current Context

The app already has:

- React Router routes in `client/src/App.jsx`
- A reusable `SeoMeta` component
- Static metadata and a small `Restaurant` JSON-LD snippet in `client/index.html`
- Public pages for home, menu, our story, FAQ, and reservations
- Utility and private routes for login, account, order status, reset password, and admin
- Existing `robots.txt` and `sitemap.xml`

The current gaps are:

- `robots.txt` and `sitemap.xml` still point at `https://example.com`
- Canonical URLs depend directly on `window.location.origin`, which is not reliable across preview, staging, and production
- Private and utility pages are not explicitly marked `noindex`
- Social metadata is basic and does not include all common Twitter fields
- Structured data is minimal and not route-aware
- FAQ content exists but is not exposed as FAQ schema

## Scope

This change will add:

- A central SEO configuration with `VITE_SITE_URL`, defaulting to `https://noffelo.com`
- Route-aware metadata for titles, descriptions, canonical paths, social sharing, robots directives, and JSON-LD
- `noindex,nofollow` metadata for private or utility pages
- Improved public page metadata for home, menu, our story, FAQ, and reservations
- Structured data for the restaurant, website, FAQ page, and menu offerings
- Updated `robots.txt` and `sitemap.xml` using the production fallback domain

Out of scope:

- Visual redesign
- Server-side rendering or prerendering
- Database-managed SEO fields
- Individual menu item SEO landing pages
- Google Business Profile setup or off-site SEO work

## Recommended Approach

Use a small reusable SEO layer inside the React client.

The app should keep one source of truth for:

- Site URL
- Brand name
- Default image
- Public business details
- Route metadata
- Structured data builders

`SeoMeta` should remain a lightweight component that updates the document head from route metadata. This keeps the change focused and avoids bringing in a new dependency only for head management.

## URL And Indexing Rules

Production URL:

- Read from `import.meta.env.VITE_SITE_URL`
- Fall back to `https://noffelo.com`
- Remove trailing slashes before building canonical URLs

Indexable public routes:

- `/`
- `/menu`
- `/our-story`
- `/faq`
- `/reserve`

Noindex routes:

- `/login`
- `/signup`
- `/forgot-password`
- `/reset-password/:token`
- `/account`
- `/orders/:reference`
- `/admin/login`
- `/admin`
- Unknown routes

The sitemap should include only indexable public routes.

## Metadata

Each public page should have:

- A clear title
- A concise search description
- Canonical URL
- Open Graph title, description, type, URL, image, and site name
- Twitter card, title, description, and image
- `robots` directive

Private and utility pages should keep helpful browser titles but receive `noindex,nofollow`.

## Structured Data

Add JSON-LD through `SeoMeta`.

Global/public page schema:

- `Restaurant` with name, description, cuisine, price range, opening hours, address locality, same-as links where available, and site URL
- `WebSite` with site name, URL, and description

Route-specific schema:

- `/faq`: `FAQPage` generated from `client/src/data/faqs.js`
- `/menu`: `Menu` and menu item offers from fallback menu data, enough for crawlers to understand the menu even before live API data loads
- `/reserve`: reservation-oriented `WebPage` metadata that points guests to the booking route

Schema should use stable public data and should not include private customer, order, or admin information.

## Files To Change

Expected frontend files:

- `client/src/components/SeoMeta.jsx`
- `client/src/App.jsx`
- New SEO helper/config file under `client/src/seo/`
- `client/index.html`
- `client/.env.example`

Expected root files:

- `robots.txt`
- `sitemap.xml`

## Testing And Verification

Minimum verification:

- `npm --prefix client run build` passes
- Public routes produce the expected title, description, canonical URL, robots directive, and social tags
- Private routes produce `noindex,nofollow`
- JSON-LD scripts are valid JSON
- `robots.txt` references `https://noffelo.com/sitemap.xml`
- `sitemap.xml` contains only indexable public routes

