import { Button } from "@/components/ui/Button";
import { StateCard } from "@/components/ui/StateCard";
import { CardPage } from "./CardPage";

/*
 * Full-page StateCard for destinations outside the current scope
 * (HANDOFF §2) and for 404.
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
    <CardPage>
      <StateCard
        headingLevel={1}
        label={label}
        title={title}
        actions={
          <Button href="/" className="w-full">
            Back to home
          </Button>
        }
      >
        <p className="text-ui leading-[1.5] text-ink-soft">{body}</p>
      </StateCard>
    </CardPage>
  );
}
