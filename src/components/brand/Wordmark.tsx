import Link from "next/link";
import { cx } from "@/lib/cx";

/*
 * Faike logo with the D2 highlighter band behind "Λi".
 *
 * The logo replaces the text wordmark of HANDOFF §3 (product decision,
 * 24 Sep 2026). Glyphs come from design/brand/faike-logo-traced.svg, a
 * provisional trace of the supplied PNG; swap LOGO_PATH when the designer
 * vector master arrives. Coordinates are in the source image's pixel space.
 *
 * Band geometry follows the handoff's .hl proportions measured on the
 * 01-upload comp: it starts 40% down from the ascender line and ends 16%
 * of the cap height below the baseline. It begins just clear of the F's
 * middle arm, so Λ's left foot rests outside it.
 *
 * Height is derived, not specified: the handoff gives 34px / 28px type for
 * the text wordmark; 29px / 24px gives the logo the same cap height.
 */

const LOGO_PATH =
  "M 424.4 116.8 C 413 120.8 405.6 130.7 405.7 141.9 C 405.7 148.7 407.6 153.5 412.6 159 C 417.2 164 421.7 166.5 429.2 167.9 C 442.8 170.4 456.7 164.4 462.2 153.7 C 464.7 148.7 465.6 139.9 464.1 134.4 C 462.6 128.9 456 121.5 449.6 118.3 C 442.8 114.8 431.8 114.1 424.4 116.8 M 68.7 121.7 C 68.3 122 68 164.1 68 215.2 L 68 308 95.5 308 L 123 308 123.1 303.8 C 123.2 301.4 123.3 287.1 123.4 272 L 123.5 244.5 169.6 244.2 L 215.7 244 216.4 240.2 C 216.7 238.2 217 228.5 217 218.8 L 217 201 170.3 200.8 L 123.5 200.5 123.2 183.3 L 123 166 136.7 166 C 144.3 166 167.4 165.8 188 165.7 L 225.5 165.5 226 161 C 226.3 158.5 226.4 148.5 226.2 138.8 L 225.8 121 147.6 121 C 104.5 121 69 121.3 68.7 121.7 M 481.7 122.7 C 481.3 123 481 164.9 481 215.7 L 481 308 507 308 L 533 308 533 279 C 533 263.1 533.4 250 533.8 250 C 534.6 250 553.4 268.9 578.3 294.8 L 591.1 308 624.2 308 L 657.2 308 646.2 296.3 C 640.1 289.8 629 278.4 621.5 271 C 614 263.6 603.4 252.7 597.9 246.9 L 588 236.2 617.7 208.2 C 634.1 192.8 649.7 177.9 652.5 175.1 L 657.4 170 625 170 C 601.4 170.1 591.9 170.4 590.4 171.3 C 589.2 172 576.3 183.8 561.6 197.5 C 546.9 211.3 534.4 222.7 533.9 222.8 C 533.4 223 533 202.8 533 172.6 L 533 122 507.7 122 C 493.7 122 482 122.3 481.7 122.7 M 295.1 152.5 C 288.6 154.3 284.6 156.7 280.3 161.2 C 277.3 164.4 264.5 186.3 236.6 236.5 C 229.5 249.2 217.7 270.1 210.4 283.1 C 203 296.1 197 307 197 307.4 C 197 307.7 210.1 307.9 226.2 307.8 L 255.3 307.5 272.7 275 C 305.4 214 308.2 209 308.9 209.5 C 309.7 209.9 317.7 229.3 340.3 284.5 L 349.7 307.5 354.1 308.3 C 356.5 308.8 368.5 308.9 380.8 308.5 C 402.9 307.8 403.1 307.8 402.4 305.6 C 400.6 299.6 370.1 229 348.3 180.2 C 344.5 171.8 340.2 163.4 338.7 161.5 C 337.2 159.7 333.1 156.7 329.4 154.9 C 323.3 151.9 321.9 151.6 311.6 151.3 C 303.9 151.1 298.8 151.5 295.1 152.5 M 721 162.6 C 719.6 162.8 715.1 163.5 711 164.1 C 683.3 168.2 661.3 182.6 651.2 203.4 C 645.3 215.6 643.5 223.2 643.6 237 C 643.6 251.7 645.1 258.7 651.1 270.8 C 660.9 290.8 680.2 304.4 707.2 310.1 C 721.7 313.2 750 313.3 764 310.3 C 783.4 306.1 797.3 299 808.5 287.4 C 813.9 281.9 820.7 271.1 822.5 265.3 L 823.1 263 796 263 L 769 263 763.9 266.5 C 750.5 275.7 728 277 713 269.5 C 705.5 265.7 696.8 255.8 698.5 253 C 698.9 252.3 721.9 252 762.3 252 L 825.5 252.1 826.4 244.6 C 827.5 235.1 825.2 217.8 821.4 208.3 C 812.4 185.4 793.6 170.8 765.5 164.8 C 756.9 163 727.2 161.5 721 162.6 M 410.6 183.7 C 410.3 184 410 212.2 410 246.2 L 410 308 435.5 308 L 461 308 460.8 245.8 L 460.5 183.5 435.9 183.3 C 422.3 183.2 411 183.3 410.6 183.7 M 724.4 201.4 C 716.6 203.2 710.5 206.3 705.7 210.9 C 701.6 214.8 698.7 219.4 699.7 220.4 C 700.8 221.5 771 221.1 771 220 C 771 214.9 761.3 205.9 752.6 203 C 744.5 200.3 732.3 199.6 724.4 201.4";

const VIEWBOX = "68 115 758 223";
const BAND = { x: 236, y: 192, width: 236, height: 146 };

export function Wordmark({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Faike home"
      className={cx("inline-flex min-h-(--control-sm) items-center rounded-region text-ink", className)}
    >
      <svg viewBox={VIEWBOX} aria-hidden="true" focusable="false" className="block h-6 w-auto sm:h-[29px]">
        <rect className="wordmark-band fill-highlight" {...BAND} />
        <path d={LOGO_PATH} fill="currentColor" fillRule="evenodd" />
      </svg>
    </Link>
  );
}
