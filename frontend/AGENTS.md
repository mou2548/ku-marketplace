<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# KU Marketplace — Frontend Agent Guidelines

Student marketplace for Kasetsart University: buy/sell, item trading, and giveaways.
This document governs all AI agent work in `frontend/`. It outlines mandatory rules, design systems, tech stack requirements, accessibility standards, and development workflows.

---

## 0. Scope Lock

- All work must be strictly inside `frontend/`. Do not create, edit, or delete files outside `frontend/`.
- Off limits:
  - `backend/` — do not modify or reference for design rules.
  - `init.sql`, `docker-compose.yml`, `README.md` at repository root.
  - Repository root `.gitignore` or configuration files.
  - Any `.claude/` directory or documentation outside `frontend/`.
- The API contract is fixed. The frontend adapts to the backend, never the reverse.
- If a screen requires data not provided by the API, document the gap in `docs/design/api-gaps.md` and design around it. Do not invent endpoints.

---

## 1. Source of Truth

Design specifications and business behavior derive from `fornewdesign/` (local, git-ignored):

- `flow1.png`: Buy / trade / cancel / refund / dispute state machine and timers.
- `flow2.png`: Report -> investigation -> appeal state machine.
- `flow3.png`: Giveaway allocation and ticket lifecycle.
- `flow4.png`: Auth, account actions, membership tiers.
- `API_Marketplace.pdf`: Endpoints, request shapes, and response envelopes.
- `DatabaseSchema.pdf`: Database tables, columns, and status enums.

Standard Response Envelope (all endpoints except `DELETE`):
```json
{ "success": true, "message": "...", "data": {} }
```

---

## 2. Tech Stack & Dependencies

- Framework: Next.js 16 (App Router). Read `node_modules/next/dist/docs/` before implementing routing, data-fetching, or caching.
- React: React 19. Server Components by default. Use `'use client'` only for interactive handlers, state, effects, or browser APIs.
- Styling: Tailwind CSS v4 (`@theme` in `app/globals.css`). No CSS-in-JS or `tailwind.config.ts`.
- Headless UI: `react-aria-components` (the sole UI library). Used for accessibility, keyboard-navigable drag-and-drop (inventory/trade UI), and DatePicker.
- Motion: `motion` (spring physics for item pickup, card lift, countdown rings, stepper progress).
- Icons: `lucide-react`.
- QR Code: `qrcode`.
- Node Version: Node 20 (enforced by `predev`).

Banned packages (removed and must not be added): `shadcn`, `@base-ui/react`, `tw-animate-css`. All UI primitives in `components/ui/` are custom built using `react-aria-components`.

---

## 3. Design Principles

1. Depth over outline: Use layered shadows and 1px top inner highlights instead of flat hairline borders.
2. Radius rhythm: Match corner radii to component roles (cards 20px, inventory slots 10px, buttons 12px, pills fully rounded).
3. Surface texture: Subtle 2% noise on game panels, faded grid backgrounds on heroes, beveled gradient edges. Avoid text background clutter.
4. Green-tinted neutrals: Neutral grays carry subtle green brand tinting. Pure gray (`#808080`) is prohibited.
5. Typographic hierarchy: Use Prompt font at display sizes with negative tracking and 600-700 font weight. Do not rely solely on color for emphasis.
6. Functional motion: Animate state changes to provide feedback. Never add purely decorative animation. Honor `prefers-reduced-motion`.
7. Purposeful empty states: Include an illustration, explanatory text, and a call-to-action for zero-data states.
8. Game-inspired UI: Inventory and trade interfaces feature slot grids, rarity border highlights, and drag interactions rendered with modern depth.

---

## 4. Brand Colors & Tokens

- Primary Brand Color: `#2E8F5A` (`primary-600`).
- Color Contrast Standards: `#2E8F5A` on white text has a contrast ratio of 4.04:1. Use `primary-600` for background fills, icons, chrome, and large bold text. Use `primary-700` (`#257248`, contrast ratio 5.88:1) for body text and links.
- Color Ramps: `primary` (green), `neutral` (green-gray), `warning` (amber), `danger` (rose), `info` (blue), `trade` (violet).
- Token Rule: Never hardcode hex colors in JSX or CSS components. Use semantic CSS variables/tokens defined in `@theme`.

---

## 5. Responsive Design Standards

- Mobile-first approach: Write baseline styles for mobile screens first, applying `sm:`, `md:`, `lg:` breakpoints progressively.
- Screen resolution verification: Test layouts at 360px, 768px, and 1280px.
- Mobile layout features: Bottom tab bar, full-bleed cards, bottom sheets for dialogs.
- Desktop layout features: Side navigation, masonry grids, modal dialogs.
- Target sizing: Minimum 44x44px touch targets.
- Horizontal scrolling: Prevent page-level horizontal overflow. Use localized `overflow-x: auto` containers when needed.

---

## 6. Accessibility Requirements (WCAG 2.2 AA)

- Text contrast: Minimum 4.5:1 for body text; minimum 3:1 for large text and UI borders.
- Keyboard navigation: Full keyboard accessibility across all interactive components. Inventory drag-and-drop must support keyboard controls via `react-aria-components`.
- Focus indicators: Maintain visible focus outlines across interactive elements.
- Semantic HTML: Use native HTML elements where possible.
- Status indicators: Never rely solely on color to indicate status; combine color with icons or descriptive text labels.

---

## 7. Performance Targets

- LCP: <= 2000ms
- INP: <= 200ms
- CLS: <= 0.05
- JS Bundle per route: <= 150 KB gzip
- Accessibility score: >= 95 in Lighthouse

Ensure images use `next/image` with explicit `sizes` and aspect-ratio reservation to avoid CLS during loading.

---

## 8. Code Organization & Conventions

Directory Structure:
- `components/ui/`: Low-level UI primitives (Button, Input, Dialog, Sheet, Tabs, etc.)
- `components/patterns/`: Reusable pattern compositions (PostCard, StatusBadge, Stepper, etc.)
- `components/features/<domain>/`: Domain-specific components (trade, giveaway, chat, inventory)
- `lib/`: Helper utilities, API clients, enum-to-label mappings, and domain logic.

TypeScript & Data Rules:
- Enforce strict typing with zero `any` types. Use discriminated unions for status-dependent props.
- Handle all backend enum values explicitly in conditional logic and switch statements.

---

## 9. Language & Formatting Rules

- Primary Language: All code, comments, identifiers, documentation, commit messages, and file names must be written in English.
- No Emojis: Do not use emojis anywhere (code, comments, documentation, commit messages, or chat responses). Use plain text, Lucide icons, or typographic symbols instead.

---

## 10. Agent Workflow Guidelines

1. Plan First: Propose an implementation plan before making edits to code.
2. Ask Clarifying Questions: If requirements or designs are ambiguous, ask the user before proceeding. Do not make unverified assumptions.
3. Git Actions: Pushing commits requires explicit user authorization.
4. Restricted Commits: Do not commit `.claude/`, `CLAUDE.md`, `AGENTS.md`, or `fornewdesign/`.
5. Author Attribution: Do not tag AI assistants as commit authors or co-authors.
6. Context Limits: Notify the user when approaching context token limits.
7. Incremental Delivery: Work in single phases and report changes upon completion.
