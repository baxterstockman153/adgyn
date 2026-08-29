export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";

const NAV_ITEMS = [
  { href: "/admin", label: "Overview", icon: "📊" },
  { href: "/admin/venues", label: "Venues", icon: "🏪" },
  { href: "/admin/campaigns", label: "Campaigns", icon: "📋" },
  { href: "/admin/brands", label: "Brands", icon: "🏷️" },
  { href: "/admin/users", label: "Users", icon: "👤" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.email)) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-[#F5F0EB]">
      {/* Top nav */}
      <nav className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="font-serif text-xl font-bold">
              ad<span className="text-purple-400">gyn</span>
              <span className="text-xs font-normal text-gray-400 ml-2">
                admin
              </span>
            </Link>
            <div className="hidden sm:flex items-center gap-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-3 py-1.5 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
                >
                  <span className="mr-1.5">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">{user.email}</span>
            <Link
              href="/dashboard"
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Exit admin
            </Link>
            <SignOutButton className="text-sm text-gray-500 hover:text-gray-300 transition-colors" />
          </div>
        </div>
      </nav>

      {/* Mobile nav */}
      <div className="sm:hidden bg-gray-900 border-t border-gray-800 px-4 pb-2 flex gap-1 overflow-x-auto">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <span className="mr-1">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
