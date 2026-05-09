# NOFFELO Customer Accounts And Password Reset Design

Date: 2026-05-09

## Goal

Add production-ready customer accounts to NOFFELO so visitors can sign up, log in, place orders, reserve tables, and later review their own orders and reservations. The account system should improve repeat-customer experience without blocking guest checkout or guest reservations.

## Current Context

The app already has:

- Public menu, order checkout, and reservation flows
- Admin login for staff using JWT and an admin-only cookie
- Admin dashboard for orders, reservations, menu, and analytics
- Express, Mongoose, React, Vite, and Docker Compose

The app does not currently have:

- Customer signup/login
- Customer profile storage
- User-linked order history
- User-linked reservation history
- Forgot-password flow

Admin authentication must stay separate from customer authentication.

## Scope

This feature will add:

- Customer signup, login, logout, and current-user session check
- Forgot-password and reset-password flow
- Customer account page with profile summary, orders, and reservations
- Optional linking of new orders and reservations to the logged-in customer
- Auto-filled customer details in order and reservation forms when logged in
- Navigation state that shows `Login` for guests and `Account` for logged-in customers
- Backend validation, rate limiting, secure password hashing, and reset-token expiry

Guest users must still be able to place orders and reserve tables.

Out of scope for this first customer-account version:

- OTP login
- Social login
- Email verification before first login
- Multi-factor authentication
- User profile editing beyond the signup details
- Changing payment behavior

## Architecture

The backend will add a separate customer auth layer:

- `server/src/models/CustomerUser.js`
- `server/src/routes/auth.js`
- `server/src/routes/account.js`
- `server/src/middleware/customerAuth.js`
- `server/src/services/email.js`

Customer sessions will use a dedicated HTTP-only cookie, for example `noffelo_customer_session`. Admin sessions keep using the existing admin cookie and admin middleware.

The frontend will add:

- `client/src/auth/customerSession.js` or a small React auth context
- `client/src/pages/LoginPage.jsx`
- `client/src/pages/SignupPage.jsx`
- `client/src/pages/ForgotPasswordPage.jsx`
- `client/src/pages/ResetPasswordPage.jsx`
- `client/src/pages/AccountPage.jsx`

The existing `api/client.js` module will gain customer auth and account methods.

## Data Model

`CustomerUser`:

- `name`
- `email`, unique and lowercased
- `phone`
- `passwordHash`
- `resetPasswordTokenHash`
- `resetPasswordExpiresAt`
- `lastLoginAt`
- timestamps

`Order` will gain:

- `customerUser`: optional ObjectId reference to `CustomerUser`

`Reservation` will gain:

- `customerUser`: optional ObjectId reference to `CustomerUser`

Existing guest records remain valid because the account link is optional.

## API Design

Public customer auth routes:

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

Protected account routes:

- `GET /api/account/orders`
- `GET /api/account/reservations`

Order and reservation creation stay public:

- `POST /api/orders`
- `POST /api/reservations`

When a valid customer cookie is present, these create routes will attach `customerUser` to the new record. When no customer cookie is present, they continue as guest flows.

## Forgot Password Flow

1. User enters email on `/forgot-password`.
2. API always returns the same success message, whether the email exists or not.
3. If the email exists, API creates a cryptographically random token.
4. API stores only a SHA-256 hash of the token in MongoDB.
5. API stores an expiry time, recommended 15 minutes.
6. API emails a reset link using `CLIENT_URL`, for example `/reset-password/<token>`.
7. User submits a new password from `/reset-password/:token`.
8. API hashes the submitted token, finds a matching unexpired user, updates the password hash, clears reset fields, and logs the user in or asks them to log in.

In development, if SMTP is not configured, the server may log the reset URL to the console. In production, reset links must only be sent by email and must not be returned in API responses.

## Frontend Flow

Navigation:

- Guest sees `Login`
- Logged-in customer sees `Account`
- Admin link remains separate

Signup/login:

- Signup collects name, email, phone, password
- Login collects email and password
- Successful auth redirects to `/account` or the previous intended page

Menu checkout:

- Guest sees the current checkout form
- Logged-in customer sees name, phone, and email auto-filled
- Submitted order links to the customer account

Reservation:

- Guest sees the current reservation form
- Logged-in customer sees name, phone, and email auto-filled
- Submitted reservation links to the customer account

Account page:

- Shows customer name, email, and phone
- Shows recent orders with reference, total, status, payment status, and date
- Shows recent reservations with reference, visit date/time, guests, and status
- Includes logout

## Security

- Hash passwords with bcrypt.
- Never store reset tokens in plain text.
- Use HTTP-only cookies for sessions.
- Keep customer and admin cookies separate.
- Add rate limiting to signup, login, forgot-password, and reset-password endpoints.
- Return generic forgot-password responses to prevent email enumeration.
- Validate all auth payloads with Zod.
- Do not expose `passwordHash` or reset fields in API responses.
- Use `secure: true` cookies in production.
- Require strong enough passwords, minimum 8 characters.

## Email Configuration

Add environment variables for SMTP:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `MAIL_FROM`

If SMTP settings are absent in development, the API logs the reset link. In production, missing SMTP settings should make forgot-password fail internally while still returning the generic public response.

## Error Handling

Backend:

- Validation errors return `400` with field details.
- Invalid login returns `401`.
- Missing customer session returns `401`.
- Forgot-password always returns generic success.
- Expired or invalid reset token returns a safe error asking the user to request a new link.

Frontend:

- Forms show inline field errors.
- Auth failures show concise messages.
- Account page redirects guests to login.
- Empty order/reservation history shows practical empty states.

## Testing And Verification

Minimum verification:

- Customer can sign up.
- Customer can log in and log out.
- `GET /api/auth/me` returns the logged-in customer.
- Guest order still works.
- Logged-in order links to account and appears on `/account`.
- Guest reservation still works.
- Logged-in reservation links to account and appears on `/account`.
- Forgot-password returns generic success for existing and unknown emails.
- Reset token is stored hashed, expires, and can only be used once.
- Password reset allows login with the new password and rejects the old password.
- Docker Compose runs client, server, and MongoDB on the expected ports.

## Implementation Notes

Keep the implementation close to the existing app style. Use the current Express route structure, Mongoose model patterns, Zod validation, shared API client, and existing form styling. Avoid changing the admin auth behavior while adding customer auth.
