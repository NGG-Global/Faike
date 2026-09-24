"use client";

import { useEffect, useState } from "react";
import { scanService } from "@/lib/scan/client";
import { useScanJob } from "@/lib/scan/store";
import type { ScanJob } from "@/lib/scan/job";

/**
 * The check for an id, loading it when this tab doesn't have it (direct
 * links, HANDOFF §7.1). `undefined` while unknown, `null` when not found.
 */
export function useEnsureScan(scanId: string): ScanJob | null | undefined {
  const job = useScanJob(scanId);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (job !== null) return;
    let active = true;
    scanService.load(scanId).then((found) => {
      if (active && !found) setMissing(true);
    });
    return () => {
      active = false;
    };
  }, [job, scanId]);

  if (job) return job;
  return missing ? null : undefined;
}
