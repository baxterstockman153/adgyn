export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { outreachEnabled } from "@/lib/features";
import { redirect } from "next/navigation";
import { OutreachBoard } from "./outreach-board";

export default async function OutreachPage() {
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

  // Feature-flagged per venue — anyone not whitelisted lands back on their
  // normal dashboard rather than seeing a half-built page.
  if (!outreachEnabled(venueId)) redirect("/dashboard/venue");

  const venue = await prisma.venue.findUnique({
    where: { id: venueId },
    include: {
      prospects: {
        orderBy: [{ statusUpdatedAt: "desc" }, { createdAt: "desc" }],
      },
    },
  });
  if (!venue) redirect("/dashboard");

  const prospects = venue.prospects.map((p) => ({
    id: p.id,
    businessName: p.businessName,
    address: p.address,
    city: p.city,
    phone: p.phone,
    website: p.website,
    contactName: p.contactName,
    contactTitle: p.contactTitle,
    email: p.email,
    notes: p.notes ?? "",
    outreachMessage: p.outreachMessage,
    status: p.status,
  }));

  return <OutreachBoard venueName={venue.name} prospects={prospects} />;
}
