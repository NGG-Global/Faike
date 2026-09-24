import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

// Outside the current scope (HANDOFF §2): placeholder until built.
export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <PlaceholderPage
      label="Sign in"
      title="This page is on its way"
      body="It isn't ready yet. Head back to the home page for now."
    />
  );
}
