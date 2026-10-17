export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { smartSleeveEnabled } from "@/lib/features";
import { redirect } from "next/navigation";
import { SmartSleeveApp } from "./smart-sleeve-client";

export default async function SmartSleevePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email! },
    include: { memberships: { where: { orgType: "venue" } } },
  });
  const venueId = dbUser?.memberships[0]?.orgId;
  if (!venueId) redirect("/dashboard");

  // Feature-flagged per venue — only the demo venue sees the Smart Sleeves
  // prototype; everyone else lands back on their normal dashboard.
  if (!smartSleeveEnabled(venueId)) redirect("/dashboard/venue");

  return <SmartSleeveApp />;
}
