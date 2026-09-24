# Faike architecture

Status: Stage 1 (foundation) complete. Reality Defender is not yet integrated. Sections marked **Planned** describe the intended design and remain subject to the verification items in HANDOFF §12.

## 1. Overview

Faike is a single Next.js application deployed to Vercel. The browser never talks to Reality Defender (RD) directly: all RD traffic passes through Next.js Route Handlers, which hold the API key and translate RD's responses into Faike's own result model.

```
Browser                          Next.js on Vercel                          External
───────                          ─────────────────                          ────────
Server-rendered pages  ◀───────  App Router (Server Components)
Client components  ───fetch───▶  Route Handlers  src/app/api/**/route.ts
  (intake, polling,                    │
   player, feedback)                   ▼
                                 RD adapter (server-only)  ──── HTTPS ───▶  Reality Defender API
                                       │
                                       ▼
                                 ScanResult  (src/lib/scan/types.ts)
                                       │
UI components  ◀───── JSON ────────────┘
```

## 2. Repository layout

```
design/handoff/            Approved D2 handoff, verbatim (spec, tokens, comps). Never edited.
design/brand/              Supplied logo PNG + provisional traced SVG.
docs/architecture.md       This document.
src/app/                   Routes (App Router).
  layout.tsx               Root: fonts, metadata, skip link, logo-swipe script.
  globals.css              Tailwind theme mapped to tokens, base styles, motion.
  (site)/                  Route group sharing the "home" header: /, /history, /how-it-works, /sign-in.
  not-found.tsx            404 (brings its own header; root not-found bypasses group layouts).
src/components/brand/      Wordmark (logo + highlighter band).
src/components/layout/     SiteHeader, PageColumn, PlaceholderPage.
src/components/ui/         Button, RoundIconButton, Icon, StateCard.
src/components/home/       Home-screen components (StepStrip).
src/lib/                   Framework-free code: cx helper, scan result types.
src/styles/tokens.css      Copy of the handoff tokens (minus the Google Fonts import).
```

Planned additions: `src/app/check/[scanId]/` (scan flow), `src/app/api/` (Route Handlers), `src/lib/rd/` (server-only adapter), `src/lib/config/` (thresholds, limits, gating), fixtures for every verdict × media type (HANDOFF §14).

## 3. Frontend

**Rendering.** Pages and layouts are Server Components. Client Components are used only where interaction requires them (today: `Button`, whose disabled guard needs a click handler). All current routes prerender as static HTML.

**Routes.**

| Route | Status | Screen |
|---|---|---|
| `/` | Built (foundation) | Home: header, hero, step strip. Universal input arrives in Stage 2. |
| `/how-it-works`, `/history`, `/sign-in` | Placeholder | Out of scope per HANDOFF §2 |
| `/check/[scanId]` | Planned | Uploading → retrieving → analysing → result, state-driven, one route |
| `/check/[scanId]/details` | Planned | Result details on desktop; on mobile, details render below the result |

**Header.** `SiteHeader` has three variants from the comps (`home`, `flow`, `result`) and collapses to one control on mobile. The `(site)` group layout renders the `home` variant; the scan flow will choose its variant per state.

## 4. Styling pipeline

1. `design/handoff/tokens.css` is the source. `src/styles/tokens.css` copies it verbatim, minus the Google Fonts `@import`.
2. `src/app/globals.css` imports Tailwind and the tokens, clears Tailwind's default colour, type, radius, shadow, easing, container and breakpoint namespaces, and maps each token into Tailwind's theme with `@theme inline reference`. Utilities therefore resolve straight to the token variables (`.bg-ink { background-color: var(--color-ink) }`) and Tailwind emits no parallel variables.
3. Handoff values that are not in tokens.css (mobile display sizes §4, tablet width §5) are declared once in `globals.css`, each with its HANDOFF reference.
4. Fonts are self-hosted by `next/font/google` (Bricolage Grotesque with the `opsz` axis, Figtree). `--font-display` and `--font-body` are re-pointed at the next/font variables, keeping the token fallback stacks.
5. Breakpoints are exactly the handoff's: `sm` 640px (tablet) and `lg` 1024px (desktop).

## 5. Backend and data flow (Planned)

**Server boundary.** Route Handlers are the only backend. Modules that read secrets import `"server-only"` so a build fails if client code imports them. The RD API key is an environment variable set in Vercel, never prefixed `NEXT_PUBLIC_`.

**Adapter.** One module maps RD responses into `ScanResult`. It validates the response shape at runtime, treats every field as optional, never hard-codes detector or model names, takes the verdict and score from RD's ensemble result, and maps anything unrecognised to the `unable` state rather than to a verdict.

**Scan lifecycle** (HANDOFF §9.4): validate on the client (type, size, duration, free-tier gate) → validate again on the server → upload → submit to RD → poll or subscribe for status with exponential back-off, pausing while the tab is hidden → normalise → render. The same state machine drives the uploading, retrieving, analysing, partial, result and error states.

**Open design points to settle at integration time:**

- **Upload path.** HANDOFF limits go up to 250 MB (video). Vercel Functions cap request bodies at roughly 4.5 MB (verify against current Vercel documentation), so files cannot stream through a Route Handler. Expect a direct-to-storage or RD-provided upload URL flow; confirm what RD supports.
- **Scan persistence.** `/check/[scanId]` must reload a completed result and support retry without re-upload (HANDOFF §8), which implies a server-side scan record and file reference. Storage choice and retention period are open (HANDOFF §13.2).
- **Status pattern.** Polling versus webhooks, progress percentages and cancellation depend on RD (HANDOFF §12.11).
- **SDK or REST.** Decide after reviewing RD's current documentation.

**Privacy.** No file contents in logs. Feedback stores the scan ID and answer only. Share never includes the user's file.

## 6. Decision log

| # | Decision | Reason |
|---|---|---|
| 1 | Next.js 16.3 App Router, TypeScript strict, npm, Turbopack (default). | Brief. Current stable release; npm per brief. |
| 2 | React 19.3.0 instead of the scaffold's 19.2.8. | Current stable; Next 16.3.6 runs the App Router on its bundled React 19.3 canary, so the installed version now matches that line. |
| 3 | ESLint 9 and TypeScript 5.9 kept. | `eslint-config-next`'s bundled plugins (react, jsx-a11y, import) declare peer support only up to ESLint 9; `typescript-eslint` supports TypeScript < 6.1, which excludes TypeScript 7. |
| 4 | Tailwind 4 used only as a delivery mechanism for the handoff tokens; default theme cleared. | The brief asks for Tailwind; HANDOFF §0 forbids a framework whose defaults override the look. Clearing the defaults satisfies both. |
| 5 | Handoff stored verbatim in `design/handoff/`; tokens copied into `src/styles/tokens.css` minus the font import. | Keeps the authoritative files untouched and diffable; avoids a runtime Google Fonts request and a mid-file `@import`. |
| 6 | Fonts via `next/font/google`. | Self-hosted at build time: no third-party request from users' browsers, automatic fallback metrics, no layout shift. |
| 7 | Supplied logo replaces the text wordmark; highlighter band kept behind "Λi"; traced SVG marked provisional. | Product decision, 24 Sep 2026. Only a PNG (opaque background, pure black) was supplied; the trace gives a transparent, ink-coloured, scalable mark until the designer master arrives. |
| 8 | Band position measured, not guessed. | Derived from the handoff's `.hl` proportions on the 01-upload comp rendered in Bricolage (band from 40% below the ascender line to 16% of cap height below the baseline). It starts clear of the F's middle arm so only "Λi" is highlighted. |
| 9 | Logo swipe driven by an inline `<head>` script and a data attribute on `<html>`. | Runs before first paint, so the band never flashes; no client component; plays only on the first home load of a session; reduced motion shows the end state via the tokens. `next/script` `beforeInteractive` was rejected because it does not block paint. A future CSP needs a hash or nonce for this script. |
| 10 | `(site)` route group owns the shared header; `not-found.tsx` renders its own. | Avoids repeating the header per page; the root not-found renders outside group layouts. |
| 11 | Focus ring as `box-shadow` (`--focus-ring`) plus a transparent outline. | Matches the token; the transparent outline keeps focus visible in forced-colours mode. |
| 12 | `Button` is a Client Component; `RoundIconButton` and the rest are server-compatible. | The disabled guard (aria-disabled, stays focusable per §6.1) needs a click handler. |
| 13 | No UI, icon or class-merging libraries. | HANDOFF §0 and the brief. Icons are the comps' own SVGs; `cx` replaces `clsx`. |
| 14 | `ScanResult` (HANDOFF §9.1) defined before the adapter. | Fixes the UI ↔ adapter contract so screens can be built against fixtures while RD details are verified. |
| 15 | Step strip stays stacked below desktop. | Derived: the handoff stacks it on mobile and is silent on tablet; the row needs ~790px, more than the 720px tablet column. |
| 16 | Display headings use `text-wrap: balance`. | Prevents orphaned words at narrow widths (e.g. the hero at 360px) without changing the specified sizes. |
