"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { createClient } from "@/lib/supabase/server";
import { sendTextEmail } from "@/lib/email";
import { cents, isExpired, parseExperience, PLACEMENTS, SLEEVE_DESIGNS, SLEEVE_SIZES, sleeveQuote, validEmail, validUrl, validateExperience, type Placement } from "@/lib/smart-sleeves";
import { shipToText, workspaceOwner } from "@/lib/smart-sleeves-server";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const BASE = "/dashboard/venue/smart-sleeve";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.adgyn.com";
// Who hears about new sleeve orders (they invoice the café by hand in V1).
const ORDER_NOTIFY = (process.env.SLEEVE_ORDER_NOTIFY_EMAILS || "mark.huber153@gmail.com").split(",").map(email => email.trim()).filter(Boolean);

async function run<T extends object>(label: string, work: (venueId: string) => Promise<Result<T>>): Promise<Result<T>> {
  try {
    return await work(await workspaceOwner());
  } catch (error) {
    console.error(`Smart Sleeves: ${label} failed`, error);
    return { ok: false, error: error instanceof Error && error.message.startsWith("Only") ? error.message : `We couldn’t ${label}. Please try again.` };
  }
}

function refresh(campaignId?: string) {
  revalidatePath(BASE, "layout");
  if (campaignId) revalidatePath(`/q/${campaignId}`);
}

async function ownedCampaign(venueId: string, id: string) {
  return prisma.smartExperience.findFirst({ where: { id, venueId }, select: { id: true, config: true, launchedAt: true } });
}

type QrInput = { name: string; placement: string; label: string };
function cleanQr(input: QrInput): QrInput | string {
  const name = String(input.name ?? "").trim();
  const label = String(input.label ?? "").trim();
  if (!name || name.length > 80) return "Give this QR code a name.";
  if (!Object.hasOwn(PLACEMENTS, input.placement)) return "Choose where it will be placed.";
  if (label.length > 60) return "Keep the printed label under 60 characters.";
  return { name, placement: input.placement as Placement, label };
}

type OrderInput = { quantity: number; size: string; design: string; instructions: string };
function cleanOrder(input: OrderInput): OrderInput | string {
  if (!SLEEVE_DESIGNS.some(design => design.id === input.design)) return "Choose a sleeve design.";
  if (!SLEEVE_SIZES.some(size => size.id === input.size)) return "Choose a sleeve size.";
  const instructions = String(input.instructions ?? "").trim();
  if (instructions.length > 1000) return "Please shorten the design notes.";
  return { quantity: sleeveQuote(Number(input.quantity)).quantity, size: input.size, design: input.design, instructions };
}

async function createOrder(venueId: string, campaignId: string, order: OrderInput): Promise<string | null> {
  const venue = await prisma.venue.findUniqueOrThrow({ where: { id: venueId } });
  const shipTo = shipToText(venue);
  if (!shipTo) return "Add your café’s address in Settings → Business details so we know where to ship.";
  const quote = sleeveQuote(order.quantity);
  const created = await prisma.sleeveOrder.create({ data: { venueId, experienceId: campaignId, quantity: quote.quantity, size: order.size, design: order.design, instructions: order.instructions, subtotalCents: quote.subtotal, shippingCents: quote.shipping, taxCents: quote.tax, totalCents: quote.total, shipTo } });
  const result = await sendTextEmail({
    to: ORDER_NOTIFY,
    subject: `New sleeve order — ${venue.name} (${quote.quantity.toLocaleString()} × ${order.size})`,
    text: [`${venue.name} placed a sleeve order. Invoice them and update the status in ${APP_URL}/admin/sleeve-orders.`, "",
      `Order: ${created.id}`, `Design: ${order.design}`, `Size: ${order.size}`, `Quantity: ${quote.quantity.toLocaleString()}`,
      `Total: ${cents(quote.total)} (sleeves ${cents(quote.subtotal)}, shipping ${cents(quote.shipping)}, tax ${cents(quote.tax)})`,
      `Design notes: ${order.instructions || "—"}`, "", "Ship to:", shipTo].join("\n"),
  });
  if (!result.sent) console.error("Sleeve order email not sent", result.error);
  return null;
}

export async function createCampaign(input: { experience: unknown; qr: QrInput; order: OrderInput | null }): Promise<Result<{ id: string }>> {
  return run<{ id: string }>("create your campaign", async venueId => {
    const experience = parseExperience(input.experience);
    if (!experience) return { ok: false, error: "This campaign couldn’t be read. Please check its details." };
    const invalid = validateExperience(experience);
    if (invalid) return { ok: false, error: invalid };
    const qr = cleanQr(input.qr);
    if (typeof qr === "string") return { ok: false, error: qr };
    const order = input.order ? cleanOrder(input.order) : null;
    if (typeof order === "string") return { ok: false, error: order };
    if (order) {
      const venue = await prisma.venue.findUniqueOrThrow({ where: { id: venueId } });
      if (!shipToText(venue)) return { ok: false, error: "Add your café’s address in Settings → Business details so we know where to ship." };
    }
    const campaign = await prisma.smartExperience.create({ data: { venueId, config: experience as unknown as Prisma.InputJsonValue, published: true, launchedAt: new Date() } });
    await prisma.smartQrCode.create({ data: { experienceId: campaign.id, ...qr } });
    if (order) await createOrder(venueId, campaign.id, order);
    refresh();
    return { ok: true, id: campaign.id };
  });
}

export async function saveCampaignContent(id: string, input: unknown): Promise<Result> {
  return run("save your changes", async venueId => {
    const campaign = await ownedCampaign(venueId, id);
    if (!campaign) return { ok: false, error: "Campaign not found." };
    const experience = parseExperience(input, id);
    if (!experience) return { ok: false, error: "These changes couldn’t be read." };
    const invalid = validateExperience(experience);
    if (invalid) return { ok: false, error: invalid };
    await prisma.smartExperience.update({ where: { id }, data: { config: experience as unknown as Prisma.InputJsonValue } });
    refresh(id);
    return { ok: true };
  });
}

export async function setCampaignState(id: string, action: "launch" | "pause" | "archive"): Promise<Result> {
  return run("update this campaign", async venueId => {
    const campaign = await ownedCampaign(venueId, id);
    if (!campaign) return { ok: false, error: "Campaign not found." };
    const data = action === "launch" ? { published: true, archivedAt: null, launchedAt: campaign.launchedAt ?? new Date() }
      : action === "pause" ? { published: false }
      : { published: false, archivedAt: new Date() };
    await prisma.smartExperience.update({ where: { id }, data });
    refresh(id);
    return { ok: true };
  });
}

export async function createQrCode(campaignId: string, input: QrInput): Promise<Result<{ id: string }>> {
  return run<{ id: string }>("create this QR code", async venueId => {
    if (!(await ownedCampaign(venueId, campaignId))) return { ok: false, error: "Campaign not found." };
    const qr = cleanQr(input);
    if (typeof qr === "string") return { ok: false, error: qr };
    const code = await prisma.smartQrCode.create({ data: { experienceId: campaignId, ...qr } });
    refresh();
    return { ok: true, id: code.id };
  });
}

export async function updateQrCode(id: string, input: QrInput): Promise<Result> {
  return run("update this QR code", async venueId => {
    const qr = cleanQr(input);
    if (typeof qr === "string") return { ok: false, error: qr };
    const result = await prisma.smartQrCode.updateMany({ where: { id, experience: { venueId } }, data: qr });
    if (!result.count) return { ok: false, error: "QR code not found." };
    refresh();
    return { ok: true };
  });
}

export async function archiveQrCode(id: string): Promise<Result> {
  return run("remove this QR code", async venueId => {
    const code = await prisma.smartQrCode.findFirst({ where: { id, experience: { venueId } }, select: { experienceId: true } });
    if (!code) return { ok: false, error: "QR code not found." };
    const remaining = await prisma.smartQrCode.count({ where: { experienceId: code.experienceId, archivedAt: null } });
    if (remaining <= 1) return { ok: false, error: "A campaign needs at least one QR code." };
    await prisma.smartQrCode.update({ where: { id }, data: { archivedAt: new Date() } });
    refresh();
    return { ok: true };
  });
}

async function emailSponsorInvite(sponsor: { token: string; email: string; businessName: string; priceCents: number }, cafeName: string, replyTo: string | undefined) {
  const price = sponsor.priceCents ? `The placement is ${cents(sponsor.priceCents)} for this campaign.` : "There’s no cost to be featured.";
  return sendTextEmail({
    to: sponsor.email, replyTo,
    subject: `${cafeName} would like to feature ${sponsor.businessName}`,
    text: [`Hi ${sponsor.businessName},`, "",
      `${cafeName} would like to feature your business on their Community Board — the page their customers see when they scan the QR code on their cups and signs.`, "",
      `${price} It takes about a minute to add your logo and an offer for their customers:`, `${APP_URL}/join/${sponsor.token}`, "",
      `Questions? Just reply to this email.`, "", `— ${cafeName}, via Adgyn`].join("\n"),
  });
}

async function ownerEmail(): Promise<string | undefined> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.email ?? undefined;
}

export async function addSponsor(campaignId: string, input: { businessName: string; email: string; price: number }): Promise<Result<{ emailed: boolean; link: string }>> {
  return run<{ emailed: boolean; link: string }>("add this business", async venueId => {
    const campaign = await prisma.smartExperience.findFirst({ where: { id: campaignId, venueId }, include: { venue: { select: { name: true } } } });
    if (!campaign) return { ok: false, error: "Campaign not found." };
    const businessName = String(input.businessName ?? "").trim();
    const email = String(input.email ?? "").trim().toLowerCase();
    const price = Number(input.price);
    if (!businessName || businessName.length > 100) return { ok: false, error: "Business name is required." };
    if (!validEmail(email)) return { ok: false, error: "Enter a valid email." };
    if (!Number.isFinite(price) || price < 0 || price > 100000) return { ok: false, error: "Enter a valid amount." };
    const sponsor = await prisma.smartSponsor.create({ data: { venueId, experienceId: campaignId, businessName, email, priceCents: Math.round(price * 100), status: "invited" } });
    const sent = await emailSponsorInvite(sponsor, campaign.venue.name, await ownerEmail());
    if (!sent.sent) console.error("Sponsor invite email not sent", sent.error);
    refresh();
    return { ok: true, emailed: sent.sent, link: `${APP_URL}/join/${sponsor.token}` };
  });
}

export async function resendSponsorInvite(id: string): Promise<Result> {
  return run("resend the invite", async venueId => {
    const sponsor = await prisma.smartSponsor.findFirst({ where: { id, venueId }, include: { venue: { select: { name: true } } } });
    if (!sponsor) return { ok: false, error: "Business not found." };
    const sent = await emailSponsorInvite(sponsor, sponsor.venue.name, await ownerEmail());
    return sent.sent ? { ok: true } : { ok: false, error: "The email didn’t send. Copy the invite link and share it directly." };
  });
}

export async function updateSponsor(id: string, patch: { status?: "approved" | "declined"; paid?: boolean; price?: number }): Promise<Result> {
  return run("update this business", async venueId => {
    const sponsor = await prisma.smartSponsor.findFirst({ where: { id, venueId } });
    if (!sponsor) return { ok: false, error: "Business not found." };
    const data: Prisma.SmartSponsorUpdateInput = {};
    if (patch.status === "approved" || patch.status === "declined") {
      if (patch.status === "approved" && !sponsor.offer) return { ok: false, error: "This business hasn’t finished its profile yet." };
      data.status = patch.status;
    }
    if (typeof patch.paid === "boolean") data.paidAt = patch.paid ? new Date() : null;
    if (patch.price !== undefined) {
      if (!Number.isFinite(patch.price) || patch.price < 0 || patch.price > 100000) return { ok: false, error: "Enter a valid amount." };
      data.priceCents = Math.round(patch.price * 100);
    }
    await prisma.smartSponsor.update({ where: { id }, data });
    refresh(sponsor.experienceId);
    return { ok: true };
  });
}

export async function removeSponsor(id: string): Promise<Result> {
  return run("remove this business", async venueId => {
    const result = await prisma.smartSponsor.deleteMany({ where: { id, venueId } });
    if (!result.count) return { ok: false, error: "Business not found." };
    refresh();
    return { ok: true };
  });
}

export async function placeSleeveOrder(campaignId: string, input: OrderInput): Promise<Result> {
  return run("place your order", async venueId => {
    if (!(await ownedCampaign(venueId, campaignId))) return { ok: false, error: "Campaign not found." };
    const order = cleanOrder(input);
    if (typeof order === "string") return { ok: false, error: order };
    const problem = await createOrder(venueId, campaignId, order);
    if (problem) return { ok: false, error: problem };
    refresh();
    return { ok: true };
  });
}

export async function confirmRedemption(id: string): Promise<Result> {
  return run("confirm the redemption", async venueId => {
    const claim = await prisma.smartClaim.findFirst({ where: { id, experience: { venueId } } });
    if (!claim) return { ok: false, error: "Claim not found for this café." };
    if (claim.expiresOn && isExpired(claim.expiresOn)) return { ok: false, error: "This offer has expired and cannot be redeemed." };
    await prisma.smartClaim.updateMany({ where: { id, redeemedAt: null }, data: { redeemedAt: new Date() } });
    refresh();
    return { ok: true };
  });
}

export async function saveProfile(input: { name: string }): Promise<Result> {
  return run("save your profile", async () => {
    const name = String(input.name ?? "").trim();
    if (!name || name.length > 120) return { ok: false, error: "Your name is required." };
    const email = await ownerEmail();
    if (!email) return { ok: false, error: "Please sign in again." };
    await prisma.user.update({ where: { email }, data: { name } });
    refresh();
    return { ok: true };
  });
}

export async function saveBusiness(input: { name: string; websiteUrl: string; street: string; suite: string; city: string; state: string; zip: string }): Promise<Result> {
  return run("save your business details", async venueId => {
    const value = Object.fromEntries(Object.entries(input).map(([key, raw]) => [key, String(raw ?? "").trim()])) as typeof input;
    if (!value.name || value.name.length > 100) return { ok: false, error: "Business name is required." };
    if (value.websiteUrl && !validUrl(value.websiteUrl)) return { ok: false, error: "Enter a full website address, starting with https://." };
    if (!value.street || value.street.length > 200) return { ok: false, error: "Street address is required." };
    if (value.suite.length > 60) return { ok: false, error: "Please shorten the suite or unit." };
    if (!value.city || value.city.length > 100) return { ok: false, error: "City is required." };
    if (!/^[A-Za-z]{2}$/.test(value.state)) return { ok: false, error: "Use a 2-letter state code." };
    if (!/^\d{5}(-\d{4})?$/.test(value.zip)) return { ok: false, error: "Enter a valid ZIP code." };
    const state = value.state.toUpperCase();
    await prisma.venue.update({ where: { id: venueId }, data: {
      name: value.name, websiteUrl: value.websiteUrl || null, street: value.street, suite: value.suite || null, city: value.city, state, zip: value.zip,
      address: `${[value.street, value.suite].filter(Boolean).join(", ")}, ${value.city}, ${state} ${value.zip}`,
    } });
    refresh();
    return { ok: true };
  });
}

const STORAGE_PREFIX = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/logos/`;

export async function saveBranding(input: { logoUrl: string | null; iconUrl: string | null }): Promise<Result> {
  return run("save your branding", async venueId => {
    const ok = (url: string | null) => url === null || url.startsWith(STORAGE_PREFIX);
    if (!ok(input.logoUrl) || !ok(input.iconUrl)) return { ok: false, error: "Upload images with the button above." };
    await prisma.venue.update({ where: { id: venueId }, data: { logoUrl: input.logoUrl, iconUrl: input.iconUrl } });
    refresh();
    return { ok: true };
  });
}
