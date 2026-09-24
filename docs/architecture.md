# Faike architecture

Status: Stage 3b, part 1. Image files are checked for real: the browser uploads straight to Reality Defender and polls Faike's own status route; audio, video, text and links still run on the mock. In production the browser upload is blocked until RD adds Faike's origins to its CORS allow-list (§5, open points). Sections marked **Planned** describe the intended design.

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
                           api (Route Handler contract, client-safe), api-input (request validation, pure).
src/lib/rd/                Reality Defender. verdict.ts is pure and shared with the mock; every other module
                           imports "server-only": types (RD response subset), parse (runtime validation),
                           client (HTTP, timeouts, retries), errors, adapter (RD → Faike status).
src/lib/api/respond.ts     Route Handler helpers: JSON body reading, no-store responses, safe error mapping.
src/lib/guards.ts          Runtime type checks for unknown input.
src/config/                Media limits, gating and RD-accepted extensions; meter thresholds (placeholders);
                           social platforms (RD's list); RD language names and ensemble-name pattern.
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

In a complete result: `ensembleScore` = `finalScore / 100`, only for authentic, suspicious and artificial; `language` = first name in `metadata.languages` found in `RD_LANGUAGE_CODES`; `notApplicableReasons` = `metadata.reasons[].code` (RD's message text is dropped); `models` = every model except those RD marks not applicable, by the name RD returns; `heatmaps` = image only, only when the verdict is suspicious or artificial, only from non-ensemble models with status `FAKE`. RD's `userId`, `institutionId`, file names, storage keys, `storageLocation`, `thumbnail`, aggregation URLs and `explainabilityUrl` are never read.

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

### Browser flow (Stage 3b: image files)

```
Intake ─ validate (MIME family + RD extension, size) ─▶ scanService.start   (src/lib/scan/client.ts)
                                                          │ image file?          otherwise → mock service
                                                          ▼
                                   live-service.ts: job { engine: "rd" } in the scan store
                                                          │
   presignUpload()  POST /api/scans/presign ──────────────┤  api-client.ts (responses validated)
   putFile()        XHR PUT uploadUrl (progress) ─────────┤  uploading stage, real bytes
   pollScan()       GET /api/scans/{requestId}, sequential┤  analysing stage, no percentage
                                                          ▼
                     resultFromAnalysis(input facts + ScanAnalysis) → done → existing result screens
```

- **Polling** (`src/lib/scan/poll.ts`, values in `src/config/polling.ts`):
  - one request at a time, each with its own 35 s timeout
  - 2 s between requests, 4 s after 30 s, doubled after an error
  - fails after 3 consecutive errors, and at a 3-minute deadline
  - stops at the first final state; a model still `ANALYZING` does not delay it, because completion follows the ensemble
- **Abort:** each check has one AbortController. Starting a step, cancelling, or starting another check aborts the previous work, and a newer check removes an older one still in progress.
- **Retry:**
  - upload failure: presign and upload again
  - status failure or deadline: resume polling the same request
  - "Unable to analyze": send the file kept in memory again as a new check
  - After a reload the file is gone, and `canRetry` is false.
- **Result:** composed only from the person's file facts and RD's analysis. One heat map is shown, from the flagged model with the highest score. Model names are hidden until RD permits showing them (`RD_MODEL_NAMES_PUBLIC`).

**Not built yet:** audio, video, text and social links on the live service; a server-side scan record; removal of the mock layer.

**Open points:**

- **Browser upload (CORS): blocking.** Checked live on 24 Sep 2026: RD's upload endpoint (`api.prd.realitydefender.xyz/api/files/{id}`) answers preflights with `Access-Control-Allow-Origin` only for `https://app.realitydefender.ai`. Faike's origins get none, so browsers refuse the upload. RD must add Faike's production, preview and local-development origins. Relaying files through a Route Handler would contradict decision 32.
- **Upload URL lifetime.** RD documents a 15-minute expiry for media-detail URLs, not for the upload URL.
- **Request id format.** Not documented. Faike accepts `[A-Za-z0-9_-]`, up to 128 characters, and fails closed otherwise.
- **Detail data.** Segments, regions, scene timelines and text spans live in RD's `aggregation.json` (`modelMetadataUrl`), whose schema is not documented, so they are not mapped. Text explainability is a pre-signed HTML page; how to present it safely is undecided.
- **Picture and sound.** Videos with audio carry `showAudioResult` and a separate `audioRequestId`; the flow for fetching that result is not documented.
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
