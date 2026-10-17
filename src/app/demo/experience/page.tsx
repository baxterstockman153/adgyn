import type { Metadata } from "next";
import { GRATITUDE, NIRVANA, parseExperience, sampleExperiences } from "@/lib/smart-sleeves";
import { CustomerExperience } from "@/app/dashboard/venue/smart-sleeve/customer-experience";
import "@/app/dashboard/venue/smart-sleeve/workspace.css";

export const metadata: Metadata = { title: "Customer preview · Adgyn", robots: { index: false, follow: false } };

export default async function DemoExperiencePage({ searchParams }: { searchParams: Promise<{ cafe?: string; experience?: string }> }) {
  const params = await searchParams;
  const cafe = params.cafe === "gratitude" ? GRATITUDE : NIRVANA;
  let experience = sampleExperiences(cafe)[1];
  if (params.experience && params.experience.length < 12000) {
    try { experience = parseExperience(JSON.parse(params.experience)) ?? experience; } catch {}
  }
  return <div className="ss"><div className="ss-public-banner">Sample preview only · offers are not valid · no activity is recorded</div><main className="ss-public"><CustomerExperience cafe={cafe} experience={experience} preview /></main></div>;
}
