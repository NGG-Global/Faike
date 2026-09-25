import { mockScanService } from "@/mocks/mock-scan-service";
import { liveScanService } from "./live-service";
import type { ScanService } from "./service";
import { scanStore } from "./store";

/**
 * The scan service used by the interface. Every check the person starts
 * goes to Reality Defender through live-service.ts. The MOCK service only
 * runs checks started by the /mock review tools and the demo checks; a
 * check is always handled by the service that started it, recorded on the
 * job as `engine`.
 */
function owner(id: string): ScanService {
  return scanStore.getJob(id)?.engine === "rd" ? liveScanService : mockScanService;
}

export const scanService: ScanService = {
  start(input) {
    // Only one real check runs at a time: a new check stops the old one's polling.
    liveScanService.abortInProgress();
    return liveScanService.start(input);
  },
  load: (id) => (scanStore.getJob(id) ? Promise.resolve(true) : mockScanService.load(id)),
  cancel: (id) => owner(id).cancel(id),
  retry: (id) => owner(id).retry(id),
  canRetry: (id) => owner(id).canRetry(id),
  sendFeedback: (id, answer) => owner(id).sendFeedback(id, answer),
};
