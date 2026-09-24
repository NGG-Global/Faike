import type { ReactNode } from "react";

/*
 * Line icons taken from the D2 reference comps (24 × 24 grid), with the
 * comps' stroke widths, caps and joins. Icons are always decorative: the
 * accessible name comes from the surrounding text or the control's label.
 */

type IconDef = {
  body: ReactNode;
  strokeWidth?: number;
  filled?: boolean;
  roundCap?: boolean;
  roundJoin?: boolean;
};

const icons = {
  plus: {
    body: <path d="M12 5v14M5 12h14" />,
    strokeWidth: 2.2,
    roundCap: true,
  },
  "arrow-right": {
    body: <path d="M5 12h14M13 6l6 6-6 6" />,
    strokeWidth: 2.2,
    roundCap: true,
  },
  "chevron-down": { body: <path d="M6 9l6 6 6-6" />, strokeWidth: 2.2 },
  "chevron-up": { body: <path d="M6 15l6-6 6 6" />, strokeWidth: 2.2 },
  "chevron-left": { body: <path d="M15 6l-6 6 6 6" />, strokeWidth: 2.2 },
  check: { body: <path d="M5 12l5 5L20 7" />, strokeWidth: 2.5 },
  cross: { body: <path d="M6 6l12 12M18 6L6 18" />, strokeWidth: 2.6 },
  info: {
    body: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5M12 8v.5" />
      </>
    ),
    roundCap: true,
  },
  alert: {
    body: (
      <>
        <path d="M12 8v5M12 16.5v.5" />
        <circle cx="12" cy="12" r="9" />
      </>
    ),
    strokeWidth: 2.4,
    roundCap: true,
  },
  share: {
    body: (
      <>
        <path d="M12 3v12M7 8l5-5 5 5" />
        <path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
      </>
    ),
    roundCap: true,
  },
  "thumb-up": {
    body: (
      <path d="M7 10v11H4V10zM7 10l4-7a2 2 0 0 1 3 2l-1 5h6a2 2 0 0 1 2 2.3l-1.3 7A2 2 0 0 1 17.7 21H7" />
    ),
    roundJoin: true,
  },
  "thumb-down": {
    body: (
      <path d="M17 14V3h3v11zM17 14l-4 7a2 2 0 0 1-3-2l1-5H5a2 2 0 0 1-2-2.3l1.3-7A2 2 0 0 1 6.3 3H17" />
    ),
    roundJoin: true,
  },
  play: { body: <path d="M8 5l12 7-12 7z" />, filled: true },
  image: {
    body: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="3" />
        <circle cx="9" cy="10" r="2" />
        <path d="M21 16l-5-5-9 9" />
      </>
    ),
  },
  audio: {
    body: <path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2" />,
    roundCap: true,
  },
  video: {
    body: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="3" />
        <path d="M10 9l5 3-5 3z" />
      </>
    ),
  },
  text: { body: <path d="M5 6h14M5 11h14M5 16h9" />, roundCap: true },
  link: {
    body: (
      <>
        <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
        <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
      </>
    ),
    roundCap: true,
  },
} satisfies Record<string, IconDef>;

export type IconName = keyof typeof icons;

type IconProps = {
  name: IconName;
  /** Rendered size in px. */
  size?: number;
  /** Overrides the icon's default stroke width. */
  strokeWidth?: number;
  className?: string;
};

export function Icon({ name, size = 18, strokeWidth, className }: IconProps) {
  const icon: IconDef = icons[name];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={icon.filled ? "currentColor" : "none"}
      stroke={icon.filled ? "none" : "currentColor"}
      strokeWidth={icon.filled ? undefined : (strokeWidth ?? icon.strokeWidth ?? 2)}
      strokeLinecap={icon.roundCap ? "round" : undefined}
      strokeLinejoin={icon.roundJoin ? "round" : undefined}
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {icon.body}
    </svg>
  );
}
