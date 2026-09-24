import { isRdVerdict } from "@/lib/rd/verdict";
import { scanService } from "@/lib/scan/client";
import { classifyPaste } from "@/lib/scan/input";
import type { FlowStep } from "@/lib/scan/job";
import { scanStore } from "@/lib/scan/store";
import { loadSampleFile, SAMPLE_LINKS, SAMPLE_TEXT, SAMPLES, sampleMedia, sampleSummary, type SampleId } from "./samples";
import { setMockSettings, setNextScenario, type MockOutcome } from "./settings";

/*
 * MOCK launcher behind /mock/run: turns a review link into a live state.
 * Returns where to go next. Unknown parameters are ignored.
 *
 *   ?plan=free|plus  ?progress=determinate|indeterminate   → settings, back to /mock
 *   ?select=photo|voice|video                              → home with the file selected
 *   ?sample=photo|voice|video | ?link=tiktok|… | ?text=1   → start a check
 *   &outcome=<RD verdict>|NETWORK_ERROR|OFFLINE|RETRIEVAL_FAILED  &hold=uploading|retrieving|analysing
 */

const HOLDS: FlowStep[] = ["uploading", "retrieving", "analysing"];
const FAILURES = ["NETWORK_ERROR", "OFFLINE", "RETRIEVAL_FAILED"];

function sampleId(value: string | null): SampleId | null {
  return value && value in SAMPLES ? (value as SampleId) : null;
}

export async function runMock(params: URLSearchParams): Promise<string> {
  const plan = params.get("plan");
  const progress = params.get("progress");
  if (plan === "free" || plan === "plus") setMockSettings({ plan });
  if (progress === "determinate" || progress === "indeterminate") setMockSettings({ progress });
  if (plan || progress) return "/mock";

  const selected = sampleId(params.get("select"));
  if (selected) {
    const sample = SAMPLES[selected];
    const file = await loadSampleFile(sample);
    scanStore.setDraft({
      kind: "file",
      file,
      summary: sampleSummary(sample),
      previewUrl: sample.mediaType === "image" ? URL.createObjectURL(file) : undefined,
    });
    return "/";
  }

  const outcome = params.get("outcome");
  const hold = params.get("hold");
  setNextScenario({
    outcome: outcome && (isRdVerdict(outcome) || FAILURES.includes(outcome)) ? (outcome as MockOutcome) : undefined,
    hold: HOLDS.find((step) => step === hold),
  });

  const sample = sampleId(params.get("sample"));
  if (sample) {
    const file = await loadSampleFile(SAMPLES[sample]);
    const id = scanService.start({ kind: "file", file, summary: sampleSummary(SAMPLES[sample]), media: sampleMedia(SAMPLES[sample]) });
    return `/check/${id}`;
  }

  const link = params.get("link");
  if (link && link in SAMPLE_LINKS) {
    const input = classifyPaste(SAMPLE_LINKS[link as keyof typeof SAMPLE_LINKS]);
    if (input.kind === "link") {
      const id = scanService.start({ kind: "link", url: input.url, platformName: input.platform?.name, handle: input.handle });
      return `/check/${id}`;
    }
  }

  if (params.get("text")) {
    const id = scanService.start({ kind: "paste", text: SAMPLE_TEXT });
    return `/check/${id}`;
  }

  setNextScenario(null);
  return "/mock";
}
