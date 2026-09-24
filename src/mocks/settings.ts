import { useSyncExternalStore } from "react";
import type { RdVerdict } from "@/lib/rd/verdict";
import type { FlowStep } from "@/lib/scan/job";
import type { Plan } from "@/lib/plan";

/*
 * MOCK settings for reviewing the interface without Reality Defender.
 * Set from the /mock review page and kept for the browser session.
 *
 * - plan: "plus" by default so every input type can be tried; "free" shows
 *   the Plus badges and gate from the handoff.
 * - progress: whether the mock reports percentages or status only
 *   (HANDOFF §6.8 shows both behaviours).
 * - next scenario: the outcome, and optionally a step to hold on, for the
 *   next check only.
 */

export type MockOutcome = RdVerdict | "NETWORK_ERROR" | "OFFLINE" | "RETRIEVAL_FAILED";

export interface MockScenario {
  outcome?: MockOutcome;
  hold?: FlowStep;
}

interface MockSettings {
  plan: Plan;
  progress: "determinate" | "indeterminate";
}

const STORAGE_KEY = "faike:mock-settings:v1";
const DEFAULTS: MockSettings = { plan: "plus", progress: "determinate" };

let settings: MockSettings = DEFAULTS;
let loaded = false;
let nextScenario: MockScenario | null = null;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (raw) settings = { ...DEFAULTS, ...(JSON.parse(raw) as Partial<MockSettings>) };
  } catch {
    // Keep defaults.
  }
}

export function getMockSettings(): MockSettings {
  load();
  return settings;
}

export function setMockSettings(next: Partial<MockSettings>) {
  settings = { ...getMockSettings(), ...next };
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Session only.
  }
  listeners.forEach((listener) => listener());
}

export function setNextScenario(scenario: MockScenario | null) {
  nextScenario = scenario;
}

export function consumeNextScenario(): MockScenario | null {
  const scenario = nextScenario;
  nextScenario = null;
  return scenario;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The viewer's plan (mock until accounts exist). */
export function usePlan(): Plan {
  return useSyncExternalStore(subscribe, () => getMockSettings().plan, () => DEFAULTS.plan);
}
