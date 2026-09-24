import { MEDIA } from "@/config/media";
import { countWords, formatBytes, formatDuration, formatDurationWords, formatRelative, languageName, plural } from "@/lib/format";
import { displayUrl } from "./input";
import type { InputSummary } from "./job";
import type { ScanResult } from "./types";

/*
 * Fact pills (HANDOFF §6.12) and meta lines. Only facts that RD returned or
 * that come from the file's own metadata. Never inferred.
 */

export interface Fact {
  label: string;
  /** Shorter form for mobile (06-mobile-result: "English", "0:48"). */
  short?: string;
  /** Leading dot, only for the flagged count. */
  flagged?: boolean;
}

export function flaggedCount(result: ScanResult): { count: number; noun: string } | null {
  if (result.mediaType === "image") {
    return result.regions ? { count: result.regions.length, noun: "area" } : null;
  }
  if (result.mediaType === "text") {
    return result.textSpans ? { count: result.textSpans.length, noun: "passage" } : null;
  }
  return result.segments ? { count: result.segments.length, noun: "moment" } : null;
}

export function flaggedHeading(result: ScanResult): string | null {
  const flagged = flaggedCount(result);
  if (!flagged) return null;
  if (flagged.count === 0) return `No ${flagged.noun}s flagged`;
  return `${flagged.count} ${plural(flagged.count, flagged.noun)} flagged`;
}

export function buildFacts(result: ScanResult, input?: InputSummary): Fact[] {
  const facts: Fact[] = [];
  const flagged = flaggedCount(result);
  if (flagged && flagged.count > 0) {
    facts.push({ label: `${flagged.count} ${plural(flagged.count, flagged.noun)} flagged`, flagged: true });
  }
  if (result.language) {
    const name = languageName(result.language);
    facts.push({ label: `${name} detected`, short: name });
  }
  if (result.suitability?.some((s) => s.check === "single_speaker" && s.passed)) {
    facts.push({ label: "One speaker" });
  }
  const { durationSec, width, height } = result.file;
  if ((result.mediaType === "audio" || result.mediaType === "video") && durationSec !== undefined) {
    facts.push({ label: formatDurationWords(durationSec), short: formatDuration(durationSec) });
  }
  if (result.mediaType === "image" && width && height) {
    facts.push({ label: `${width} × ${height}` });
  }
  if (result.mediaType === "text" && input?.text) {
    const words = countWords(input.text);
    facts.push({ label: `${words.toLocaleString("en")} ${plural(words, "word")}` });
  }
  return facts;
}

/** "Audio · 0:48 · 1.1 MB" (analysing card, selected file). */
export function inputMeta(input: InputSummary): string {
  const parts: string[] = [];
  if (input.mediaType) parts.push(MEDIA[input.mediaType].typeLabel);
  if (input.durationSec !== undefined) parts.push(formatDuration(input.durationSec));
  if (input.mediaType === "text" && input.text) {
    const words = countWords(input.text);
    parts.push(`${words.toLocaleString("en")} ${plural(words, "word")}`);
  }
  if (input.sizeBytes !== undefined && input.kind === "file") parts.push(formatBytes(input.sizeBytes));
  if (input.kind === "link" && input.platformName) parts.push(input.platformName);
  return parts.join(" · ");
}

/** "Audio · 0:48 · checked just now" (file summary card). */
export function resultMeta(result: ScanResult, now?: number): string {
  const parts: string[] = [MEDIA[result.mediaType].typeLabel];
  if (result.file.durationSec !== undefined) parts.push(formatDuration(result.file.durationSec));
  else if (result.mediaType === "image" && result.file.width && result.file.height) {
    parts.push(`${result.file.width} × ${result.file.height}`);
  }
  parts.push(`checked ${formatRelative(result.checkedAt, now)}`);
  return parts.join(" · ");
}

/** Display name of what was checked. */
export function subjectName(result: Pick<ScanResult, "source">, input?: InputSummary): string {
  const { source } = result;
  if (source.kind === "paste") return "Pasted text";
  if (source.kind === "link") return source.handle ? `${source.platform ?? "Post"} · ${source.handle}` : (source.platform ?? "Linked post");
  return source.fileName ?? input?.fileName ?? "Your file";
}

/** Display name of the input while it is being checked. */
export function inputName(input: InputSummary): string {
  if (input.kind === "paste") return "Pasted text";
  if (input.kind === "link") {
    if (input.platformName && input.handle) return `${input.platformName} · ${input.handle}`;
    return input.url ? displayUrl(input.url) : "Linked post";
  }
  return input.fileName ?? "Your file";
}
