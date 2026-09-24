import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";
import { cx } from "@/lib/cx";
import { Icon, type IconName } from "./Icon";

/*
 * HANDOFF §6.2. Circular icon-only control. It always needs an accessible
 * label, so `label` is required and becomes the aria-label.
 *
 *   84 · hero "Choose a file"      (highlight)
 *   64 · audio play / pause        (highlight)
 *   48 · paste-field submit         (ink)
 *   44 · mobile header "New check"  (highlight)
 */

type Size = 44 | 48 | 64 | 84;
type Tone = "highlight" | "ink";

type OwnProps = {
  label: string;
  icon: IconName;
  size?: Size;
  tone?: Tone;
  className?: string;
};

type ButtonProps = OwnProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof OwnProps | "children"> & { href?: never };

type LinkProps = OwnProps &
  Omit<ComponentProps<typeof Link>, keyof OwnProps | "children"> & {
    href: ComponentProps<typeof Link>["href"];
  };

const sizeClass: Record<Size, string> = {
  44: "size-(--control-sm)",
  48: "size-(--control-md)",
  64: "size-16",
  84: "size-(--control-hero)",
};

// Icon size and stroke per control size, as drawn in the comps.
const iconSpec: Record<Size, { size: number; strokeWidth?: number }> = {
  44: { size: 20, strokeWidth: 2.4 },
  48: { size: 20 },
  64: { size: 26 },
  84: { size: 34 },
};

const toneClass: Record<Tone, string> = {
  highlight: "bg-highlight text-ink",
  ink: "bg-ink text-surface",
};

export function RoundIconButton({
  label,
  icon,
  size = 48,
  tone = "highlight",
  className,
  ...rest
}: ButtonProps | LinkProps) {
  const classes = cx(
    "inline-flex shrink-0 items-center justify-center rounded-full",
    "transition-[scale] duration-(--dur-fast) ease-out active:scale-[0.98]",
    sizeClass[size],
    toneClass[tone],
    className,
  );
  const glyph = <Icon name={icon} size={iconSpec[size].size} strokeWidth={iconSpec[size].strokeWidth} />;

  if (rest.href !== undefined) {
    const linkProps = rest as Omit<LinkProps, keyof OwnProps>;
    return (
      <Link {...linkProps} aria-label={label} className={classes}>
        {glyph}
      </Link>
    );
  }

  const { type = "button", ...buttonProps } = rest as Omit<ButtonProps, keyof OwnProps>;
  return (
    <button {...buttonProps} type={type} aria-label={label} className={classes}>
      {glyph}
    </button>
  );
}
