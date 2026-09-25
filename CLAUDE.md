@AGENTS.md

# Faike — working rules

## Product

Faike is a consumer web app that tells people how likely it is that a photo, voice note, video, piece of text or social-media link was generated or manipulated by AI. Detection is performed by Reality Defender (RD). Faike's job is to make RD's output understandable to non-experts, honest about uncertainty, and never presented as proof.

Tagline: "Drop something in. Find out how real it looks."

Build only what the product brief and `design/handoff/HANDOFF.md` describe. Do not invent features, data or copy beyond them; where the handoff is silent, record the gap in `progress.md` and choose the most conservative option.

## Sources of truth

| Source | Authority |
|---|---|
| `design/handoff/HANDOFF.md` | Authoritative specification. Where a comp and the spec disagree, the spec wins. |
| `design/handoff/tokens.css` | Authoritative tokens. Mirrored in `src/styles/tokens.css` (see below). |
| `design/handoff/reference/` | Visual reference only. Never copy their markup: inline styles, fixed widths and placeholder data. |
| `design/brand/` | Supplied logo (original PNG) and its provisional traced SVG. |
| `docs/architecture.md` | Architecture and decision log. |
| `progress.md` | What is done, what is next, open questions. |

Never edit anything under `design/`. If the handoff changes, replace the files and re-sync `src/styles/tokens.css`.

**Brand decision (24 Sep 2026).** The supplied Faike logo replaces the text wordmark of HANDOFF §3, with the D2 highlighter band kept behind "Λi". All brand rendering goes through `src/components/brand/Wordmark.tsx`. The traced vector is provisional until a designer supplies the master.

## Stack and commands

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript (strict) · Tailwind CSS 4 · ESLint 9 · Vitest · npm. Deploy target: Vercel.

```bash
npm run dev        # local development
npm run lint       # ESLint (next lint no longer exists in Next 16)
npm run typecheck  # route type generation + tsc
npm test           # Vitest unit tests (pure logic)
npm run build      # production build
```

Run lint, typecheck, tests and build before every commit. Add unit tests for logic that decides what the person sees (meter placement, validation, mapping, copy selection). Tests never reach the network: `vitest.setup.ts` makes any unstubbed `fetch` throw, so stub RD responses in the test. Never call RD's paid API from automated tests. This Next.js version differs from older training data: read the relevant guide in `node_modules/next/dist/docs/` before using an API.

## Architecture rules

- App Router only. Pages and layouts are Server Components by default; add `"use client"` only where state, effects, browser APIs or event handlers require it, and keep client components small and low in the tree.
- All server-side functionality goes in Route Handlers (`src/app/api/**/route.ts`). No other backend.
- All RD-specific code lives in `src/lib/rd/`. Every module there except the pure `verdict.ts` imports `"server-only"`: `client.ts` (the only code that reads the key and calls RD), `types.ts`, `parse.ts` (runtime validation), `adapter.ts` (RD → Faike). Route Handlers return only the shapes in `src/lib/scan/api.ts`; the UI consumes `ScanResult` and those shapes, and nothing outside `src/lib/rd/` reads RD's raw response.
- Configuration values that product or RD may change (score thresholds, size and duration limits, free-tier gating, platforms, reason codes) live in `src/config` or `src/lib/scan/copy.ts`, never inside components. Unconfirmed values are named or commented as placeholders.
- Media categories, RD's extensions, size and duration limits and MIME families are declared only in `src/config/media.ts`. Which kinds of check are available is switched only in `src/config/capabilities.ts`, and both the browser and the Route Handlers enforce it before any paid call.
- One live service (`src/lib/scan/live-service.ts`) runs every input. Never add scan logic per media type: new inputs reuse its stages, request-id handling, polling and error mapping.
- Screens talk to checks only through `scanService` (`src/lib/scan/client.ts`, the `ScanService` contract) and the scan store (`useScanJob`, `useEnsureScan`). They never call RD or import the mock service directly.
- Browser-only state is read with `useSyncExternalStore`; object URLs and other side effects are created in event handlers. The enabled React Compiler lint rules forbid synchronous setState in effects and reading refs during render.
- The user's file is never re-hosted, shared or logged. Social-link media is never redistributed publicly.

## Reality Defender rules

- **Secrets never reach client code.** `REALITY_DEFENDER_API_KEY` and `REALITY_DEFENDER_API_BASE_URL` are read only in `src/lib/rd/client.ts`, at request time. Never prefix a secret with `NEXT_PUBLIC_`, never pass it to a Client Component, never return it from a Route Handler, never log it, never put a real value in `.env.example`. Do not return RD account identifiers (`userId`, `institutionId`) or storage keys to the browser.
- **Handle every RD response defensively.** Validate the shape at runtime before use; treat every field as possibly missing, null, renamed or of an unexpected type. Unknown values map to the neutral "unable" path, never to a verdict. Time out and retry network calls with back-off, and surface failures as the handoff's system states.
- **Never hard-code individual RD detector or model names.** Model names are data from RD's response. Display them only in the "Model results" section and the heat-map picker, and only while `RD_MODEL_NAMES_PUBLIC` in `src/config/rd.ts` is on. It is on by the product owner's instruction of 25 Sep 2026; RD has not yet confirmed that end users may see them (HANDOFF §12.12). A friendly-name mapping, if one is ever needed, lives in config and must tolerate unknown names.
- **The ensemble result is the primary result.** The verdict headline, signal meter and summary derive from RD's overall/ensemble result. Per-model results are secondary detail and must never override or contradict it.
- **Never show what RD did not return.** Populate optional `ScanResult` fields only when RD (or the file's own metadata) provides them; every UI element tied to an optional field hides cleanly when it is absent. No inferred facts, invented reasons or guessed segments.
- **Scores are not probabilities.** Label them as model output scores. Never say "proof", "certain", "guaranteed" or "100%".
- `aggregation.json` (`modelMetadataUrl`, `audioModelMetadataUrl`) is documented only by its top-level keys. Do not map fields from it until its real structure is confirmed (capture it with `REALITY_DEFENDER_LOG_AGGREGATION_SHAPE=1`, see `progress.md`). Until then no timeline, box or audio moment is drawn from it.
- Confirm every assumption in HANDOFF §12 against RD's current documentation before wiring the adapter. Do not guess endpoints, field names or reason codes. The status of each item is in `progress.md`; the API flow is in `docs/architecture.md` §5.

## Mock data (review tools only)

- Every check started from the interface runs for real through `src/lib/scan/live-service.ts`. The mock serves only the `/mock` launcher and the demo checks, so review links never spend RD checks; `src/lib/scan/client.ts` routes cancel and retry by the job's `engine`.
- Everything mock lives in `src/mocks/`: fixtures (every verdict × media type), the result builder, samples, the mock scan service, demo checks, mock settings, `?preview=` states and the `/mock` launcher. Product components do not embed mock data.
- Documented seams into the mock: `src/lib/scan/client.ts` (service), `src/lib/plan.ts` (plan), the intake's example samples and `?preview=` hook. Remove the mock layer when RD is integrated; keep the example files (§6.6).
- Fixtures use Faike's `ScanResult` shape, never a guessed RD schema. Mock model names are prefixed `mock-`; scores are illustrative.
- `/mock` and `/mock/run` are review tools (no-index), not product pages.

## Visual rules (from the handoff)

- **Tokens only.** Every colour, type size, radius, shadow, easing and duration comes from the tokens. Tailwind's default palette, type scale, radii and breakpoints are removed in `src/app/globals.css`; use the token utilities (`bg-surface`, `text-ink`, `text-muted`, `rounded-xl`, `text-hero`, `font-display` …). Do not add raw hex values.
- `src/styles/tokens.css` is a copy of the handoff tokens with one deviation: the Google Fonts `@import` is removed because fonts are self-hosted with `next/font`. Values not in tokens.css but specified in the handoff (mobile display sizes, tablet width) are declared once in `globals.css` with their HANDOFF section.
- **Two families only:** Bricolage Grotesque for display (hero, verdict headline, card headings, badges, round-marker numerals); Figtree for everything else.
- **Radius hierarchy is intentional:** verdict card `rounded-hero` (36) › drop and analysis cards `rounded-xl` (32) › standard cards `rounded-lg` (28) › inner cards `rounded-md` (24) › rows `rounded-row` (20). Never flatten to one value.
- `subtle` and `line-dashed` are decorative only: never text, never the sole boundary of a control. Use `line-strong` where a border is a control's only affordance.
- **Colour is never the only carrier of meaning.** Every verdict, strength and flagged region is also stated in words.
- One brand gesture, the yellow highlighter: logo band, analysis progress sweep, flagged moments. Nothing else competes with it.
- Breakpoints: mobile < 640px, `sm:` tablet 640–1023px, `lg:` desktop ≥ 1024px. Comp widths are max-widths; layouts shrink fluidly down to 360px with no horizontal scroll. Use `PageColumn` for the intake (880) and result (1040) columns.
- Motion: only the gestures in HANDOFF §10. Every transition and animation uses the token durations (`--dur-*`), which reduced motion sets to zero. No scroll-triggered entrances.
- Build components with the screen that first needs them; reuse existing ones (`Button`, `RoundIconButton`, `Icon`, `StateCard`, `CardPage`, `PageColumn`, `SiteHeader`, `FlaggedList`, `Accordion`, `SegmentedControl`, tags) before creating new ones.
- Components do not merge classes. Never pass a class that conflicts with the component's own (for example `hidden` onto something that is `flex`); put responsive visibility on a wrapper element.

## Accessibility expectations

Target WCAG 2.2 AA (HANDOFF §11):

- Text contrast meets AA; decorative colours never carry text.
- Every interactive target is at least 44 × 44px; primary buttons 48px (52px on the result page).
- Visible focus on every focusable element via the global `--focus-ring`. Do not put a `shadow-*` utility on a focusable element: utilities override the base-layer focus ring.
- Logical tab order that follows the visual order; the skip link is the first stop.
- Native elements first: buttons for actions, links for navigation (`Button` with `href` renders a link). Icon-only controls always have an `aria-label` (`RoundIconButton` requires `label`).
- Live regions: stage changes and upload milestones announced politely; result arrival moves focus to the verdict headline.
- The drop zone is fully operable without drag and drop. The waveform is an accessible slider. Accordion headers are real buttons with `aria-expanded`.
- Decorative SVGs are `aria-hidden`. Reduced motion shows end states.
- Before sign-off: keyboard-only pass plus VoiceOver (Safari, iOS) and NVDA.

## Copy and voice

Verdict wording (product brief, 24 Sep 2026): AUTHENTIC → "Likely authentic", FAKE → "Likely AI-generated or manipulated", SUSPICIOUS → "Suspicious signals detected", NOT_APPLICABLE → "Not enough suitable information", UNABLE_TO_EVALUATE → "Unable to analyze". All result copy lives in `src/lib/scan/copy.ts`; the evidence-not-proof note appears under every completed verdict.

Plain, warm, second person, sentence case, short sentences. No jargon ("detector", "model", "inference") outside the "Model results" section. Errors explain what happened and what to do next; they do not apologise. Use the handoff's copy verbatim where it exists.

## Dependencies and abstractions

- Do not add a dependency when a few lines of code or a platform feature will do. No component libraries, no CSS-in-JS, no icon packages, no `clsx`/`tailwind-merge` (use `cx` from `src/lib/cx.ts`).
- Before adding any dependency, check that it is maintained, justify it in `docs/architecture.md`, and confirm its API against current documentation rather than memory.
- Prefer small, direct components over configurable abstractions. No speculative props, wrappers or layers for needs that do not exist yet.
- Components accept `className` for layout (margin, width, flex) only; there is no class-merging, so do not use it to override internal styles.

## Housekeeping

- Update `progress.md` at the end of each stage, and add a decision to `docs/architecture.md` whenever an architectural choice is made.
- Commit messages describe the change and its reason.
