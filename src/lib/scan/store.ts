import { useSyncExternalStore } from "react";
import type { Draft, ScanJob } from "./job";

/*
 * Client-side store for checks in this tab. The scan service (mock today,
 * Route Handler client later) writes to it; screens read from it.
 *
 * Finished checks are kept in sessionStorage so a reload or direct load of
 * /check/:id shows the result (HANDOFF §7.1). Files, object URLs and
 * in-progress checks are never persisted.
 */

const STORAGE_KEY = "faike:checks:v1";

interface State {
  jobs: Readonly<Record<string, ScanJob>>;
  /** Input restored on the home page after Cancel or a failed link. */
  draft: Draft | null;
  /** Control the home page should focus when it next mounts. */
  intakeFocus: "file" | "paste" | null;
}

let state: State = { jobs: {}, draft: null, intakeFocus: null };
let hydrated = false;
const listeners = new Set<() => void>();

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed: unknown = JSON.parse(raw);
    const stored = (parsed as { jobs?: Record<string, ScanJob> } | null)?.jobs ?? {};
    const jobs: Record<string, ScanJob> = {};
    for (const [id, job] of Object.entries(stored)) {
      if (job?.stage?.name === "done" && job.stage.result) jobs[id] = { ...job, live: false };
    }
    state = { ...state, jobs };
  } catch {
    // Storage unavailable or unreadable: start empty.
  }
}

function persist() {
  try {
    const jobs: Record<string, ScanJob> = {};
    for (const [id, job] of Object.entries(state.jobs)) {
      if (job.stage.name !== "done") continue;
      jobs[id] = { ...job, media: job.media?.persistent ? job.media : undefined };
    }
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ jobs }));
  } catch {
    // Quota exceeded or storage blocked: results stay in memory only.
  }
}

function set(next: Partial<State>, { save = false } = {}) {
  hydrate();
  state = { ...state, ...next };
  if (save) persist();
  listeners.forEach((listener) => listener());
}

export const scanStore = {
  getState(): State {
    hydrate();
    return state;
  },

  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getJob(id: string): ScanJob | undefined {
    return scanStore.getState().jobs[id];
  },

  putJob(job: ScanJob) {
    set({ jobs: { ...state.jobs, [job.id]: job } }, { save: job.stage.name === "done" });
  },

  updateJob(id: string, update: (job: ScanJob) => ScanJob) {
    const job = scanStore.getJob(id);
    if (job) scanStore.putJob(update(job));
  },

  removeJob(id: string) {
    const jobs = { ...scanStore.getState().jobs };
    delete jobs[id];
    set({ jobs }, { save: true });
  },

  setDraft(draft: Draft | null) {
    set({ draft });
  },

  setIntakeFocus(intakeFocus: State["intakeFocus"]) {
    set({ intakeFocus });
  },
};

/** The job, null when unknown, or undefined before the browser store is available. */
export function useScanJob(id: string): ScanJob | null | undefined {
  return useSyncExternalStore(
    scanStore.subscribe,
    () => scanStore.getState().jobs[id] ?? null,
    () => undefined,
  );
}
