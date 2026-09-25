import { Fragment } from "react";
import { CAPABILITIES } from "@/config/capabilities";
import { cx } from "@/lib/cx";

/*
 * HANDOFF §6.6. Each example loads a bundled sample and runs a check. They
 * start an action, so they are buttons styled as the comp's links; the
 * pseudo-element enlarges the touch area without changing the line.
 */

const linkButton =
  "relative font-semibold text-ink underline underline-offset-2 hover:text-verdict-authentic-fg " +
  "after:absolute after:-inset-x-1 after:-inset-y-3.5 after:content-[''] disabled:opacity-40";

export function ExampleLinks({
  onExample,
  busy,
  className,
}: {
  onExample: (sample: "photo" | "voice") => void;
  busy: boolean;
  className?: string;
}) {
  // Only examples of kinds that are switched on (capabilities.ts).
  const examples = [
    ...(CAPABILITIES.image ? [{ sample: "photo" as const, label: "a photo" }] : []),
    ...(CAPABILITIES.audio ? [{ sample: "voice" as const, label: "a voice note" }] : []),
  ];
  if (!examples.length) return null;
  return (
    <p className={cx("text-small text-muted", className)}>
      No file handy? Try an example:{" "}
      {examples.map((example, index) => (
        <Fragment key={example.sample}>
          {index > 0 ? " · " : null}
          <button type="button" className={linkButton} disabled={busy} onClick={() => onExample(example.sample)}>
            {example.label}
          </button>
        </Fragment>
      ))}
    </p>
  );
}
