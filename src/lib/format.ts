/*
 * Display formatting. Sizes use decimal units (1 MB = 1,000,000 bytes), to
 * match the limits in HANDOFF §9.3 and how most operating systems report
 * file sizes.
 */

function trimDecimal(value: number, decimals: number): string {
  return value.toFixed(decimals).replace(/\.0+$/, "");
}

/** "900 KB", "1.1 MB", "12.4 MB", "250 MB". */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  if (bytes < 1_000) return `${Math.round(bytes)} bytes`;
  if (bytes < 1_000_000) {
    const kb = bytes / 1_000;
    return `${trimDecimal(kb, kb < 100 ? 1 : 0)} KB`;
  }
  if (bytes < 1_000_000_000) {
    const mb = bytes / 1_000_000;
    return `${trimDecimal(mb, mb < 100 ? 1 : 0)} MB`;
  }
  return `${trimDecimal(bytes / 1_000_000_000, 1)} GB`;
}

/** "7.8 of 12.4 MB": both values in the total's unit. */
export function formatUploadProgress(loaded: number, total: number): string {
  const [value, unit] = total >= 1_000_000 ? [1_000_000, "MB"] : [1_000, "KB"];
  return `${trimDecimal(loaded / value, 1)} of ${trimDecimal(total / value, 1)} ${unit}`;
}

/** "0:48", "1:12", "1:02:03". */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

/** "48 seconds" under a minute, otherwise "1:12". */
export function formatDurationWords(seconds: number): string {
  const total = Math.round(seconds);
  if (total < 60) return `${total} ${total === 1 ? "second" : "seconds"}`;
  return formatDuration(seconds);
}

/** "24 Sep 2026, 14:32", in the viewer's locale. */
export function formatDateTime(iso: string, locale?: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** "just now", "5 minutes ago", "yesterday". */
export function formatRelative(iso: string, now: number = Date.now()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const seconds = Math.round((then - now) / 1000);
  if (Math.abs(seconds) < 60) return "just now";
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return rtf.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return rtf.format(hours, "hour");
  return rtf.format(Math.round(hours / 24), "day");
}

/** English name for a BCP 47 code ("en" → "English"); the code if unknown. */
export function languageName(code: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** Model output scores are shown to two decimals. */
export function formatScore(score: number): string {
  return score.toFixed(2);
}

const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

/** "two" for small counts, digits otherwise. */
export function numberWord(n: number): string {
  return NUMBER_WORDS[n] ?? String(n);
}

export function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function plural(n: number, singular: string, pluralForm = `${singular}s`): string {
  return n === 1 ? singular : pluralForm;
}

/**
 * Short format label for display ("M4A", "JPEG"): the file extension when
 * there is one, otherwise the MIME subtype. Display only; never validation.
 */
export function formatLabel(fileName?: string, mime?: string): string | undefined {
  const ext = fileName?.match(/\.([a-z0-9]{1,5})$/i)?.[1];
  if (ext) return ext.toUpperCase();
  const subtype = mime?.split("/")[1]?.replace(/^x-/, "").split(/[;+]/)[0];
  return subtype ? subtype.toUpperCase() : undefined;
}

export function countWords(text: string): number {
  const words = text.trim().match(/\S+/g);
  return words ? words.length : 0;
}
