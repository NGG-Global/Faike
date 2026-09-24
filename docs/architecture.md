# Faike architecture

Status: Stage 2 complete. The whole interface runs on mock data through the same service contract the real integration will use. Reality Defender is not yet integrated. Sections marked **Planned** describe the intended design and remain subject to the verification items in HANDOFF §12.

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
design/handoff/            Approved D2 handoff, verbatim. Never edited.
design/brand/              Supplied logo PNG + provisional traced SVG.
public/samples/            Bundled sample files (generated for Faike): photo, heat map, voice note, video.
src/app/                   Routes (App Router).
  layout.tsx, globals.css  Root: fonts, metadata, skip link, logo swipe; tokens → Tailwind theme, motion.
  (site)/                  Shared "home" header: /, /history, /how-it-works, /sign-in, /plus, /mock, /mock/run.
  check/[scanId]/          The flow (page.tsx) and result details (details/page.tsx).
  not-found.tsx            404.
src/components/
  brand/ layout/ ui/       Wordmark, header, columns, cards, buttons, icons, tags, accordion, segmented control.
  intake/                  Universal input: drop zone, paste field, type chips, example links, validation cards.
  flow/                    ScanFlow (stage switch), analysing view and visual, full-page state cards.
  result/                  Verdict card, signal meter, file summary, actions, share, feedback, evidence note, non-verdict cards.
  details/                 Media evidence (audio, image, video, text), flagged list, aside cards, advanced details.
src/hooks/                 Browser helpers: media playback, decoded audio peaks, video frames, element width, media query.
src/lib/scan/              types (ScanResult), job (flow state), store, service contract, client (swap point),
                           input (classify/validate), media-meta, meter, copy, facts.
src/lib/rd/verdict.ts      RD verdict concepts → Faike verdicts (defensive; shared with the future adapter).
src/config/                Media limits and gating, meter thresholds (placeholders), social platforms (placeholder).
src/mocks/                 MOCK ONLY: fixtures, result builder, samples, mock scan service, demo checks, settings,
                           home previews, review-page launcher. Removed at RD integration.
```

## 3. Frontend

**Rendering.** Pages are Server Components that hand off to client components where the flow needs browser state. Static pages prerender; `/check/[scanId]` and its details render on demand because they depend on the check.

**Routes.**

| Route | Screen |
|---|---|
| `/` | Home: universal input (§7.2) |
| `/check/[scanId]` | Uploading → retrieving → analysing → result or system state, one route driven by the check's stage (§7.1) |
| `/check/[scanId]/details` | Result details on tablet and desktop; on mobile the same content renders inline on the result page (§5) |
| `/how-it-works`, `/history`, `/sign-in`, `/plus` | Placeholders (out of scope, §2) |
| `/mock`, `/mock/run` | MOCK review page and launcher (no-index; removed at RD integration) |

**Header.** `SiteHeader` variants: `home` on general pages, `flow` while a check runs, `result` once it is done.

**State.** A small client store (`src/lib/scan/store.ts`, read with `useSyncExternalStore`) holds the checks in this tab, the input restored after Cancel, and a focus request for the home page. Screens read a check by id; they never call Reality Defender or the mock directly.

**Accessibility mechanics.** Result arrival moves focus to the verdict headline; step pills and upload milestones are polite live regions; the audio waveform is a slider; image regions and text passages are focusable with spoken labels; accordion panels are inert while collapsed; the file picker, paste and example links make the input fully usable without drag and drop.

## 4. Styling pipeline

1. `design/handoff/tokens.css` is the source. `src/styles/tokens.css` copies it verbatim, minus the Google Fonts `@import`.
2. `src/app/globals.css` imports Tailwind and the tokens, clears Tailwind's default colour, type, radius, shadow, easing, container and breakpoint namespaces, and maps each token into Tailwind's theme with `@theme inline reference`. Utilities therefore resolve straight to the token variables (`.bg-ink { background-color: var(--color-ink) }`) and Tailwind emits no parallel variables.
3. Handoff values that are not in tokens.css (mobile display sizes §4, tablet width §5) are declared once in `globals.css`, each with its HANDOFF reference.
4. Fonts are self-hosted by `next/font/google` (Bricolage Grotesque with the `opsz` axis, Figtree). `--font-display` and `--font-body` are re-pointed at the next/font variables, keeping the token fallback stacks.
5. Breakpoints are exactly the handoff's: `sm` 640px (tablet) and `lg` 1024px (desktop).

## 5. Data flow

**Today (mock).**

```
Intake (browser) ── validate (type, size, duration, Plus) ──▶ scanService.start(input)
                                                               │  src/lib/scan/client.ts → mockScanService
                                                               ▼
                             timers simulate upload / retrieval / analysis, fixtures → ScanResult
                                                               │
                                                               ▼
                                          scan store (this tab; finished checks in sessionStorage)
                                                               │
                        /check/[scanId] and /details ◀─────────┘  (useScanJob / useEnsureScan)
```

Nothing is uploaded. Previews, waveform peaks, video frames and file metadata are computed in the browser from the person's own file.

**Planned (Stage 3).** A client implementing the same `ScanService` contract replaces the mock:

- **Server boundary.** Route Handlers are the only backend. Modules that read secrets import `"server-only"`. The RD API key is a Vercel environment variable, never prefixed `NEXT_PUBLIC_`.
- **Adapter.** One server module maps RD responses into `ScanResult`: runtime validation, every field optional, no hard-coded model names, verdict and score from the ensemble, anything unrecognised → `unable` (via `verdictFromRd`).
- **Lifecycle** (§9.4): client validation (already built) → server validation → upload → submit → poll or subscribe with back-off, paused while the tab is hidden → normalise → the same store updates the same screens.

**Open points for Stage 3:**

- **Upload path.** Limits go up to 250 MB; Vercel Functions cap request bodies at roughly 4.5 MB (verify against current Vercel documentation), so files need a direct-to-storage or RD-provided upload URL flow.
- **Scan persistence.** Direct links and retry across devices need a server-side scan record and file reference; storage and retention are open (§13.2). The mock keeps finished checks per browser session only.
- **Status pattern.** Polling versus webhooks, progress percentages and cancellation depend on RD (§12.11). The interface already handles both real percentages and status-only progress.
- **SDK or REST.** Decide after reviewing RD's current documentation.

**Privacy.** No file contents in logs. Feedback sends the check id and answer only. Share never includes the person's file. Retrieved social media is never re-hosted.

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
| 17 | Screens depend on a `ScanService` contract and a client store, not on RD or the mock. `src/lib/scan/client.ts` is the single swap point. | The integration replaces one implementation; no screen changes. Keeps RD parsing out of the UI (CLAUDE.md). |
| 18 | Fixtures use Faike's `ScanResult` shape, never a guessed RD schema. RD verdict concepts map through `verdictFromRd`, which returns `unable` for anything unrecognised. | §12.1 forbids guessing RD field names; the mapping is exercised by the mock and unit tests now. |
| 19 | Mock runs entirely in the browser (timers, fixtures, bundled samples). | Works on any static deployment for review; nothing leaves the device. |
| 20 | Finished checks persist in `sessionStorage`; files and in-progress checks do not. | Meets §7.1 "direct loads show the result" for the mock without a database; the server takes this over in Stage 3. |
| 21 | Vitest (unit tests of pure logic, Node environment) and `@types/node` 22 added. | The meter rule (§9.2), validation and fixtures need tests. Only `vitest` was added; no DOM testing stack. `@types/node` 22 is required by Vitest 5 and matches the Node 22 toolchain. |
| 22 | Browser-only state is read with `useSyncExternalStore` (store, plan, media query, `?preview=`); object URLs are created in event handlers. | Hydration-safe and compliant with the React Compiler lint rules enabled by `eslint-config-next` (no synchronous setState in effects, no refs in render). |
| 23 | A picked or dropped file shows a "file selected" state and waits for "Check it". | The person sees what will be sent; the same state holds the file after Cancel (§7.3). Flagged for design review. |
| 24 | Mobile details render inline on the result page only below 640px, chosen with a media query rather than duplicated markup. | §5; avoids two audio players and duplicated ids. |
| 25 | Waveforms are decoded from the real audio (Web Audio); the analysing filmstrip samples frames from the real video (canvas). | §6.17 forbids decorative waveforms; everything stays in the browser. |
| 26 | Bundled samples were generated for Faike (canvas and synthesis), not sourced from the web. | No third-party rights questions; sizes and durations are known exactly. |
| 27 | Button gained `action` (54/52px), `highlight` and `inverse`; responsive visibility is applied on wrapper elements. | Mobile actions are 54px (§5) and the Plus card needs dark-surface buttons; wrappers avoid conflicting `display` utilities, since components do not merge classes. |
| 28 | Product wording from the brief for not-applicable and unable titles; `/mock` review page and `?preview=` states for review only. | The brief post-dates the handoff; the review tooling is isolated in `src/mocks` and removed at integration. |
| 29 | Example links and demo checks use bundled samples in `public/samples`. | §6.6 requires bundled samples; the descriptors move out of `src/mocks` when the mock is removed. |

