import "server-only";

import { prisma } from "@/lib/prisma";
import { parseExperience } from "@/lib/smart-sleeves";

// A join token is either one business's personal invite (SmartSponsor.token)
// or a campaign's shareable invite link (SmartExperience.inviteToken).
export async function resolveJoinToken(token: string) {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return null;
  const sponsor = await prisma.smartSponsor.findUnique({ where: { token }, include: { experience: { include: { venue: true } } } });
  const campaign = sponsor?.experience ?? await prisma.smartExperience.findUnique({ where: { inviteToken: token }, include: { venue: true } });
  if (!campaign || campaign.archivedAt) return null;
  const experience = parseExperience(campaign.config, campaign.id);
  if (!experience || experience.kind !== "board") return null;
  return { sponsor, campaign, experience, venue: campaign.venue };
}
