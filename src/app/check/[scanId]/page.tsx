import type { Metadata } from "next";
import { ScanFlow } from "@/components/flow/ScanFlow";

export const metadata: Metadata = { title: "Your check", robots: { index: false } };

/* HANDOFF §7.1: uploading → retrieving → analysing → result, one route. */
export default async function CheckPage({ params }: PageProps<"/check/[scanId]">) {
  const { scanId } = await params;
  return <ScanFlow scanId={scanId} />;
}
