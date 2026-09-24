# Faike — progress

Last updated: 24 Sep 2026

## Stage 1 — Foundation ✅

- [x] Next.js 16.3.6 App Router project (TypeScript strict, Tailwind 4.3, ESLint 9, npm), React 19.3.0.
- [x] Handoff stored verbatim in `design/handoff/`; supplied logo stored in `design/brand/`.
- [x] Tokens mirrored in `src/styles/tokens.css`; Tailwind theme cleared and mapped to tokens (`src/app/globals.css`); breakpoints 640 / 1024 only.
- [x] Bricolage Grotesque (opsz) and Figtree self-hosted via `next/font`.
- [x] Global base: page colour, body type, focus ring (forced-colours safe), reduced motion via token durations, skip link.
- [x] Brand: logo traced to a provisional SVG; `Wordmark` renders it in ink with the highlighter band behind "Λi"; once-per-session swipe (§10) with reduced-motion end state.
- [x] Layout primitives: `SiteHeader` (home / flow / result, mobile collapse), `PageColumn` (intake 880, result 1040, tablet 720, fluid mobile).
- [x] Shared components: `Button` (primary / secondary / text; 44 / 48 / 52; link rendering; hover, press, aria-disabled), `RoundIconButton` (84 / 64 / 48 / 44), `Icon` (comp icon set), `StateCard`, `StepStrip`, `PlaceholderPage`.
- [x] Routes: `/` (hero + step strip), `/how-it-works`, `/history`, `/sign-in` (placeholders per §2), 404.
- [x] `ScanResult` contract (§9.1) in `src/lib/scan/types.ts`.
- [x] `CLAUDE.md`, `docs/architecture.md`, this file.
- [x] Verified: lint, typecheck and production build clean; screenshots at 1440 / 768 / 390 / 360 with no horizontal overflow; desktop home fits 900px; keyboard order and focus ring; swipe plays once per session and respects reduced motion.

## Remaining work (proposed order)

### Stage 2 — Universal input
- [ ] `DropZone` (drag and drop, picker via add button and "browse", drag-over state), `PasteField` (URL vs text, Enter, multi-line expansion, clipboard file), `TypeChip` + `PlusBadge`, `ExampleLinks`.
- [ ] Media config: types, free-tier gating, size and duration limits (§9.3) in config. Accepted formats taken from RD's documentation, not guessed.
- [ ] Client-side validation before upload; Plus gate, too large and unsupported states.
- [ ] Bundled example files (a photo, a voice note): source needed.

### Stage 3 — Scan flow on a mock adapter
- [ ] Fixtures for every verdict × media type (§14).
- [ ] `/check/[scanId]` state machine (§9.4): uploading, retrieving, analysing, partial, result, not applicable, unable, offline.
- [ ] Analysing: `AnalysisCard` (real progress or indeterminate sweep, never a fake percentage), `StepPills`, Cancel.
- [ ] Result: `VerdictCard`, `SignalMeter` (thresholds in config, marked as placeholders; never contradicts the verdict), `FactPill`, `FileSummaryCard`, `ResultActions`, share (text summary + URL), `FeedbackButtons`, `EvidenceNote`.
- [ ] All twelve system states (§8) reachable.

### Stage 4 — Result details
- [ ] Audio (designed): `AudioEvidencePlayer` (decoded peaks, accessible slider), `MomentList`, `SuitabilityChecklist`, `FileDetails`, `Accordion`.
- [ ] Image, video, text and social-link views (derived; for design review).
- [ ] Mobile: details below the result on the same page.

### Stage 5 — Reality Defender integration
- [ ] Confirm every item in HANDOFF §12 against RD's current documentation.
- [ ] Server-only adapter with runtime validation; ensemble result primary; no hard-coded model names.
- [ ] Route Handlers: submit, status, feedback. Upload path that respects Vercel's request-size limit.
- [ ] Polling or webhooks with back-off; cancellation if supported; retry without re-upload.
- [ ] Environment variables documented (`.env.example`), set in Vercel.

### Stage 6 — Quality and hardening
- [ ] Keyboard, VoiceOver (Safari, iOS) and NVDA walkthrough of the full audio flow.
- [ ] Visual pass against every comp at 1440 and 390; reduced-motion pass.
- [ ] Security review (secrets, headers, CSP including the logo-swipe script hash), performance review.

### Stage 7 — Deployment
- [ ] Vercel project, environment variables, domain, `metadataBase`, favicon, app icon and social image.

## Open items

### Brand (needs design)
- Vector master of the logo. The provisional trace inherits slightly irregular edges from the supplied PNG: fine at header size, not for large or print use.
- Sign-off on the logo + highlighter combination and on the band position.
- Favicon, app icon and social-share image (need a square mark). None exist yet; Next.js defaults were removed.

### Reality Defender (HANDOFF §12)
All twelve items are unverified: response schema, calibrated thresholds, supported platforms, not-applicable reason codes, audio segments, video spatial and lane data, image heat maps or regions, text spans, language detection, accepted formats and limits, progress and cancellation, and whether model names may be displayed.

### Product (HANDOFF §13)
Share format · retention period · signed-out history · status-chip copy for authentic and artificial · Plus model (subscription or credits) · follow-up on feedback "No".

### Handoff ambiguities and the choice made

| Topic | Choice | Status |
|---|---|---|
| `/design/handoff` and `/design/brand` did not exist | Handoff zip stored as `design/handoff/`; logo supplied separately, stored in `design/brand/` | Done |
| Logo vs the handoff's text wordmark | Logo replaces it, highlighter kept (product decision) | Needs design sign-off |
| Logo size | 29px desktop / 24px mobile, matching the text wordmark's cap height | Derived |
| Tailwind vs HANDOFF §0 | Tailwind defaults removed; tokens only | Done |
| Tablet header | 84px height, 20px side padding until desktop (56px) | Derived |
| Mobile header on the analysing screen | "Sign in", as on home | Derived |
| Step strip on tablet | Stacked, as on mobile | Derived |
| Full-page `StateCard` width | 340px (`--width-aside`), close to the designed card width | Derived |
| Primary button hover colour | Ink darkened 20% via `color-mix` (no token) | Derived |
| Round icon button hover | Press feedback only | Derived |
| UI line-height | Fonts' natural line-height, as in the comps (Tailwind's 1.5 default removed) | Derived |
| Skip link | Added (WCAG 2.4.1); not in the comps | Added |
| Comp link hover turns the wordmark green | Not applied to the logo | Derived |
| Swipe technique | `scaleX` on the SVG band, equivalent to the `background-size` sweep described for text | Derived |
| Placeholder and 404 copy | Written in the D2 voice | Needs copy review |
| "How it works" | Treated as an out-of-scope marketing page (placeholder) | Confirm |
