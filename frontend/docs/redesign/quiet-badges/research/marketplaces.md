# Marketplace research: status badges, notice boxes, buttons

Date: 2026-10-30. Scope: how real marketplaces style status badges, inline notices, buttons
and colour, as evidence for replacing KU Marketplace's tinted-pill-plus-border badges and
tinted-box-plus-border message boxes.

## How the evidence was gathered

| Label | Meaning |
|---|---|
| **VERIFIED (code)** | Read from the company's own published design-system source (CSS package or official docs). |
| **VERIFIED (live)** | Computed styles read from the live public website (mobile viewport 414 px, logged out) on 2026-10-30 with a headless browser. |
| **SECONDARY** | Third-party write-up or unofficial reconstruction. Treat hex values as estimates. |
| **INFERRED** | From general product familiarity or partial evidence; not measured. Do not rely on exact values. |

Blocked on 2026-10-30 (403, captcha or geo-block): Etsy, Depop, Carousell, eBay live search,
Shopee TH, Lazada TH (captcha), OfferUp (geo). For those, the notes below are SECONDARY or
INFERRED. eBay is still well covered because its design system (Evo / Skin) is public.

Tools: `@ebay/skin@19.38.0` npm package (CSS read directly), Vinted's production CSS bundles
(`web_ui__*` component classes), Playwright computed-style extraction, the eBay Playbook,
the `ui-ux-pro-max` local database, and `impeccable` reference notes.

---

## Per-app findings

### eBay (Evo design system) - VERIFIED (code)

| Element | Style |
|---|---|
| Listing "signal" (e.g. NEW LISTING, GREAT PRICE, DEAL ENDING) | **Outline pill, no fill.** `border: 1px solid currentColor`, radius 16px (full pill), 10px / 700 / uppercase / 0.5px tracking, 16px tall, 8px side padding. Text and border share one colour: trust blue `#0968F6`, recent green `#288034`, time-sensitive red `#D50B0B`, neutral grey `#707070`. Playbook rules: outlined only, "Don't fill the signal", "use signals sparingly, about one per five items", fixed strings only, no new colours. |
| Count badge | Red circle with white outline, numbers only. eBay's "badge" is never used for status words. |
| Section / inline notice | **Neutral grey box, coloured icon only.** Background `#F7F7F7` (neutral-200), **no border**, radius 8px, padding 16px, 16px icon in the semantic colour (attention `#D50B0B`, confirmation `#288034`, information `#0968F6`, warning `#B97E31`), all text stays `#191919`. Title bold only when a body exists; body regular weight ("Don't use bold for body copy"). One notice at a time, no stacking. |
| Page notice (page-level only) | **Solid fill.** attention `#D50B0B` + white text; warning `#FFBD14` + `#191919` text; confirmation `#288034` + white. Reserved for page-level messages. |
| Buttons | Full pill. Default 40px tall / 20px radius; large 48px / 24px; small 32px / 16px. Hierarchy primary, secondary, tertiary, borderless. "Limit each page to one primary action." Destructive primary = solid `#D50B0B`, 700 weight; borderless destructive = red text only. |
| Palette per screen | Black/white/greys plus eBay blue for actions; red/green/yellow only as semantic signals. |

Sources: https://playbook.ebay.com/design-system/components/signal ,
https://playbook.ebay.com/design-system/components/section-notice ,
https://playbook.ebay.com/design-system/components/inline-notice ,
https://playbook.ebay.com/design-system/components/badge ,
https://playbook.ebay.com/design-system/components/button ,
https://www.npmjs.com/package/@ebay/skin (files `dist/signal/signal.css`,
`dist/section-notice/section-notice.css`, `dist/page-notice/page-notice.css`,
`dist/button/button.css`, `dist/tokens/evo-core.css`, `dist/tokens/evo-light.css`).

### Vinted - VERIFIED (code + live)

| Element | Style |
|---|---|
| Badge component | Full pill (`border-radius: 3996px`), 12px / weight 375, 16px line height, padding 4px 8px (about 24px tall). Two families: **filled** = solid semantic colour + white text, border transparent; **light** = light tint + dark same-hue text, **border explicitly transparent**. `default` = white + 1px `rgba(21,25,26,.12)` hairline + grey text `#5A6566` (the "Pro" seller badge on live cards). |
| Condition on listing card | **Plain grey text, no chip**: "L · Very good", 12px, `#5A6566`. "Bumped" also plain 12px text. |
| Info banner (notice box) | **Very light tint, no border**, radius 6px, padding 16px, 12px gap. info bg `#EDF2F2` (a neutral grey-teal, not blue), success `#EBFCEF`, warning `#FFF5E5`, error `#FFF4F4`. Title 16px / 500 near-black `#15191A`; **body text also near-black**, not coloured. Only the icon and the link take the semantic colour. |
| Buttons | Radius 6px, 44px tall, 16px / 500. Primary solid teal `#007782` + white; secondary white + 1px teal border + teal text; tertiary text-only teal. |
| Palette | Teal `#007782` + greys on a pale grey page (`#EDF2F2`) with white cards. Semantic: success `#28865A`, red `#D04555`, amber `#F9BB42`. |

Sources: https://www.vinted.co.uk/catalog?search_text=jacket (live computed styles and the
`marketplace-web-assets.vinted.com/_next/static/chunks/*.css` bundles it loads;
classes `web_ui__Badge__*`, `web_ui__InfoBanner__*`, `web_ui__Button__*`).

### Mercari US - VERIFIED (live)

| Element | Style |
|---|---|
| SOLD | **Solid near-black block**: bg `#222222`, white text, 10px / 600, radius 4px, padding 1px 4px, overlaid on the photo. |
| Condition | Not shown as a coloured chip on search cards (INFERRED: shown as text on the item page). |
| Notice | Not observed on public pages. |
| Buttons | Primary solid `#5356EE` (Mercari indigo), white, 44px, radius 4px, 16px / 600. Secondary = **grey fill `#ECEDF1`, no border**, dark text, radius 4px. |
| Palette | Indigo + near-black `#222` + greys. Font Averta. |

Source: https://www.mercari.com/search/?keyword=iphone&itemStatuses=2 (live).

### Mercari JP - VERIFIED (live)

| Element | Style |
|---|---|
| SOLD | **Brand-red corner sticker**: SVG right-triangle in the top-left of the photo, 33% of tile width, fill `#FF333F`, white "SOLD" rotated -45 degrees. No pill at all. |
| Filter / neutral chips | White + 1px `#C7C7C7` border, radius 8px or 18px pill, `#333` text. Active filter = red outline + red text. |
| Buttons | Primary solid `#FF333F`, white, 45px, radius 4px, 15px / 700. |
| Palette | One brand red + `#333` text + greys. Red is used for the primary action and for SOLD, nothing else on the grid. |

Source: https://jp.mercari.com/search?keyword=iphone&status=sold_out%7Ctrading (live).

### Kaidee (Thailand) - VERIFIED (live)

| Element | Style |
|---|---|
| Promo tags | **Solid pills, white text**: HOT `#FF6A00`, PREMIUM navy `#0D1C63`; 12px / 600, 24px tall, full radius. |
| Condition ("มือสอง" / used) | **Plain grey text**, 12px, about `#737373`. No chip. |
| Buttons | **Radius 12px, height 44px** (identical to KU's button radius). Primary solid `#4F68E8` + white, 16px / 600. Secondary white + 1px `#E5E5E5` border + grey text. Tonal: `#F1F4FF` fill + dark text. |
| Palette | Blue primary, one orange accent, navy; near-white page `#FAFAFA`. Font "Kaidee" / Inter. |

Source: https://www.kaidee.com/ and https://www.kaidee.com/all?q=iphone (live).

### OLX (Poland) - VERIFIED (live)

| Element | Style |
|---|---|
| Condition chip (Używane / Nowe / Uszkodzone) | **Flat neutral chip, no border**: bg `#F2F4F5`, text `#02282C`, 12px / 500, 26px tall, radius 4px. The same chip for every condition; no colour per condition. |
| Benefit chips | **Light tint, no border**: "Free delivery" `#C8F8F6` / `#085C5D`; "Selling for 7 years" `#E8DBF0` / `#8E4FB3`. |
| Featured | Solid `#23E5DB`, dark text, 700, uppercase, square corners. |
| Buttons | Radius 4px, 40-48px. Primary solid dark `#02282C`; secondary transparent + 2px translucent border; tonal `rgba(38,72,88,.06)`. |
| Palette | Dark teal-black + one cyan accent + greys. Font Geomanist. |

Source: https://www.olx.pl/elektronika/telefony/q-iphone/ (live).

### Facebook Marketplace - VERIFIED (live, logged out) for cards; INFERRED for Sold/Pending

| Element | Style |
|---|---|
| "Just listed" | **Flat grey pill, no border**, overlaid top-left of the photo: bg `#E4E6EB`, text `#1C1E21`, 12px / 600, 23px tall, radius 12px. |
| Price | 17px / 600 `#050505`. No coloured price or tag colours on cards. |
| Sold / Pending | INFERRED: shown as words next to the price or in the listing header, not as coloured pills. Sellers can set Available / Pending / Sold (SECONDARY: https://www.itgeared.com/what-does-pending-mean-on-facebook-marketplace/). |
| Buttons | Primary solid `#0866FF`, radius 6px. Secondary grey fill `#E4E6EB` + dark text (INFERRED from the Facebook UI). |
| Palette | Blue + greys only. |

Source: https://www.facebook.com/marketplace/bangkok/search?query=iphone (live).

### Etsy - SECONDARY / INFERRED (site returned 403)

| Element | Style |
|---|---|
| Badges | Bestseller and Popular-now tags on listing cards; Star Seller shown as a purple icon + text under the shop name (SECONDARY: https://help.etsy.com/hc/en-us/articles/4403058372503). An unofficial reconstruction lists pill tags at 11px bold (https://www.shadcn.io/design/etsy , https://www.oppadu.com/tools/design-systems-site/brand/etsy.html). Its hex values are unverified. |
| Notices | Not verified. |
| Buttons | INFERRED: full-pill buttons; the main purchase CTA is black/near-black and the secondary is white with a dark outline. The orange brand colour is used mostly for logo and accents, not for every button. |
| Palette | Orange brand `#F1641E` (SECONDARY) used sparingly; mostly black, white and warm greys. |

### Depop - INFERRED (403)

Monochrome UI (black, white, greys) with the red brand mostly in the logo. Sold items are
shown as a "Sold" overlay on the photo rather than coloured pills. Buttons black, full
pill. Not measured.

### Carousell - INFERRED (403)

"Reserved" and "Sold" appear as a dark label overlaid on the listing photo. The brand red
is kept for the main CTA. Condition is shown as text in the listing details. Not measured.

### Shopee - INFERRED (traffic-verification block)

| Element | Style |
|---|---|
| Order status (My Purchases) | Tabs: To Pay / To Ship / To Receive / Completed / Cancelled / Return Refund (SECONDARY: https://help.shopee.sg/portal/4/article/76732). Inside an order card, the status is **coloured text in the card's top-right corner** (brand orange, uppercase). It is not a pill. |
| Listing tags | Small solid tags (Mall red, Preferred orange) and outline-orange voucher or discount tags. Shopee is the loudest app in this set and the least restrained. |
| Buttons | Primary solid orange `#EE4D2D`, small radius (2-4px). Secondary white + grey border. |

### Lazada - partial VERIFIED (live) / INFERRED

The search page loaded behind a captcha. The visible card badges (LazMall, PAYDAY) are
**image assets with solid red and magenta fills** and are not CSS pills. Promo-heavy like
Shopee. Not used as a model.

### OfferUp - INFERRED (geo-blocked)

Green brand used for the primary CTA. Item tiles are photo + price + location with almost no
tags. Not measured.

### Grab / LINE MAN (order-status patterns) - INFERRED, brand colour SECONDARY

Order state is told with a **headline sentence + progress stepper or map**, not a badge
("Driver is on the way"). History lists show the status as plain text ("Completed" /
"Cancelled") in grey or red text. Grab green `#00B14F` is confirmed against Grab's brand
centre according to https://www.oppadu.com/tools/design-systems-site/brand/grab.html. That
page's other values are estimates, including tags at 20px tall / 4px radius / 11px 700 and
buttons at 48px / 8px radius.

---

## Cross-app patterns

### What most of them do

1. **Item condition is never colour-coded.** Vinted, Kaidee and FB show it as plain grey
   12px text, and OLX uses one flat neutral chip for every condition. No verified app gives
   "Like new" a green and "Fair" an amber.
2. **Neutral grey fill is the default chip.** FB `#E4E6EB`, OLX `#F2F4F5`, Mercari US
   secondary button `#ECEDF1`, eBay notices `#F7F7F7`, Vinted info banner `#EDF2F2`. Dark text
   on light grey with no border is the most common "quiet but present" treatment. This is
   the answer to "removing colour felt empty": they keep a **filled shape** and remove the
   **hue**.
3. **A blocking state gets one solid, high-contrast mark on the photo.** Mercari US SOLD
   is near-black, Mercari JP SOLD is a brand-red corner, and Carousell and Depop use dark
   overlays (inferred). Each card has exactly one, and the mark is solid, not a tint.
4. **Hue is reserved for one or two commercial tags, and those are solid.** Kaidee HOT and
   PREMIUM, OLX featured, Lazada LazMall and Etsy Bestseller are all solid fill + white text.
   When hue appears, it commits.
5. **Notice boxes keep body text black.** eBay (grey box + coloured 16px icon) and Vinted
   (pale tint + near-black text) both put the semantic colour only in the icon and link.
6. **Page-level critical messages use a solid fill**, not a tint (eBay page notice).
7. **One primary button per screen** (eBay states this rule explicitly). Secondary buttons
   are a neutral grey fill (Mercari US, FB) or white + 1px border (Vinted, Kaidee).
8. **Per-screen colour count:** brand colour + black/greys + at most one semantic or promo
   colour. Mercari JP uses a single red for both CTA and SOLD.

### What the strong apps avoid

- **Tint + same-hue border on the same chip.** No verified system does this. Vinted's light
  badges set `border-color: transparent`, and eBay's outline signals have no fill. KU's
  current style combines both.
- **Coloured borders on notice boxes.** None found (eBay, Vinted). `impeccable`'s craft
  floor also bans coloured side-stripe borders on alerts and callouts.
- **Six-hue status systems on browse cards.** The most seen on a card was two or three
  hues, and those were promo tags, not lifecycle states.
- **Coloured body text inside notices**, and bold body copy (eBay rule).
- **Inconsistent "danger".** Where red appears it is either the solid destructive button
  (eBay) or an icon. It does not show up as a one-off solid pill among pastel siblings.
- **Badge overload.** eBay targets about one signal per five items. Baymard warns that
  users become "blind" to badges when too many appear (https://baymard.com/blog/badge-ui).

---

## Style recipes for KU Marketplace

KU values: brand `#2E8F5A`, font Prompt, white page, card radius 20px, button radius 12px.
These are the values from the research brief. Contrast was checked with the WCAG formula.

**Conflict to resolve with the owner (not decided here).** `frontend/CLAUDE.md` (owner
decision 2026-10-29, Herbarium direction) gives different values from the brief:

- chips and cards `2px`, buttons `4px`
- type Maitree / Anuphan, with Prompt as a fallback only
- an existing `primary-700` `#257248` token (5.88:1 on white) for text and the primary fill
- "Condition keeps its colours" and "Trade has no colour"

The radii and hexes below follow the brief. If the Herbarium rules apply, use the CLAUDE.md
radii, use `#257248` wherever this file says `#23774B`, and note that Recipe 1 (condition
as a neutral chip) contradicts the "condition keeps its colours" rule. That rule needs an
explicit owner ruling.

**Accessibility flag:** white text on `#2E8F5A` is **4.04:1**. That passes for large text
and UI shapes but fails AA for 12-16px labels. For small solid-green labels, use a darker
step such as `#23774B` (5.51:1 with white).

### Recipe 1 - Neutral chip (default for most statuses and condition)
Drawn from: OLX condition chip, FB "Just listed", Mercari US secondary, Vinted default badge.

- bg `#F1F3F2` (slightly green-tinted grey), text `#1F2421` (14.1:1), muted variant text
  `#5B6660` (5.36:1)
- Prompt 12px / 500, height 24px, padding 0 8px, radius 6px (or 999px if a pill is
  preferred), **no border**
- Optional 12px leading icon in `#5B6660`
- Use for: Like new / Good / Fair, Pending, Shipped, Completed, Trade, and Cancelled (muted
  text). Most of the current six tones collapse into this one.

### Recipe 2 - Solid state mark (sold or other blocking states only)
Drawn from: Mercari US SOLD (`#222`, 4px), Mercari JP SOLD corner (brand colour), Kaidee
solid tags.

- Sold / Reserved on the photo: bg `#1F2421`, white text (15.8:1), Prompt 11-12px / 600,
  height 22px, padding 0 8px, radius 6px, placed 8px from the photo's top-left
- Free (giveaway): the same shape in `#23774B` + white (5.51:1). This is the one place the
  brand hue appears as a tag.
- Limit: at most one solid mark per card

### Recipe 3 - Light tint, no border (rare semantic emphasis)
Drawn from: Vinted light badge (tint + dark same-hue text, transparent border), OLX benefit
chips.

- success `#E9F4EE` / `#1E6B43` (5.75:1); warning `#FFF4DE` / `#8A5A00` (5.43:1); danger
  `#FDEDEC` / `#B42318` (5.79:1)
- Same geometry as Recipe 1, **border none**
- Use only where the state needs action from the viewer (for example "Action needed" on an
  order or "Rejected" in admin), and use at most one per card. Danger stays a tint, not
  a lone solid pill.

### Recipe 4 - Grey notice box, colour lives in the icon
Drawn from: eBay section and inline notice (`#F7F7F7`, no border, 8px radius, 16px padding,
coloured 16px icon, black text), Vinted info banner (black text, only icon and link
coloured).

- bg `#F4F6F5`, **no border**, radius 12px (between eBay's 8px and KU's 20px cards),
  padding 16px, gap 12px
- Icon 20px in the semantic colour: info `#2E8F5A` or `#5B6660`, success `#1E6B43`, warning
  `#8A5A00`, danger `#B42318`
- Title Prompt 14px / 600 `#1F2421`; body 14px / 400 `#1F2421` or `#5B6660`; at most one
  link or link-button, placed below the body
- Variant for blocking errors (eBay page notice): solid `#B42318` bg + white text (6.57:1),
  page-level only
- Alternative closer to Vinted: replace the grey with the pale tints from Recipe 3, still
  with no border and with black body text

### Recipe 5 - Buttons: one primary, neutral secondary
Drawn from: eBay ("one primary per page", destructive = red text unless confirming), Kaidee
(44px / 12px radius), Mercari US (grey-fill secondary), Vinted (outline secondary).

- Primary: solid `#2E8F5A` (or `#23774B` for AA on 14-16px labels), white, 44-48px, radius
  12px, Prompt 16px / 600. One per screen.
- Secondary: bg `#F1F3F2`, text `#1F2421`, no border, same size. Alternative: white + 1px
  `#D5DBD8`.
- Tertiary: text-only `#23774B`
- Destructive: tertiary red text `#B42318` in normal flows; solid `#B42318` + white only
  inside the confirm dialog

### Suggested mapping (inferred, not taken from any single app)

| Current tone | Proposed |
|---|---|
| neutral grey | Recipe 1 |
| info slate | Recipe 1 |
| trade blue | Recipe 1 + swap icon (no separate hue) |
| success green | Recipe 1 for routine states (Completed, Shipped); Recipe 2 green only for "Free" |
| warning amber | Recipe 3 warning, only when the viewer must act |
| danger rose (solid) | Recipe 3 danger on cards; solid red only on destructive confirm buttons and page-level notices |

---

## Tool notes

- `ui-ux-pro-max` database (`--domain product`, "marketplace secondhand resale"):
  Classifieds / Buy-Sell recommends "Neutral bg + price green + category chips + verified
  seller badge". UX rule "Color Only" (High): never convey state by colour alone; pair it
  with text or an icon. All recipes above keep text labels.
- `impeccable` references: the `craft-floor` bans coloured side-stripe borders on alerts
  and callouts. `quieter` says "neutral dominance, use color as accent (10% rule)", "Never
  gray on color: use a darker shade of that color", and "Borders: reduce thickness, decrease
  opacity, or remove entirely".

## Source list

- eBay Playbook: https://playbook.ebay.com/design-system/components/signal ,
  https://playbook.ebay.com/design-system/components/section-notice ,
  https://playbook.ebay.com/design-system/components/inline-notice ,
  https://playbook.ebay.com/design-system/components/badge ,
  https://playbook.ebay.com/design-system/components/button ,
  https://playbook.ebay.com/design-system/tokens/color-tokens
- eBay Skin CSS: https://www.npmjs.com/package/@ebay/skin (v19.38.0), https://opensource.ebay.com/skin/
- Vinted live + CSS: https://www.vinted.co.uk/catalog?search_text=jacket
- Mercari US: https://www.mercari.com/search/?keyword=iphone
- Mercari JP: https://jp.mercari.com/search?keyword=iphone&status=sold_out%7Ctrading
- Kaidee: https://www.kaidee.com/ , https://www.kaidee.com/all?q=iphone
- OLX: https://www.olx.pl/elektronika/telefony/q-iphone/
- Facebook Marketplace: https://www.facebook.com/marketplace/bangkok/search?query=iphone
- Shopee help (order tabs): https://help.shopee.sg/portal/4/article/76732-[Order-Tracking]-How-do-I-check-the-status-of-my-order
- Etsy Star Seller: https://help.etsy.com/hc/en-us/articles/4403058372503
- Etsy unofficial reconstruction: https://www.shadcn.io/design/etsy , https://www.oppadu.com/tools/design-systems-site/brand/etsy.html
- Grab unofficial reconstruction: https://www.oppadu.com/tools/design-systems-site/brand/grab.html
- Baymard on badges: https://baymard.com/blog/badge-ui
- FB pending (secondary): https://www.itgeared.com/what-does-pending-mean-on-facebook-marketplace/
