/*
 * Reality Defender values that RD may change. Read only by the server-side
 * RD module (src/lib/rd); nothing here is secret.
 */

/**
 * RD returns detected languages as lower-case English names. Its Media
 * Detail documentation names English, Spanish and Portuguese as examples,
 * not a complete list. Names not listed here are dropped rather than
 * guessed, so the language line hides.
 */
export const RD_LANGUAGE_CODES: Readonly<Record<string, string>> = {
  english: "en",
  spanish: "es",
  portuguese: "pt",
};

/**
 * RD documents that heat maps are usable only for non-ensemble image models
 * with a FAKE status, and that entries for ensemble models are invalid. The
 * response has no field that marks a model as the ensemble, so RD's own
 * TypeScript SDK (v0.1.19) recognises it by "ensemble" in the model name.
 * This is a pattern, not a model name; revisit if RD adds such a field.
 */
export const RD_ENSEMBLE_MODEL_PATTERN = /ensemble/i;
