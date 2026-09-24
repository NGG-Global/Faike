"use client";

import { useState } from "react";
import { MEDIA } from "@/config/media";
import { VERDICT_HEADLINE } from "@/lib/scan/copy";
import type { ScanResult } from "@/lib/scan/types";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

/*
 * HANDOFF §6.14. Shares a text summary plus the app URL (what to share is
 * an open question, §13.1). Web Share API where available, otherwise the
 * summary is copied. The person's file is never shared.
 */

export function ShareButton({ result, className }: { result: ScanResult; className?: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function share() {
    const url = window.location.origin;
    const text = `Faike checked this ${MEDIA[result.mediaType].noun}: ${VERDICT_HEADLINE[result.verdict]}. AI detection gives you evidence, not proof.`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Faike result", text, url });
      } catch {
        // Dismissed by the person: nothing to do.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
    setTimeout(() => setStatus("idle"), 2500);
  }

  return (
    <>
      <Button
        variant="secondary"
        size="action"
        onClick={share}
        icon={<Icon name="share" className="hidden sm:block" />}
        className={className}
      >
        {status === "copied" ? (
          "Copied"
        ) : (
          <>
            <span className="sm:hidden">Share</span>
            <span className="hidden sm:inline">Share result</span>
          </>
        )}
      </Button>
      <span aria-live="polite" className="sr-only">
        {status === "copied" ? "A summary and link were copied." : status === "failed" ? "Copying didn't work." : ""}
      </span>
    </>
  );
}
