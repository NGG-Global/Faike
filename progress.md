# Faike — progress

Last updated: 25 Sep 2026 (heat maps drawn from RD's data; Sign in removed)

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
| 4 | NOT_APPLICABLE reason codes | **Answered for images and audio.** Image: `relevance`. Audio: `duration`, `detected` (dial tone or music), `cross-talk` (more than one speaker), `quality`, `language`. Video: none. Copy written for each (Stage 3b). |
| 5 | Audio time segments | **Open.** Only in `aggregation.json` (`chunks`). RD documents the top-level keys only, so no moments are drawn. The structure can now be captured from one check (Stage 3b, part 3). |
| 6 | Video regions / segments; picture and sound | **Partly.** Timelines only in `aggregation.json` (same status as 5). The separate sound result is now shown beside the overall verdict (read through `audioRequestId`; see part 3 for what is assumed). |
| 7 | Image heat map / regions | **Partly, built.** Every usable heat map is drawn in the signal colours through Faike's own route, with a picker; detectors that finish later add theirs. RD documents no scale for the map's intensity. Boxes only in `aggregation.json` (same status as 5). |
| 8 | Text span explainability | **Partly, built.** RD's pre-signed HTML page is offered in a sandboxed frame and a new tab; no span data is documented. |
| 9 | Language detection | **Answered.** `metadata.languages`, lower-case names (English, Spanish and Portuguese named as examples). |
| 10 | Formats and limits | **Answered.** Images jpg/jpeg/png/gif/webp ≤ 50 MB; audio mp3/wav/m4a/aac/ogg/flac/alac ≤ 20 MB; video mp4/mov ≤ 250 MB and 30 min; text txt ≤ 900 KB. Matches §9.3. |
| 11 | Progress, cancellation, polling | **Partly.** No percentages or cancellation documented; poll (SDK default every 5 s) or webhook (setup not documented). In-progress statuses: `ANALYZING`, `DOWNLOADING`. |
| 12 | Showing model names | **Open with RD; shown by the owner's instruction.** RD says names are not stable, and its SDK marks per-model results as deprecated. Names are now shown as RD returns them (`RD_MODEL_NAMES_PUBLIC = true`, 25 Sep 2026). Still to ask RD whether end users may see them. |

## Stage 3b, part 1 — Real image checks ✅ (see the CORS status below)

Image files now run for real: **presign → the browser PUTs the file straight to RD → poll Faike's own `GET /api/scans/{requestId}` → RD's result on the existing result and details screens.** Audio, video, text and links stay on the mock.

**Workaround in place (25 Sep 2026, later).** Confirmed again on the deployment: Faike's presign route works, but RD's upload server answers the browser's CORS check with no permission for `https://faike.vercel.app`, so the upload is blocked and the person sees "We couldn't connect". By the owner's decision, uploads now go through a temporary same-origin route (`/rd-upload/{id}?token=…`), which a rewrite forwards unchanged to RD. See "Temporary upload route" below. RD is also being asked to allow Faike's addresses; once it does, switch the route off.

**Earlier status (25 Sep 2026).** You reported the real image flow working in production. From this environment, a browser-style preflight on a real upload URL still returns no `Access-Control-Allow-Origin` for `https://faike.vercel.app`, while `https://app.realitydefender.ai` gets one; to confirm: the origin you tested from, and whether RD has allow-listed Faike's addresses. Original finding: RD's upload endpoint only allows its own web app's origin. Browser preflights from `https://faike.vercel.app`, `http://localhost:3000` or any other origin get no `Access-Control-Allow-Origin` header, while `https://app.realitydefender.ai` does (checked 24 Sep 2026). Until RD adds Faike's origins, a real browser upload fails and the person sees "We couldn't connect" with Try again. Nothing in Faike can fix this within the agreed architecture. Options:
1. **Recommended:** ask RD to allow Faike's origins: production domain(s), Vercel preview domains, and `http://localhost:3000` for development.
2. Relay small files through a Route Handler to RD. Contradicts the "no media through serverless functions" decision, and Vercel's request-body limit (about 4.5 MB; verify) caps it.
3. Upload to storage Faike controls, then server-to-server to RD. Adds a dependency and temporary re-hosting of the person's file (conflicts with the privacy rule).

**Built.**
- [x] `src/lib/scan/live-service.ts`: the real `ScanService` for image files. The file is kept in memory for retries in this tab only.
- [x] `src/lib/scan/client.ts` routes image files to the live service and everything else to the mock; each job records its service (`engine: "rd"`), so cancel and retry reach the right one.
- [x] `src/lib/scan/api-client.ts`: calls Faike's routes (responses validated) and uploads with XMLHttpRequest for real upload progress. The browser sends no key.
- [x] `src/lib/scan/poll.ts`: polling. One request at a time; stops at the first final state; 2 s waits, 4 s after 30 s, doubled after an error; fails after 3 errors in a row; 3-minute deadline; aborts immediately on cancel or a newer check. Values in `src/config/polling.ts`.
- [x] A model still `ANALYZING` never holds up or fails a check: the verdict comes from the ensemble, and such a model is shown without a result.
- [x] `src/lib/scan/result.ts` builds `ScanResult` from the person's file facts plus RD's analysis only. No regions, segments or reasons are invented; one heat map is shown, from the flagged model with the highest score (part 3 shows them all).
- [x] Retry: after an upload failure it starts over; after a status failure or the deadline it keeps waiting on the same request (no new upload); after "Unable to analyze" it sends the kept file again as a new check. A real check whose file is gone (after a reload) offers only "Check a different file".
- [x] A new check stops any real check still uploading or analysing and removes it.
- [x] The browser now also requires one of RD's extensions, so HEIC, AVIF or WebM get the "can't check this" card before any upload.
- [x] `/mock` review links always use the mock, including photos, so reviewing never spends RD checks.

**Live findings** (two checks of Faike's own generated sample photo through the production routes, 24 Sep 2026):
- The presign envelope and media-detail fields match our types; no type changes were needed beyond the points below.
- The upload URL is RD's own API (`api.prd.realitydefender.xyz/api/files/{requestId}?token=…`), not an S3 link. A PUT with the file body alone succeeded.
- The result arrived in about 10 s: "artificial", ensemble score 0.92. The sample is synthetic, so that is the expected answer.
- Four models were still `ANALYZING` when the ensemble was final.
- A file upload reported "retrieving" at first, because the social-link fields also appear on file uploads. Fixed: they now count only when a link was submitted.
- Model names differ from RD's documented examples (e.g. `rd-full-elm-img`), which confirms they must stay data.
- RD's heat map is a greyscale PNG with transparency, the size of the photo, with white glow where a model reacted. Faike's strength legend does not describe it and is now hidden unless there are region outlines. The glow is faint over bright photos (design item below).

**Verified.**
- Lint, typecheck, 151 unit tests and the production build are clean. New tests cover the poller, the result composer, the browser API client, the live service (abort, retry, cancel, still-analysing models, other media staying on the mock) and live-shaped adapter data.
- A production build was run in Chromium against a local RD stand-in shaped after the live responses: 20/20 checks.
  - Covered: full flow, sequential polling that stops at the result, heat map, neutral model labels, no RD account data on the page, no key from the browser, old polling aborted by a new check, CORS-blocked upload followed by retry, status errors followed by retry on the same request, cancel, and mobile layout.
  - Server logs contained no key or upload token.
- Not verified: a real browser upload against RD. It is blocked by CORS as above, and this environment's Chromium cannot open the production site through its proxy. The live path was verified server-side with curl, including the browser-style CORS preflight.

**Decisions** (derived; see also the table below):
- "This is taking longer than usual" state for the polling deadline, with Try again (the handoff has no such state).
- Model names hidden behind `RD_MODEL_NAMES_PUBLIC = false` until RD confirms end users may see them (HANDOFF §12.12); rows read "Model 1", "Model 2"… (Superseded in part 3: shown by the owner's instruction.)
- The handoff's Unable copy "try again without re-uploading" stays: the person does not choose the file again, but the browser does send it again, because RD documents no way to re-run a check.
- The example photo on the home page is now a real check and uses RD quota each time.

## Stage 3b, part 2 — Every input on the live service ✅

Photos, audio, video, text files, pasted text and social links are all real Reality Defender checks through **one** live service: the same job stages, request-id handling, poller, error mapping, retry, cancel and abort. Only the way the request id is obtained differs:
- A file goes through presign and a direct upload. Pasted text is sent as a `.txt` file the same way.
- A link goes through `POST /api/scans/social`, and RD downloads the post itself.

The mock now serves only the `/mock` review tools and the demo checks.

**Built.**
- [x] **One typed configuration module** (`src/config/media.ts`): categories, RD's extensions, size limits (images 50 MB, audio 20 MB, video 250 MB, text 900 KB), the 30-minute video limit, MIME families and Plus gating. It also provides the file-picker `accept` list and format lists for messages. Nothing else declares these values.
- [x] **Capability switches** (`src/config/capabilities.ts`): image, audio, video, text and social on or off.
  - A switched-off kind disappears from the "what you can check" chips, the examples, the paste prompt and the home intro. Where the design has room for it (the intake), the person gets a clear "Video checks aren't available right now" card before anything is uploaded.
  - The server refuses it too (`disabled`, HTTP 403) before calling RD.
  - No subscription or payment behaviour was added; the handoff's Plus gate is unchanged and separate.
- [x] **Validation before any paid call**, in the browser and again on the server, in this order: category, availability, format, size, video length, Plus. Messages are built from the config:
  - "Images can be up to 50 MB. This one is 64.2 MB. Try a smaller image."
  - "Images can be JPG, JPEG, PNG, GIF or WEBP files." (a HEIC photo)
  - "Videos can be up to 30 minutes. This one is 30:24 long."
  - "Faike checks links from TikTok, Instagram, X, YouTube, Facebook and Threads." (a link from another site)
- [x] **Video duration** is read in the browser from the file's own metadata with the built-in media element (5-second timeout, no dependency). If the browser cannot read it, the check proceeds and RD enforces its own limit.
- [x] Files with no MIME type (some audio formats) are recognised by their extension.
- [x] **Links:** "Grabbing the post from the link…" while RD downloads, then analysing, then the result. The media type comes from RD. A refused or undownloadable post shows "We couldn't open that link". The details say Faike doesn't keep a copy of the post, and no preview is invented.
- [x] **Results without RD segment data:** the video "Where Faike reacted" lanes and the audio strength legend are left out rather than drawn empty.
- [x] **Not-applicable copy** for every code RD documents (`relevance`, `duration`, `detected`, `cross-talk`, `quality`, `language`); the placeholder is gone.

**Verified.**
- Lint, typecheck, 171 unit tests and the production build are clean.
- In Chromium against a local RD stand-in, 23/23 checks with everything switched on:
  - photo, audio (language shown), video (duration read before upload), text file and pasted text
  - a social link going from retrieving to result, and an undownloadable post
  - refusals before any request: another site's link, HEIC, an oversized image
  - RD's not-applicable reason shown in words
  - no overlapping polls and no key from the browser
- A build with video and links switched off: 8/8, including the server's 403.
- Logs contained no key or upload token, and RD received only random file names.
- Not verified:
  - a real browser upload from `faike.vercel.app` (see the CORS note above)
  - the video test file is the bundled WebM clip renamed `.mp4` (no ffmpeg here); a genuine MP4/MOV should be tried on the deployment

## Stage 3b, part 3 — Result detail from real RD data ✅

The remaining mock visualisation is replaced by what RD returns. Where RD returns nothing, or returns data whose structure is not documented, the section is left out rather than drawn empty or guessed.

**Built.**
- [x] **Overall result** from RD's ensemble (`resultsSummary.status`, falling back to `overallStatus`), with the brief's five labels. No wording states that a file is real or fake.
- [x] **Score:** `resultsSummary.metadata.finalScore` is shown only when it is a number from 0 to 100 and the verdict is authentic, suspicious or artificial. It is labelled "Overall output score" in "Technical details", and that section is left out when there is no score. Nothing is averaged from the individual detectors, and no 0, 50 or 100 % is filled in.
- [x] **Model results** (collapsed by default):
  - one row per detector, named from RD's response
  - RD's ensemble entry and detectors RD marks not applicable are left out
  - a detector still `ANALYZING` reads "Still running"
  - the status is the main column; the score column appears only when at least one detector has a score, so the table stays useful if RD drops per-detector scores
- [x] **Image heat maps:**
  - every usable heat map (non-ensemble detectors that flagged the image, only with a suspicious or artificial verdict), strongest first
  - the existing original / heat map / overlay control, plus a "Heat map from" picker when there is more than one, and "From {detector}." when there is one
  - **expired links:** if the heat map fails to load, Faike re-reads the check's detail by request id and swaps in the fresh links. It never re-runs the check or changes the verdict. After two unsuccessful refreshes, a note says the heat map couldn't be loaded and the result is unchanged. (Replaced by the heat map route below.)
- [x] **Video with sound:** when RD analysed the sound separately (`showAudioResult` not false, plus a valid `audioRequestId`), the server reads that result too, and the details show a "Sound check" card beside the overall result, without repeating the overall verdict. If the sound result can't be read, the overall result still stands.
- [x] **Text explanation:** when RD returns `explainabilityUrl` for text, the details offer "Detailed explanation". It loads in an iframe with `sandbox=""` (no scripts, forms or navigation), with a link to open it in a new tab, and the Faike summary stays around it.
  - The page is never copied into Faike's HTML and there is no `dangerouslySetInnerHTML`.
  - The frame and the link point at `GET /api/scans/{requestId}/explainability`, which re-reads the detail and redirects to a fresh URL each time, so an expired link cannot be served.
- [x] **File details** show only file name, type, detected language, source (for links) and check time. No RD ids, storage paths or processing metadata.
- [x] **Video timelines and audio moments:** not drawn. Their only source is `aggregation.json`, whose inner structure RD does not document (checked against the Media Detail page and both SDKs on 25 Sep 2026). The details say nothing about where in the clip Faike reacted, rather than invent it.
- [x] **Capturing the aggregation structure.** `src/lib/rd/aggregation.ts` fetches `aggregation.json` safely: no key sent, redirects refused, 8 s timeout, 5 MB cap, JSON validated. It can describe the structure without any content (keys, types, array lengths and numeric ranges; strings reduced to "string" unless they are upper-case codes). With `REALITY_DEFENDER_LOG_AGGREGATION_SHAPE=1`, each finished check logs that description.

**To unlock timelines and audio moments:**
1. Set `REALITY_DEFENDER_LOG_AGGREGATION_SHAPE=1` in `.env.local` (or temporarily in Vercel) and run one check each of a video with speech, an audio file and a photo.
2. Copy the `[rd] aggregation shape` log lines (they contain no values, names or links) and share them, or ask RD for the schema.
3. The fields can then be mapped explicitly into `ScanResult.segments` and `regions`, with tests.
4. Remove the variable afterwards.

**Assumptions to confirm on a real check:**
- **Sound of a video:** RD's docs show `audioRequestId` but do not say how to fetch it. Faike reads it through the same media-detail endpoint. If that is wrong, the sound card simply does not appear.
- **Explanation in a frame:** it is not known whether RD's storage allows its page to be framed. If it does not, the frame stays empty and the new-tab link still works.
- **`showAudioResult`:** RD's example shows the text "True"; Faike accepts that and a real boolean.

**Verified.**
- Lint, typecheck, 208 unit tests and the production build are clean. New tests cover:
  - RD fixtures for image, audio, video with sound, text and a minimal result of every media type (missing optional fields)
  - the explanation redirect (fresh link each time, 404 for other media, unsafe ids never forwarded)
  - the sound lookup, including a failed sound read
  - aggregation fetching (key never sent, size cap, redirect refused) and shape logging (no values; off by default)
  - the detector table with and without scores
  - file details
  - expired heat map recovery in the live service
- In Chromium against a local RD stand-in, 16/16 checks:
  - an expired heat map (403) recovered after one refresh, with the result unchanged
  - the picker listed only the flagging detectors, with no ensemble
  - "Still running" shown for a running detector
  - audio: language shown, no invented moments, no "Technical details" without a score
  - video: the "Sound check" card
  - text: the explanation loaded in the sandboxed frame through the redirect, and a script inside it did not run
  - no RD ids on any page and no page errors
- Server logs contained no key and no signed-URL query.

**Decisions:**
- Detector names shown by the owner's instruction; `RD_MODEL_NAMES_PUBLIC = false` shows "Model 1", "Heat map 1"… instead.
- The sound card reads "Sound check — Checked separately, beside the overall result." so it never reads as a second overall verdict.

## Heat maps drawn from RD's data; Sign in removed ✅

**What was wrong.** With image uploads working, the owner found no visible heat map. RD's heat map is a white mask whose transparency says how strongly one detector reacted. In the live map (24 Sep 2026), 99.6% of pixels were almost clear and most marked pixels were under 7% intensity. Drawn as-is at 70% over a bright photo it was practically invisible, and the details opened on "Original".

**Built.**
- [x] **Heat map route:** `GET /api/scans/{requestId}/heatmap?model={name}`.
  - Each request re-reads the media detail and takes that detector's current link, so RD's 15-minute expiry no longer matters.
  - Only a heat map RD marks as usable is served (non-ensemble `FAKE` detector, suspicious or artificial result).
  - The PNG is fetched server-side without the RD key: no redirects, 8 s timeout, 4 MB cap, PNG signature checked.
  - It is returned from Faike's own origin with `no-store`, `nosniff` and `Cross-Origin-Resource-Policy: same-origin`.
  - RD's storage links no longer reach the browser: the status response carries Faike's own address for each heat map.
- [x] **Drawn in the signal colours** (`src/lib/scan/heatmap.ts`, `HeatmapLayer`).
  - The browser reads the PNG's pixels and scales the map to its own strongest point (99.9th percentile of marked pixels).
  - Haze below 12% of that point is left clear.
  - Colours blend from `--signal-some` to `--signal-strong`, read from the tokens.
  - Values are in `src/config/heatmap.ts` and were tuned on the live map.
  - "Overlay strength" sets the colour's opacity and fades the photo underneath to grey by the same amount, so the colours read on any photo.
- [x] **Details open on the heat map** when there is one ("Show me where"), on desktop and in the mobile inline details. The person can switch to Original or Side by side.
- [x] **Detectors that finish later.** While the details are open, a finished check with detectors still running is re-read after 0, 4, 8 and 15 s, stopping when none is running (`LATER_DETAIL_WAITS_MS`). Their rows and heat maps are added; the verdict and score never change.
- [x] **Plain notes instead of an unmarked photo:**
  - no heat map came back: "Faike didn't get a heat map for this photo, so no particular area is marked."
  - still expected: "Some checks are still finishing. A heat map may appear here shortly."
  - not loadable: "The heat map couldn't be loaded right now. The result is unchanged."
  - blank: "This heat map doesn't mark any particular area."
- [x] The caption now says what the colour means: "Deeper orange means a stronger reaction in that spot."
- [x] **Sign in removed** from the header on desktop and mobile (owner, 25 Sep 2026). The `/sign-in` placeholder page stays, unlinked. The mobile home header now shows the logo only.

**Verified.**
- Lint, typecheck, unit tests and build are clean. New tests cover:
  - the heat map route: fresh link each time, key never sent, 404s, expired link, non-PNG body
  - the recolouring (RD-style mask, stray pixels, greyscale maps, blank maps)
  - later detail: rows and heat maps taken, verdict kept, reads stop, single run
- In Chromium against a local RD stand-in serving **RD's real heat map from the live check**, 18/18 checks:
  - details open on the heat map, which is drawn in `--signal-strong` (17,236 marked pixels)
  - an expired storage link (403) recovered through a second read
  - a detector finishing later added its heat map to the picker, strongest first, and its row
  - overlay strength and grey move together; Original shows the photo alone
  - no RD storage link or account id reached the browser; storage never received the key
  - the "no heat map" and "blank heat map" notes
  - the mobile inline view, with no sideways scroll
  - the header without Sign in on desktop and mobile
- The `/mock` demo photos still draw their sample heat map.
- Not verified: a heat map from RD's live storage through the new route on the deployment. This needs one real check after merge.

**Decisions:** see architecture decisions 62–65.

## Temporary upload route (while RD's CORS excludes Faike) ✅

**Why.** RD's upload server grants browser uploads only to `https://app.realitydefender.ai`. Every upload from `faike.vercel.app` failed at the browser's CORS check.

**Built.**
- [x] `src/config/upload.ts`: one switch (`RD_UPLOAD_PROXY.enabled`), the same-origin path (`/rd-upload`) and the only destination (`https://api.prd.realitydefender.xyz/api/files`).
- [x] `next.config.ts`: an external rewrite, `/rd-upload/{id}` → RD's upload endpoint. It accepts only a plain id (`[A-Za-z0-9_-]{1,128}`); any other path is a 404.
- [x] `src/lib/rd/upload.ts` (`browserUploadUrl`): the presign route converts RD's signed URL to the same URL on Faike's domain, but only for that exact destination with a plain id. Anything else (a changed RD address, the local stub) is passed through unchanged.
- [x] The browser code is unchanged: it still PUTs with real progress, now to a same-origin address, so no CORS check applies.

**How it behaves.**
- **Vercel's network forwards the file**, not a Faike function, so the 4.5 MB function limit does not apply. The file is forwarded, never stored, and the RD key is not involved.
- **Limit: 120 seconds per upload** (Vercel's limit for forwarded requests). A large video on a slow connection can exceed it.
- **Size limit: not documented** by Vercel for forwarded requests. Large files need a test.
- **Logs:** RD's short-lived upload token is in the forwarded URL, so it may appear in Vercel's request logs, which only the project team can see.
- **Cookies:** the browser sends Faike-domain cookies with the upload, and they are forwarded. Faike sets none. On password-protected Vercel preview deployments, Vercel's own access cookie may be forwarded to RD.

**Verified.**
- Lint, typecheck, unit tests and build are clean.
- A local build forwarding to an echo server delivered the method, path, token, content type and all 6 MB of a test file (checksum match). Paths outside the pattern returned 404.
- On the deployment, to be checked after merge: a request through `/rd-upload/` with a dummy id must return RD's own 404 echoing the token.

**To remove.** When RD confirms Faike's addresses are allowed, set `enabled: false` (or delete `src/config/upload.ts`, `src/lib/rd/upload.ts` and the rewrite) and verify one direct upload.

## Remaining work

### Stage 3c — Hardening the real flow
- [ ] **Ask RD to allow Faike's origins** (production and custom domains, Vercel previews, `http://localhost:3000`), then switch off the temporary upload route and check each media type and a social link on the deployment.
- [ ] Until then: test a large video through the upload route (Vercel's 120-second limit and undocumented size limit).
- [ ] Real MP4 and MOV samples; the bundled sample video is WebM, which RD does not accept (it is used only by the mock).
- [ ] Heat map drawing: confirm the thresholds in `src/config/heatmap.ts` on more real maps, and ask RD what the map's intensity means; design review of the grey-photo treatment.
- [ ] Feedback: RD needs a label (`REAL`, `SYNTHETIC`, `MANIPULATED`, `UNKNOWN`) and a category (`FALSE_POSITIVE`, `FALSE_NEGATIVE`, `CONFIRMATION`, `OTHER`); mapping Faike's Yes / No / Not sure is a product decision. Answers are kept in the tab for now. RD's feedback response includes the account holder's name and email, which must never be passed on.
- [ ] Map `aggregation.json` once its structure is confirmed (video timelines, audio moments, image boxes); see part 3.
- [ ] Confirm on a real check: the sound result of a video via `audioRequestId`, and whether RD's explanation page can be framed.
- [ ] Decide on social-link previews (`storageLocation` / `thumbnail`); today no preview is shown.
- [ ] Server-side scan record so direct links and retry work across devices and after a reload; retention period.
- [ ] Replace remaining placeholder config (meter thresholds); decide when to remove the mock layer (it now serves only `/mock` and the demo checks).
- [ ] Vercel environment variables for Preview as well as Production (confirm scope).

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
See the Stage 3a table: 5 answered, 4 partly answered, 3 open (thresholds, audio segments, showing model names). Questions to put to RD: adding Faike's origins to the upload CORS allow-list (confirmed blocking; worked around for now), the `aggregation.json` schema, how to read the sound result of a video (`audioRequestId`), whether the explanation page may be framed, the upload URL lifetime, the request id format, webhooks, whether model names may be shown, and whether Faike's RD plan covers video, text and links (RD's free tier covers images and audio only).

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
| Advanced details | "Model results" and "Technical details" (overall output score), both collapsed; each left out when RD returned nothing for it | Brief |
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
| Polling deadline | "This is taking longer than usual" + Try again (keeps waiting on the same request) | Derived |
| Upload route | Same-origin rewrite to RD while RD's CORS excludes Faike; one switch removes it | Owner decision, temporary |
| Model names | Shown as RD returns them, by the owner's instruction (25 Sep 2026); RD permission still to confirm; one switch hides them | Owner decision |
| Heat map legend | Strength legend only with region outlines; RD's heat map keeps its own caption | Derived from live data |
| One real check at a time | A new check stops and removes a real check still in progress | Brief |
| Disabled kinds | Left out of chips, examples, paste prompt and home intro; explained with a "… checks aren't available right now" card if dropped or pasted anyway | Derived; the design has no disabled state |
| Size message wording | "Images can be up to 50 MB." (brief) instead of "Photos"; other kinds keep the handoff's pattern | Brief |
| Not-applicable sentences | Derived from RD's own reason messages; "cross-talk" uses the handoff's example wording | Derived |
| Link details | "Faike doesn't keep a copy of posts from links, so the post isn't shown here." | Derived; follows the no-redistribution rule |
| Pasted text | Sent to RD as a `.txt` file through the same upload path | RD documents no text-body endpoint |
| Missing RD status | Treated as still processing; the client's polling deadline will bound it | Derived |
| Heat maps | Only with a suspicious or artificial verdict, so a model's flags never contradict the ensemble | CLAUDE.md rule |
| Several heat maps | "Heat map from" picker beside the overlay control, strongest first | Derived, needs design review |
| Heat map drawing | RD's mask scaled to its own strongest point, drawn from `--signal-some` to `--signal-strong`; photo fades to grey with the overlay | Derived from live data, needs design review |
| Heat map first | "Show me where" opens photo details on the heat map when there is one | Derived |
| No heat map | Plain notes for none, still expected, not loadable and blank | Derived |
| Sign in | Removed from the header until accounts exist; placeholder page kept, unlinked | Owner decision |
| Sound of a video | "Sound check" card with its own label; the overall verdict is not repeated | Derived, needs design review |
| Text explanation | "Detailed explanation" card: sandboxed frame plus "Open the explanation in a new tab" | Derived, needs design review |
| Video timeline, audio moments | Not drawn until RD's `aggregation.json` structure is confirmed | CLAUDE.md rule (no guessed fields) |
| Earlier Stage 1 decisions | Logo size, tablet header, step strip on tablet, card width, hover colours, line-height, skip link | Unchanged |
