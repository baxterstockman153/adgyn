export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email! },
    include: { memberships: true },
  });

  const orgType = dbUser?.memberships[0]?.orgType;

  return (
    <div className="min-h-screen bg-[#F5F0EB]">
      <nav className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/dashboard" className="font-serif text-xl font-bold">
            ad<span className="text-purple-700">gyn</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{user.email}</span>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
              {orgType === "venue" ? "Venue" : "Brand"}
            </span>
            <SignOutButton />
          </div>
        </div>
      </nav>
      <main className="max-w-5xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
