import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

// The Plus purchase flow is out of scope (HANDOFF §2): placeholder until built.
export const metadata: Metadata = { title: "Faike Plus" };

export default function PlusPage() {
  return (
    <PlaceholderPage
      label="Faike Plus"
      title="This page is on its way"
      body="It isn't ready yet. Head back to the home page for now."
    />
  );
}
