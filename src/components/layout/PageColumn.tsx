import type { ElementType, ReactNode } from "react";
import { cx } from "@/lib/cx";

/*
 * HANDOFF §5. Centred content column. The comps' drawn widths are
 * max-widths and the column shrinks fluidly, keeping a 20px margin:
 *
 *   mobile   full width minus 20px each side
 *   tablet   max 720px
 *   desktop  intake 880px (home, analysing) · result 1040px (result, details)
 */

type Width = "intake" | "result";

const desktopWidth: Record<Width, string> = {
  intake: "lg:w-[min(100%_-_2.5rem,var(--width-intake))]",
  result: "lg:w-[min(100%_-_2.5rem,var(--width-result))]",
};

export function PageColumn({
  width = "intake",
  as: Component = "div",
  className,
  children,
}: {
  width?: Width;
  as?: ElementType;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Component
      className={cx("mx-auto w-[min(100%_-_2.5rem,var(--width-tablet))]", desktopWidth[width], className)}
    >
      {children}
    </Component>
  );
}
