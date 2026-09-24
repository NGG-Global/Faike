/*
 * Runtime checks for values of unknown shape (request bodies, upstream
 * responses). Each helper returns undefined instead of throwing, so a
 * missing, null or wrongly typed field reads as absent.
 */

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** A non-empty string after trimming, or undefined. */
export function optString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

export function optNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function optBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}
