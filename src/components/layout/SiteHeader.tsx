import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";
import { Button } from "@/components/ui/Button";
import { RoundIconButton } from "@/components/ui/RoundIconButton";

/*
 * HANDOFF §5 "Header". 84px desktop / 64px mobile, logo left.
 *
 *   home   · How it works, History               mobile: logo only
 *   flow   · History (analysing comp)            mobile: logo only
 *   result · History, Check something else      mobile: round "New check"
 *
 * "Sign in" is left out for now (product owner, 25 Sep 2026): there are no
 * accounts yet. The placeholder page at /sign-in stays, unlinked. With it
 * gone, the mobile header of home and flow has no navigation, so the nav
 * landmark is not rendered there. Tablet side padding is not specified and
 * stays at the mobile value until the desktop gutter applies.
 */

export type HeaderVariant = "home" | "flow" | "result";

const textLink =
  "inline-flex min-h-(--control-sm) items-center rounded-region transition-colors hover:text-verdict-authentic-fg";

export function SiteHeader({ variant = "home" }: { variant?: HeaderVariant }) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between pr-4 pl-5 sm:h-(--header-height) sm:px-5 lg:px-(--page-gutter)">
      <Wordmark />

      <nav aria-label="Main" className={variant === "result" ? undefined : "hidden sm:block"}>
        {/* Tablet and desktop */}
        <ul className="hidden items-center gap-7 text-ui font-semibold sm:flex">
          {variant === "home" ? (
            <li>
              <Link href="/how-it-works" className={textLink}>
                How it works
              </Link>
            </li>
          ) : null}
          <li>
            <Link href="/history" className={textLink}>
              History
            </Link>
          </li>
          {variant === "result" ? (
            <li>
              <Button href="/" variant="secondary" size="sm">
                Check something else
              </Button>
            </li>
          ) : null}
        </ul>

        {/* Mobile: the nav collapses to a single control on the result page */}
        {variant === "result" ? (
          <div className="sm:hidden">
            <RoundIconButton href="/" label="New check" icon="plus" size={44} />
          </div>
        ) : null}
      </nav>
    </header>
  );
}
