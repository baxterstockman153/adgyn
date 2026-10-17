import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { smartSleeveEnabled, outreachEnabled } from "@/lib/features";
import { loadClaims, loadExperiences } from "@/lib/smart-sleeves-server";
import { NIRVANA, type Cafe } from "@/lib/smart-sleeves";
import { SmartSleeveApp } from "./smart-sleeve-client";

export const dynamic = "force-dynamic";

export default async function SmartSleevePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");
  const account = await prisma.user.findUnique({ where: { email: user.email }, include: { memberships: { where: { orgType: "venue" } } } });
  const membership = account?.memberships.find(item => smartSleeveEnabled(item.orgId));
  if (!membership) redirect("/dashboard/venue");
  const venue = await prisma.venue.findUnique({ where: { id: membership.orgId } });
  if (!venue) redirect("/dashboard");
  const nirvana = venue.slug === "nirvana-soul";
  const cafe: Cafe = { id: venue.id, name: venue.name, slug: venue.slug, locations: nirvana ? NIRVANA.locations : [venue.address || venue.name], accent: nirvana ? NIRVANA.accent : "#2f5d4c", appUrl: nirvana ? NIRVANA.appUrl : venue.websiteUrl || "" };
  const [experiences, claims] = await Promise.all([loadExperiences(venue.id), loadClaims(venue.id)]);
  return <SmartSleeveApp cafe={cafe} initialExperiences={experiences} claims={claims} canPublish={membership.role === "owner"} hasOutreach={outreachEnabled(venue.id)} />;
}
