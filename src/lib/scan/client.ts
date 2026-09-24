import { mockScanService } from "@/mocks/mock-scan-service";
import { handlesInput, liveScanService } from "./live-service";
import type { ScanService } from "./service";
import { scanStore } from "./store";

/**
 * The scan service used by the interface. Image files are checked for real
 * through Reality Defender (live-service.ts); audio, video, text and links
 * still run on the MOCK until their slices are built. A check is handled by
 * the service that started it, recorded on the job as `engine`.
 */
function owner(id: string): ScanService {
  return scanStore.getJob(id)?.engine === "rd" ? liveScanService : mockScanService;
}

export const scanService: ScanService = {
  start(input) {
    // Only one real check runs at a time: a new check stops the old one's polling.
    liveScanService.abortInProgress();
    return handlesInput(input) ? liveScanService.start(input) : mockScanService.start(input);
  },
  load: (id) => (scanStore.getJob(id) ? Promise.resolve(true) : mockScanService.load(id)),
  cancel: (id) => owner(id).cancel(id),
  retry: (id) => owner(id).retry(id),
  canRetry: (id) => owner(id).canRetry(id),
  sendFeedback: (id, answer) => owner(id).sendFeedback(id, answer),
};
