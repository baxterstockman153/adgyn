import type { Metadata } from "next";
import { newExperience, type Cafe } from "@/lib/smart-sleeves";
import { CustomerExperience } from "@/app/dashboard/venue/smart-sleeve/customer-experience";
import "@/app/dashboard/venue/smart-sleeve/workspace.css";

export const metadata: Metadata = { title: "Customer preview · Adgyn", robots: { index: false, follow: false } };

// A sample of what customers see when they scan. Nothing is recorded.
export default async function DemoExperiencePage({ searchParams }: { searchParams: Promise<{ cafe?: string }> }) {
  const params = await searchParams;
  const cafe: Cafe = params.cafe === "nirvana"
    ? { id: "demo", name: "Nirvana Soul", slug: "nirvana-soul", accent: "#8a4172" }
    : { id: "demo", name: "Gratitude Coffee Bar", slug: "gratitude", accent: "#2f5d4c" };
  const experience = { ...newExperience("board", cafe.name), entries: [{ id: "sample-event", name: "Friday community night", category: "Event" as const, description: "Live music and local makers, 6–9pm.", url: "" }] };
  const sponsors = [
    { id: "s1", name: "Alder Street Books", offer: "15% off any paperback", url: "", logoUrl: null },
    { id: "s2", name: "Bloom & Stem Florist", offer: "Free stem with any bouquet", url: "", logoUrl: null },
  ];
  return <div className="ss"><div className="ss-public-banner">Sample preview only · offers are not valid · no activity is recorded</div><main className="ss-public"><CustomerExperience cafe={cafe} experience={experience} sponsors={sponsors} preview /></main></div>;
}
