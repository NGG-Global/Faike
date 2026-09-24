import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";
import { SiteHeader } from "@/components/layout/SiteHeader";

export const metadata: Metadata = { title: "Page not found" };

// Root not-found renders inside the root layout only, so it brings its own
// header and main landmark.
export default function NotFound() {
  return (
    <>
      <SiteHeader variant="home" />
      <main id="main" className="flex flex-1 flex-col">
        <PlaceholderPage
          label="Not found"
          title="We couldn't find that page"
          body="The link may be mistyped or out of date."
        />
      </main>
    </>
  );
}
