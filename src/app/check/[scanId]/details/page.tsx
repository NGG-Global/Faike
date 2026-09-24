import type { Metadata } from "next";
import { DetailsPage } from "@/components/details/DetailsPage";

export const metadata: Metadata = { title: "Result details", robots: { index: false } };

/* HANDOFF §7.5: result details (desktop and tablet; inline on mobile). */
export default async function CheckDetailsPage({ params }: PageProps<"/check/[scanId]/details">) {
  const { scanId } = await params;
  return <DetailsPage scanId={scanId} />;
}
