import { redirect } from "next/navigation";

// The pitch demo now lives in the Magic Patterns prototype; keep old links working.
const PROTOTYPE = "https://project-campaigns-dashboard-268.magicpatterns.app/";

export default async function DemoPage({ searchParams }: { searchParams: Promise<{ cafe?: string }> }) {
  const { cafe } = await searchParams;
  redirect(`${PROTOTYPE}?cafe=${encodeURIComponent(cafe === "gratitude" ? "Gratitude Coffee Bar" : cafe || "Gratitude Coffee Bar")}`);
}
