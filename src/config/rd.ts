/*
 * Reality Defender values that RD may change. Nothing here is secret: the
 * language names and ensemble pattern are read by the server-side RD module
 * (src/lib/rd), the model-name switch by the "Model results" section.
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

/**
 * Whether "Model results" and the heat-map picker show the detector names
 * RD returns (always read from the response, never hard-coded). On by the
 * product owner's instruction of 25 Sep 2026. RD has not confirmed that
 * end users may see them (HANDOFF §12.12); set false to show "Model 1",
 * "Model 2"… instead.
 */
export const RD_MODEL_NAMES_PUBLIC = true;
