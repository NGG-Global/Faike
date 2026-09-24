import { MEDIA } from "@/config/media";
import { cx } from "@/lib/cx";
import type { MediaType } from "@/lib/scan/types";
import { Icon, type IconName } from "./Icon";

/*
 * File-type tile. 52px on sage (analysis card, HANDOFF §6.8); 44px on white
 * inside a sunk row (uploading state, 05-states).
 */

export function FileTile({
  mediaType,
  icon,
  size = 52,
  className,
}: {
  mediaType?: MediaType;
  icon?: IconName;
  size?: 44 | 52;
  className?: string;
}) {
  const name = icon ?? (mediaType ? MEDIA[mediaType].icon : "link");
  return (
    <span
      aria-hidden="true"
      className={cx(
        "flex shrink-0 items-center justify-center text-ink",
        size === 52 ? "size-13 rounded-tile bg-bg" : "size-11 rounded-region bg-surface",
        className,
      )}
    >
      <Icon name={name} size={size === 52 ? 24 : 20} strokeWidth={2} />
    </span>
  );
}
