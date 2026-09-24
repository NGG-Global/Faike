import { SiteHeader } from "@/components/layout/SiteHeader";

// Home and the general pages share the "home" header. The scan flow
// (/check/...) will choose its header per state.
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SiteHeader variant="home" />
      <main id="main" className="flex flex-1 flex-col">
        {children}
      </main>
    </>
  );
}
