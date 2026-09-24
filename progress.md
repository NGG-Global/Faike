# Faike — progress

Last updated: 24 Sep 2026 (Stage 3a)

## Stage 1 — Foundation ✅

- [x] Next.js 16.3.6 App Router project (TypeScript strict, Tailwind 4.3, ESLint 9, npm), React 19.3.0.
- [x] Handoff stored verbatim in `design/handoff/`; supplied logo stored in `design/brand/`.
- [x] Tokens mirrored in `src/styles/tokens.css`; Tailwind theme cleared and mapped to tokens; breakpoints 640 / 1024 only.
- [x] Bricolage Grotesque (opsz) and Figtree self-hosted via `next/font`.
- [x] Global base, focus ring, reduced motion, skip link; logo with highlighter and once-per-session swipe.
- [x] Layout primitives and first shared components; placeholder pages; `ScanResult` contract; project docs.

## Stage 2 — Complete interface on mock data ✅

Reality Defender is **not** integrated. Every screen runs on fixtures through a mock scan service that can be swapped for the real one in one line (`src/lib/scan/client.ts`).

**Flow:** input → upload / retrieve → analyse → result → optional details → check something else.

- [x] **Universal input** (§6.3–§6.6): drop zone (drag anywhere on the page, picker via the add button and "browse"), selected-file state with "Check it", paste field (URL → social link, otherwise text; Enter submits; grows to six lines; pasted clipboard files behave like a drop), example links running the bundled samples, type chips with Plus badges.
- [x] **Validation before upload** (§9.3): type by MIME family, size limits, 30-minute video limit, Plus gate; cards for too large, too long, unsupported and Plus.
- [x] **Flow states** (§8): uploading (milestones announced), retrieving a link, link can't be opened, analysing per media type (photo sweep, decoded audio waveform, video filmstrip, text highlight; real percentage or status-only loop, static under reduced motion), step pills (polite live region), video "Partly done", Cancel back to the input with the file kept, network/API failure (offline and service-unreachable variants) with retry.
- [x] **Results** (§7.4): verdict card with status chip, product wording headline, explanation, file summary, signal meter (placeholder thresholds in config, never contradicts the verdict), fact pills from data only, cautions; actions (details, check something else, share via Web Share or copy), feedback with "Thanks, that helps."; evidence-not-proof note on every verdict; not-applicable and unable states (retry without re-upload; buttons swap after two failed retries).
- [x] **Details** (§7.5): audio player with waveform from the real audio as an accessible slider, flagged moments with range playback and highlight; photo with Original / Side by side / Heat map, overlay strength, numbered region outlines and zoom; video with native player, Picture and Sound lanes, scene-cut ticks and lane-tagged moments; text with focusable highlighted passages; source card for links; file details; accordion with "Why", "Model results" and "Technical details" (collapsed); three-way feedback.
- [x] **Mobile** (06-mobile-result): verdict, meter and facts above the fold, stacked 54px actions, details inline below the result, compact moment rows with 44px round play buttons. Checked at 320, 360, 390 and 430px with no horizontal scroll.
- [x] **Mock layer** (`src/mocks/`): fixtures for every verdict × media type (§14), result builder scaling fixtures to the person's own file, bundled samples generated for Faike (photo, heat map, voice note, video), demo checks at `/check/demo-<source>-<verdict>`, review page at `/mock` with links to all twelve requested states.
- [x] **Tests:** 35 Vitest unit tests (meter rule, input classification and validation, formatting, RD verdict mapping, fixtures and result builder).
- [x] **Verified:** lint, typecheck, unit tests and production build clean; 33 scripted end-to-end checks in Chromium (full flows, cancel, retries, network failure, links, text, drag and drop, file picker, Plus gate, keyboard slider, feedback focus, accordion, reduced motion, reload); no console errors on any screen at 1440 / 430 / 390 / 360 / 320px; every control at least 44 × 44px on mobile.

### The twelve requested states

| # | State | Where to see it |
|---|---|---|
| 1 | Empty / ready | `/` |
| 2 | Dragging a file over the scanner | drag onto the page, or `/?preview=dragging` |
| 3 | File selected | pick a file, or `/mock/run?select=voice` |
| 4 | Uploading | `/mock/run?sample=video&hold=uploading` |
| 5 | Retrieving social media | `/mock/run?link=tiktok&hold=retrieving` |
| 6 | Analyzing | `/mock/run?sample=voice&hold=analysing` (also photo, video, text) |
| 7 | Likely authentic | `/check/demo-photo-authentic` |
| 8 | Suspicious | `/check/demo-voice-suspicious` |
| 9 | Likely AI-generated or manipulated | `/check/demo-video-artificial` |
| 10 | Not applicable | `/check/demo-voice-not-applicable` |
| 11 | Unable to evaluate | `/mock/run?sample=voice&outcome=UNABLE_TO_EVALUATE` |
| 12 | Network / API failure | `/mock/run?sample=photo&outcome=NETWORK_ERROR` (or `OFFLINE`) |

## Stage 3a — Reality Defender server integration ✅ (interface not connected)

Built against RD's current documentation (checked 24 Sep 2026: API Quickstart, AWS Presigned URL, Social Media URL Upload, Media Detail, Create User Feedback) and, where those pages are incomplete, RD's official TypeScript SDK 0.1.19. **Not yet run against RD's live API**: no real key was available, and no test calls the paid API. The interface still runs on the mock.

- [x] **Route Handlers** (`src/app/api/scans/`):
  - `POST /api/scans/presign`: `{ fileName, mimeType, sizeBytes }` → `{ requestId, uploadUrl }`. The browser PUTs the file straight to RD's storage; media never passes through Faike.
  - `POST /api/scans/social`: `{ url }` → `{ requestId }`.
  - `GET /api/scans/{requestId}`: processing (analysing or retrieving), failed (post not retrievable) or complete with the analysis in Faike's terms.
- [x] **Server-only RD module** (`src/lib/rd/`): typed client (three endpoints), response types for the fields Faike uses, runtime validation, adapter to Faike's status, error classification. Presign envelope verified: `signedUrl` is nested under `response`, `requestId` is top level.
- [x] **Secrets:** `REALITY_DEFENDER_API_KEY` and `REALITY_DEFENDER_API_BASE_URL`, read at request time in one module that imports `server-only`; `.env.example` without values. Checked after a production build with a canary key: not inlined anywhere, and no RD path, header or variable name in browser chunks or HTML.
- [x] **Defensive handling:** every field validated at runtime; unknown statuses → "unable"; verdict from the ensemble summary; account ids (`userId`, `institutionId`), file names and storage links never returned; fixed error messages; safe server logs (operation, kind, status, RD code only); `Cache-Control: no-store`.
- [x] **Timeouts and retries:** 8 s per attempt, up to three attempts with back-off; POSTs are retried only when RD certainly did not process them; redirects are not followed; `maxDuration = 30`.
- [x] **Privacy:** RD receives a random file name with the right extension, not the person's.
- [x] **Config confirmed from RD's docs:** accepted extensions and limits (§12.10), social platforms including Threads (§12.3).
- [x] **Tests:** 120 Vitest tests in total (85 new: request validation, parsing, adapter, client with timeouts and retries, Route Handlers end to end). RD is replaced by fetch stubs, and any unstubbed `fetch` throws. Mutation-checked: breaking the verdict source, the ensemble heat-map filter or the POST-timeout rule fails the suite.
- [x] **Verified:** lint, typecheck, tests and production build clean. The production server was smoke-tested against a local RD stub: all three routes, validation, unsafe ids (never forwarded), 405 on wrong methods, and a hung upstream answering 504 after the retry budget, with only a safe summary logged.

### HANDOFF §12, against RD's documentation

| # | Question | Status |
|---|---|---|
| 1 | Response schema | **Answered.** `resultsSummary.status` (ensemble), `resultsSummary.metadata.finalScore` (0–100), `overallStatus`, `models[]` (`name`, `status`, `finalScore`, `code`). |
| 2 | Calibrated thresholds for the meter | **Open.** None published; placeholders stay. |
| 3 | Social platforms | **Answered.** Facebook, Instagram, Twitter/X, YouTube, TikTok, Threads. |
| 4 | NOT_APPLICABLE reason codes | **Answered for images and audio.** Image: `relevance`. Audio: `duration`, `detected` (dial tone or music), `cross-talk` (more than one speaker), `quality`, `language`. Video: none. |
| 5 | Audio time segments | **Open.** Only in `aggregation.json` (`chunks`), whose schema is not documented. |
| 6 | Video regions / segments; picture and sound | **Partly.** Timelines only in `aggregation.json` (undocumented). Sound is a separate result (`showAudioResult`, `audioRequestId`). |
| 7 | Image heat map / regions | **Partly.** Per-model heat map PNGs (non-ensemble `FAKE` models only, 15-minute URLs); boxes only in `aggregation.json` (undocumented). |
| 8 | Text span explainability | **Partly.** A pre-signed HTML page (`explainabilityUrl`); no span data documented. |
| 9 | Language detection | **Answered.** `metadata.languages`, lower-case names (English, Spanish and Portuguese named as examples). |
| 10 | Formats and limits | **Answered.** Images jpg/jpeg/png/gif/webp ≤ 50 MB; audio mp3/wav/m4a/aac/ogg/flac/alac ≤ 20 MB; video mp4/mov ≤ 250 MB and 30 min; text txt ≤ 900 KB. Matches §9.3. |
| 11 | Progress, cancellation, polling | **Partly.** No percentages or cancellation documented; poll (SDK default every 5 s) or webhook (setup not documented). In-progress statuses: `ANALYZING`, `DOWNLOADING`. |
| 12 | Showing model names | **Open.** RD says names are not stable, and its SDK marks per-model results as deprecated. Ask RD whether end users may see them. |

## Remaining work

### Stage 3b — Connect the interface
- [ ] **First, with a real key:** confirm a browser PUT to the upload URL works from Faike's origin (CORS; not covered by RD's docs), the request id format, and a live media detail for each media type and a social link.
- [ ] A `ScanService` that calls the routes (presign → PUT with progress → poll; social → poll), composes `ScanResult` from the input summary plus `ScanAnalysis`, and polls with back-off, paused while the tab is hidden, with an overall deadline; swap it in `src/lib/scan/client.ts`.
- [ ] Pasted text uploaded as a `.txt` file through the same presign flow (RD documents no text-body endpoint).
- [ ] Align browser validation with the server: extensions, not only MIME families (HEIC or WebM currently pass the browser and are refused by the server). The bundled sample video is WebM, which RD does not accept; an MP4 sample is needed if it is ever sent to RD.
- [ ] Not-applicable copy for RD's real codes (`cross-talk`, `detected`, `duration`, `quality`, `language`, `relevance`); the placeholder `multiple_speakers` goes.
- [ ] Map the server's error codes onto the handoff's system states.
- [ ] Feedback: RD needs a label (`REAL`, `SYNTHETIC`, `MANIPULATED`, `UNKNOWN`) and a category (`FALSE_POSITIVE`, `FALSE_NEGATIVE`, `CONFIRMATION`, `OTHER`); mapping Faike's Yes / No / Not sure is a product decision. RD's feedback response includes the account holder's name and email, which must never be passed on.
- [ ] Decide how to present text explainability (RD's pre-signed HTML page) and social-link previews (`storageLocation` / `thumbnail`), and whether to fetch the separate audio result of a video.
- [ ] Server-side scan record so direct links and retry work across devices; retention period (RD's originals are subject to RD's own retention).
- [ ] Replace remaining placeholder config (meter thresholds); remove the mock layer (`src/mocks/`, `/mock`, `/mock/run`, `?preview=`), keeping the example files.
- [ ] Vercel environment variables (Production and Preview) for the two RD settings.

### Stage 4 — Quality and hardening
- [ ] Design review of the derived views (photo, video, text, social link, selected-file state, connection failure).
- [ ] VoiceOver (Safari, iOS) and NVDA walkthrough of the full audio flow; real-device checks on iOS and Android.
- [ ] Safari check of the WebM sample video (older iOS versions may not play WebM; an MP4 sample may be needed).
- [ ] Security review (secrets, headers, CSP including the logo-swipe script), performance review.
- [ ] **Launch blockers:** a signed token issued with each request id (today the id alone reads the result), and rate limiting or bot protection on `POST /api/scans/presign` and `/social` (today anyone can spend Faike's RD quota).

### Stage 5 — Deployment
- [ ] Vercel project, environment variables, domain, `metadataBase`, favicon, app icon and social image.

## Open items

### Brand (needs design)
- Vector master of the logo (the provisional trace inherits irregular edges from the PNG).
- Sign-off on the logo + highlighter combination and band position.
- Favicon, app icon and social-share image.

### Reality Defender (HANDOFF §12)
See the Stage 3a table: 5 answered, 4 partly answered, 3 open (thresholds, audio segments, showing model names). Questions to put to RD: the `aggregation.json` schema, browser upload CORS, the upload URL lifetime, the request id format, webhooks, whether model names may be shown, and whether Faike's RD plan covers video, text and links (RD's free tier covers images and audio only).

### Product (HANDOFF §13)
Share format · retention period · signed-out history · status-chip copy for authentic and artificial ("Looks good", "Be careful with this one" are proposals) · Plus model · follow-up on feedback "No".

### Decisions where the brief, the handoff or the comps differ, or are silent

| Topic | Choice | Status |
|---|---|---|
| Not-applicable and unable titles | Product wording from the brief ("Not enough suitable information", "Unable to analyze") replaces the handoff's titles; the handoff's body copy is kept | Brief supersedes handoff |
| Spelling | "analyze" (US) in the not-applicable sentence to match "Unable to analyze"; the handoff used "analyse" | Confirm house style |
| Network / API failure | "Connection" card: handoff's offline copy, plus a derived "We couldn't connect" variant for an unreachable service | Derived |
| File selected | A picked or dropped file waits for "Check it" before anything is sent; the same state holds the file after Cancel | Derived, needs design review |
| Plus gating vs "no pricing" | Gating logic kept in config; mock plan defaults to Plus so every input works; free plan (badges, gate) switchable on `/mock`; "See Plus" goes to a placeholder | Derived |
| "Optional score" | Numeric ensemble score only in "Technical details", labelled as a model output score; the signal meter carries it on the result | Handoff §6.21 rule kept |
| Advanced details | "Technical details" section (metadata, check information) added next to "Model results", both collapsed | Brief |
| Disclaimer | Handoff's evidence note used verbatim ("evidence, not proof") | Handoff copy |
| Retrieving title | "Grabbing the post from the link…" until the media type is known (the comp assumes a video) | Derived |
| Details title for authentic | "What Faike heard / saw / noticed" (nothing is flagged) | Derived |
| Meter without a score | Least extreme allowed position (the handoff's "middle" is ambiguous for two-position verdicts) | Derived |
| Meter tag at the ends | Extra space above the segments so "This file" can't collide with the title or caption | Derived |
| Colours not in tokens | "Leaning AI" idle #FBE7C4 (from 05-states), unplayed waveform #A9B3AD (§6.17), 18px file names (§6.8) declared once in `globals.css` | Derived from handoff |
| Feedback pills border | `line-strong` instead of the comp's `line-dashed` (§4: decorative colours never bound a control) | Handoff rule over comp |
| Mobile sizes | Explanation 16px and verdict card 28px radius (comp); fact pills and evidence note keep 15px text (§4 "body sizes stay the same") | Mixed, per source |
| Video lanes | Flagged bands use the legend colours so they read on the neutral track | Derived |
| Heat map | Mock supplies an RD-style heat map image; legend: "shows where signs of AI were picked up, not why" | Derived |
| Direct links | Finished checks are kept for the browser session (mock); local media previews are unavailable after a reload | Mock stand-in |
| Default mock outcomes | Photo → authentic, voice and text → suspicious, video and video links → likely AI | Mock |
| RD file name | Random `<uuid>.<ext>` instead of the person's file name | Privacy, derived |
| Missing RD status | Treated as still processing; the client's polling deadline will bound it | Derived |
| Heat maps | Only with a suspicious or artificial verdict, so a model's flags never contradict the ensemble | CLAUDE.md rule |
| Earlier Stage 1 decisions | Logo size, tablet header, step strip on tablet, card width, hover colours, line-height, skip link | Unchanged |
