"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function acceptInvite(input: {
  token: string;
  email: string;
  password: string;
  name: string;
}) {
  // 1. Look up and validate the invite
  const invite = await prisma.invite.findUnique({
    where: { token: input.token },
  });

  if (!invite) throw new Error("Invalid invite link.");
  if (invite.usedAt) throw new Error("This invite has already been used.");
  if (invite.expiresAt < new Date()) throw new Error("This invite has expired.");
  if (invite.email && invite.email.toLowerCase() !== input.email.toLowerCase()) {
    throw new Error("This invite is for a different email address.");
  }

  // 2. Create Supabase auth user (using service role key for auto-confirm)
  const authRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: SERVICE_ROLE_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: input.email,
      password: input.password,
      email_confirm: true,
    }),
  });

  if (!authRes.ok) {
    const err = await authRes.json();
    // User might already exist — that's fine, they can still be linked
    if (
      !err.msg?.includes("already") &&
      !err.message?.includes("already")
    ) {
      throw new Error(err.msg || err.message || "Failed to create account.");
    }
  }

  // 3. Create DB user + membership
  const user = await prisma.user.upsert({
    where: { email: input.email },
    update: { name: input.name || undefined },
    create: {
      email: input.email,
      name: input.name || null,
    },
  });

  await prisma.membership.upsert({
    where: {
      userId_orgId_orgType: {
        userId: user.id,
        orgId: invite.orgId,
        orgType: invite.orgType,
      },
    },
    update: {},
    create: {
      userId: user.id,
      orgId: invite.orgId,
      orgType: invite.orgType,
      role: invite.role,
    },
  });

  // 4. Mark invite as used
  await prisma.invite.update({
    where: { id: invite.id },
    data: {
      usedBy: user.id,
      usedAt: new Date(),
    },
  });

  // 5. Redirect to login
  redirect("/login");
}
