import { mockScanService } from "@/mocks/mock-scan-service";
import type { ScanService } from "./service";

/**
 * The scan service used by the interface. MOCK until Reality Defender is
 * integrated (Stage 5); swap this one line for the Route Handler client.
 */
export const scanService: ScanService = mockScanService;
