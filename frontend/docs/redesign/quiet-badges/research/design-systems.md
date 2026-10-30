# Badges, notices and buttons: what the major design systems do

Research for the quiet-badges redesign. KU Marketplace context: mobile-first, white page (`#ffffff`), dark theme page `#14171b` / surface `#1d2127`, brand `#2E8F5A` (4.04:1 with white, so fills only; `#257248` is the AA text/fill green at 5.87:1), font Prompt.

Two directions have already been rejected: the current one (pastel tint, coloured border, pill shape, solid red for danger, six tones) and a colourless one (dot plus text, outline only, coloured text only). The recipes in section 5 sit between those two.

Where the specs come from: values marked **(v)** were read from the live documentation page during this research (2026-10-30). Values marked **(k)** are the published spec as I know it from the system's docs and source. Check a (k) value against the linked page before treating it as a hard number. All contrast numbers in sections 4 and 5 were computed (WCAG 2.x relative luminance) with a script, not estimated.

---

## 1. Per-system specs

### 1.1 Material Design 3 (Google)

| Item | Spec |
|---|---|
| Badge | Notification badge only, not a status label. Small: 6dp dot. Large: 16dp tall, full radius, `error` fill with `onError` text (k). |
| Status-style label | No status component. The closest is the **assist chip**: 32dp tall, 8dp radius, 1dp `outlineVariant` border, label-large 14sp/500, 18dp leading icon, 16dp side padding (8dp on the icon side) (k). |
| Inline alert | No inline banner component. M3 has snackbars (inverse surface) and dialogs. |
| Buttons | Five emphasis levels: **filled**, **filled tonal**, **elevated**, **outlined**, **text** (v). Height 40dp, full (pill) radius, label 14sp/500, 24dp padding (16dp beside an icon) (k). M3 Expressive adds XS 32, S 40, M 56, L 96 and XL 136 sizes and a square-corner option (k). |
| Colour model | Tonal palettes (tones 0 to 100, HCT space). Every colour has four roles: `X` / `onX` / `XContainer` / `onXContainer`. Light theme: X = tone 40, container = tone 90. Dark theme: X = tone 80, container = tone 30 (k). A tone difference of 40 gives at least 3:1, and 50 gives at least 4.5:1 (k). Only `error` is a built-in semantic role. Success and warning are "custom colours", **harmonised** toward the brand: their hue is rotated toward the source colour by up to 15 degrees (`Blend.harmonize` in material-color-utilities) (k). |
| Sources | https://m3.material.io/components/buttons/overview , https://m3.material.io/components/chips/specs , https://m3.material.io/components/badges/specs , https://m3.material.io/styles/color/roles , https://github.com/material-foundation/material-color-utilities |

### 1.2 Apple Human Interface Guidelines

| Item | Spec |
|---|---|
| Badge | Only count badges (app icon, tab bar), which are red. There is no status-pill component. Status is shown with SF Symbols in a system colour next to text (k). |
| Inline alert | No inline banner. Apple uses alerts (modal), and inline text plus a symbol. |
| Buttons | Styles: **plain**, **gray**, **tinted**, **filled**, each in small, medium and large, and each style-size pair carries a different level of prominence (v). `tinted` is the tint colour at low opacity as the fill with a tint-coloured label. Filled is reserved for the most likely action. Keep prominent buttons to one or two per view, and distinguish the preferred choice by **style, not size** (v). Hit target at least 44x44pt (k). Shape is capsule or rounded rectangle. |
| Colour | System colours (systemGreen, Orange, Red, Blue and so on), each with separate light, dark and increased-contrast values. Don't use one colour to mean different things, and don't rely on colour alone (k). |
| Sources | https://developer.apple.com/design/human-interface-guidelines/buttons , https://developer.apple.com/design/human-interface-guidelines/color , https://developer.apple.com/documentation/uikit/uibutton/configuration |

### 1.3 Shopify Polaris

| Item | Spec |
|---|---|
| Badge | Tones: `info`, `success`, `warning`, `critical`, `caution`, `neutral`, `auto` (v). Emphasis: `color="base"` (moderate, the default) or `"strong"` (v). Size `base` for tables and lists, `large` for a standalone primary status (v). Optional left icon from the admin set (v). One or two words, past tense ("Refunded") (v). Text never wraps and truncates with an ellipsis (v). Badges are for system status, not user tags (v). Visually: no border, about 20px tall, 8px radius, 12px/550 text, tinted fill with dark same-hue text for base, saturated fill for strong (k). |
| Banner | Tones: info, success, warning, critical (v). One message per banner, a clear next step for info, warning and critical, dismissible unless action is required (v). Placement follows scope: page-level outside sections, contextual inside them (v). Visually: tinted fill, coloured icon, no border, 12px radius inside cards (k). |
| Buttons | Variants: primary (near-black fill in Admin), secondary (white with a subtle bevel), tertiary, plain. A `critical` tone exists for destructive actions. 8px radius, about 28 to 32px tall on desktop (k). |
| Sources | https://shopify.dev/docs/api/app-home/polaris-web-components/feedback-and-status-indicators/badge , https://shopify.dev/docs/api/app-home/polaris-web-components/feedback-and-status-indicators/banner , https://shopify.dev/docs/apps/build/app-home/migrate-from-polaris-react/badge |

### 1.4 GitHub Primer

| Item | Spec |
|---|---|
| Label | Variants: default, primary, secondary, accent, success, attention, severe, danger, done, sponsors (v). Sizes small (the default) and large (v). Visually: **transparent fill, 1px coloured border, coloured text**, pill radius, 20px or 24px tall, 12px/500 (k). This is exactly the outline style KU rejected. |
| StateLabel | Issue and PR state: a **solid emphasis fill** (open green, closed red, merged and done purple, draft grey) with white text and an octicon, pill shape, 32px or 24px tall, 14px/500 (k). |
| Banner (Flash) | `bgColor-{role}-muted` fill, 1px `borderColor-{role}-muted` border, icon in `fgColor-{role}`, body text in the default foreground, 6px radius, 16px padding (k). |
| Buttons | primary (green emphasis fill, `#1f883d` with white = 4.52:1, computed), default (grey fill plus border), invisible, danger (red text, red fill on hover). 28, 32 and 40px tall, 6px radius, 14px/500 (k). |
| Colour rules | Roles: accent, success, attention, danger, open, closed, done, sponsors (v). Each role has `fg`, `bg-muted`, `bg-emphasis`, `border-muted`, `border-emphasis` (v). Emphasis backgrounds are **always** paired with `fgColor-onEmphasis` (v). Role foregrounds must contrast with both the muted and the default backgrounds (v). High-contrast themes aim for at least 7:1, and they add a border when a softer fill is wanted (v). |
| Sources | https://primer.style/product/components/label/ , https://primer.style/product/components/state-label/ , https://primer.style/product/components/banner/ , https://primer.style/product/getting-started/foundations/color-usage/ |

### 1.5 IBM Carbon

| Item | Spec |
|---|---|
| Tag | Heights: sm 18px, md 24px, lg 32px (v). Radius 16px, so a pill (v). Padding 8px (sm, md) or 12px (lg) per side (v). Type 12px/400 (v). 16px icon (v). Colours, light theme: **text and icon step 70, background step 20**. Dark theme: text step 20, background step 70 (v). **Read-only tags have no border**. Borders appear only on the outline, high-contrast and operational variants (v). Keep text under 20 characters (v). |
| Inline notification | Low contrast: a tinted status background, **title and body text in `$text-primary`** (not coloured), icon and a **3px left border** in `$support-{status}` (v). High contrast: inverse background and inverse text (v). At least 48px tall, 16px side margins, 12px vertical padding, title 14px/600, body 14px/400 (v). Square corners. |
| Buttons | primary (blue 60 `#0f62fe` with white = 5.0:1, computed), secondary (grey 80), tertiary (outline), ghost, and danger in primary, tertiary and ghost forms. 32, 40, 48, 64 and 80px tall, radius 0, 14px/400 (k). |
| Sources | https://carbondesignsystem.com/components/tag/style/ , https://carbondesignsystem.com/components/notification/style/ , https://carbondesignsystem.com/components/button/style/ |

### 1.6 Atlassian Design System

| Item | Spec |
|---|---|
| Lozenge | Appearances: neutral (draft, inactive), success (completed, approved), warning (at risk, needs review), danger (blocked, overdue), information (in progress), discovery (new, beta) (v). Optional `iconBefore` and `trailingMetric` (v). `spacious` raises the height to 32px (v). Max width 200px, then truncation, so avoid long text (v). Two emphasis levels: **subtle** (light tint with coloured text, the default) and **bold** (`isBold`: saturated fill with inverse text) (v, from the AUI and Confluence docs). The historic default is 16px tall, 11px/700 uppercase, 3px radius (k). |
| Section message | Appearances: information, warning, error, success, discovery (v). Each has a fixed icon: blue "i" circle, yellow triangle, red diamond, green check, purple circle (v). Visually: tinted `background.{role}` fill, **no border**, 24px coloured icon, text in the default colour, about 16px padding, small radius (k). Guidance: don't rely on colour alone, so the wording must state the severity, and errors should say what to do next (v). |
| Buttons | default (subtle grey fill), primary (bold blue), subtle (no fill), warning (bold yellow, dark text), danger (bold red, white text), link, subtle-link. 32px tall (24px compact), 3 to 4px radius, 14px/500 (k). |
| Colour tokens | Backgrounds come in five levels, subtlest, subtler, subtle, bold and bolder (v). Pairing rules: `text.success` on `background.success`, and `text.inverse` on `background.success.bold` (v). |
| Sources | https://atlassian.design/components/lozenge/examples , https://atlassian.design/components/section-message/ , https://atlassian.design/foundations/content/designing-messages , https://atlassian.design/foundations/color-new/ , https://aui.atlassian.com/aui/7.1/docs/lozenges.html |

### 1.7 Ant Design

| Item | Spec |
|---|---|
| Tag | 22px tall, `0 7px` padding, 12px text, 4px radius, 1px border. Preset status tags use a tint fill, a tint border and coloured text: success `#f6ffed` / `#b7eb8f` (v), with text from the green ramp (k). Since v5 it also has `variant`: filled, solid, outlined, plus a borderless option (k). **Caution:** `#52c41a` on `#f6ffed` is 2.21:1 and `#389e0d` on `#f6ffed` is 3.37:1 (computed). Ant's preset success tag fails 4.5:1 for 12px text. |
| Alert | Types success, info, warning, error (v). `variant`: outlined (the default: tint fill plus tint border) or filled (no border) (v). Tokens: success bg `#f6ffed` / border `#b7eb8f`, info `#e6f4ff` / `#91caff`, warning `#fffbe6` / `#ffe58f`, error `#fff2f0` / `#ffccc7` (v). Padding 8px 12px, or 20px 24px with a description (v). Radius 8px (v). Icon off by default and on in banner mode (v). Text stays in the default colour (k). |
| Buttons | `type`: primary, default, dashed, text, link, plus `danger`. From v5.21: `color` x `variant` (solid, outlined, dashed, filled, text, link). 24, 32 and 40px tall, 6px radius (4px small, 8px large), `4px 15px` padding (k). |
| Sources | https://ant.design/components/tag , https://ant.design/components/alert , https://ant.design/components/button |

### 1.8 Radix Themes and Radix Colors

| Item | Spec |
|---|---|
| Badge | Variants: **solid**, **soft** (the default), **surface**, **outline** (v). Sizes 1 to 3 (v). Size 1 is about 20px tall with 12px text, size 3 about 26px with 14px (k). Recipes: soft = step a3 fill and a11 text, no border. surface = a2 fill, a7 inset 1px border, a11 text. outline = a8 border and a11 text, no fill. solid = step 9 fill with a contrast colour (k). `highContrast` swaps text to step 12 (k). Radius follows the theme radius token (k). |
| Callout | Variants soft, surface and outline, with an icon slot. Text uses step a11 of the colour. Sizes 1 to 3 (k). |
| Buttons | Variants classic, solid, soft, surface, outline, ghost. Sizes 1 to 4: 24, 32, 40 and 48px (k). |
| 12-step scale | 1 and 2: app and subtle backgrounds. 3, 4, 5: component background, hover, pressed. 6: subtle non-interactive border. 7: interactive border. 8: strong border and focus. 9: purest solid. 10: solid hover. 11: low-contrast text. 12: high-contrast text (v). Step 11 on step 2 is guaranteed APCA Lc 60, and step 12 is guaranteed Lc 90 (v). |
| Sources | https://www.radix-ui.com/themes/docs/components/badge , https://www.radix-ui.com/themes/docs/components/callout , https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale |

### 1.9 WCAG and status-colour guidance

| Criterion | What it means for badges, notices and buttons |
|---|---|
| 1.4.1 Use of Color (A) | Colour cannot be the only carrier of meaning. A status badge passes because its **text names the status**. A bare coloured dot, or a red border alone, does not pass. |
| 1.4.3 Contrast Minimum (AA) | Text needs 4.5:1, and large text (24px, or 18.66px bold) needs 3:1. Badge text is 12 to 13px, so it **always needs 4.5:1 against its own fill**. Button labels at 14 to 16px/600 are not "large", so white on `#2E8F5A` (4.04) fails. |
| 1.4.11 Non-text Contrast (AA) | Meaningful graphics and control boundaries need 3:1 against adjacent colours. A boundary is **only required when nothing else identifies the control** (v). Disabled controls are exempt (v). In practice: a status badge's fill or border is decorative because the text carries the meaning, so a 1.1 to 1.5:1 tint is allowed. A status **icon** that carries meaning needs 3:1. A secondary button identified only by its outline needs a 3:1 border, or a fill plus an obvious label. |
| APCA (WCAG 3 draft, used by Radix) | Lc 60 is the floor for small UI text such as badges, and Lc 75 for body text. It is stricter than 4.5:1 for light text on dark backgrounds, which is why dark-theme badge text should aim for 6.5:1 or more. |
| Sources | https://www.w3.org/WAI/WCAG22/Understanding/use-of-color , https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum , https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast , https://www.yatil.net/blog/non-text-contrast-in-detail-ui-components |

Supporting material:

- **ui-ux-pro-max** (local database): `color-semantic` (tokens, not raw hex), `color-dark-mode` (desaturated, lighter tonal variants, not inverted), `color-accessible-pairs` (4.5:1 or 7:1), `color-not-decorative-only` and "Color Only, severity High" (red and green need an icon or text), `contrast-feedback` (error and success colours meet 4.5:1), `compact-label-overflow` (pick badge, tag or chip by its meaning, and don't hide truncation).
- **impeccable**: `colorize.md` says to build colour roles rather than a bag of swatches, use OKLCH ramps that reduce chroma near white and black, and prefer explicit colours over translucent overlays. `quieter.md` says quiet does not mean grey, desaturate to 70 to 85 percent, never put grey text on a coloured fill, and tinted neutrals are fine. `craft-floor.md` **refuses a coloured `border-left` or `border-right` wider than 1px on alerts**. That conflicts with Carbon's 3px rule, so none of the recipes below uses a side stripe.
- **frontend-design**: spend boldness in one place and keep everything around it quiet. Avoid all-caps labels, which rules out Atlassian's historic uppercase lozenge. The look should come from the subject, a student marketplace, not from a generic SaaS kit.

---

## 2. Rules every system agrees on

1. **Text carries the meaning.** Every system pairs status colour with a word, and usually with an icon too (Atlassian, Carbon, Polaris). A dot alone is never a status.
2. **Three emphasis levels for status.** Every system has a **subtle** level (tint fill with dark same-hue text) and a **bold** level (saturated fill with white or inverse text). Most also have an outline or surface level. Subtle is the default everywhere: Polaris `base`, Radix `soft`, Atlassian default, Carbon tag. Bold is for a standalone primary status or something that blocks the user (Polaris `strong` "for maximum visibility", Atlassian `isBold`, Primer StateLabel).
3. **Read-only badges have no border by default.** Carbon tag, Polaris badge, Radix soft and Atlassian lozenge have none. Borders appear only on dedicated outline or surface variants, or on interactive chips. Ant and Primer are the exceptions: Ant uses tint plus border, Primer uses outline only.
4. **Badge text gets more contrast than the fill would suggest.** Carbon uses step 70 on step 20, Radix 11 on 3, Primer `fg` against `bg-muted`. For 12px text, aim for 6:1 or more, not just 4.5.
5. **Notices keep body text neutral.** Carbon, Primer, Atlassian and Ant colour only the **icon**, plus a left border in Carbon. Title and body stay in the primary text colour. Coloured paragraphs are not used anywhere.
6. **Notices have an icon per severity**, and its shape differs per severity (Atlassian: circle, triangle, diamond, check), so colour-blind users can tell them apart.
7. **One filled button per view.** Material, Apple, Atlassian and Carbon all use a ladder: filled, then tonal or gray, then outlined, then text. Destructive actions get the danger colour only where they are the primary action (for example in a confirmation dialog). Elsewhere they are text or outline in danger red.
8. **Pair a fill with its own "on" colour.** Primer `onEmphasis`, Material `onX` and `onXContainer`, Atlassian `text.inverse` on `.bold`. Never put arbitrary grey on a tint (impeccable: "never gray on color").
9. **Dark mode remaps colour, it doesn't invert it.** Carbon swaps steps (text 20, background 70). Material uses tone 80 for X and tone 30 for containers. Solids get lighter and their text goes dark.
10. **Shape is a channel.** Atlassian (3px) and Polaris (8px) make badges squarer than buttons. Carbon and Primer use pills. Whichever you pick, **badges and buttons should not share both height and radius**, or a badge reads as tappable.

Typical sizes: badge 20 to 24px tall, 12px text at weight 500 to 600, 6 to 8px side padding, 12 to 16px icon. Notice: 12 to 16px padding, 16 to 24px icon, 8 to 12px radius (Carbon uses 0). Mobile buttons: at least 44px hit area.

---

## 3. Measuring the current KU badges

| Current pair | Text on fill | Fill on page |
|---|---:|---:|
| neutral `#46505d` on `#f1f2f6` | 7.32 | 1.12 |
| success `#1d6d41` on `#cde7d9` | **4.83** | 1.31 |
| warning `#754d03` on `#f8efe0` | 6.53 | 1.14 |
| danger `#96273b` on `#fbe4e8` | 6.55 | 1.21 |

The success badge is the weakest pair (4.83:1). Its fill is also the most saturated (1.31:1 against the page), so it is both the loudest badge and the one closest to failing. Fill strength is uneven across tones: 1.12 to 1.31 against the page.

---

## 4. Three semantic palettes around `#2E8F5A`

All three palettes are generated in OKLCH. Each role uses the **same lightness and chroma** and differs only in hue, so no tone looks heavier than another, which fixes the success-is-loudest problem. Text lightness was solved per hue to hit a contrast target on the subtle fill. Dark solids take dark ink (`#14171b`); light solids take white, except warning, which takes a dark same-hue ink. Brand hue in OKLCH: L 0.580, C 0.122, h 155.3.

Columns:

- **subtle**: the quietest fill (for notices and surface badges).
- **soft**: a fill one step stronger, for borderless badges.
- **border**: decorative hairline, about 1.5:1, allowed by 1.4.11 because the text identifies the badge.
- **border-3:1**: use it when the outline is the only boundary.
- **text**: badge text and icon colour.
- **solid / on-solid**: the bold emphasis level.

### Palette A: Even tonal (canonical hues, Radix and Carbon method)

Hues: success 155 (brand), warning 75, danger 25, info 245, neutral 262 (matches the app's blue-grey `#2f3542`). Chroma: fill 0.03, text 0.13, solid 0.14. The light success solid is pinned to the existing `--green-700` `#257248`.

**Light (page `#ffffff`)**

| Role | subtle | soft | border | border-3:1 | text | solid / on-solid |
|---|---|---|---|---|---|---|
| success | `#e5fbec` | `#d1f4dc` | `#a7e1bb` | `#69a17d` | `#046036` | `#257248` / `#ffffff` |
| warning | `#fef3e3` | `#fde6c7` | `#f0ca96` | `#b28e5c` | `#724b01` | `#f2af48` / `#5f3e02` |
| danger | `#fef1f0` | `#ffe2df` | `#febfb9` | `#c4847f` | `#923230` | `#bf534e` / `#ffffff` |
| info | `#ecf6ff` | `#d9ecfe` | `#a9d7ff` | `#6999c2` | `#03578b` | `#047ac0` / `#ffffff` |
| neutral | `#f2f4f9` | `#e6eaf0` | `#ccd1db` | `#8a95a9` | `#4c5361` | `#6b7587` / `#ffffff` |

| Role | text/subtle | text/soft | text/page | subtle/page | soft/page | border/page | border-3:1/page | on-solid/solid | solid/page |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| success | 7.08 | 6.47 | 7.69 | 1.09 | 1.19 | 1.49 | 3.00 | 5.87 | 5.87 |
| warning | 7.03 | 6.36 | 7.71 | 1.10 | 1.21 | 1.54 | 3.04 | 5.05 | 1.91 |
| danger | 7.00 | 6.32 | 7.72 | 1.10 | 1.22 | 1.57 | 3.02 | 4.60 | 4.60 |
| info | 7.00 | 6.34 | 7.66 | 1.09 | 1.21 | 1.52 | 3.03 | 4.62 | 4.62 |
| neutral | 7.02 | 6.40 | 7.73 | 1.10 | 1.21 | 1.53 | 3.02 | 4.65 | 4.65 |

**Dark (page `#14171b`, surface `#1d2127`)**

| Role | subtle | soft | border | border-3:1 | text | solid / on-solid |
|---|---|---|---|---|---|---|
| success | `#183021` | `#203929` | `#225a3a` | `#3f7654` | `#75c894` | `#62ca8c` / `#14171b` |
| warning | `#362711` | `#403019` | `#664610` | `#876533` | `#e0ac61` | `#f6b758` / `#14171b` |
| danger | `#3d221f` | `#472a28` | `#733a36` | `#975b56` | `#f79c94` | `#fa8e86` / `#14171b` |
| info | `#172c3e` | `#1f3548` | `#225176` | `#406f95` | `#75bcf6` | `#62b9fe` / `#14171b` |
| neutral | `#282a2e` | `#313337` | `#494d56` | `#616b7e` | `#aeb6c3` | `#b3bed2` / `#14171b` |

| Role | text/subtle | text/soft | text/page | text/surface | border/page | border-3:1 page/surface | on-solid/solid | solid/page | solid/surface |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| success | 7.04 | 6.22 | 8.94 | 8.04 | 2.22 | 3.36 / 3.03 | 8.86 | 8.86 | 7.96 |
| warning | 7.04 | 6.19 | 8.77 | 7.88 | 2.10 | 3.37 / 3.03 | 10.13 | 10.13 | 9.11 |
| danger | 7.01 | 6.22 | 8.68 | 7.80 | 2.04 | 3.38 / 3.04 | 7.94 | 7.94 | 7.14 |
| info | 7.01 | 6.19 | 8.80 | 7.91 | 2.15 | 3.36 / 3.02 | 8.47 | 8.47 | 7.61 |
| neutral | 7.04 | 6.19 | 8.80 | 7.91 | 2.12 | 3.35 / 3.01 | 9.60 | 9.60 | 8.63 |

Character: clear and familiar, with 7:1 text everywhere. Danger is a muted brick red (`#bf534e`), not the current saturated red.

### Palette B: Brand-harmonised (Material `harmonize` method, quieter)

Each semantic hue is rotated up to 15 degrees toward the brand hue 155 (Material Color Utilities `Blend.harmonize`). Chroma is cut by about 30 percent (impeccable `quieter`: 70 to 85 percent saturation), and the neutral is tinted with the brand hue. Hues: success 155, warning 88 (ochre), danger 32 (brick or rust), info 230 (teal-blue), neutral 160. Text target 6.5:1.

**Light**

| Role | subtle | soft | border | border-3:1 | text | solid / on-solid |
|---|---|---|---|---|---|---|
| success | `#e9f9ee` | `#d8f1e0` | `#b5dcc2` | `#789d85` | `#1d643d` | `#308455` / `#ffffff` |
| warning | `#fbf4e4` | `#f3e9d0` | `#e0d0a8` | `#a3936e` | `#6e5403` | `#dbba66` / `#584303` |
| danger | `#fef1ef` | `#fee3dd` | `#f3c5bb` | `#b58a81` | `#874437` | `#b05e4f` / `#ffffff` |
| info | `#e9f7fe` | `#d3effd` | `#add8ef` | `#709aaf` | `#065f7f` | `#057ea7` / `#ffffff` |
| neutral | `#f1f6f3` | `#e6ebe8` | `#cad4ce` | `#89988f` | `#4c5b53` | `#67796e` / `#ffffff` |

| Role | text/subtle | text/soft | text/page | subtle/page | soft/page | border/page | border-3:1/page | on-solid/solid | solid/page |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| success | 6.54 | 5.97 | 7.14 | 1.09 | 1.19 | 1.50 | 3.02 | 4.61 | 4.61 |
| warning | 6.53 | 5.93 | 7.16 | 1.10 | 1.21 | 1.53 | 3.02 | 5.06 | 1.87 |
| danger | 6.54 | 5.92 | 7.21 | 1.10 | 1.22 | 1.55 | 3.04 | 4.61 | 4.61 |
| info | 6.51 | 5.94 | 7.12 | 1.09 | 1.20 | 1.52 | 3.03 | 4.62 | 4.62 |
| neutral | 6.56 | 5.95 | 7.17 | 1.09 | 1.21 | 1.52 | 3.02 | 4.63 | 4.63 |

**Dark**

| Role | subtle | soft | border | border-3:1 | text | solid / on-solid |
|---|---|---|---|---|---|---|
| success | `#1e2f23` | `#26382c` | `#335640` | `#4f735c` | `#83bd97` | `#78c594` / `#14171b` |
| warning | `#302918` | `#3a3220` | `#5a4b28` | `#786945` | `#c3ac72` | `#e0c072` / `#14171b` |
| danger | `#382420` | `#422d29` | `#68423a` | `#896158` | `#df9e90` | `#ec9887` / `#14171b` |
| info | `#192d36` | `#213640` | `#2a5365` | `#477083` | `#76b8d7` | `#63bde7` / `#14171b` |
| neutral | `#272b29` | `#303432` | `#474f4a` | `#5f6e65` | `#a4b2aa` | `#afc3b8` / `#14171b` |

| Role | text/subtle | text/soft | text/page | text/surface | border/page | border-3:1 page/surface | on-solid/solid | solid/page | solid/surface |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| success | 6.52 | 5.75 | 8.30 | 7.46 | 2.18 | 3.37 / 3.03 | 8.74 | 8.74 | 7.86 |
| warning | 6.50 | 5.71 | 8.10 | 7.29 | 2.12 | 3.34 / 3.01 | 10.23 | 10.23 | 9.20 |
| danger | 6.54 | 5.75 | 8.07 | 7.26 | 2.08 | 3.35 / 3.01 | 8.05 | 8.05 | 7.24 |
| info | 6.54 | 5.77 | 8.22 | 7.40 | 2.16 | 3.35 / 3.01 | 8.53 | 8.53 | 7.67 |
| neutral | 6.51 | 5.73 | 8.16 | 7.33 | 2.13 | 3.34 / 3.01 | 9.69 | 9.69 | 8.71 |

Character: earthy and calm, and it clearly belongs to the green brand. Two risks:

- Danger (`#874437` text, `#b05e4f` solid) reads as rust. It is less alarming, which is the point, but check that it still reads as "problem".
- Hue 32 at high chroma would drift toward the generic terracotta accent `#D97757`. Keep the chroma low.

### Palette C: Wide separation (split-complementary danger, high distinguishability)

Danger sits near the split-complement of green (h 8, crimson or raspberry). Info is indigo (272), so it is far from both brand green and the brand's existing blue-grey. Warning is saffron (68). Chroma is higher (fill 0.04, text 0.17, solid 0.19), so the tones are easy to tell apart, which matters for colour-vision deficiency, where red and green otherwise collapse. Text target 6.5:1.

**Light**

| Role | subtle | soft | border | border-3:1 | text | solid / on-solid |
|---|---|---|---|---|---|---|
| success | `#e0fde9` | `#c8f7d7` | `#94e7b2` | `#53a573` | `#016639` | `#01864d` / `#ffffff` |
| warning | `#fff2e5` | `#ffe5c9` | `#ffc485` | `#c38946` | `#7d4d04` | `#ffa839` / `#633b00` |
| danger | `#fff0f2` | `#fee1e5` | `#ffbcc7` | `#d37b8c` | `#a61f4b` | `#d23a66` / `#ffffff` |
| info | `#f1f4fe` | `#e2e9fe` | `#c1cfff` | `#7e91da` | `#3d4cb8` | `#5569e7` / `#ffffff` |
| neutral | `#f2f4fa` | `#e6eaf2` | `#cbd1df` | `#8895b1` | `#4f5869` | `#6b758a` / `#ffffff` |

| Role | text/subtle | text/soft | text/page | subtle/page | soft/page | border/page | border-3:1/page | on-solid/solid | solid/page |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| success | 6.55 | 5.99 | 7.09 | 1.08 | 1.18 | 1.47 | 3.00 | 4.65 | 4.65 |
| warning | 6.50 | 5.89 | 7.15 | 1.10 | 1.21 | 1.56 | 3.01 | 5.06 | 1.92 |
| danger | 6.51 | 5.86 | 7.19 | 1.11 | 1.23 | 1.58 | 3.01 | 4.63 | 4.63 |
| info | 6.54 | 5.92 | 7.18 | 1.10 | 1.21 | 1.54 | 3.02 | 4.60 | 4.60 |
| neutral | 6.51 | 5.94 | 7.16 | 1.10 | 1.21 | 1.53 | 3.01 | 4.63 | 4.63 |

**Dark**

| Role | subtle | soft | border | border-3:1 | text | solid / on-solid |
|---|---|---|---|---|---|---|
| success | `#0e321e` | `#173b26` | `#035d34` | `#22794a` | `#50c683` | `#1fd17d` / `#14171b` |
| warning | `#3c2406` | `#462d0e` | `#6d4200` | `#965f13` | `#eb9d39` | `#ffb257` / `#14171b` |
| danger | `#411d25` | `#4b262d` | `#7d2e41` | `#a35162` | `#ff88a1` | `#ff869f` / `#14171b` |
| info | `#202846` | `#293150` | `#394788` | `#5667ac` | `#94aaff` | `#96acfe` / `#14171b` |
| neutral | `#272a30` | `#303339` | `#484d58` | `#5f6b85` | `#a7afbf` | `#b3bed5` / `#14171b` |

| Role | text/subtle | text/soft | text/page | text/surface | border/page | border-3:1 page/surface | on-solid/solid | solid/page | solid/surface |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| success | 6.53 | 5.77 | 8.34 | 7.50 | 2.24 | 3.34 / 3.00 | 8.97 | 8.97 | 8.06 |
| warning | 6.51 | 5.73 | 8.06 | 7.25 | 2.08 | 3.38 / 3.04 | 10.07 | 10.07 | 9.05 |
| danger | 6.51 | 5.75 | 7.95 | 7.15 | 2.00 | 3.35 / 3.01 | 7.84 | 7.84 | 7.05 |
| info | 6.50 | 5.73 | 8.09 | 7.28 | 2.08 | 3.37 / 3.03 | 8.24 | 8.24 | 7.41 |
| neutral | 6.53 | 5.75 | 8.16 | 7.33 | 2.12 | 3.36 / 3.02 | 9.62 | 9.62 | 8.65 |

Character: lively, maximally distinct, and the most "app-like". The light success solid `#01864d` is greener than the brand, so if C is chosen, pin it to `#257248` as in Palette A.

### Notes common to all three palettes

- **The warning solid can never reach 3:1 against white** (1.87 to 1.92). Any amber fill does this. That is acceptable under 1.4.11 because the text identifies the badge. If a warning solid ever has to stand alone as a shape, add the border-3:1 colour.
- **Brand button fill:** use `#257248` with white (5.87). `#2E8F5A` with white (4.04) or with `#122b1d` (3.74) fails for 14 to 16px labels. `#2E8F5A` can stay as a **fill-only** accent, such as a selected tab or an icon, where 3:1 applies. GitHub made the same move: its primary `#1f883d` is 4.52:1.
- **Dark brand button:** `#3ab572` with `#14171b` text (6.88), or `#52c684` with it (8.36). White on `#3ab572` is only 2.61.
- **Tonal (secondary) brand button:** `#19432c` text on `#e6f2eb` (9.71) in light. `#8bdcad` text on `#1f3c2a` (7.44) in dark.

---

## 5. Three style recipes

Each recipe defines the badge, the notice and the button ladder. Any palette can be used with any recipe; the suggested pairing is noted. Shared rules for all three:

- Prompt 12px/500 for badge text, with `tabular-nums` for counts.
- Status icons are 14px in badges and 18 to 20px in notices, and each severity gets a different shape: info circle, check, triangle, octagon.
- Notice body text is always `--text-primary`; only the icon (and optionally the title) takes the role colour.
- No coloured side stripes, and no uppercase.
- Badges never share both height and radius with buttons.

### Recipe 1: "Soft, borderless" (suggested palette: A)

Derived from Radix `soft`, Carbon read-only tag, Polaris `base` badge, Atlassian subtle lozenge and Apple `tinted` button.

| Part | Spec |
|---|---|
| Badge | Fill `soft`. **No border**. Text and icon in `text`. 22px tall, `0 8px` padding (`0 6px 0 4px` with a 14px leading icon, 4px gap), **6px radius** (rounded rectangle, not a pill), 12px/500, single line. Every tone looks equally heavy (soft is 1.19 to 1.22:1 against the page in light, about 1.42:1 in dark). |
| Emphasis levels | Two. `soft` is the default. `solid` (white or dark on-solid text) is allowed only for one standalone hero status per screen, such as "Sold" on a listing photo (Polaris `strong` rule). |
| Notice | Fill `subtle`, no border, 12px radius, `12px 14px` padding, 20px role icon in `text` (top-aligned with the first line), title 14px/600 `--text-primary`, body 14px/400 `--text-secondary`, actions as text buttons in the role `text` colour. |
| Buttons | Primary: solid `#257248` with white text (dark: `#3ab572` with `#14171b`), 44px tall, full radius, 15px/600, `0 20px` padding. Secondary: tonal `#e6f2eb` / `#19432c`. Tertiary: text only, `#257248`. Destructive: danger `text` on a transparent background, and solid danger only inside a confirmation dialog. |
| Why it fits | It keeps colour but drops the border and the pill, the two things that made the current badges look like "pastel pills". It uses fewer surfaces than the current design. |

### Recipe 2: "Calm solids" (suggested palette: B)

Derived from Primer StateLabel, Atlassian `isBold` lozenge, Confluence status default (solid with white text), Carbon high-contrast tag, and Material filled versus tonal emphasis.

| Part | Spec |
|---|---|
| Badge | Fill `solid` with `on-solid` text (light: white on success, danger, info and neutral, ink `#584303` on warning; dark: `#14171b` on all). No border. 20px tall, `0 7px` padding, **4px radius**, 12px/600. Low chroma (Palette B) keeps a solid from shouting: rust danger `#b05e4f`, not a red siren. |
| Emphasis levels | Two. `solid` for status that matters for the transaction (sold, reserved, reported, rejected). Neutral `soft` with `text` for metadata (category, condition, "2 days ago"), so most chips on a card stay quiet and colour appears only for status. |
| Notice | Neutral surface (light `#f8f9fb`, dark `#1d2127`) with a 1px `--border-subtle` border and 12px radius. **A 28px icon tile** (`subtle` fill, 16px icon in `text`, 8px radius) leads the notice. Title 14px/600 `--text-primary`, body `--text-secondary`. Colour is only in the icon tile, which echoes the badge. |
| Buttons | Primary solid `#257248`. Secondary: outline with a 1px `#747d8c` border (4.15:1 on white, 4.33:1 on dark page) and ink text. Tertiary: text. Destructive primary: Palette B danger solid `#b05e4f` with white (4.61). 44px, full radius. Badges at 4px radius and 20px tall cannot be confused with 44px pill buttons. |
| Why it fits | It is the opposite of both rejected directions. There is no pastel tint and no colour-free outline: confident, small, matte solids, as in GitHub and Confluence. |

### Recipe 3: "Two-tier by urgency" (suggested palette: C, with the success solid pinned to `#257248`)

Derived from Polaris base versus strong guidance, Atlassian section message versus banner, Carbon low versus high-contrast notifications, and the Material emphasis ladder.

| Part | Spec |
|---|---|
| Badge | **Informational states** (neutral, info, success): `soft` fill, no border, `text` colour, 22px tall, 11px radius (pill), 12px/500, with an optional 14px icon. **Action-needed states** (warning, danger, for example "Payment due", "Reported"): `solid` fill with `on-solid` text and a leading 14px icon. Colour intensity tells the user what to look at; the hue tells them which kind of status it is. |
| Emphasis levels | Exactly two, chosen by **urgency, not tone**. Never show more than one solid badge per card. |
| Notice | Info and success: `subtle` fill, no border, 12px radius, 20px icon in `text`, body in `--text-primary`, `12px 14px` padding. Warning and danger that block the user: a full-width **inverse** strip (Carbon high contrast): light `#2f3542` background with white text and the icon in the role's dark-mode `text` colour. Dark theme: `#f1f2f6` background with `#2f3542` text and the icon in the role's light-mode `text` colour. 48px minimum height. |
| Buttons | Primary solid `#257248`, 44px pill. Secondary tonal green. Tertiary text. Destructive: Palette C danger `text` `#a61f4b` as a text button, and solid `#d23a66` with white (4.63) only in a confirmation dialog. |
| Why it fits | Colour volume follows importance. Most screens show only quiet soft badges, and the rare solid or inverse element is the "one bold place" that the frontend-design and impeccable guidance asks for. |

### Where the recipes conflict with `frontend/CLAUDE.md` (the owner decides)

The research brief gave Prompt as the font and did not mention the Herbarium direction. `frontend/CLAUDE.md` (owner decision 2026-10-29) sets different rules, and the recipes above break some of them as written:

| CLAUDE.md rule | Where a recipe breaks it | Change that would comply |
|---|---|---|
| Radius: chips and labels 2px, buttons 4px, pills only for avatars | Recipe 1 badge 6px. Recipe 3 badge 11px pill. All recipes use full-radius buttons. Notices 12px. | Badge 2px, button 4px, notice 2px or 4px. The recipes still differ in fill, border and emphasis, which is what they are compared on. |
| Neutrals carry a trace of the brand hue | Palettes A and C use a blue-grey neutral (hue 262 or 265). | Palette B's neutral (hue 160), or the B neutral column used with A or C. |
| Type: Anuphan body, Maitree display, Prompt fallback only | The recipes name Prompt. | Font size, weight and colour rules are unchanged; only the family changes. |
| Primary button label 16px semibold (15px for the small size) | Recipe 1 says 15px/600. | 16px/600. |
| Flat with hairlines; inputs and segmented controls use the 3:1 `line-strong` | Recipe 2's outline secondary button (`#747d8c`, 4.15:1) already complies. The other recipes use hairline-free tonal secondaries. | Either is allowed. Choose per recipe. |
| Trade has no colour | The palettes have no trade tone, so they already comply. | None. |

These are left as open questions rather than resolved in the recipes.

---

## 6. Sources

- Material 3: https://m3.material.io/components/buttons/overview , https://m3.material.io/components/chips/specs , https://m3.material.io/components/badges/specs , https://m3.material.io/styles/color/roles , https://github.com/material-foundation/material-color-utilities , https://developer.android.com/develop/ui/compose/components/button
- Apple HIG: https://developer.apple.com/design/human-interface-guidelines/buttons , https://developer.apple.com/design/human-interface-guidelines/color , https://developer.apple.com/documentation/uikit/uibutton/configuration
- Polaris: https://shopify.dev/docs/api/app-home/polaris-web-components/feedback-and-status-indicators/badge , https://shopify.dev/docs/api/app-home/polaris-web-components/feedback-and-status-indicators/banner , https://shopify.dev/docs/apps/build/app-home/migrate-from-polaris-react/badge
- Primer: https://primer.style/product/components/label/ , https://primer.style/product/components/state-label/ , https://primer.style/product/components/banner/ , https://primer.style/product/getting-started/foundations/color-usage/
- Carbon: https://carbondesignsystem.com/components/tag/style/ , https://carbondesignsystem.com/components/notification/style/ , https://carbondesignsystem.com/components/button/style/
- Atlassian: https://atlassian.design/components/lozenge/examples , https://atlassian.design/components/section-message/ , https://atlassian.design/foundations/content/designing-messages , https://atlassian.design/foundations/color-new/ , https://aui.atlassian.com/aui/7.1/docs/lozenges.html , https://confluence.atlassian.com/doc/status-macro-223222355.html
- Ant Design: https://ant.design/components/tag , https://ant.design/components/alert , https://ant.design/components/button
- Radix: https://www.radix-ui.com/themes/docs/components/badge , https://www.radix-ui.com/themes/docs/components/callout , https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale
- WCAG: https://www.w3.org/WAI/WCAG22/Understanding/use-of-color , https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum , https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast , https://www.yatil.net/blog/non-text-contrast-in-detail-ui-components
- Local skills: ui-ux-pro-max `references/quick-reference.md` §1 and §6, plus the color and ux databases. impeccable `reference/colorize.md`, `quieter.md`, `craft-floor.md`. frontend-design `SKILL.md`.
