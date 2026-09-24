"use client";

import { useSyncExternalStore } from "react";

/** Whether a media query matches; false during server rendering. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** HANDOFF §5: mobile is below 640px. */
export const MOBILE_QUERY = "(max-width: 639.98px)";
