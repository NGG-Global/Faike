# Faike — Front-end Handoff (Direction 2, "Just drop it")

**Audience:** Claude Code (and any engineer picking this up).
**Status:** Approved visual direction, ready for implementation.
**Date:** 24 September 2026.

---

## 0. How to use this package

Read this file end to end before writing code. It is the authoritative specification. The reference comps show the intended look; where a comp and this file disagree, this file wins, because it adds the accessibility, responsive and state rules the static comps cannot express.

| Path | What it is | Authority |
|---|---|---|
| `HANDOFF.md` | This specification | Authoritative |
| `tokens.css` | Every colour, type size, radius, spacing, shadow and motion value as CSS custom properties | Authoritative; import it, do not re-type values |
| `reference/screens/*.html` | Static, pixel-accurate comps exported from the design canvas, fixed at artboard size | Visual reference only. **Do not copy their markup into production.** They use inline styles, fixed pixel widths and placeholder data |
| `reference/png/*.png` | Screenshots of the same comps | Visual reference. Rendered offline, so they show a fallback font instead of Bricolage Grotesque and Figtree. Open the HTML files with an internet connection to see the real type |

Reference screens:

| File | Screen | Artboard |
|---|---|---|
| `01-upload` | Home / universal input | 1440 × 900 |
| `02-analyzing` | Analysis in progress (audio example) | 1440 × 900 |
| `03-result` | Completed result, "Suspicious" verdict | 1440 × 1000 |
| `04-result-details-audio` | Result details for audio | 1440 × 1360 |
| `05-states` | Eight system states as cards | 1440 × 1200 |
| `06-mobile-result` | Mobile result + details, stacked | 390 × 1340 |

### Stack

Use whatever stack the target repository already uses. If this is a greenfield project, React with TypeScript is a sensible default, styled with plain CSS or CSS Modules that consume `tokens.css`. Do not introduce a component library or utility-CSS framework whose defaults would override the look; every component here is custom and small. Before using any third-party library API (audio waveform rendering, file upload, etc.), confirm the method names against that library's current documentation rather than relying on memory.

---

## 1. Product in one paragraph

Faike is a consumer web app that tells people how likely it is that a photo, voice note, video, piece of text or social-media link was generated or manipulated by AI. Detection is performed by **Reality Defender** (RD). Faike's job is to make RD's output understandable to non-experts, honest about uncertainty, and never presented as proof. Tagline: **"Drop something in. Find out how real it looks."**

### Design idea for Direction 2

A tool you would send to a friend without explaining it. Soft sage background, white rounded cards, one highlighter yellow, and conversational copy. The single memorable gesture is the **yellow highlighter swipe**: it sits behind "ai" in the wordmark, it is the progress indicator while analysing, and it marks flagged moments. Everything else stays quiet. Colour is never the only carrier of meaning; every coloured element is paired with a word.

---

## 2. Scope

**In scope:** upload/home, analysing, result, result details (per media type), all system states listed in §8, free-tier gating, feedback capture, share, history entry point, desktop and mobile layouts.

**Out of scope for this handoff:** authentication flows, the Plus purchase flow, the History page, account settings, marketing pages. Buttons that lead there should route to placeholder pages.

**Designed vs. derived.** The comps fully design the **audio** details view. Image, video, text and social-link details views are **not drawn in Direction 2**; §7.5 specifies them using D2's components and rules. Build them from the same components, and treat their exact layout as a first pass to be reviewed by design.

---

## 3. Brand

### Wordmark

Lowercase `faike` set in Bricolage Grotesque 800, 34px, tracking −0.03em, colour `--color-ink`. The letters `ai` sit on the highlighter mark (`.hl` class in `tokens.css`: a yellow band from 40% to 90% of the line height). It is text, not an image: render it as `f<span class="hl">ai</span>ke` inside a link with `aria-label="Faike home"`. Mobile size: 28px.

Do not animate the wordmark on every page load. The swipe plays once per session, on the first load of the home page (see §10).

### Voice

Plain, warm, second person, sentence case. Short sentences. No jargon ("detector", "model", "inference") on primary surfaces; those words are allowed only inside the "Model results" section. Never say "proof", "certain", "guaranteed", "100%". Errors explain what happened and what to do next; they do not apologise.

---

## 4. Tokens

Import `tokens.css` globally. Key decisions a developer needs to know:

**Colour roles.** `--color-subtle` (#9AA69F) and `--color-line-dashed` (#C3CBBE) are decorative only; they fail text contrast and must never be used for text or as the sole boundary of an interactive control. Where a border is the only thing identifying a control (for example a text input on a white card), use `--color-line-strong` (#7F8B84, 3.5:1 on white).

**Verdict colour sets.** Each verdict has a foreground (text, icon, active meter segment) and a tint (card background). Measured contrast of verdict text on its own tint: authentic 5.8:1, suspicious 5.35:1, artificial 4.99:1. All pass WCAG AA for normal text. Not-applicable and unable states deliberately use the neutral white card; they are not verdicts about the content.

**Type.** Two families only. Bricolage Grotesque for display (hero, verdict headline, card headings, badges, numerals in round markers). Figtree for everything else. Scale and tracking are in `tokens.css`. Mobile display sizes: hero 40px, verdict 38px, details H1 30px, H2 22px; body sizes stay the same.

**Radius hierarchy is intentional.** The larger and more important the container, the larger the radius: verdict card 36, drop card 32, standard cards 28, inner cards 24, rows 20. Do not flatten these to one value.

**Touch targets.** Every interactive element is at least 44 × 44px. Primary buttons are 48px (default) or 52px (result page).

---

## 5. Layout and responsiveness

### Breakpoints

| Name | Range | Behaviour |
|---|---|---|
| Mobile | < 640px | Single column, 20px side padding, full-width buttons stacked |
| Tablet | 640–1023px | Single column, content max-width 720px, centred |
| Desktop | ≥ 1024px | Layouts as drawn in the comps |

The comps are drawn at 1440px. Treat the drawn widths as **max-widths**, not fixed widths: intake column `max-width: 880px`, result/details column `max-width: 1040px`, details aside `340px`. All should shrink fluidly.

### Header

Height 84px desktop, 64px mobile. Wordmark left. Right side varies by screen: home shows "How it works", "History", "Sign in"; result and details show "History" and a secondary pill "Check something else". On mobile the nav collapses to a single 44px round button "New check" (plus icon) on result screens, and to "Sign in" on home.

### Mobile adaptation rules (from `06-mobile-result`)

The verdict card, meter and fact pills stay above the fold. Actions stack below: "Show me where" full width, then "New check" and "Share" side by side at half width, each 54px tall. The details content follows on the same page rather than a separate route. The meter keeps all five segments and five labels (11px, may wrap to two lines). Moment rows lose their description text and show time range + "Strong signal"/"Some signal", with a 44px round play button. Model results and "Why" remain accordions.

---

## 6. Components

Build these as reusable components. Names are suggestions.

### 6.1 `Button`

Three variants, all pill-shaped (`--radius-pill`), Figtree 600.

| Variant | Look | Use |
|---|---|---|
| `primary` | Ink fill, white text | The one main action per view |
| `secondary` | Transparent, 1.5px ink border, ink text | Alternative actions |
| `text` | No border, underlined (offset 4px) | Low-emphasis actions such as "Cancel" |

Sizes: `md` 48px (15px text), `lg` 52px (16px text). Icons 18px, gap 8–10px. States: hover darkens the border/fill slightly and shifts text to `--verdict-authentic-fg` for secondary and text variants (matches the comps' link hover); pressed scales to 0.98; disabled at 40% opacity with `aria-disabled`. Focus uses `--focus-ring`. A button that navigates must be rendered as a link.

### 6.2 `RoundIconButton`

Circular, yellow (`--color-highlight`) fill with ink icon for the hero "Choose a file" (84px) and the audio play button (64px). Ink fill with white icon for the paste-field submit (48px). Always has an `aria-label`.

### 6.3 `DropZone` (the universal input, part 1)

White card, radius 32, 14px inner padding, `--shadow-card`. Inside: a 250px-tall area with a 2px dashed `--color-line-dashed` border and radius 22. Centred stack: round yellow add button, prompt "Drop your file here **or** browse" (the word "or" in 500 weight muted; "browse" is an underlined link that opens the file picker), and the type chips row.

Behaviour: the entire area accepts drag-and-drop and is keyboard reachable through the add button and the "browse" link, both of which open the native file picker. While a file is dragged over the page, the dashed border turns solid ink and the background shifts to `--color-highlight-soft`, with the prompt changing to "Let go to check it". Accept one file at a time. On drop, validate immediately (§9.3) before uploading.

### 6.4 `TypeChip` and `PlusBadge`

36px pill on `--color-bg`, 14px/600 label, 16px line icon. Free types (Photos, Audio) use ink; gated types (Video, Text, Links) use muted text and icon plus a `PlusBadge`: 11px/700, tracking 0.04em, ink background, yellow text, reading "PLUS". Chips are informational, not buttons. For screen readers, gated chips read "Video, requires Plus".

When the signed-in user has Plus, gated chips render like free chips and the badge is hidden.

### 6.5 `PasteField` (the universal input, part 2)

64px white pill directly below the drop card, 1.5px `--color-line` border (use `--color-line-strong` if it sits on white rather than on the sage background), placeholder "…or paste a link or some text", 17px text, and a 48px round ink submit button labelled "Check it". A visually hidden `<label>` is required.

Behaviour: if the pasted value is a URL, treat it as a social link; otherwise treat it as text. Pressing Enter submits. Multi-line paste should expand the field into a textarea of up to six lines with the submit button pinned bottom-right. Pasting a file from the clipboard behaves like a drop.

### 6.6 `ExampleLinks`

Line under the paste field: "No file handy? Try an example: a photo · a voice note". Each loads a bundled sample and runs a real scan (or a canned result if the backend is unavailable in development).

### 6.7 `StepStrip`

Three steps pinned near the bottom of the home page: "Drop it in", "Faike checks it", "You get a clear answer, and the why". Each has a 32px white circle with a 1.5px ink border and a Bricolage numeral, connected by thin arrows in `--color-subtle`. Numerals are justified here because the content is a genuine sequence. Hide the arrows and stack vertically on mobile.

### 6.8 `AnalysisCard`

White card, radius 32. Top row: 52px file-type tile (radius 16, sage fill, type icon), file name (18px/700), meta line "Audio · 0:48 · 1.1 MB", and a percentage (15px/700) on the right. Below: a 96px visual that depends on media type (§7.2). The progress sweep is a `--color-highlight-soft` band that grows from left to the current percentage, with a 3px ink playhead at its leading edge. For audio, bars left of the playhead are ink and bars to the right are `--color-line-dashed`.

The percentage and sweep must reflect **real** progress if RD exposes it. If RD offers only job status (queued / processing / done), show an indeterminate sweep that loops slowly and hide the percentage. Do not fake a percentage.

### 6.9 `StepPills`

A row of three 56px pills under the analysis card showing stage: done (white fill, check icon, "Got your file"), active (ink fill, white text, 10px yellow dot, e.g. "Checking the voice"), pending (transparent, 1.5px dashed border, muted text, "Writing your answer"). The middle label changes with media type: "Checking the photo", "Checking the voice", "Checking the picture and sound", "Reading the text". Wrap the row in `aria-live="polite"` so stage changes are announced.

### 6.10 `VerdictCard`

The hero of the result page. Full column width, radius 36, padding 44/48/40, background = verdict tint. Left: a status chip (34px white pill, verdict-coloured icon and text), the verdict headline (Bricolage 800, 58px), and a one- or two-sentence plain explanation (20px). Right: a 260px `FileSummaryCard`. Below, inside the card: the `SignalMeter`, then a row of `FactPill`s.

Status chip text per verdict: authentic "Looks good", suspicious "Worth a closer look", artificial "Be careful with this one". (Only "Worth a closer look" appears in the comps; the other two are proposed and should be confirmed.)

### 6.11 `SignalMeter`

Replaces any circular score ring. A white inner card (radius 24) titled "Where this lands", with a right-aligned caption "Signal strength: weak / moderate / strong". A five-column grid of pill segments labelled **Likely real · Leaning real · Unclear · Leaning AI · Likely AI**.

Idle segments are 22px tall in their soft colours (`--meter-real-strong`, `--meter-real-soft`, `--color-neutral-track`, a pale warm tone for "Leaning AI", `--meter-ai-soft`). The **active** segment grows to 36px, fills with the verdict's strong colour, gets a 3px ink ring, and carries a floating ink tag "This file" above it. Its label switches from muted to ink.

Accessibility: render as `role="img"` with an `aria-label` such as "Signal meter: this file lands on Leaning AI, the fourth of five positions from Likely real to Likely AI." The visual never stands alone; the verdict headline states the result in words.

Hidden entirely for Not applicable and Unable to analyse.

How the active segment is chosen is specified in §9.2 and is the most important logic rule in this handoff.

### 6.12 `FactPill`

40px white pill (34px on mobile), 15px/600. Optional 10px leading colour dot (only for the flagged-moments count, in `--signal-strong`). Content examples: "3 moments flagged", "English detected", "One speaker", "48 seconds". Show only facts that RD actually returned or that come from the file's own metadata. Never infer a fact.

### 6.13 `FileSummaryCard`

White card, radius 24, 18px padding. A small media preview (for audio, a 56px mini-waveform with flagged bars coloured; for images, a thumbnail; for video, a poster frame; for text, the first two lines; for links, platform + handle), then the file name (15px/700) and meta ("Audio · 0:48 · checked just now").

### 6.14 `ResultActions`

Row under the verdict card: primary "Show me where" (chevron-down icon, navigates to details), secondary "Check something else" (back to home, clearing the current scan from the input), secondary "Share result" (upload icon). On the right, `FeedbackButtons`.

"Share result" should use the Web Share API where available and fall back to copying a link. What exactly is shared (a public result page, an image card, a text summary) is an open product question (§13); implement it as a text summary plus the app URL until decided. Never share the user's file.

### 6.15 `FeedbackButtons`

Prompt "Does this seem right?" (14px/600 muted) followed by 44px outlined pills. Result page: "Yes" and "No" with thumb icons. Details page: "Yes", "No", "Not sure". After a choice, replace the buttons with "Thanks, that helps." and allow changing the answer. Selected state uses ink fill. Send the choice with the scan ID to the backend.

### 6.16 `EvidenceNote`

Always shown under a completed verdict: info icon + "AI detection gives you evidence, not proof. If it matters, check who sent it and ask them directly." 15px muted. On mobile, the shorter form "…If it matters, check who sent it."

### 6.17 `AudioEvidencePlayer` (details, audio)

White card, radius 28. Top row: 64px yellow play/pause button, file name, current time / duration ("**0:14** / 0:48"), legend on the right with 12px swatches "Strong signal" (`--signal-strong`) and "Some signal" (`--signal-some-legend`).

Below: a 120px waveform. Flagged regions are drawn as rounded background bands behind the bars (`--signal-strong-region` or `--signal-some-region`, radius 12), each with a 26px ink numbered badge at its top-left matching the moments list. Bars inside a strong region are `--signal-strong`, inside a some region `--signal-some`; elsewhere bars already played are ink and unplayed bars are `#A9B3AD`. A 3px ink playhead extends 6px beyond the waveform top and bottom. Time ruler below at 12px/600 muted.

Interaction: click or tap anywhere on the waveform to seek. The waveform is a slider for assistive technology (`role="slider"`, arrow keys seek ±5s, Home/End to start/end, `aria-valuetext` like "0:14 of 0:48, inside flagged moment 1"). Space toggles play when the player has focus. The waveform must be generated from the real audio (decoded peaks), not the decorative sine pattern used in the comps.

### 6.18 `MomentList`

Card titled "3 moments flagged" (Bricolage 24px/700). Each row (radius 20, `--color-surface-sunk`): 34px ink numbered badge, time range (17px/700), one-line description (14px muted), a strength tag ("Strong" on `--signal-strong-region`, "Some" on `--signal-some-region`, both `--verdict-suspicious-fg` text), and a 44px "Play" button that seeks to the moment start and plays just that range. Footer line: "The rest of the recording sounded like a real person to Faike." Only show that line when RD's segment data supports it.

Row descriptions must stay within what RD returns. Acceptable: "The voice here reads strongly as synthetic." / "Some signs, but weaker and less consistent." Not acceptable: invented causes ("unnatural breathing", "pitch artefacts") unless RD explicitly provides them.

### 6.19 `SuitabilityChecklist`

Card titled "Was the recording good enough?" with rows (check icon in `--verdict-authentic-fg` when passed, cross icon in `--verdict-artificial-fg` when failed): "Long enough", "One speaker", "Mostly speech, not music", "Clear enough to hear". Summary line: "Yes, this sample was suitable." (authentic-fg, 600) or the specific failure reason. Show only the checks RD actually reports; hide rows RD does not evaluate rather than showing them as passed. This component is also used inside the Not applicable state (§8).

### 6.20 `FileDetails`

Definition list in a white card: File, Type ("Audio · M4A · 1.1 MB"), Language ("English (detected)"), Checked ("24 Sep 2026, 14:32", localised). Social links add Source (platform + link). Labels 13px muted, values 15px/600.

### 6.21 `Accordion`

Stacked sections inside one white card, divided by 1px `--color-line`. Header button 64px min height, 17px/700 label, chevron on the right, `aria-expanded` and `aria-controls` wired. Two sections:

**"Why did Faike reach this result?"** Expanded by default. A plain-language paragraph (16px, line-height 1.6, max-width 860px) explaining how the verdict follows from the evidence, including uncertainty. Example from the comps: "Two short stretches sounded strongly synthetic, but most of the recording sounded like a real person. That mix is why Faike says 'suspicious' instead of 'likely AI'. A clip can be partly edited, or the detectors can react to things like heavy compression."

**"Model results"** with the inline caption "For the curious · N models". Collapsed by default. Contains a table: model (RD's name or a mapped friendly name), what it checks, its individual result, its score. Scores here must be labelled as model output scores, not probabilities. This is the only place technical vocabulary is allowed.

### 6.22 `StateCard`

The pattern for every non-happy-path state (see `05-states`). White card, radius 28, 24px padding. A 12px uppercase 700 label in muted (or verdict colour), a 27px Bricolage 800 title, one or two 15px paragraphs, an optional visual (progress track, checklist, source preview), and one obvious primary button with at most one secondary. When shown as a full page rather than a card sheet, centre it in the intake column.

### 6.23 `ProgressTrack`

12px pill track in `--color-neutral-track` with an ink fill. Used for upload progress. Accessible as `role="progressbar"` with `aria-valuenow`.

---

## 7. Screens and flow

### 7.1 Routes (suggested)

| Route | Screen |
|---|---|
| `/` | Home / universal input |
| `/check/:scanId` | Uploading → retrieving → analysing → result (one route, state-driven) |
| `/check/:scanId/details` | Result details (desktop). On mobile, details render on the result page below the actions |

Direct loads of `/check/:scanId` for a completed scan show the result immediately.

### 7.2 Home (`01-upload`)

Header, centred hero "Drop something in. / Find out how real it looks." (64px, two lines), intro "Photos, voice notes, videos, text or a link. Faike checks for signs of AI and tells you what it found, in plain words." (19px muted, max-width 640px), `DropZone`, `PasteField`, `ExampleLinks`, `StepStrip` at the bottom. The whole page should fit a 900px-tall desktop viewport without scrolling.

### 7.3 Analysing (`02-analyzing`)

Title and subtitle change by media type:

| Media | Title | Subtitle |
|---|---|---|
| Image | Looking closely… | Hang tight. Faike is checking whether this photo looks real. |
| Audio | Listening closely… | Hang tight. Faike is checking whether this voice sounds real. |
| Video | Watching closely… | Hang tight. Faike is checking the picture and the sound. |
| Text | Reading closely… | Hang tight. Faike is checking whether this reads like AI. |

(Only the audio row appears in the comps; the others follow the same pattern.)

The `AnalysisCard` visual per type: audio shows the waveform with sweep; image shows the photo at reduced size with the yellow sweep passing over it as a translucent band; video shows a filmstrip of poster frames with the sweep; text shows the first lines with the sweep as a highlight. Then `StepPills` and a text-button "Cancel". Cancel asks for no confirmation, stops the job if RD supports cancellation, and returns home with the file still loaded in the input.

### 7.4 Result (`03-result`)

`VerdictCard` → `ResultActions` → `EvidenceNote`. Verdict content per outcome:

| RD verdict | Headline | Card tint | Example explanation |
|---|---|---|---|
| `AUTHENTIC` | Likely authentic | authentic | Faike didn't find meaningful signs of AI in this photo. |
| `SUSPICIOUS` | Suspicious signals detected | suspicious | Parts of this voice note sound like they could be AI-generated. It's not a clear yes or no. |
| `FAKE` | Likely AI-generated or manipulated | artificial | Strong, consistent signs of AI across this image. |
| `NOT_APPLICABLE` | We need a clearer sample | neutral | → `StateCard`, see §8 |
| `UNABLE_TO_EVALUATE` | That didn't work this time | neutral | → `StateCard`, see §8 |

For authentic results add the caution "No detector can rule out every trick. If it matters, check the source too." For artificial results add "Before you share it, it's worth finding where it came from." The primary action on authentic is "See the details"; on suspicious and artificial it is "Show me where".

### 7.5 Result details

Shared frame for all media: back link "Back to result" (44px target), H1 (44px), verdict tag on the right (36px pill, verdict tint and foreground). Then a media-specific evidence card, a two-column row (main: moments/regions list; aside 340px: suitability or source card + `FileDetails`), the `Accordion`, and `FeedbackButtons` with "Not sure".

**Audio (designed, `04-result-details-audio`).** H1 "Where Faike heard it". `AudioEvidencePlayer`, `MomentList`, `SuitabilityChecklist`, `FileDetails`.

**Image (derived).** H1 "Where Faike saw it". Evidence card holds the image with a three-way segmented control "Original / Side by side / Heat map" (44px segments, ink fill for selected). Heat map mode overlays RD's localisation data in the suspicious palette (strong `--signal-strong`, some `--signal-some`) with an opacity slider labelled "Overlay strength". Where RD returns regions, draw rounded outlines with numbered ink badges matching a "N areas flagged" list in the main column (same row pattern as moments; "Show" button instead of "Play" zooms to the region). Legend copy must say the overlay shows **where** detectors reacted, not **why**. Aside: `FileDetails` including dimensions.

**Video (derived).** H1 "Where Faike noticed it". Video player with frame-accurate scrubbing, then a timeline with two separate lanes labelled "Picture" and "Sound", each showing flagged segments as rounded bands (strong/some colours) with numbered badges; scene cuts as small ticks above the lanes if RD provides them. Main column lists moments across both lanes, each tagged "Picture" or "Sound". Aside: a small card comparing picture vs sound results ("Picture: looks real · Sound: some signals"), then `FileDetails`. Show region boxes on the video frame only if RD returns spatial data for video (to verify).

**Text (derived).** H1 "What Faike noticed". The submitted text in a white card at reading width (max 70ch, 17px, line-height 1.6), with flagged spans marked using the highlighter style: strong spans on `--signal-strong-region` with a 2px `--signal-strong` underline, some spans on `--signal-some-region`. Each span is focusable and exposes its strength in an accessible label. Only build span highlighting if RD provides span-level output; otherwise show a document-level result with no highlights.

**Social link.** Same as the media type retrieved, plus a "Source" card in the aside with platform, handle and a link to the original post. Never re-host or redistribute the retrieved media publicly.

---

## 8. System states

All from `05-states` unless marked derived. Each is a `StateCard`.

| State | Label | Title | Body | Actions |
|---|---|---|---|---|
| Uploading | Uploading | Sending it over… | File tile + "7.8 of 12.4 MB", `ProgressTrack`, "We'll start checking the moment it lands." | Cancel (secondary) |
| Retrieving social | Getting a link | Grabbing the video from the link… | Preview placeholder + truncated URL + "Video post". "If the post is private or removed, we'll let you know and you can upload the file instead." | none |
| Retrieval failed (derived) | Getting a link | We couldn't open that link | "The post may be private, removed, or from a site Faike doesn't support yet. You can download it and upload the file instead." | Upload a file (primary), Try another link |
| Partial | Partly done | The picture's checked. Still listening to the sound. | Two rows: "Video · Looks real" / "Audio · Checking…". "Your final answer might change once the audio is done." | none |
| Authentic | Authentic | Likely authentic | See §7.4 | See the details |
| Artificial | Artificial | Likely AI-generated or manipulated | See §7.4 | Show me where |
| Not applicable | Not applicable | We need a clearer sample | "We couldn't confidently analyse this clip because {reason}." + `SuitabilityChecklist` showing the failed check + a fix hint | Try another clip |
| Unable to evaluate | Unable to evaluate | That didn't work this time | "Something went wrong on our side while checking your file. It's usually temporary." / "Your file is still here, so you can try again without re-uploading." | Try again (primary), Check a different file |
| Plus gate | Plus feature | Videos, text and links come with Faike Plus | "The free version checks photos and audio. You dropped a video, so this one needs Plus." + file name and length | See Plus (primary), Choose a photo or audio |
| Too large (derived) | File too big | That file is over the limit | "Audio files can be up to 20 MB. This one is 34 MB. Try a shorter clip." (values from §9.3) | Choose another file |
| Unsupported type (derived) | Can't check this | Faike can't check this kind of file | "Try a photo, audio, video or text file." | Choose another file |
| Offline (derived) | Connection | You're offline | "Faike needs a connection to check your file. We'll keep it here until you're back." | Try again |

**Not-applicable reasons.** Map RD's reason codes to human sentences, for example "multiple speakers were detected" with the fix "Try trimming it to a part where just one person is talking." The set of reason codes RD returns must be confirmed (§12); do not invent reasons. If RD returns no reason, use "there wasn't enough suitable material to analyse" with no checklist.

**Unable → Retry.** Keep the uploaded file server-side (or its reference) so retry does not require re-upload. After two failed retries, show the secondary "Check a different file" as the primary.

---

## 9. Data and logic

### 9.1 Normalised result model

Keep all RD-specific parsing in a single adapter module. The UI consumes only this shape. Field names below are Faike's own; map RD's response into them after confirming RD's actual response schema in its current documentation.

```ts
type MediaType = 'image' | 'audio' | 'video' | 'text';
type Verdict = 'authentic' | 'suspicious' | 'artificial' | 'not_applicable' | 'unable';
type Strength = 'strong' | 'some';

interface ScanResult {
  scanId: string;
  mediaType: MediaType;
  source: { kind: 'file' | 'link' | 'paste'; fileName?: string; url?: string; platform?: string };
  file: { sizeBytes?: number; format?: string; durationSec?: number; width?: number; height?: number };
  checkedAt: string;              // ISO 8601
  verdict: Verdict;
  ensembleScore?: number;         // 0..1, RD's overall score. Not a probability.
  language?: string;              // only if RD returns it
  notApplicableReason?: string;   // RD reason code, mapped to copy in the UI layer
  suitability?: { check: 'duration' | 'single_speaker' | 'speech' | 'clarity'; passed: boolean }[];
  segments?: { id: number; startSec: number; endSec: number; strength: Strength; lane?: 'picture' | 'sound' }[];
  regions?: { id: number; x: number; y: number; w: number; h: number; strength: Strength }[]; // normalised 0..1
  heatmapUrl?: string;
  textSpans?: { start: number; end: number; strength: Strength }[];
  partial?: { picture?: Verdict | 'pending'; sound?: Verdict | 'pending' };
  models: { name: string; friendlyName?: string; verdict?: Verdict; score?: number }[];
}
```

Only fields RD actually provides should be populated. Every UI element tied to an optional field must hide cleanly when the field is absent.

### 9.2 Signal meter position

The meter must **never contradict the verdict headline**. The verdict comes from RD; the meter only refines where within that verdict the file sits.

```
allowed segments by verdict
  authentic   → 0 (Likely real) or 1 (Leaning real)
  suspicious  → 1 (Leaning real), 2 (Unclear) or 3 (Leaning AI)
  artificial  → 3 (Leaning AI) or 4 (Likely AI)

segment = bandFor(ensembleScore)  // using configurable thresholds
segment = clamp(segment, allowed[verdict])
```

Thresholds live in configuration, not in component code. **RD's calibrated thresholds are not known at the time of writing**; until confirmed with RD, use evenly spaced placeholder bands (0–0.2, 0.2–0.4, 0.4–0.6, 0.6–0.8, 0.8–1.0) behind a clearly named config key and a code comment marking them as placeholders. If `ensembleScore` is missing, place the marker on the middle allowed segment for that verdict.

The caption "Signal strength: weak / moderate / strong" derives from the same score with its own configurable thresholds and is hidden if there is no score.

### 9.3 Input validation and gating

| Type | Max size | Other limit | Free tier |
|---|---|---|---|
| Image | 50 MB | — | Yes |
| Audio | 20 MB | — | Yes |
| Video | 250 MB | 30 minutes | Plus |
| Text | 900 KB | — | Plus |
| Social link | per retrieved media type | — | Plus |

Validate client-side before upload (size, type, and duration where the browser can read it) and again server-side. Accepted file formats per type must be taken from RD's documentation; do not hard-code a guessed extension list. Check the gate **before** uploading so free users never wait for an upload that will be refused.

### 9.4 State machine

```
idle
 ├─ file dropped/selected ─▶ validating ─┬─ invalid ─▶ error(too_large | unsupported)
 │                                        ├─ gated ───▶ plus_gate
 │                                        └─ ok ──────▶ uploading ─▶ analysing
 ├─ link submitted ─▶ validating ─▶ retrieving ─┬─ fail ─▶ retrieval_failed
 │                                               └─ ok ───▶ analysing
 └─ text submitted ─▶ validating ─▶ analysing

analysing ─┬─ partial update ─▶ analysing(partial)
           ├─ done ────────────▶ result(authentic | suspicious | artificial)
           ├─ not applicable ──▶ not_applicable
           ├─ error ───────────▶ unable ─(retry)─▶ analysing
           └─ cancel ──────────▶ idle (file retained in input)

offline at any network step ─▶ offline ─(retry)─▶ previous step
```

Poll or subscribe for job status according to RD's recommended pattern (to verify). Use exponential back-off for polling and stop when the tab is hidden for a long time, resuming on focus.

### 9.5 Security and privacy

Call RD only from the server; the RD API key must never reach the browser. Uploaded files and retrieved social media are private to the user; set a retention period and state it in the UI copy once product decides it. Do not log file contents. Feedback events store scan ID and answer only.

---

## 10. Motion

One orchestrated gesture: the highlighter.

**Wordmark swipe.** On the first home-page load of a session, the yellow band behind "ai" draws from left to right over 520ms (`--ease-out`). Implement with `background-size` from `0% 100%` to `100% 100%`.

**Progress sweep.** The analysing band grows with real progress, easing each update over 240ms. Indeterminate mode loops a 30%-wide band across the card over 1.6s.

**Meter settle.** When the result appears, idle segments fade in, then the active segment grows from 22px to 36px and the ring and "This file" tag appear, over 600ms total. No bounce; the scale should feel like it arrives, not celebrates.

**Moment highlight.** During audio playback, when the playhead enters a flagged region, the matching row in `MomentList` gets a 2px ink outline. No swipe per row; it would be too busy.

**Responsive motion only elsewhere.** Accordions expand over 240ms, buttons respond to press. No scroll-triggered entrances.

**Reduced motion.** Under `prefers-reduced-motion: reduce`, all of the above render in their end state immediately (the token file already zeroes durations), and the indeterminate loop is replaced by a static band with the text "Still checking…".

---

## 11. Accessibility checklist

- Text contrast meets WCAG 2.2 AA everywhere (measured values in §4). Decorative colours never carry text.
- Every verdict, strength and flagged region is communicated in words as well as colour.
- All interactive targets ≥ 44 × 44px; visible focus ring (`--focus-ring`) on every focusable element; logical tab order that follows the visual order.
- The drop zone is fully operable without drag-and-drop.
- Live regions: stage changes (`polite`), upload progress milestones at 25/50/75/100% (`polite`), result arrival moves focus to the verdict headline.
- Waveform is an accessible slider; each flagged moment is reachable and playable by keyboard; image regions and text spans are focusable with descriptive labels.
- Accordion headers are real buttons with `aria-expanded`.
- Language of the page is set; detected language of the content is shown as text, not only as a flag.
- Test with VoiceOver (Safari, iOS) and NVDA (Firefox or Chrome) before sign-off.

---

## 12. Must be verified against Reality Defender's current documentation

These are assumptions in the design. Confirm each before wiring the adapter, and do not guess field names or endpoints.

1. Response schema: field names for the overall verdict, ensemble score and per-model results.
2. Whether RD publishes calibrated score thresholds that should drive the five meter bands (§9.2).
3. Which social platforms RD (or Faike's own retrieval) supports for links.
4. The full list of NOT_APPLICABLE reason codes, for example whether "multiple speakers" and "mostly music" exist.
5. Whether audio results include time segments, and at what resolution.
6. Whether video results include spatial regions, or time segments only; whether picture and sound are reported separately.
7. Whether image results include a heat map, bounding regions, or both.
8. Whether text results include span-level explainability.
9. Whether language detection is returned, and for which media.
10. Accepted file formats per media type, and whether the size and duration limits in §9.3 are still current.
11. Whether analysis jobs expose progress percentages and support cancellation, and the recommended polling or webhook pattern.
12. Model names that can be shown to end users, and whether RD permits displaying them.

---

## 13. Open product questions

1. What does "Share result" share: a public result page, an image card, or text?
2. Retention period for uploaded files and results.
3. Where do signed-out users' scans go in History, if anywhere?
4. Final status-chip copy for authentic and artificial verdicts (§6.10).
5. Is Plus a subscription, credits, or both? This changes the gate copy.
6. Should feedback "No" open a short follow-up ("What did you expect?")?

---

## 14. Acceptance criteria

- [ ] Home, analysing, result and audio details match the reference comps at 1440px within reasonable tolerance (type, colour, radius, spacing from tokens).
- [ ] Layouts adapt fluidly from 1440px down to 360px; mobile result matches `06-mobile-result`.
- [ ] One universal input handles drag-drop, file picker, pasted link, pasted text and pasted clipboard file.
- [ ] Size, type, duration and free-tier checks run before upload; gated types show the Plus state without uploading.
- [ ] All twelve states in §8 are reachable and render correctly (use a mock adapter with fixtures for each).
- [ ] Signal meter never contradicts the verdict; thresholds are in config and marked as placeholders until confirmed.
- [ ] No UI element shows data RD did not return; optional sections hide cleanly.
- [ ] "Evidence, not proof" note appears on every completed verdict.
- [ ] Model results are collapsed by default and are the only place technical terms appear.
- [ ] RD API key is server-side only.
- [ ] Keyboard-only and screen-reader walkthrough of the full audio flow passes.
- [ ] Reduced-motion mode shows end states without animation.
- [ ] A fixtures file exercises every verdict for every media type so design can review the derived image, video and text views.
