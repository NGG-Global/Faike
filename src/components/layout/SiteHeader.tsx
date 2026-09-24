import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";
import { Button } from "@/components/ui/Button";
import { RoundIconButton } from "@/components/ui/RoundIconButton";

/*
 * HANDOFF §5 "Header". 84px desktop / 64px mobile, logo left.
 *
 *   home   · How it works, History, Sign in      mobile: Sign in
 *   flow   · History, Sign in (analysing comp)   mobile: Sign in
 *   result · History, Check something else      mobile: round "New check"
 *
 * The handoff does not specify the mobile header for the analysing screen;
 * it follows the home rule. Tablet side padding is not specified either and
 * stays at the mobile value until the desktop gutter applies.
 */

export type HeaderVariant = "home" | "flow" | "result";

const textLink =
  "inline-flex min-h-(--control-sm) items-center rounded-region transition-colors hover:text-verdict-authentic-fg";

export function SiteHeader({ variant = "home" }: { variant?: HeaderVariant }) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between pr-4 pl-5 sm:h-(--header-height) sm:px-5 lg:px-(--page-gutter)">
      <Wordmark />

      <nav aria-label="Main">
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
          <li>
            {variant === "result" ? (
              <Button href="/" variant="secondary" size="sm">
                Check something else
              </Button>
            ) : (
              <Button href="/sign-in" variant="secondary" size="sm">
                Sign in
              </Button>
            )}
          </li>
        </ul>

        {/* Mobile: the nav collapses to a single control */}
        <div className="sm:hidden">
          {variant === "result" ? (
            <RoundIconButton href="/" label="New check" icon="plus" size={44} />
          ) : (
            <Button href="/sign-in" variant="secondary" size="sm">
              Sign in
            </Button>
          )}
        </div>
      </nav>
    </header>
  );
}
