import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

// Outside the current scope (HANDOFF §2): placeholder until built.
export const metadata: Metadata = { title: "History" };

export default function HistoryPage() {
  return (
    <PlaceholderPage
      label="History"
      title="This page is on its way"
      body="It isn't ready yet. Head back to the home page for now."
    />
  );
}
