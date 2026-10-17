import type { Metadata } from "next";
import { GRATITUDE, NIRVANA } from "@/lib/smart-sleeves";
import { SmartSleeveApp } from "@/app/dashboard/venue/smart-sleeve/smart-sleeve-client";

export const metadata: Metadata = { title: "Explore your café workspace · Adgyn", robots: { index: false, follow: false } };

export default async function DemoPage({ searchParams }: { searchParams: Promise<{ cafe?: string }> }) {
  const { cafe } = await searchParams;
  return <SmartSleeveApp key={cafe === "gratitude" ? "gratitude" : "nirvana"} cafe={cafe === "gratitude" ? GRATITUDE : NIRVANA} demo />;
}
