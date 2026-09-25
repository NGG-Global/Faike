# Faike architecture

Status: Stage 3b complete. Every input the person submits (photo, audio, video, text file, pasted text, social link) is a real Reality Defender check through one live service; the mock serves only the `/mock` review tools and demo checks. Browser uploads depend on RD's CORS allow-list including Faike's origin (§5, open points). Sections marked **Planned** describe the intended design.

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
  api/scans/               Route Handlers: presign, social, [requestId] (see §5).
  not-found.tsx            404.
src/components/
  brand/ layout/ ui/       Wordmark, header, columns, cards, buttons, icons, tags, accordion, segmented control.
  intake/                  Universal input: drop zone, paste field, type chips, example links, validation cards.
  flow/                    ScanFlow (stage switch), analysing view and visual, full-page state cards.
  result/                  Verdict card, signal meter, file summary, actions, share, feedback, evidence note, non-verdict cards.
  details/                 Media evidence (audio, image, video, text), flagged list, aside cards, advanced details.
src/hooks/                 Browser helpers: media playback, decoded audio peaks, video frames, element width, media query.
src/lib/scan/              types (ScanResult), job (flow state), store, service contract, client (swap point),
                           input (classify/validate), media-meta, meter, copy, facts,
                           api (Route Handler contract, client-safe), api-input (request validation, pure),
                           live-service (real checks for every input), api-client, poll, result.
src/lib/rd/                Reality Defender. verdict.ts is pure and shared with the mock; every other module
                           imports "server-only": types (RD response subset), parse (runtime validation),
                           client (HTTP, timeouts, retries), errors, adapter (RD → Faike status).
src/lib/api/respond.ts     Route Handler helpers: JSON body reading, no-store responses, safe error mapping.
src/lib/guards.ts          Runtime type checks for unknown input.
src/config/                media.ts: the single typed source for categories, RD extensions, size and duration
                           limits, MIME families, Plus gating. capabilities.ts: which kinds are switched on.
                           platforms.ts (RD's list), polling.ts, meter.ts (placeholders), rd.ts.
.env.example               The two server-only variables, without values.
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

### Server integration (Stage 3a)

Sources, checked 24 Sep 2026: RD's documentation (API Quickstart, AWS Presigned URL, Social Media URL Upload, Media Detail, Create User Feedback) and RD's official TypeScript SDK (`@realitydefender/realitydefender` 0.1.19) where the REST pages are incomplete. The SDK is read as a reference, not installed (decision 30).

**File flow.** Media never passes through a Faike function:

```
Browser                             Faike (Route Handlers, Node)                 Reality Defender
───────                             ────────────────────────────                 ────────────────
POST /api/scans/presign  ─────────▶ validate name, type, size
  { fileName, mimeType, sizeBytes }   │
                                      └─ POST /api/files/aws-presigned ───────▶  { response: { signedUrl },
                                         { fileName: "<uuid>.<ext>" }               requestId, … }
                         ◀───────── { requestId, uploadUrl }
PUT uploadUrl  (file body only) ─────────────────────────────────────────────▶  RD upload endpoint
                                                                                  (/api/files/{id}?token=…)
GET /api/scans/{requestId}  ──────▶ GET /api/media/users/{requestId} ─────────▶  media detail
   (poll)                ◀───────── ScanStatusResponse  ◀── validate, map ──
```

**Temporary upload route (decision 61).** While RD's upload server refuses Faike's origins (CORS), the presign route returns the signed URL on Faike's own domain (`/rd-upload/{id}?token=…`), and an external rewrite in `next.config.ts` forwards the PUT unchanged to `https://api.prd.realitydefender.xyz/api/files/{id}`. On Vercel this is handled by Vercel's network, not a Faike function; the file is forwarded, never stored. Only a plain id on that exact destination is converted or forwarded. One switch (`src/config/upload.ts`) restores direct uploads.

**Social flow.** `POST /api/scans/social { url }` → validate the platform → `POST /api/files/social { socialLink }` → `{ requestId }`; then the same polling. RD downloads the post itself; Faike never fetches or re-hosts it.

**Faike endpoints** (contract in `src/lib/scan/api.ts`):

| Route | Request | Success | Validation before RD is called |
|---|---|---|---|
| `POST /api/scans/presign` | `{ fileName, mimeType, sizeBytes }` | `{ requestId, uploadUrl }` | JSON content type, body ≤ 8 KB; extension in RD's list; a recognised MIME family must agree with it; size ≤ the type's limit |
| `POST /api/scans/social` | `{ url }` | `{ requestId }` | http(s), no credentials or port, host on RD's platform list |
| `GET /api/scans/{requestId}` | none | `ScanStatusResponse` | id matches `[A-Za-z0-9][A-Za-z0-9_-]{0,127}` |

**Status mapping** (`src/lib/rd/adapter.ts`). The status is `resultsSummary.status` (ensemble), falling back to `overallStatus`, as RD's SDK resolves it.

| RD | Faike |
|---|---|
| `socialLinkDownloadFailed: true` | `failed`, reason `retrieval` |
| no status, `ANALYZING` | `processing`, stage `analysing` |
| `DOWNLOADING`, or `socialLinkDownloaded: false` | `processing`, stage `retrieving` |
| `AUTHENTIC` / `FAKE` / `SUSPICIOUS` / `NOT_APPLICABLE` / `UNABLE_TO_EVALUATE` | `complete`, verdict via `verdictFromRd` |
| any other value | `complete`, verdict `unable` |

In a complete result: `ensembleScore` = `finalScore / 100`, only for authentic, suspicious and artificial; `language` = first name in `metadata.languages` found in `RD_LANGUAGE_CODES`; `notApplicableReasons` = `metadata.reasons[].code` (RD's message text is dropped); `models` = every model except those RD marks not applicable, by the name RD returns; `heatmaps` = image only, only when the verdict is suspicious or artificial, only from non-ensemble models with status `FAKE`, each sent as Faike's own heat map address (decision 62). RD's `userId`, `institutionId`, file names, storage keys, `storageLocation` and `thumbnail` are never read. `explainabilityUrl`, heat map links and the aggregation URLs are read on the server only and never returned to the browser (see "Result detail" below).

**Errors** (`src/lib/rd/errors.ts`, `src/lib/api/respond.ts`). Every failure is `{ error: { code, message } }` with a fixed message, and every response is `Cache-Control: no-store`.

| RD outcome | RdError kind | Faike code (HTTP) |
|---|---|---|
| key or base URL missing / invalid | `not_configured` | `unavailable` (503) |
| 401, 403 | `unauthorized` | `unavailable` (503) |
| 400 with `free-tier-not-allowed` / `upload-limit-reached` | `quota` | `unavailable` (503) |
| other 400, 422 | `rejected` | `rejected` (422) |
| 404 | `not_found` | `not_found` (404) |
| 429 | `rate_limited` | `rate_limited` (429) |
| timeout | `timeout` | `timeout` (504) |
| network error | `network` | `upstream_error` (502) |
| 5xx, redirect, other status | `upstream` | `upstream_error` (502) |
| 2xx that is not the documented shape | `bad_response` | `upstream_error` (502) |

Server logs record the operation, kind, HTTP status and RD's machine code only, never the key, URLs, request ids, file names, links or response bodies. 404s are not logged.

**Timeouts and retries** (`src/lib/rd/client.ts`). 8 s per attempt (`AbortSignal.timeout`), at most three attempts, back-off 0.4 s then 1.2 s. GETs retry on timeouts, network errors, 408, 500, 502, 503 and 504. POSTs retry only when RD certainly did not process them (503, or a connection that was never made: `ECONNREFUSED`, `ENOTFOUND`, `EAI_AGAIN`); a POST that timed out is not repeated, because it may have created an analysis. Redirects are not followed (`redirect: "manual"`), so the key cannot be sent to another host. Each route sets `maxDuration = 30`.

**Secrets.** `REALITY_DEFENDER_API_KEY` and `REALITY_DEFENDER_API_BASE_URL` are read at request time in `src/lib/rd/client.ts` only, never prefixed `NEXT_PUBLIC_`. Every RD module except `verdict.ts` imports `server-only`, so importing it from client code fails the build. Verified after a production build with a canary key: the key is not inlined anywhere in `.next`, and no RD path, header name or variable name appears in browser chunks or prerendered HTML.

**Tests.** Vitest with RD replaced by fetch stubs; `vitest.setup.ts` makes any unstubbed `fetch` throw, so no test can reach RD's paid API.

### Browser flow (Stage 3b: every input)

```
Intake ─ validateFile / validateText / validateLink ─▶ scanService.start          (src/lib/scan/client.ts)
         (category, availability, format, size,        │
          video length, Plus; config-driven)            ▼
                                 live-service.ts: one job { engine: "rd" } in the scan store
                                                        │
          file or pasted text (.txt)                    │   social link
   presignUpload()  POST /api/scans/presign             │   submitSocialLink()  POST /api/scans/social
   putFile()        XHR PUT uploadUrl (progress)        │   stage "retrieving"
                                  └──────── requestId ──┴──────┘
   pollScan()       GET /api/scans/{requestId}, sequential; processing statuses move a link from
                    "retrieving" to "analysing" and supply its media type
                                                        ▼
                  resultFromAnalysis(input facts + ScanAnalysis) → done → the existing result screens
```

- **One state machine.** The job stages (uploading, retrieving, analysing, done, failed), request-id handling, polling, error mapping, retry, cancel and abort are shared by every input. Only `submit()` branches, on how the request id is obtained.
- **Validation** runs in the browser before any paid call and again in the Route Handlers, both reading `src/config/media.ts` and `src/config/capabilities.ts`. Video duration comes from the file's own metadata via the built-in media element; when unreadable, RD's own limit applies.
- **Capabilities.** A switched-off kind is left out of the intake's chips, examples, paste prompt and intro, explained with an "unavailable" card if submitted anyway, and refused by the server (`disabled`, 403).
- **Polling** (`src/lib/scan/poll.ts`, values in `src/config/polling.ts`):
  - one request at a time, each with its own 35 s timeout
  - 2 s between requests, 4 s after 30 s, doubled after an error
  - fails after 3 consecutive errors, and at a 3-minute deadline
  - stops at the first final state; a model still `ANALYZING` does not delay it
- **Retry:**
  - with a request id: resume polling
  - without one: submit again (upload or link)
  - "Unable to analyze": submit the kept input again
  - After a reload the input is gone, and `canRetry` is false.
- **Abort:** each check has one AbortController. A newer check stops and removes an older one still in progress.
- **Result:** composed only from the person's input facts and RD's analysis. For links, the media type comes from RD, and no file facts or preview are shown (Faike never copies the post). Model names follow `RD_MODEL_NAMES_PUBLIC` (on by the owner's instruction; decision 54).

### Result detail (Stage 3b, part 3)

```
GET /api/scans/{requestId} ─▶ media detail ─▶ toScanStatus ─▶ complete?
                                                │ └─ audioRequestFor(detail) → media detail of the sound
                                                │    (errors ignored) → analysis.sound = { verdict }
                                                ▼
   ScanAnalysis { verdict, ensembleScore?, language?, notApplicableReasons?, models[], heatmaps?,
                  hasExplainability?, sound?, uploadedAt? }  ─▶ resultFromAnalysis ─▶ ScanResult
```

- **What reaches the browser.** Only `ScanAnalysis` fields. Every optional field is set only when RD supplied it, and every UI element tied to it is left out otherwise. A section with nothing in it is not rendered.
- **Model results** (`src/lib/scan/detectors.ts`): rows from `models[]` minus the ensemble and not-applicable entries. Status first; score and description columns appear only when some row has them.
- **Heat maps** (decisions 62–64).
  - Each usable heat map travels as `{ model, url }`, where `url` is Faike's `GET /api/scans/{requestId}/heatmap?model=…` and never RD's storage link. `ScanResult.heatmaps` orders them strongest first.
  - The route re-reads the media detail, takes the detector's current link (`heatmapSources`), fetches the PNG with `fetchPresigned` (no key, no redirects, timeout, 4 MB cap, PNG signature) and returns it same-origin.
  - `HeatmapLayer` reads the pixels on a canvas and `paintHeatmap` redraws them in the signal tokens, scaled to the map's own strongest point. A failed load is retried once, then reported.
  - **Later detail:** while the details are open, `scanService.refresh(id)` re-reads a finished check whose detectors are still running (`LATER_DETAIL_WAITS_MS`) and applies `withLaterDetail`, which takes the detector rows and heat maps only. The verdict and score are never changed.
- **Text explanation.**
  - `GET /api/scans/{requestId}/explainability` re-reads the media detail and answers with a 302 to RD's current `explainabilityUrl` (`no-store`, `Referrer-Policy: no-referrer`). It answers 404 for other media, for a missing URL and for an unsafe id.
  - The target comes only from RD's response, so the route is not an open redirect.
  - The browser shows it in `<iframe sandbox="">` with a new-tab link. Faike never fetches or inserts the page.
- **Sound of a video.** `audioRequestFor` returns RD's `audioRequestId` unless `showAudioResult` is false. The server reads that id with the same media-detail call and adds the sound verdict only when it is final. This is Faike's reading of the docs, which name the field but not how to fetch it.
- **`aggregation.json`** (`src/lib/rd/aggregation.ts`). Only its top-level keys are documented, so nothing is mapped from it.
  - `fetchAggregation` sends no key, refuses redirects, times out after 8 s and caps the body at 5 MB.
  - `describeShape` reduces the JSON to keys, types, array lengths and numeric ranges.
  - With `REALITY_DEFENDER_LOG_AGGREGATION_SHAPE=1`, the status route logs that shape for each finished check, so the real structure can be confirmed and then mapped explicitly.

**Not built yet:** a server-side scan record; heat-map recolouring; timelines, audio moments and image boxes from `aggregation.json`; feedback to RD.

**Open points:**

- **Browser upload (CORS).** Worked around by the temporary upload route (decision 61) until RD allows Faike's origins. On 25 Sep 2026 the owner reported the real image flow working. From this environment a preflight on a real upload URL still showed no `Access-Control-Allow-Origin` for `https://faike.vercel.app`, so which origins RD allows needs confirming. Original check, 24 Sep 2026: RD's upload endpoint (`api.prd.realitydefender.xyz/api/files/{id}`) answers preflights with `Access-Control-Allow-Origin` only for `https://app.realitydefender.ai`. Faike's origins get none, so browsers refuse the upload. RD must add Faike's production, preview and local-development origins. Relaying files through a Route Handler would contradict decision 32.
- **Upload URL lifetime.** RD documents a 15-minute expiry for media-detail URLs, not for the upload URL.
- **Request id format.** Not documented. Faike accepts `[A-Za-z0-9_-]`, up to 128 characters, and fails closed otherwise.
- **Detail data.** Segments, regions and scene timelines live in RD's `aggregation.json`, whose inner structure is not documented, so they are not mapped (capture procedure in `progress.md`). No text span data is documented.
- **Picture and sound.** Fetching the sound result through `audioRequestId` is unconfirmed; a failure leaves the sound card out.
- **Framing.** Whether RD's storage allows its explanation page in an iframe is unconfirmed; the new-tab link is the fallback.
- **Access control and abuse.** A request id acts as a bearer token for its result, and the POST routes have no rate limit, so anyone can use Faike's RD quota. Both need solving before public launch (decision 38).
- **Scan persistence.** Direct links across devices still need a server-side record of the input summary; RD holds only the analysis.

**Privacy.** No file contents, file names, links or request ids in logs. RD receives a random file name (decision 33). Feedback sends the check id and answer only. Share never includes the person's file. Retrieved social media is never re-hosted.

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
| 30 | Plain `fetch` REST client instead of RD's TypeScript SDK. | RD's docs recommend the SDK, but it reads files from disk (no pre-signed flow for browser uploads), polls in-process, depends on axios, and its normalised result drops fields Faike needs (languages, reasons). The REST calls are three endpoints; the SDK source was used to verify the undocumented presign envelope. |
| 31 | `server-only` package added (0.0.1, React team). | CLAUDE.md requires secret-reading modules to import it. Next.js handles the import itself; the package makes the dependency explicit and lets Vitest resolve its server entry. |
| 32 | Presigned upload: the browser PUTs to RD's URL; Faike returns only `requestId` and `uploadUrl`. | The brief; keeps media out of Vercel Functions (request-body limit) and off Faike's infrastructure. `mediaId`, `code` and `errno` are not needed and not returned. |
| 33 | RD receives `<uuid>.<ext>` as the file name, not the person's. | RD needs only the extension. Keeps personal file names out of a third party's records (data minimisation). |
| 34 | The server enforces RD's documented extensions, not MIME types. | RD accepts files by extension. A recognised MIME family that disagrees is refused; an empty or generic MIME type is not, because browsers report some audio and video types inconsistently. |
| 35 | Verdict from `resultsSummary.status`, then `overallStatus`; unknown → `unable`; missing → still processing. | RD: the summary is the ensemble result, the one to rely on; its SDK resolves status the same way. A missing status is treated as early processing; the client's polling deadline bounds it. |
| 36 | Heat maps only for images, only with a suspicious or artificial verdict, only from non-ensemble `FAKE` models. | RD says other entries are invalid; showing a model's flags on an authentic verdict would contradict the ensemble. The ensemble is recognised by a name pattern from RD's SDK, kept in config (no field marks it). |
| 37 | Retries only where repeating cannot duplicate work; redirects not followed; fixed error text; no-store responses; JSON content type required. | CLAUDE.md's defensive rules. Requiring `application/json` also blocks cross-site form posts. |
| 38 | No access token or rate limit in this stage. | Not in the brief's contract. Recorded as a launch blocker: sign request ids (HMAC token issued with the id) and add rate limiting or bot protection on the POST routes. |
| 39 | Social platforms updated to RD's list (Threads added); limits and extensions confirmed against RD. | HANDOFF §12.3 and §12.10 answered by RD's documentation. The mock maps Threads links to a photo post. |
| 40 | Image files use the live service; other inputs stay on the mock, routed in `client.ts` by input and by the job's `engine`. | The brief asks for one real vertical slice; recording the owner on the job keeps cancel and retry correct after a reload. |
| 41 | Upload with XMLHttpRequest; status calls with fetch. | Only XHR reports upload progress, which HANDOFF §8 shows as real bytes. |
| 42 | Sequential polling with a deadline and consecutive-error limit; values in config. | The brief: no overlapping requests, stop at a final result, no endless polling. RD offers no progress, so analysis shows the indeterminate state (HANDOFF §6.8). |
| 43 | The social-link fields count only when `socialLink` is present. | Live data: a file upload carried them and read "retrieving". RD documents them for social submissions only. |
| 44 | URLs must be https or on the configured API origin. | Live upload URLs are RD's own API with a token; the origin rule lets a local stub on `http://localhost` work without weakening production. |
| 45 | Model names hidden in "Model results" until RD permits (`RD_MODEL_NAMES_PUBLIC`). | CLAUDE.md: show names only with RD's permission (HANDOFF §12.12), which is unconfirmed. |
| 46 | Strength legend shown only with region outlines. | Live data: RD's heat map is a white intensity mask, not Faike's strength colours. |
| 47 | Browser validation also requires RD's extensions. | The server refuses other extensions; checking first avoids starting an upload that cannot succeed. |
| 48 | Every input runs on one live service; only the way the request id is obtained differs (upload vs social route). | The brief: no scan logic duplicated per media type. Stages, polling, errors, retry, cancel and abort are shared. |
| 49 | `src/config/media.ts` is the single typed source for categories, extensions, limits and MIME families; `src/config/capabilities.ts` switches kinds on or off. | The brief: centralise, no constants in components. RD plan access varies, so each kind can be turned off in one place. |
| 50 | Disabled kinds are hidden where the design lists what can be checked, explained if submitted, and refused by the server (`disabled`, 403). | The design has no disabled state; hiding keeps "what you can check" true, and nothing fails after upload. Not a subscription system; the Plus gate is separate. |
| 51 | Pasted text is uploaded as a `.txt` file. | RD documents no endpoint for a text body; the text limits apply unchanged. |
| 52 | Video length is read from the file's metadata with the built-in media element. | Meets the 30-minute check without a media-processing dependency; unreadable files fall back to RD's own limit. |
| 53 | Validation messages live in `copy.ts` (`issueCopy`), built from the config. | CLAUDE.md: copy in one place, unit-tested; values never repeated in components. |
| 54 | Detector names shown as RD returns them (`RD_MODEL_NAMES_PUBLIC = true`), in "Model results" and the heat-map picker. Supersedes decision 45. | The product owner's instruction, 25 Sep 2026. RD's permission (HANDOFF §12.12) is still to be confirmed; one switch reverts to numbered labels. |
| 55 | "Model results" leads with each detector's status; scores and descriptions appear only when present. RD's ensemble entry is left out of the table. | The brief: the table must stay useful if RD drops per-detector scores. The ensemble is already the overall result above it. |
| 56 | Expired heat maps are recovered by re-reading the detail by request id and replacing only the links (`refresh`, `withVisuals`); at most two attempts. Superseded by decision 62. | RD's links last 15 minutes. Re-reading costs no RD check, and the verdict must never change after it is shown. |
| 57 | Text explanations open through a redirect route in a sandboxed iframe or a new tab; never proxied or inserted. | The brief forbids `dangerouslySetInnerHTML`. The redirect always serves a fresh link; `sandbox=""` blocks scripts and navigation; Faike's origin never hosts RD's HTML. |
| 58 | The sound result of a video is read on the server through `audioRequestId` and shown as its own card; failures are ignored. | The brief asks for picture and sound together without repeating the overall result. The fetch path is inferred from RD's docs, so it must never break the main result. |
| 59 | Nothing is mapped from `aggregation.json` yet; a no-values shape logger behind `REALITY_DEFENDER_LOG_AGGREGATION_SHAPE` captures its structure. | CLAUDE.md forbids guessing field names, and RD documents only the top-level keys. The logger yields the real structure from one check without logging content. |
| 60 | File details list only file name, type, detected language, source and check time. | The brief: consumer metadata only; no RD ids, storage paths or processing metadata. |
| 61 | Temporary same-origin upload route: the presign route returns `/rd-upload/{id}?token=…`, and an external rewrite forwards it to RD's upload endpoint. Only that destination and a plain id; one switch removes it. Amends decision 32 for as long as it is on. | The owner's decision, 25 Sep 2026: RD's CORS allows only its own web app, so every browser upload from Faike failed. A Route Handler relay would hit Vercel's 4.5 MB function limit; the rewrite is forwarded by Vercel's network, keeps real upload progress and stores nothing. Costs: Vercel's 120-second limit for forwarded requests, an undocumented size limit, the upload token possibly in Vercel's request logs, and Faike-domain cookies forwarded to RD. RD is being asked to allow Faike's origins. |
| 62 | Heat maps reach the browser only through `GET /api/scans/{requestId}/heatmap`, which re-reads the detail and relays that detector's PNG from Faike's origin. | Drawing them in the signal colours needs their pixels, which RD's storage does not allow a browser to read. The route also always serves a current link, keeps RD storage links out of the browser, and relays RD's output only (not the person's photo), capped below Vercel's 4.5 MB response limit. |
| 63 | RD's heat map is redrawn on a canvas: scaled to its own strongest point (99.9th percentile), haze under 12% cleared, colours from `--signal-some` to `--signal-strong`; the photo fades to grey with the overlay. Values in `src/config/heatmap.ts`. | HANDOFF §7.5 asks for the suspicious palette. Live data: RD's mask is too faint to see as-is. RD documents no intensity scale, so the map is shown relative to itself, and the caption says it shows where, not how strongly overall. |
| 64 | `refresh` now re-reads a finished check while detectors are still running and takes their rows and heat maps (`withLaterDetail`); photo details open on the heat map. | A live check had four detectors still running when the overall result was final; their heat maps can only arrive later. The verdict stays fixed. |
| 65 | "Sign in" removed from the header; the placeholder page stays unlinked. | Owner decision, 25 Sep 2026: there are no accounts yet. |
