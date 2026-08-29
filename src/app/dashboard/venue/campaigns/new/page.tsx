import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CampaignForm } from "./campaign-form";

export const dynamic = "force-dynamic";

export default async function NewCampaignPage() {
  // Feature flag
  if (process.env.NEXT_PUBLIC_FEATURE_CAMPAIGN_BUILDER !== "true") {
    redirect("/dashboard/venue");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email! },
    include: { memberships: { where: { orgType: "venue" } } },
  });

  if (!dbUser?.memberships[0]?.orgId) redirect("/dashboard");

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/dashboard/venue"
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          ← Back to Dashboard
        </Link>
      </div>

      <h1 className="font-serif text-2xl font-bold mb-1">Create Campaign</h1>
      <p className="text-sm text-gray-500 mb-8">
        Set your revenue target and add up to 4 local businesses.
      </p>

      <CampaignForm />
    </div>
  );
}
