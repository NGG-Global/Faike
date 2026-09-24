import { LINKS_FREE_TIER, MEDIA, MEDIA_TYPES } from "@/config/media";
import { cx } from "@/lib/cx";
import type { Plan } from "@/lib/plan";
import { Icon, type IconName } from "@/components/ui/Icon";

/*
 * HANDOFF §6.4. Informational chips, not buttons. Gated types show a PLUS
 * badge for free users and read "Video, requires Plus"; with Plus they
 * render like free chips.
 */

const CHIPS: { label: string; icon: IconName; free: boolean }[] = [
  ...MEDIA_TYPES.map((type) => ({ label: MEDIA[type].chipLabel, icon: MEDIA[type].icon, free: MEDIA[type].freeTier })),
  { label: "Links", icon: "link", free: LINKS_FREE_TIER },
];

export function TypeChips({ plan, className }: { plan: Plan; className?: string }) {
  return (
    <ul aria-label="What you can check" className={cx("flex flex-wrap justify-center gap-2", className)}>
      {CHIPS.map((chip) => {
        const gated = !chip.free && plan !== "plus";
        return (
          <li
            key={chip.label}
            className={cx(
              "inline-flex h-9 items-center gap-2 rounded-pill bg-bg px-3.5 text-small font-semibold",
              gated ? "text-muted" : "text-ink",
            )}
          >
            <Icon name={chip.icon} size={16} strokeWidth={2} />
            {chip.label}
            {gated ? (
              <>
                <PlusBadge />
                <span className="sr-only">, requires Plus</span>
              </>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export function PlusBadge() {
  return (
    <span
      aria-hidden="true"
      className="rounded-pill bg-ink px-1.75 py-0.5 text-badge font-bold tracking-[0.04em] text-highlight"
    >
      PLUS
    </span>
  );
}
