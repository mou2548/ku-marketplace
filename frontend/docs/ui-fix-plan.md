# UI audit fix plan

Date: 2026-10-28. Source: [ui-audit-report.md](ui-audit-report.md)
(finding IDs below refer to it).

## Progress

| Phase | Status | Evidence |
| --- | --- | --- |
| 0 Foundations | Done 2026-10-28, uncommitted | `lib/action-result.ts`, `lib/api-errors.ts`, all actions return `ActionResult`; `wrap-anywhere` on the app and admin `<main>`; own chat bubble on `brand-strong`. Production-build regression: F02, SYS01, T02, A06, C01 pass; E01 passes at 360/390/768/1280 on `/market/:id` and `/feed` (was 1,891px wide). `tests/api-errors.test.mjs` added; 30/30 tests, tsc and eslint clean. `code-review` (medium) run; its findings were fixed except the two below. |
| 1 PromptPay | Done 2026-10-28, uncommitted | PromptPay field on `/account/edit` (10 digits, sent only when changed); `PromptPayNotice` and disabled Publish on `/inventory/:id/list`, its edit page and `/post`. Regression: notice shown, invalid number blocks Save, number stored as `0812345678`, sale listing publishes. |
| 2-4 | Not started | |

### Found while fixing (added to Phase 2)

- **B13 High:** the API offers `GET /transactions/:id/payment-qr` (PromptPay QR payload plus the seller's masked number), but the frontend never shows it. At "Pay and upload the slip" the buyer sees the amount and nowhere to pay. Show the QR and masked number in the slip step.
- **B14 High (data):** the API also refuses to *buy* from a seller without PromptPay. Every seeded seller lacks one, so existing sale listings cannot be bought until their owners add it. The buyer now gets a clear message; consider hiding Buy, or labelling the listing, when the seller has no PromptPay if the API exposes that.
- **B15 Medium:** `/post` publishes several items with `Promise.all`; when one fails the others are already live and pressing Publish again duplicates them (pre-existing, found by `code-review`).
- Unpushed commit `afc8b4f` has a Thai commit message and an AI co-author trailer, against frontend CLAUDE.md sections 9 and 10.5. Not changed; the author should reword it before pushing.

## Approach

Fix root causes first, then the remaining findings by area. Each phase is one
reviewable unit: plan confirmed, code changed inside `frontend/` only, `code-review`
run, the matching Playwright checks re-run against a **production build** (several
defects only appear there), then a phase report. No push without permission. Commits
carry no AI author or co-author line (frontend CLAUDE.md section 10.5).

The backend contract is fixed. Everything below is achievable in the frontend; where
the API itself is wrong, the item is listed under [Backend follow-ups](#backend-follow-ups)
and the frontend guards it on its side.

Decisions marked **D1-D4** must be answered before the phase that needs them starts.

## Phase 0 - Foundations (root causes)

### 0.1 Server action error contract (SYS01, F02, T02, A06, F01)

- Add `lib/actions/result.ts`: `type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string; status?: number }`
  and `toActionError(err)` that turns `ApiError` into a user message, network
  failures into "Could not reach the server. Try again.", and anything else into a
  generic line. `lib/actions/auth.ts` already follows this shape; reuse its logic.
- Map known API messages to copy in `lib/copy.ts` (`errors.*`), so the English UI does
  not show the API's Thai text (F02). Unknown messages fall back by status
  (400/403/404/409). Exact policy depends on **D4**.
- Convert every action in `lib/actions/*.ts` to return `ActionResult` instead of
  throwing, domain by domain (transactions, posts, chat, giveaways, items, admin,
  appeals, reports, membership, account, uploads). Update the ~20 call sites that read
  `err.message` (`offer-composer.tsx:272`, `room-screen.tsx:396`, `post-actions.tsx:107`,
  `item-form.tsx:156`, `list-form.tsx:115`, `edit-form.tsx:47`, `offer-review.tsx:86,103`,
  `scan/page.tsx:41`, `membership-review.tsx:36`, `account-actions.tsx:64,151`, ...).
- Regression: production build; trigger a 400, 403, 409 and a network failure per
  domain and assert the specific message is shown.

### 0.2 User text wrapping (E01, C01)

- Add one utility in `app/globals.css` for user-authored text
  (`overflow-wrap: anywhere; word-break: normal`) and apply it to: post title,
  description, seller notes, "looking for" (market detail and cards), chat bubbles,
  report details, appeal text, admin evidence and item names in tables.
- Thai mid-syllable breaks (P10) come from the opposite setting; check the inventory
  card title uses normal Thai line breaking, not `break-all`.
- Regression: the edge-data sweep (`/market/11`, `/market/12`, `/chat/1`) at 360-1280
  shows no page overflow and no clipped bubble.

## Phase 1 - Blocker: PromptPay (L01, E07)

- `/account/edit`: add a PromptPay field (mobile number, 10 digits, spaces and dashes
  accepted) sent as `promptpay_id` to `PATCH /users/me`. Empty clears it. Show API
  refusals (invalid format, already used by another account, cannot clear while
  needed) through 0.1.
- `/account`: show whether PromptPay is set.
- Listing (`/inventory/:id/list`, `/post`): when "For sale" or "Sale or trade" is
  chosen and the viewer has no PromptPay, show an inline notice with a link to
  `/account/edit` and keep Publish disabled, instead of failing on submit.
- Regression: new account sets PromptPay, lists for sale, buyer sees the listing.

## Phase 2 - High findings

| ID | Change |
| --- | --- |
| T01, G02 | One shared helper for "units you can still use" (the same number the inventory card shows as Unlisted). Trade composer and `/post` picker exclude or disable Transferred and fully reserved items, with a one-line reason on the card. Keyboard path keeps working. Depends on **D3** for the Transferred/private mismatch. |
| T02 | Covered by 0.1; the 409 message names the problem. Also refresh the inventory list after a 409. |
| B02 | Replace the "not supported yet" toast with a reject sheet: required reason (max 500), `POST /transactions/:id/reject-payment-slip`. Buyer sees the reason from `payment_rejection_reason` and can upload a new slip. Remove `slipRejectUnsupported` copy. |
| F01 | `/history/:id/qr` checks the deal state first. Without a confirmed latest appointment it explains that and links back to the chat; the countdown starts only once a token exists. |
| A04 | Root cause: `components/kit/qr-scanner.tsx` decodes only through the native `BarcodeDetector`, which iOS (every iPhone browser), Firefox and desktop Chrome on Windows/Linux do not provide. Those users always land on the "cannot scan automatically, type the code" state, and the code (64 hex characters) is never shown. The diagram only requires scanning the QR at handover. Add a JavaScript decoder fallback so the camera path works everywhere; replace the typing fallback copy with camera-permission and HTTPS guidance. Library choice decided by **D1**. |
| A01, A02, A03 | Meetup date picker: `minValue` today, submit disabled while invalid, error text uses the same `dd/mm/yyyy` format as the field, four-digit year. Appointment cards show the year when it is not the current year. |
| A06 | Covered by 0.1; scan errors read "This code is wrong or has expired". |
| B09 | Deal details: do not render the delivery card twice; for a completed or cancelled deal hide "Past due" and the "Confirm once it arrives" instruction. |
| F05 | Register form: inline "Use your @ku.th or @ku.ac.th email" under the email field when the domain is wrong, shown on blur and on submit attempt. |
| AD02 | Admin membership "Amount is wrong": confirmation sheet with a required reason, passed as `rejectionReason` to `reviewPayment`. Fix the buyer-slip copy at the same time (AD01). |

## Phase 3 - Medium findings

| Area | IDs | Change |
| --- | --- | --- |
| Auth | F03, F04, F06, F07 | Trim and lowercase email before login and register. Carry `returnTo` through every redirect to `/login`. `/verify` and `/reset` without an email show a "start again" state instead of placeholders and an active form. |
| Resilience | N01, S03 | Layouts distinguish "API unreachable" from 401/403: show the error boundary rather than redirecting to `/login` or `/feed`. Add `error.tsx` for `(admin)`, `(auth)`, `app/posts`, plus `global-error.tsx`. |
| Buy | B03, B08, B10 | Slip upload error shown next to the retry button and as a toast. Tracking form: estimated delivery `min` today. Completed deal shows a "Request return, N days left" action in the chat view while the window is open. |
| Trade | T03 | Cash input accepts one decimal point and two decimals, rejects negatives visibly, caps at the price column limit (99,999,999.99). |
| Deals | A08 | Show the response deadline on a pending cancellation if the API returns its timestamp; otherwise record the gap in `docs/design/api-gaps.md`. |
| Chat | C02 | Multi-line composer (textarea, grows to a few lines), `maxLength` 2000 with a counter near the limit, Send disabled when empty. |
| Giveaway | G01 | Status badge derived from the same dates as the body, so "Open" never sits next to "Registration closed". |
| Performance | P02, P03 | Masonry cards reserve final height before images and fonts settle (CLS under 0.05). Bundle review per route with `senior-frontend` (largest: admin overview 422 KB, chat 372 KB); likely candidates are recharts and the chat screen. |
| Accessibility | P04 | Toast region gets a proper role; file inputs get labels; Tabs panels exist for every `aria-controls`; gallery removes focusable elements from `aria-hidden` slides; scrollable tables get `tabIndex=0` and a label; `<dl>` structure fixed; links always have a name. |
| Accessibility | P05 | White text on the brand fill fails at 4.04:1 for normal text. Per **D2**, primary button labels become large bold text; own chat bubbles (body text on brand fill) still need a fix, since large text is not an option there. Dark-mode condition chips and `text-ink-disabled` raised to at least 4.5:1. |
| Admin | P08 | Admin tables on small screens: visible scroll affordance (edge fade and "scroll" hint) or a stacked card layout below `md`; KPI tiles stop clipping digits. |

## Phase 4 - Low findings

S01 lint warnings, S02 delete `lib/giveaways-api 2.ts`, S04 decide whether `motion`
stays as a dependency, S05 hex literals to tokens, S06 dead focus style, F08 Terms link,
F09 Sign out in the menu, E02-E04 price badge truncation, price formatting
(always two decimals or none, one helper), duplicate "Available", B04 verify image
content client side, B05 polling interval review, B06 chat header truncation, T04
arrow-key navigation in grid layouts, P06 `notFound()` returning 404, P07 page titles
and `h1`, P09 touch targets (44px wrappers for checkboxes, radios, text links), P10
inventory badge "For sale 0", F16 edit screen gap.

## Decisions

| ID | Question | Decision |
| --- | --- | --- |
| D1 | QR decoding where `BarcodeDetector` is missing (A04) | **Decided 2026-10-28:** add the `barcode-detector` polyfill (zxing-wasm), loaded lazily on the scan screens only when the native API is missing. Approved as an addition to the stack in frontend CLAUDE.md section 2. |
| D5 | Own chat bubbles: body text on the brand fill (P05) | **Decided 2026-10-28:** fix as appropriate (a darker brand step for the bubble fill), asking if anything is unclear. |
| D2 | Primary button contrast (P05) | **Decided 2026-10-28:** keep `primary-600` fill; make primary button labels large bold text (at least 18.66px at weight 700, which passes as large text at 3:1). |
| D3 | Transferred items shown as private (Q1) | **Decided 2026-10-28:** the diagram audit says offered items are marked Transferred when a trade completes, and defines no other display. `Transferred` is authoritative on every screen: shown as handed over, never offerable or listable. |
| D4 | API messages in Thai (F02) | **Decided 2026-10-28:** map known API messages to English copy; unknown messages get a generic English line by status. |

## Backend follow-ups (not changed by this plan)

- API accepts past meetup dates and past estimated delivery dates (A01, B08); frontend
  will block them, the API should too.
- `POST /posts` price above 99,999,999.99 reports "must not be negative"; whitespace-only
  item names accepted; invalid category returns 500.
- Seed: shared `created_at` on all transactions, `placehold.co` SVG slip URLs that
  `next/image` refuses, README says `user8` is suspended but the seed has it Active.
- `backend/.env.example` appears to contain a real Supabase connection string.

## Skills per phase (frontend CLAUDE.md section 10.8)

- Phase 0-2: `senior-frontend` for actions and Next.js 16 behaviour; `impeccable harden`
  for error states.
- Phase 3: `impeccable adapt` (admin tables), `impeccable audit` (accessibility),
  `senior-frontend` (bundle), `dataviz` for the KPI tiles and admin chart.
- Phase 4: `impeccable polish`.
- Every phase: `code-review` before it is called done.

## Verification per phase

Re-use the audit scripts from the scratch session (production build, isolated
Compose stack, separate login per browser so refresh-token reuse detection does not
revoke sessions). A phase is done when its findings no longer reproduce, the full
route sweep shows no new overflow, page error or axe regression, and lint, `tsc` and
`npm test` pass.
