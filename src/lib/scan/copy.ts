import { CAPABILITIES, enabledMediaTypes, type Capabilities } from "@/config/capabilities";
import { formatList, MEDIA } from "@/config/media";
import { SOCIAL_PLATFORMS } from "@/config/platforms";
import { capitalise, formatBytes, formatDuration, numberWord, plural } from "@/lib/format";
import type { ValidationIssue } from "./input";
import type { InputSummary } from "./job";
import type { Lane, MediaType, ScanResult, Strength, SuitabilityCheck, Verdict } from "./types";

/*
 * User-facing copy for scan results. Handoff copy is used verbatim where it
 * exists (HANDOFF §6–§8); lines marked "derived" follow the same pattern for
 * cases the handoff does not spell out. Nothing here may state a cause or
 * fact that the result data does not support.
 */

/** Product wording per verdict (product brief, 24 Sep 2026). */
export const VERDICT_HEADLINE: Record<Verdict, string> = {
  authentic: "Likely authentic",
  suspicious: "Suspicious signals detected",
  artificial: "Likely AI-generated or manipulated",
  not_applicable: "Not enough suitable information",
  unable: "Unable to analyze",
};

/** Small uppercase label on state cards and short verdict names. */
export const VERDICT_LABEL: Record<Verdict, string> = {
  authentic: "Authentic",
  suspicious: "Suspicious",
  artificial: "Artificial",
  not_applicable: "Not applicable",
  unable: "Unable to evaluate",
};

/** HANDOFF §6.10. Authentic and artificial are proposed copy, to be confirmed (§13.4). */
export const STATUS_CHIP: Record<"authentic" | "suspicious" | "artificial", string> = {
  authentic: "Looks good",
  suspicious: "Worth a closer look",
  artificial: "Be careful with this one",
};

/** HANDOFF §7.4 cautions. */
export const VERDICT_CAUTION: Partial<Record<Verdict, string>> = {
  authentic: "No detector can rule out every trick. If it matters, check the source too.",
  artificial: "Before you share it, it's worth finding where it came from.",
};

export function primaryActionLabel(verdict: Verdict): string {
  return verdict === "authentic" ? "See the details" : "Show me where";
}

/** HANDOFF §6.16. */
export const EVIDENCE_NOTE = {
  full: "AI detection gives you evidence, not proof. If it matters, check who sent it and ask them directly.",
  short: "AI detection gives you evidence, not proof. If it matters, check who sent it.",
};

/**
 * One- or two-sentence explanation under the verdict headline (HANDOFF §7.4).
 * `more` is the optional second sentence, dropped on mobile as in 06-mobile-result.
 */
export function verdictExplanation(result: Pick<ScanResult, "verdict" | "mediaType">): {
  lead: string;
  more?: string;
} {
  const noun = MEDIA[result.mediaType].noun;
  switch (result.verdict) {
    case "authentic":
      return { lead: `Faike didn't find meaningful signs of AI in this ${noun}.` };
    case "suspicious": {
      const verb: Record<MediaType, string> = {
        image: "look like they",
        audio: "sound like they",
        video: "look or sound like they",
        text: "read like they",
      };
      return {
        lead: `Parts of this ${noun} ${verb[result.mediaType]} could be AI-generated.`,
        more: "It's not a clear yes or no.",
      };
    }
    case "artificial":
      return { lead: `Strong, consistent signs of AI across this ${result.mediaType === "image" ? "image" : noun}.` };
    default:
      return { lead: "" };
  }
}

/** HANDOFF §7.3 analysing titles and §6.9 step labels. */
export const ANALYSING_COPY: Record<MediaType, { title: string; subtitle: string; checking: string }> = {
  image: {
    title: "Looking closely…",
    subtitle: "Hang tight. Faike is checking whether this photo looks real.",
    checking: "Checking the photo",
  },
  audio: {
    title: "Listening closely…",
    subtitle: "Hang tight. Faike is checking whether this voice sounds real.",
    checking: "Checking the voice",
  },
  video: {
    title: "Watching closely…",
    subtitle: "Hang tight. Faike is checking the picture and the sound.",
    checking: "Checking the picture and sound",
  },
  text: {
    title: "Reading closely…",
    subtitle: "Hang tight. Faike is checking whether this reads like AI.",
    checking: "Reading the text",
  },
};

/** First step pill. "Got your file" is the handoff's; the others are derived. */
export function receivedLabel(kind: "file" | "link" | "paste"): string {
  return kind === "link" ? "Got the post" : kind === "paste" ? "Got your text" : "Got your file";
}

export const STRENGTH_TAG: Record<Strength, string> = { strong: "Strong", some: "Some" };
export const STRENGTH_PHRASE: Record<Strength, string> = { strong: "Strong signal", some: "Some signal" };

export const LANE_LABEL: Record<Lane, string> = { picture: "Picture", sound: "Sound" };

/** Lane result words for video (HANDOFF §7.5 "Picture: looks real · Sound: some signals"). */
export function laneVerdictLabel(value: Verdict | "pending"): string {
  const labels: Record<Verdict | "pending", string> = {
    authentic: "Looks real",
    suspicious: "Some signals",
    artificial: "Strong signals",
    not_applicable: "Not enough to go on",
    unable: "Couldn't check",
    pending: "Checking…",
  };
  return labels[value];
}

/**
 * Row descriptions stay within what the data says (HANDOFF §6.18). The audio
 * lines are the handoff's; the others are derived from them.
 */
export function flaggedDescription(mediaType: MediaType, strength: Strength, lane?: Lane): string {
  const weak = "Some signs, but weaker and less consistent.";
  if (mediaType === "audio") return strength === "strong" ? "The voice here reads strongly as synthetic." : weak;
  if (mediaType === "video") {
    const subject = lane === "sound" ? "sound" : "picture";
    return strength === "strong"
      ? `The ${subject} here reads strongly as synthetic.`
      : `Some signs in the ${subject}, but weaker and less consistent.`;
  }
  if (mediaType === "image") return strength === "strong" ? "This area reads strongly as synthetic." : weak;
  return strength === "strong" ? "This passage reads strongly like AI." : weak;
}

/** HANDOFF §6.19 row labels; `compact` is the shorter form used in 05-states. */
export function suitabilityLabel(check: SuitabilityCheck, compact = false): string {
  const labels: Record<SuitabilityCheck, string> = {
    duration: "Long enough",
    single_speaker: "One speaker",
    speech: compact ? "Mostly speech" : "Mostly speech, not music",
    clarity: "Clear enough to hear",
  };
  return labels[check];
}

/** Summary line when a check failed (derived). */
export function suitabilityFailure(check: SuitabilityCheck): string {
  const lines: Record<SuitabilityCheck, string> = {
    duration: "The recording was too short to check.",
    single_speaker: "More than one person was speaking.",
    speech: "It was mostly music rather than speech.",
    clarity: "It was too hard to hear clearly.",
  };
  return lines[check];
}

/**
 * Not-applicable reason codes → copy (HANDOFF §8). The codes are the ones
 * RD documents in Media Detail (checked 24 Sep 2026): images `relevance`;
 * audio `duration`, `detected`, `cross-talk`, `quality`, `language`; video
 * reports none. Sentences are derived from RD's own messages; "cross-talk"
 * uses the handoff's example wording. Unknown codes fall back to the
 * generic sentence.
 */
const NOT_APPLICABLE_REASONS: Record<string, { reason: string; fix?: string }> = {
  relevance: {
    reason: "we couldn't find a clear face in it",
    fix: "Try a photo where a face is clearly visible.",
  },
  duration: {
    reason: "the recording is too short",
    fix: "Try a longer clip.",
  },
  detected: {
    reason: "it sounds like a dial tone or music rather than speech",
    fix: "Try a clip where someone is speaking.",
  },
  "cross-talk": {
    reason: "multiple speakers were detected",
    fix: "Try trimming it to a part where just one person is talking.",
  },
  quality: {
    reason: "there's too much background noise",
    fix: "Try a clearer recording.",
  },
  language: {
    reason: "the speech seems to be in a language Faike can't check yet",
  },
};

export function notApplicableCopy(code?: string): { reason: string; fix?: string; known: boolean } {
  const entry = code && Object.hasOwn(NOT_APPLICABLE_REASONS, code) ? NOT_APPLICABLE_REASONS[code] : undefined;
  return entry
    ? { ...entry, known: true }
    : { reason: "there wasn't enough suitable material to analyze", known: false };
}

/**
 * "Why did Faike reach this result?" (HANDOFF §6.21). Explains how the
 * verdict follows from the evidence, including uncertainty, using only the
 * data in the result.
 */
export function whyText(result: ScanResult): string {
  const noun = MEDIA[result.mediaType].noun;
  const segments = result.segments ?? [];
  const strong = segments.filter((s) => s.strength === "strong").length;
  const mix = 'That mix is why Faike says "suspicious" instead of "likely AI".';

  switch (result.verdict) {
    case "authentic":
      return `Faike's checks didn't pick up meaningful signs of AI in this ${noun}. That makes it less likely to be generated or edited, but it can't rule out every trick, especially newer ones. If it matters, check where it came from.`;

    case "artificial":
      return `The signals pointed strongly and consistently towards AI across this ${noun}. That's strong evidence, not proof. If it matters, find out where it came from before you share it.`;

    case "suspicious": {
      if (result.mediaType === "audio" && strong > 0 && result.unflaggedAssessedAuthentic) {
        return `${capitalise(numberWord(strong))} short ${plural(strong, "stretch", "stretches")} sounded strongly synthetic, but most of the recording sounded like a real person. ${mix} A clip can be partly edited, or the detectors can react to things like heavy compression.`;
      }
      const picture = result.partial?.picture;
      const sound = result.partial?.sound;
      if (result.mediaType === "video" && picture && sound && picture !== "pending" && sound !== "pending") {
        const joiner = picture === sound ? "and" : "but";
        return `The picture ${laneSentence(picture)}, ${joiner} the sound ${laneSentence(sound)}. ${mix} A video can be partly edited, or the detectors can react to things like heavy compression.`;
      }
      const regions = result.regions?.length ?? 0;
      if (result.mediaType === "image" && regions > 0) {
        return `Faike found ${numberWord(regions)} ${plural(regions, "area")} that looked like they could be generated, but the signals weren't strong or consistent enough across the whole photo to say "likely AI". A photo can be partly edited, or the detectors can react to things like filters and heavy compression.`;
      }
      const spans = result.textSpans?.length ?? 0;
      if (result.mediaType === "text" && spans > 0) {
        return `${capitalise(numberWord(spans))} ${plural(spans, "passage")} read like AI-written text, but the signals weren't consistent across the whole text. ${mix} Text can be partly edited, or written with help from a tool.`;
      }
      return `Some signals pointed towards AI and others didn't, so Faike can't give a clear answer either way. Content can be partly edited, and things like heavy compression can also affect the result.`;
    }

    default:
      return "";
  }
}

function laneSentence(verdict: Verdict): string {
  switch (verdict) {
    case "authentic":
      return "looked real to Faike";
    case "suspicious":
      return "showed some signs of AI";
    case "artificial":
      return "showed strong signs of AI";
    default:
      return "couldn't be checked";
  }
}

/* Intake: validation messages and the paste prompt. */

/** "Images can be up to 50 MB." (the handoff's "Audio files can be up to 20 MB."). */
const SIZE_SUBJECT: Record<MediaType, string> = { image: "Images", audio: "Audio files", video: "Videos", text: "Text" };
const SIZE_TIP: Record<MediaType, string> = {
  image: "Try a smaller image.",
  audio: "Try a shorter clip.",
  video: "Try a shorter clip.",
  text: "Try a shorter piece.",
};

function joinList(items: string[], conjunction: "and" | "or"): string {
  return items.length > 1 ? `${items.slice(0, -1).join(", ")} ${conjunction} ${items.at(-1)}` : (items[0] ?? "");
}

function withArticle(phrase: string): string {
  return `${/^[aeiou]/i.test(phrase) ? "an" : "a"} ${phrase}`;
}

/** Title, label and sentence for a validation issue other than the Plus gate (HANDOFF §8, derived states). */
export function issueCopy(
  issue: Exclude<ValidationIssue, { kind: "gated" }>,
  summary?: InputSummary,
  capabilities: Capabilities = CAPABILITIES,
): { label: string; title: string; body: string } {
  const enabled = enabledMediaTypes(capabilities);
  switch (issue.kind) {
    case "too_large": {
      const pasted = summary?.kind === "paste";
      const verb = issue.mediaType === "text" ? "This is" : "This one is";
      return {
        label: "File too big",
        title: pasted ? "That text is over the limit" : "That file is over the limit",
        body: `${SIZE_SUBJECT[issue.mediaType]} can be up to ${formatBytes(issue.limitBytes)}. ${verb} ${formatBytes(issue.sizeBytes)}. ${SIZE_TIP[issue.mediaType]}`,
      };
    }
    case "too_long":
      return {
        label: "File too long",
        title: "That video is over the limit",
        body: `Videos can be up to ${Math.round(issue.limitSec / 60)} minutes. This one is ${formatDuration(issue.durationSec)} long. Try a shorter clip.`,
      };
    case "unsupported":
      if (issue.subject === "link") {
        return {
          label: "Can't check this",
          title: "Faike can't check links from this site",
          body: `Faike checks links from ${joinList(SOCIAL_PLATFORMS.map((platform) => platform.name), "and")}.`,
        };
      }
      if (issue.subject) {
        return {
          label: "Can't check this",
          title: `Faike can't check this type of ${MEDIA[issue.subject].typeLabel.toLowerCase()}`,
          body: `${SIZE_SUBJECT[issue.subject]} can be ${formatList(issue.subject)} files.`,
        };
      }
      return {
        label: "Can't check this",
        title: "Faike can't check this kind of file",
        body: enabled.length
          ? `Try ${withArticle(joinList(enabled.map((type) => MEDIA[type].typeLabel.toLowerCase()), "or"))} file.`
          : "Faike can't check files at the moment.",
      };
    case "unavailable": {
      const what = issue.subject === "social" ? "Link" : MEDIA[issue.subject].typeLabel;
      const others = enabled.filter((type) => type !== issue.subject).map((type) => MEDIA[type].chipLabel.toLowerCase());
      const body =
        issue.subject === "social" && enabled.length
          ? "You can download the post and upload the file instead."
          : others.length
            ? `Faike can check ${joinList(others, "and")} at the moment.`
            : "Try again later.";
      return { label: "Not available", title: `${what} checks aren't available right now`, body };
    }
  }
}

/** The paste field follows what can be pasted (HANDOFF §6.5); null when nothing can. */
export function pastePrompt(capabilities: Capabilities = CAPABILITIES): { placeholder: string; label: string } | null {
  if (capabilities.social && capabilities.text) {
    return { placeholder: "…or paste a link or some text", label: "Paste a link or some text" };
  }
  if (capabilities.social) return { placeholder: "…or paste a link", label: "Paste a link" };
  if (capabilities.text) return { placeholder: "…or paste some text", label: "Paste some text" };
  return null;
}

/**
 * Home intro (01-upload). The handoff's sentence when everything is on;
 * otherwise the same sentence listing only the kinds that are switched on.
 */
export function homeIntro(capabilities: Capabilities = CAPABILITIES): string {
  const kinds: string[] = [];
  if (capabilities.image) kinds.push("photos");
  if (capabilities.audio) kinds.push("voice notes");
  if (capabilities.video) kinds.push("videos");
  if (capabilities.text) kinds.push("text");
  if (capabilities.social) kinds.push("a link");
  const list = capitalise(joinList(kinds, "or"));
  return `${list ? `${list}. ` : ""}Faike checks for signs of AI and tells you what it found, in plain words.`;
}

/** Photo details: the heat map caption (HANDOFF §7.5: where, not why) and its notes. */
export const HEATMAP_COPY = {
  caption: "The heat map shows where signs of AI were picked up, not why. Deeper orange means a stronger reaction in that spot.",
  none: "Faike didn't get a heat map for this photo, so no particular area is marked.",
  pending: "Some checks are still finishing. A heat map may appear here shortly.",
  failed: "The heat map couldn't be loaded right now. The result is unchanged.",
  empty: "This heat map doesn't mark any particular area.",
} as const;
