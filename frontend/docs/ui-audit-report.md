# UI / UX / functionality audit report

Date: 2026-10-28. Plan: [ui-audit-plan.md](ui-audit-plan.md). Branch `develop` at
`b1a412b`. Find-and-report only: no source file was changed. Screenshots referenced
below are in [ui-audit-evidence/](ui-audit-evidence/).

## Summary

The app is in good shape on the happy path with seed data: 624 automated page loads
across 8 viewport/theme combinations produced no page-level horizontal scroll, no
uncaught client exception, and no raw enum, `undefined` or `NaN` text. Purchases,
shipping, appointment, cancellation, reports and the admin report decision all work
end to end in the browser.

The defects cluster around four root causes, so the fix list is shorter than the
finding list:

1. **Server actions throw instead of returning errors (SYS01).** In a production build
   Next.js replaces thrown messages with a generic sentence, so every API refusal
   (wrong QR code, unavailable trade item, missing PromptPay, unconfirmed meetup)
   reaches the user as "An error occurred in the Server Components render...".
   Development mode shows the real message, which is why this went unnoticed.
2. **Frontend behind backend changes.** PromptPay is now required to sell but cannot be
   entered anywhere (L01, a blocker); slip rejection with a reason exists in the API
   but the button says "not supported yet" (B02).
3. **Availability is not checked client side.** Transferred and reserved items are
   offered in the trade composer and the listing picker (T01, G02).
4. **User text does not wrap.** One long URL or token widens the whole page to
   1200-1900px at phone width (E01, C01).

| Severity | Count |
| --- | --- |
| Blocker | 1 |
| High | 14 |
| Medium | 22 |
| Low | 20 |
| Question | 2 |

## Environment

- Isolated Compose project `ku-ui-audit` (PostgreSQL 15432, Redis 16379) with fresh
  volumes seeded by `init.sql` + schema v3. Backend `dist` on 14000 with no Resend or
  Cloudinary keys. Frontend production build (`next build` + `next start`) on 13000
  from a copy of `frontend/` in a scratch directory. Node 20.20.2. The developer stack
  on 3000/4000 was not touched.
- Playwright 1.62.1, Chromium 151, axe-core 4.10 (WCAG 2.0/2.1/2.2 A and AA tags).
  Timezone Asia/Bangkok.
- Accounts: user1, user2, admin1, user8 (seed), userc (registered during the run).
- Edge data created on the isolated database: 200-character Thai title without spaces,
  120-character unbroken URL as item name and as post text, price 0 and 99,999,999.99,
  quantity 99,999, 12 images, extreme portrait and landscape images, dead image URL,
  whitespace-only and HTML item names, 110 chat messages including 1,900-character and
  unbroken-URL messages.

## Coverage

| Area | Method | Result |
| --- | --- | --- |
| Static | lint, `tsc --noEmit`, `node --test`, rule greps | 0 errors, 2 lint warnings, 23/23 tests |
| Layout sweep | 78 routes x 360/390/768/1024/1280/1920 light + 390/1280 dark (624 loads) | Done |
| Edge-data sweep | 33 routes x 360 light, 390 dark, 768, 1280 | Done |
| Accessibility | axe at 390 light and dark on every route | Done |
| Auth | login, register, OTP, forgot/reset, returnTo, session expiry, open redirect | Done |
| Buy (shipping) | buy, slip upload validation, seller review, tracking, receipt, completed state | Done (slip upload itself blocked by missing Cloudinary, slip set through API) |
| Trade | composer tap, keyboard, quantity dialog, cash input, send | Done |
| Meetup and QR | propose, validate, accept, QR page, scan fallback, wrong code | Done (real camera not tested) |
| Cancellation | request, reason validation, counterpart view | Done (accept/reject not executed) |
| Report | post report dialog, validation, success | Done |
| Giveaway | browse, detail, manage, non-owner manage | Partial (no open giveaway in seed to join) |
| Account | profile, edit, listing form | Done |
| Admin | report queue, take and decision form, memberships | Partial (decision not submitted; appeals not exercised) |
| API outage | backend stopped: (app), admin, chat, login | Done |
| WebKit pass | | Not run: host lacks WebKit system libraries (`playwright install-deps` needs sudo) |
| Design critique (`impeccable`) | | Not run in this session; see "Not tested" |

## Findings

Severity: Blocker = a core journey cannot finish; High = misleads, loses input, or
breaks at a required width; Medium = clearly wrong with a workaround; Low = polish.
"Source" is the suspected location, not a verified root cause.

### Blocker

| ID | Area | Finding | Evidence | Source |
| --- | --- | --- | --- | --- |
| L01 | Listing | Nobody can list an item for sale. The API requires a PromptPay ID (commit `b4bda6a`, 409 "กรุณาตั้งค่า PromptPay ในโปรไฟล์ก่อนลงขายสินค้า"), but no frontend screen can set it: `/account/edit` has first name, last name and phone only. Every seeded user has `promptpay_id` NULL. Publishing "For sale" at `/inventory/17/list` returns 500 and the generic SYS01 message. | [l01](ui-audit-evidence/l01-list-for-sale-generic-error-390.png) | `app/(app)/account/edit/edit-form.tsx`, `lib/actions/posts.ts` |

### High

| ID | Area | Finding | Evidence | Source |
| --- | --- | --- | --- | --- |
| SYS01 | All mutations | 55+ server actions in `lib/actions/*` (all except auth and following) have no `try/catch`. Thrown `ApiError` messages are stripped in production, so about 20 client call sites that show `err.message` display "An error occurred in the Server Components render. The specific message is omitted in production builds..." Observed on offer send, wrong QR code and listing. `lib/actions/auth.ts` already returns `{ error }` and is the pattern to copy. | [t02](ui-audit-evidence/t02-offer-send-generic-error-390.png) | `lib/actions/*.ts` |
| F01 | QR | `/history/1/qr` before the meetup is confirmed: API 400 "Confirm the latest meetup appointment before handover" becomes a 500; the page shows an empty QR box, a running "Valid for 15:00" countdown and "Could not generate a code. Try again." The real reason is hidden and the timer is misleading. | [f01](ui-audit-evidence/f01-qr-unconfirmed-appointment-360.jpg) | `app/(app)/history/[txId]/qr/` |
| A04 | QR | When a device cannot scan, `/history/:id/scan` says "Type the code from the QR instead", but `/history/:id/qr` shows only the QR image with no readable code. The manual fallback is a dead end. | [qr](ui-audit-evidence/a04-qr-without-typeable-code-390.png), [scan](ui-audit-evidence/a04-scan-fallback-asks-for-code-390.png) | `components/kit/qr-ticket.tsx`, scan page |
| A01 | Meetup | The date picker shows "Value must be 10/28/2026 or later" for a past date but "Propose this meetup" stays enabled; the proposal is saved as 2020-01-01 (the API accepts it), the other side can accept it, and the QR opens. | [a01](ui-audit-evidence/a01-past-meetup-date-allowed-390.png) | `components/kit/date-picker.tsx`, appointment form in `room-screen.tsx` |
| B02 | Buy | Seller's "Amount is wrong" shows "Rejecting a slip is not supported yet..." although the API supports rejection with a required reason (commit `64ccc91`, `rejection_reason`, `payment_rejection_reason`). The buyer never sees a rejection reason either. | | `room-screen.tsx:743`, `lib/copy.ts:454` |
| B09 | Buy | After a shipping deal completes, Deal details shows the delivery card twice with a red "Past due" pill and "Confirm once it arrives... That closes the deal." | [b09](ui-audit-evidence/b09-completed-deal-past-due-390.png) | `components/kit/delivery-card.tsx`, deal details drawer |
| T01 | Trade | The offer composer lists items that cannot be offered and lets you add them without any indication: Transferred items and an item reserved by a Processing deal. | [t01](ui-audit-evidence/t01-offer-composer-unavailable-items-390.png) | `app/(app)/offers/new/offer-composer.tsx` |
| T02 | Trade | Sending such an offer: API 409 "An offered item is no longer available", user sees the SYS01 generic message; the composer gives no hint which item is the problem. | [t02](ui-audit-evidence/t02-offer-send-generic-error-390.png) | same |
| G02 | Listing | The `/post` item picker shows a Transferred item as "1 unlisted", i.e. listable. Same root as T01. | | `app/(app)/post/post-composer.tsx` |
| E01 | Market | A long unbroken token (URL, code) in the item name, seller notes or "The owner is looking for" does not wrap: `/market/11` is 1,891px wide at 360, `/market/12` 1,202px. The page scrolls sideways and taps land on the wrong element. | [e01](ui-audit-evidence/e01-long-token-page-overflow-360.jpg) | post detail text blocks; add `overflow-wrap:anywhere` / `break-words` |
| C01 | Chat | Same in chat: a message with an unbroken URL renders as a 1,169px bubble cut off at the screen edge (390 and 1280). | [c01](ui-audit-evidence/c01-chat-url-bubble-overflow-390.png) | `components/kit/chat-thread.tsx` |
| F05 | Register | A non-KU email disables "Send me the code" with no message at all, even after blur, while every password rule shows green. The user cannot tell why. | [f05](ui-audit-evidence/f05-register-non-ku-no-message-390.png) | `app/(auth)/auth-panel.tsx` |
| AD02 | Admin | `/admin/memberships` "Amount is wrong" rejects a request on a single tap: no confirmation, no reason field. | | `app/(admin)/admin/memberships/membership-review.tsx` |
| A06 | QR | A wrong handover code on `/history/:id/scan` shows the SYS01 generic message instead of "invalid or expired code". | | `app/(app)/history/[txId]/scan/page.tsx:41` |

### Medium

| ID | Area | Finding | Source |
| --- | --- | --- | --- |
| F02 | Auth | API messages are shown verbatim in Thai inside the English UI: "อีเมลหรือรหัสผ่านไม่ถูกต้อง", "อีเมลนี้เคยลงทะเบียนแล้ว", "OTP ไม่ถูกต้องหรือหมดอายุแล้ว". Map known API errors to copy. | `lib/actions/auth.ts` |
| F03 | Auth | Login email is not trimmed or lowercased: "  USER1@KU.TH " fails. Phone keyboards capitalise the first letter. | auth panel / action |
| F04 | Auth | Redirect to `/login` from a protected page drops `returnTo`: anonymous `/history/1` lands on `/feed` after login. `returnTo` itself rejects `//evil.com`, `https://evil.com`, `/\evil.com` and `javascript:` correctly. | `proxy.ts` / layouts |
| F06 | Auth | `/verify` opened directly says "We sent a 6-digit code to student.name@ku.th" (placeholder rendered as data) with an active form. | `app/(auth)/verify/page.tsx` |
| N01 | Outage | With the API down, `/chat/1` redirects to `/login` and `/admin` redirects to `/feed` (layout treats a failed viewer fetch as "not signed in / not admin"). Other `(app)` pages correctly show "This page could not load... Try again". Sessions survive once the API returns. [n01](ui-audit-evidence/n01-api-down-chat-redirects-login-390.png), [ok](ui-audit-evidence/n00-api-down-error-boundary-390.png) | `app/(admin)/layout.tsx:27-29`, chat route |
| S03 | Errors | No `error.tsx` for `(admin)`, `(auth)` or `app/posts`, and no `global-error.tsx`. | `app/` |
| B03 | Buy | When the slip upload fails, "Upload failed... try sending it again" renders below the tall slip preview, off screen at 390. | `components/kit/slip.tsx` |
| B08 | Buy | Tracking form accepts a past estimated delivery date (no `min`) and a 3-character tracking number; the deal is "Past due" immediately. | delivery form |
| B10 | Buy | "Request return (within 7 days)" exists only inside Deal details; the completed chat view has no entry point or remaining-days indicator. | deal details |
| T03 | Trade | Extra-cash input strips the decimal point silently: "12.345" becomes 12345; "-50" becomes 50; no maximum. | `offer-composer.tsx` |
| A02 | Meetup | Date field shows `dd/mm/yy` (typing 2020 displays "20") while its error uses US `10/28/2026`. | `date-picker.tsx` |
| A03 | Meetup | Appointment cards omit the year ("Wed 1 Jan, 10:00"), so a past date reads as upcoming. | `lib/date-format.ts` |
| A08 | Cancel | The counterpart sees "your answer needed" with no deadline, although the request dialog promises 72 hours before admin escalation. | cancellation card |
| C02 | Chat | Composer is a single-line `<input>` with no `maxLength`; the API limit is 2,000 characters, so longer text fails through SYS01. Send is enabled when empty. | `chat-thread.tsx` |
| G01 | Giveaway | Giveaway 3 shows the badge "Open for entries" next to "Registration for this giveaway has closed" and two "Past due" deadlines; the list says "No open giveaways right now". Badge uses stored status, body uses dates. | [g01](ui-audit-evidence/g01-giveaway-status-contradiction-390.png) |
| AD01 | Admin | Memberships review reuses the buyer slip card: "Check the slip and confirm payment", "Buyer uploaded", "Amount is wrong". | `membership-review.tsx` |
| P02 | Perf | CLS 0.054-0.096 on `/feed` and `/sellers/4` at 1024 and 1280 (masonry reflow), budget 0.05. | `masonry-grid.tsx` |
| P03 | Perf | First-load JS 372-422 KB compressed per route (admin overview 422, chat/history 372) against the 150 KB budget. | |
| P04 | A11y | axe: `aria-label` on role-less divs (toast region `.z-[120]`, `.fixed`, about 140 hits); unlabeled file inputs (critical); Tabs `aria-controls` pointing at a missing panel (critical); focusable content inside `aria-hidden` gallery; scrollable tables not keyboard focusable; invalid `<dl>` children; nameless link for a whitespace-only item name. | `components/kit/toast.tsx`, `tabs.tsx`, `photo-viewer.tsx` |
| P05 | A11y | Contrast: white on brand `#2e8f5a` is 4.04:1 on every primary button and own chat bubble at 16-17px normal weight (CLAUDE.md section 4 forbids this); dark-mode condition chips 1.74-2.09:1; `text-ink-disabled` 2.2:1 in the chat list; placeholder initials 3.7:1. | `app/globals.css` tokens |
| P08 | Admin | At 360-768 the admin overview queue and "Listings that moved the most" tables are clipped at the right edge with no scroll affordance; KPI numbers (`dd.truncate`) clip vertically. | [p08](ui-audit-evidence/p08-admin-overview-tables-clipped-360.jpg) |
| E07 | Listing | The 409 PromptPay refusal has no UI path at all (see L01); once a field exists, the listing form should link to it before publish. | |

### Low

| ID | Finding |
| --- | --- |
| S01 | Lint: unused `TRANSACTION_STATUS`, `ActorPrompt` in `room-screen.tsx:90,92`. |
| S02 | `lib/giveaways-api 2.ts` is a tracked duplicate of `lib/giveaways-api.ts`. |
| S04 | `motion` is a dependency but never imported; reduced motion is handled by CSS only. |
| S05 | Hex literals in components: `avatar-crop-dialog.tsx:254` accent fallback, `qr-ticket.tsx:107` QR colours. |
| S06 | `giveaway-browser.tsx:331` `group-focus-visible/drop` sits on a non-focusable `<article>`, so that focus style never applies. |
| F07 | `/reset` opened directly says "no email given" but keeps the form active. |
| F08 | "KU Marketplace Terms" is styled as a link but is not one. |
| F09 | Sign out exists only at the bottom of `/account`; not in the menu. |
| E02 | Card badge "For sale" truncates to "For" next to a long price at 390. |
| E03 | Prices format inconsistently: `฿120.5`, `฿99,999,999.99`, `฿9,999,999`. |
| E04 | `/market/:id` shows "Available 1" twice. |
| B04 | Slip picker accepts any file with an image MIME type by extension (a text file named `.png` previews as a slip). [b04](ui-audit-evidence/b04-fake-image-accepted-390.png) |
| B05 | An open chat polls about three server actions every 2.5 seconds. |
| B06 | Chat header at 390 truncates the counterpart name to about 8 characters and the item to "iPad ...". |
| T04 | Inventory cards are laid out as a grid but ArrowLeft/Right do not move focus; Enter works. |
| P06 | "Page not found" screens (`/history/abc`, `/history/999999`, non-participant deal, `/admin/users/abc`) return HTTP 200, not 404. |
| P07 | 39 routes keep the generic `<title>` "KU Marketplace"; chat, deal and login screens have no `h1`. |
| P09 | Native 13x13px checkboxes/radios (76 hits) and 21-22px text links ("Back to ...", table links) at touch widths; CLAUDE.md asks for 44px. |
| P10 | Thai item names break mid-syllable in inventory cards ("เสื้อนิสิตทร / งบอย"); Physics card shows "For sale 0" while stats say Listed 1. [p10](ui-audit-evidence/p10-inventory-dark-390.jpg) |
| F16 | `/inventory/:id/edit` at 360 leaves a large blank gap between "Delete item" and the preview card. |

### Questions (need a product decision, not defects yet)

| ID | Question |
| --- | --- |
| Q1 | Item 10 is `Transferred` in the database but the inventory shows it as a private unlisted item, and the header counts "1 transferred" where the database has 2. Which is correct for an item handed over in a trade? |
| Q2 | Should past meetup dates and past estimated delivery dates be refused by the API as well as the UI (A01, B08)? The frontend can enforce it, but the API currently accepts both. |

## Backend observations (recorded, not in frontend scope)

- `POST /posts` with price 1e12 returns "price ต้องไม่ติดลบ..." (numeric(10,2) overflow reported as negative).
- `POST /items` accepts a whitespace-only name; an invalid category returns 500.
- Seed: all transactions share one `created_at` (schema v3 migration time), so History shows "28 OCT 2026" for every seeded deal; slip and chat images use `placehold.co` SVG URLs that `next/image` refuses (broken images in chat and admin memberships); README says `user8` is suspended but the seed has it Active.
- `backend/.env.example` contains what looks like a real Supabase connection string with a password; rotate it if real.

## Verified as working

Login double-submit sends one request; access-token renewal through `proxy.ts` works
with only the refresh cookie; `returnTo` is safe against open redirects; purchase sheet
(Escape closes, double-click creates one deal); slip type and 5 MB checks; payment
confirmation, tracking, receipt; meetup accept and QR generation; cancellation reason
validation; post report with 10-character minimum and success state; admin report
verdict form with 30-character reasoning; non-owner giveaway manage returns a designed
404; `(app)` error boundary during an API outage; chat thread opens at the newest
message with 110+ messages; HTML in item names is escaped.

## Not tested

- WebKit / iOS Safari rendering and the virtual keyboard over the chat composer
  (WebKit libraries missing on the host).
- Real camera scanning, Cloudinary uploads and Resend email (no credentials, by design).
- Paid refunds and returns, Manual giveaway selection and pickup, appeals, membership
  approval, cancellation accept/reject: data paths exist but were not driven through
  the UI in this run.
- `impeccable` critique/audit (CLAUDE.md section 10.8) was not run; the visual notes
  above come from reviewing sweep screenshots directly.

## Suggested fix order

1. L01 PromptPay field (unblocks selling) and SYS01 action error contract (fixes the
   message for every API refusal, including F01, T02, A06).
2. T01/G02 availability filtering, B02 slip rejection, A01/A04 meetup date and QR code.
3. E01/C01 text wrapping, F05 register hint, B09 completed delivery card, AD02 confirm.
4. Medium items by area, then accessibility tokens (P05) and Low polish.

Each fix should re-run the matching Playwright check as regression evidence.
