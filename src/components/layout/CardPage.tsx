import type { ReactNode } from "react";
import { PageColumn } from "./PageColumn";

/*
 * A full-page state card, centred in the intake column (HANDOFF §6.22).
 * Width follows the designed card proportions (≈317px in 05-states) via
 * --width-aside; the handoff does not specify the full-page width.
 */
export function CardPage({ children }: { children: ReactNode }) {
  return (
    <PageColumn className="pt-8 pb-12 sm:pt-13">
      <div className="mx-auto w-full max-w-aside">{children}</div>
    </PageColumn>
  );
}
