import { cx } from "@/lib/cx";
import { EVIDENCE_NOTE } from "@/lib/scan/copy";
import { Icon } from "@/components/ui/Icon";

/*
 * HANDOFF §6.16. Always shown under a completed verdict: detection is
 * evidence, not proof. Shorter form on mobile.
 */
export function EvidenceNote({ className }: { className?: string }) {
  return (
    <p className={cx("flex gap-2.5 text-ui leading-[1.5] text-muted sm:items-center", className)}>
      <Icon name="info" className="mt-0.5 shrink-0 sm:mt-0" />
      <span>
        <span className="sm:hidden">{EVIDENCE_NOTE.short}</span>
        <span className="hidden sm:inline">{EVIDENCE_NOTE.full}</span>
      </span>
    </p>
  );
}
