import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email! },
    include: { memberships: true },
  });

  if (!dbUser || dbUser.memberships.length === 0) {
    return (
      <div className="text-center py-16">
        <h1 className="font-serif text-2xl font-bold mb-2">Welcome to adgyn</h1>
        <p className="text-gray-500">Your account hasn&apos;t been linked to a venue or brand yet.</p>
        <p className="text-gray-400 text-sm mt-1">Contact us to get set up.</p>
      </div>
    );
  }

  const membership = dbUser.memberships[0];

  if (membership.orgType === "venue") {
    redirect("/dashboard/venue");
  } else {
    redirect("/dashboard/brand");
  }
}
