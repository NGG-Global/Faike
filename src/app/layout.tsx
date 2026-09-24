import type { Metadata } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import "./globals.css";

// Self-hosted at build time; no request to Google from users' browsers.
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  axes: ["opsz"],
  variable: "--font-bricolage",
});

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
});

export const metadata: Metadata = {
  title: {
    default: "Faike",
    template: "%s · Faike",
  },
  description: "Drop something in. Find out how real it looks.",
};

/*
 * HANDOFF §10: the logo's highlighter swipe plays once per session, on the
 * first home-page load. Runs before first paint so the band never flashes;
 * the attribute is removed once the animation has finished.
 */
const wordmarkSwipeScript = `try{var k="faike:wordmark-swiped";if(location.pathname==="/"&&!sessionStorage.getItem(k)){sessionStorage.setItem(k,"1");var d=document.documentElement;d.setAttribute("data-wordmark-swipe","");setTimeout(function(){d.removeAttribute("data-wordmark-swipe")},1500)}}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the swipe script may add an attribute to
    // <html> before hydration. It applies to this element only.
    <html lang="en" className={`${bricolage.variable} ${figtree.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: wordmarkSwipeScript }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        {/* Off-screen until focused; the first stop for keyboard users. */}
        <a
          href="#main"
          className="fixed top-3 left-3 z-50 inline-flex h-(--control-sm) -translate-y-[200%] items-center rounded-pill bg-surface px-5 text-ui font-semibold focus:translate-y-0"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
