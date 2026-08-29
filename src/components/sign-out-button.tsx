"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <button
      onClick={handleSignOut}
      className={className || "text-sm text-gray-400 hover:text-gray-600 transition-colors"}
    >
      Sign out
    </button>
  );
}
