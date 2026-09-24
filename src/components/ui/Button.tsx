"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, MouseEvent, ReactNode } from "react";
import { cx } from "@/lib/cx";

/*
 * HANDOFF §6.1. Pill buttons in three variants. A button that navigates is
 * rendered as a link (pass `href`).
 *
 * Sizes: sm 44px (header pill, --control-sm), md 48px, lg 52px (result page).
 * Every variant carries a 1.5px border (transparent where it is not drawn),
 * so all variants share one outer size; padding plus border matches the
 * comps' 20–24px side padding.
 *
 * Client component because the disabled guard needs a click handler.
 */

type Variant = "primary" | "secondary" | "text";
type Size = "sm" | "md" | "lg";

type OwnProps = {
  variant?: Variant;
  size?: Size;
  /** Leading or trailing icon element, typically an <Icon />. */
  icon?: ReactNode;
  iconPosition?: "start" | "end";
  className?: string;
  children: ReactNode;
};

type ButtonProps = OwnProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof OwnProps> & { href?: never };

type LinkButtonProps = OwnProps &
  Omit<ComponentProps<typeof Link>, keyof OwnProps> & { href: ComponentProps<typeof Link>["href"] };

const base =
  "inline-flex shrink-0 items-center justify-center rounded-pill border-[1.5px] font-semibold whitespace-nowrap " +
  "transition-[background-color,border-color,color,scale] duration-(--dur-fast) ease-out " +
  "not-aria-disabled:active:scale-[0.98] aria-disabled:cursor-not-allowed aria-disabled:opacity-40";

const variants: Record<Variant, string> = {
  primary:
    "border-transparent bg-ink text-surface not-aria-disabled:hover:bg-ink-hover",
  secondary:
    "border-ink bg-transparent text-ink not-aria-disabled:hover:border-ink-hover not-aria-disabled:hover:text-verdict-authentic-fg",
  text:
    "border-transparent bg-transparent text-ink underline underline-offset-4 not-aria-disabled:hover:text-verdict-authentic-fg",
};

const sizes: Record<Size, string> = {
  sm: "h-(--control-sm) gap-2 px-5 text-ui",
  md: "h-(--control-md) gap-2 px-5 text-ui",
  lg: "h-(--control-lg) gap-2.5 px-5.5 text-body",
};

function buttonClassName({
  variant = "primary",
  size = "md",
  className,
}: Pick<OwnProps, "variant" | "size" | "className">) {
  return cx(base, variants[variant], sizes[size], className);
}

function Content({ icon, iconPosition = "start", children }: Pick<OwnProps, "icon" | "iconPosition" | "children">) {
  return (
    <>
      {icon && iconPosition === "start" ? icon : null}
      {children}
      {icon && iconPosition === "end" ? icon : null}
    </>
  );
}

export function Button(props: ButtonProps | LinkButtonProps) {
  if (props.href !== undefined) {
    const { variant, size, icon, iconPosition, className, children, ...linkProps } = props;
    return (
      <Link {...linkProps} className={buttonClassName({ variant, size, className })}>
        <Content icon={icon} iconPosition={iconPosition}>
          {children}
        </Content>
      </Link>
    );
  }

  const {
    variant,
    size,
    icon,
    iconPosition,
    className,
    children,
    disabled,
    onClick,
    type = "button",
    ...buttonProps
  } = props;

  // aria-disabled rather than the native attribute keeps the control
  // focusable and discoverable by screen-reader users (HANDOFF §6.1).
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (disabled) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };

  return (
    <button
      {...buttonProps}
      type={type}
      aria-disabled={disabled || undefined}
      onClick={handleClick}
      className={buttonClassName({ variant, size, className })}
    >
      <Content icon={icon} iconPosition={iconPosition}>
        {children}
      </Content>
    </button>
  );
}
