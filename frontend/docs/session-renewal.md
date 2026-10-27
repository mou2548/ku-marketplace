# Session renewal

## Policy

- Access token: 15 minutes. Proxy refreshes when fewer than 60 seconds remain.
- Session: seven days from login/OTP verification, with a fixed absolute deadline.
  There is no inactivity timeout; background polling cannot extend that deadline.
- Existing access-only sessions need one new login to receive a refresh cookie.
- No database migration or new environment variable is required. Redis must be
  available for login, refresh and authenticated requests carrying a session ID.
  Redis loss/eviction invalidates sessions; all API instances must share Redis
  and token secrets. Protect Redis access and use persistent storage as needed.

## API contract

Login and OTP verification return `user`, `accessToken`, `refreshToken`, and
`sessionExpiresAt` (Unix seconds) inside the existing response envelope.
`user` never includes a password hash. Token responses have `Cache-Control: no-store`.

`POST /auth/refresh` takes `{ refreshToken }` in JSON and returns the same three
token fields, preserving the original deadline. The legacy backend refresh cookie
is also updated, but possession of a cookie alone does not authorize this endpoint.
The web's Server Actions consume tokens server-side and write HttpOnly, SameSite=Lax
cookies (`session` and `ku-refresh`), Secure in production. No refresh token is
returned to client component state or stored in localStorage.

`POST /auth/logout` takes `{ refreshToken }` and revokes the whole family,
including access tokens. An old rotated refresh token can still revoke its family.
The frontend clears both cookies only after the backend call succeeds.

## Concurrency and revocation

Redis Lua rotates atomically across API workers. For 30 seconds after rotation,
the immediately previous token returns the identical new pair, and the current
token does not rotate again. This permits parallel page loads, polling, and tabs
without advancing the token chain several times. Reuse outside that bounded grace
period revokes the family. Exceptionally delayed in-flight requests exceeding the
grace period can require another login.

Each family stores a digest of the password hash at login. Guards and refresh
compare it with the current account, so a password reset invalidates sessions on
all devices. Account deletion blocks access and refresh; restricted accounts retain
the existing profile/appeal exceptions. Legacy tokens without a session ID remain
valid until their original 15-minute expiry and cannot be refreshed.

## Frontend flow

Proxy runs for page requests, `/api/session`, and Server Action POSTs. It skips
static assets only. When renewal succeeds, it updates request cookies before the
page/action runs and sends Set-Cookie on the response. Backend guards remain the
authorization boundary. The frontend does not replay a business mutation.

A definitive refresh 401 clears both cookies. Network/Redis/server failures return
503 without clearing credentials or forwarding a mutation. A visible-tab session
check runs once per minute and on focus; only a definitive 401 displays an expired
session notice. Signing in in another tab preserves the original mounted form.
Unsaved data is not persisted across reloads or navigation.

## Verification

- `npm test --prefix backend -- --runInBand`
- `npm run test:e2e --prefix backend -- --runInBand session-refresh.e2e-spec.ts`
- `npm test --prefix frontend`
- `npm run lint --prefix frontend`
- `npm run build --prefix backend`
- `npm run build --prefix frontend`

Integration tests isolate Redis keys and exercise expiry, concurrent rotation,
reuse detection, logout, password changes, malformed tokens and absolute expiry.
Frontend tests check fresh/missing/expired access cookies, same-request forwarding
for GET and Server Actions, cookie lifetime, and transient failures.
