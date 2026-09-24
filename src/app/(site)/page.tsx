import { StepStrip } from "@/components/home/StepStrip";
import { PageColumn } from "@/components/layout/PageColumn";

/*
 * Home (01-upload), foundation stage. The universal input (drop zone,
 * paste field, example links) is added in Stage 2 between the intro and
 * the step strip, together with its validation and scan behaviour.
 */
export default function HomePage() {
  return (
    <PageColumn className="flex flex-1 flex-col items-center pt-7 text-center">
      <h1 className="font-display text-balance text-hero-mobile sm:text-hero">
        Drop something in.
        <br />
        Find out how real it looks.
      </h1>
      <p className="mt-4.5 max-w-[640px] text-intro text-muted">
        Photos, voice notes, videos, text or a link. Faike checks for signs of AI and tells you what it
        found, in plain words.
      </p>

      <StepStrip className="mt-auto pt-12 pb-9 text-left" />
    </PageColumn>
  );
}
