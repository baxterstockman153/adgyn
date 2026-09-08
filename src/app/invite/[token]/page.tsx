export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { InviteSignup } from "./invite-signup";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const invite = await prisma.invite.findUnique({
    where: { token },
  });

  if (!invite) notFound();

  const now = new Date();
  const isExpired = invite.expiresAt < now;
  const isUsed = !!invite.usedAt;

  // Look up the org name
  let orgName = "";
  if (invite.orgType === "venue") {
    const venue = await prisma.venue.findUnique({
      where: { id: invite.orgId },
      select: { name: true },
    });
    orgName = venue?.name || "Unknown venue";
  } else {
    const brand = await prisma.brand.findUnique({
      where: { id: invite.orgId },
      select: { name: true },
    });
    orgName = brand?.name || "Unknown brand";
  }

  if (isUsed || isExpired) {
    return (
      <div className="min-h-screen bg-[#F5F0EB] flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <h1 className="font-serif text-4xl font-bold mb-2">
            ad<span className="text-purple-700">gyn</span>
          </h1>
          <div className="bg-white rounded-2xl shadow-sm p-6 mt-6">
            <p className="text-gray-500">
              {isUsed
                ? "This invite has already been used."
                : "This invite has expired."}
            </p>
            <p className="text-gray-400 text-sm mt-2">
              Contact your admin for a new invite link.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F0EB] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="font-serif text-4xl font-bold">
            ad<span className="text-purple-700">gyn</span>
          </h1>
          <p className="text-gray-500 mt-2">You&apos;ve been invited!</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          {/* Invite context */}
          <div className="text-center mb-6 pb-6 border-b border-gray-100">
            <p className="text-sm text-gray-500">
              Join as {invite.role === "owner" ? "an owner" : "a member"} of
            </p>
            <p className="font-serif text-xl font-bold mt-1">{orgName}</p>
            <span
              className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full ${
                invite.orgType === "venue"
                  ? "bg-blue-50 text-blue-600"
                  : "bg-orange-50 text-orange-600"
              }`}
            >
              {invite.orgType}
            </span>
          </div>

          <InviteSignup token={token} lockedEmail={invite.email} />
        </div>
      </div>
    </div>
  );
}
