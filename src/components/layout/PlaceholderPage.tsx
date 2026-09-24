import { Button } from "@/components/ui/Button";
import { StateCard } from "@/components/ui/StateCard";
import { PageColumn } from "./PageColumn";

/*
 * Full-page StateCard, centred in the intake column (HANDOFF §6.22). Used
 * for destinations outside the current scope (HANDOFF §2) and for 404.
 * Card width is not specified for the full-page case; it keeps the
 * designed card proportions (≈317px in 05-states) via --width-aside.
 */

export function PlaceholderPage({
  label,
  title,
  body,
}: {
  label: string;
  title: string;
  body: string;
}) {
  return (
    <PageColumn className="pt-13 pb-12">
      <StateCard
        headingLevel={1}
        label={label}
        title={title}
        className="mx-auto w-full max-w-aside"
        actions={
          <Button href="/" className="w-full">
            Back to home
          </Button>
        }
      >
        <p className="text-ui leading-[1.5] text-ink-soft">{body}</p>
      </StateCard>
    </PageColumn>
  );
}
