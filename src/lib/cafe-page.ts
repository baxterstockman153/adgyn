// Café page + events: shared (client + server) types and helpers.
//
// The café page is a public link hub at /<slug> (events, Community Board,
// menu, merch…). The café picks which links show. It's stored as JSON on
// `venues.cafe_page`; the event space settings live on `venues.event_space`.
// Event requests and the café's own events are `CafeEvent` rows.

import { normalizeUrl, todayPacific, validEmail, validUrl } from "@/lib/smart-sleeves";

export type PageLinkKind = "events" | "board" | "menu" | "merch" | "website" | "instagram" | "custom";

export type PageLink = {
  id: string;
  kind: PageLinkKind;
  label: string;
  url: string; // menu, merch, website, instagram, custom
  campaignId: string; // board: which Community Board campaign
  visible: boolean;
};

export type CafePage = { enabled: boolean; tagline: string; links: PageLink[] };

export type EventSpace = {
  enabled: boolean;
  name: string;
  description: string;
  capacity: number;
  eventTypes: string[];
  days: number[]; // 0 = Sunday
  opensAt: string; // HH:MM
  closesAt: string;
  noticeDays: number; // how far ahead requests must be
  policies: string;
};

export type EventStatus = "pending" | "approved" | "declined" | "canceled";

export type CafeEventView = {
  id: string;
  source: "request" | "cafe";
  status: EventStatus;
  title: string;
  eventType: string;
  date: string;
  startTime: string;
  endTime: string;
  partySize: number;
  isPublic: boolean;
  description: string;
  hostName: string;
  email: string;
  phone: string;
  notes: string;
  replyNote: string;
  createdAt: string;
};

export const LINK_KINDS: Record<PageLinkKind, { label: string; icon: string; hint: string }> = {
  events: { label: "Events", icon: "calendar", hint: "Your upcoming events and a button to request your space." },
  board: { label: "Community Board", icon: "grid", hint: "Offers from neighborhood businesses." },
  menu: { label: "Menu & specials", icon: "cup", hint: "A link to your menu or this week’s specials." },
  merch: { label: "Merchandise", icon: "bag", hint: "Your shop for mugs, beans, and shirts." },
  website: { label: "Website", icon: "external", hint: "Your café’s website." },
  instagram: { label: "Instagram", icon: "camera", hint: "Your Instagram profile." },
  custom: { label: "Link", icon: "link", hint: "Anything else you’d like to share." },
};
export const URL_KINDS: PageLinkKind[] = ["menu", "merch", "website", "instagram", "custom"];
export const MAX_CUSTOM_LINKS = 6;

export const DEFAULT_EVENT_TYPES = ["Birthday", "Meeting or work session", "Baby or bridal shower", "Workshop or class", "Community gathering", "Other"];
export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function defaultCafePage(websiteUrl: string | null = null): CafePage {
  const link = (kind: PageLinkKind, visible: boolean, url = ""): PageLink => ({ id: kind, kind, label: LINK_KINDS[kind].label, url, campaignId: "", visible });
  return { enabled: false, tagline: "", links: [link("events", true), link("menu", false), link("board", true), link("merch", false), link("instagram", false), link("website", !!websiteUrl, websiteUrl ?? "")] };
}

export function defaultEventSpace(): EventSpace {
  return { enabled: false, name: "Event space", description: "", capacity: 30, eventTypes: DEFAULT_EVENT_TYPES, days: [0, 1, 2, 3, 4, 5, 6], opensAt: "09:00", closesAt: "21:00", noticeDays: 3, policies: "" };
}

const str = (value: unknown, max: number) => typeof value === "string" ? value.slice(0, max) : "";
const isTime = (value: unknown): value is string => typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

/** Reads a stored or submitted café page. Missing built-in links are added back (hidden). */
export function parseCafePage(input: unknown, websiteUrl: string | null = null): CafePage {
  const fallback = defaultCafePage(websiteUrl);
  if (!input || typeof input !== "object") return fallback;
  const value = input as Record<string, unknown>;
  const seen = new Set<string>();
  const links = (Array.isArray(value.links) ? value.links : []).flatMap((raw): PageLink[] => {
    if (!raw || typeof raw !== "object") return [];
    const item = raw as Record<string, unknown>;
    const kind = item.kind as PageLinkKind;
    if (!Object.hasOwn(LINK_KINDS, kind) || typeof item.id !== "string" || seen.has(item.id)) return [];
    if (kind !== "custom" && seen.has(kind)) return [];
    seen.add(item.id); seen.add(kind);
    return [{ id: kind === "custom" ? item.id.slice(0, 64) : kind, kind, label: str(item.label, 60) || LINK_KINDS[kind].label, url: normalizeUrl(str(item.url, 2048)), campaignId: str(item.campaignId, 64), visible: item.visible === true }];
  });
  for (const link of fallback.links) if (!seen.has(link.kind)) links.push({ ...link, visible: false });
  return { enabled: value.enabled === true, tagline: str(value.tagline, 160), links: links.slice(0, 6 + MAX_CUSTOM_LINKS) };
}

export function validateCafePage(page: CafePage): string | null {
  if (page.links.filter(link => link.kind === "custom").length > MAX_CUSTOM_LINKS) return `You can add up to ${MAX_CUSTOM_LINKS} extra links.`;
  for (const link of page.links) {
    if (!link.label.trim()) return "Every link needs a label.";
    if (!link.visible) continue;
    if (URL_KINDS.includes(link.kind) && !validUrl(link.url)) return `Add a web address for “${link.label}”, or hide it.`;
  }
  return null;
}

export function parseEventSpace(input: unknown): EventSpace {
  const fallback = defaultEventSpace();
  if (!input || typeof input !== "object") return fallback;
  const value = input as Record<string, unknown>;
  const types = Array.isArray(value.eventTypes) ? value.eventTypes.filter((type): type is string => typeof type === "string" && !!type.trim()).map(type => type.trim().slice(0, 60)).slice(0, 12) : [];
  const days = Array.isArray(value.days) ? [...new Set(value.days.filter((day): day is number => Number.isInteger(day) && day >= 0 && day <= 6))].sort() : fallback.days;
  const int = (raw: unknown, min: number, max: number, otherwise: number) => typeof raw === "number" && Number.isFinite(raw) ? Math.min(max, Math.max(min, Math.round(raw))) : otherwise;
  return {
    enabled: value.enabled === true,
    name: str(value.name, 60) || fallback.name,
    description: str(value.description, 600),
    capacity: int(value.capacity, 1, 1000, fallback.capacity),
    eventTypes: types.length ? types : fallback.eventTypes,
    days,
    opensAt: isTime(value.opensAt) ? value.opensAt : fallback.opensAt,
    closesAt: isTime(value.closesAt) ? value.closesAt : fallback.closesAt,
    noticeDays: int(value.noticeDays, 0, 60, fallback.noticeDays),
    policies: str(value.policies, 1000),
  };
}

export function validateEventSpace(space: EventSpace): string | null {
  if (!space.name.trim()) return "Give your space a name, like “Patio”.";
  if (!space.days.length) return "Pick at least one day people can book.";
  if (space.opensAt >= space.closesAt) return "The space has to open before it closes.";
  if (!space.eventTypes.length) return "Add at least one event type.";
  return null;
}

/** "6:30 PM" for "18:30". */
export function formatTime(value: string): string {
  if (!isTime(value)) return value;
  const [hours, minutes] = value.split(":").map(Number);
  return `${hours % 12 || 12}${minutes ? `:${String(minutes).padStart(2, "0")}` : ""} ${hours < 12 ? "AM" : "PM"}`;
}

export function formatTimeRange(start: string, end: string): string {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

/** "Sat, Dec 6" (adds the year when it isn't this year). */
export function formatEventDate(date: string, { long = false } = {}): string {
  const parsed = new Date(`${date}T12:00:00Z`);
  if (!Number.isFinite(parsed.getTime())) return date;
  const sameYear = date.slice(0, 4) === todayPacific().slice(0, 4);
  return new Intl.DateTimeFormat("en-US", { weekday: long ? "long" : "short", month: long ? "long" : "short", day: "numeric", ...(sameYear ? {} : { year: "numeric" }), timeZone: "UTC" }).format(parsed);
}

export function weekday(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

export function addDays(date: string, days: number): string {
  const parsed = new Date(`${date}T12:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

export function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function overlaps(a: { date: string; startTime: string; endTime: string }, b: { date: string; startTime: string; endTime: string }): boolean {
  return a.date === b.date && a.startTime < b.endTime && b.startTime < a.endTime;
}

export type EventInput = { title: string; eventType: string; date: string; startTime: string; endTime: string; partySize: number; isPublic: boolean; description: string; hostName: string; email: string; phone: string; notes: string };

/** Trims and checks an event. `request` adds the rules a public request must follow. */
export function cleanEvent(input: Partial<EventInput>, space: EventSpace, { request }: { request: boolean }): EventInput | string {
  const text = (value: unknown, max: number) => String(value ?? "").trim().slice(0, max);
  const event: EventInput = {
    title: text(input.title, 100), eventType: text(input.eventType, 60), date: text(input.date, 10),
    startTime: text(input.startTime, 5), endTime: text(input.endTime, 5), partySize: Math.round(Number(input.partySize) || 0),
    isPublic: input.isPublic === true, description: text(input.description, 600), hostName: text(input.hostName, 120),
    email: text(input.email, 254).toLowerCase(), phone: text(input.phone, 30), notes: text(input.notes, 1000),
  };
  if (!validDate(event.date)) return "Choose a date.";
  if (!isTime(event.startTime) || !isTime(event.endTime)) return "Choose a start and end time.";
  if (event.startTime >= event.endTime) return "The event has to end after it starts.";
  if (event.partySize < 0 || event.partySize > 1000) return "Enter how many people are coming.";
  if (event.email && !validEmail(event.email)) return "Enter a valid email.";
  if (!request) {
    if (!event.title) return "Give the event a name.";
    return { ...event, eventType: event.eventType || "Other" };
  }
  const today = todayPacific();
  if (!space.eventTypes.includes(event.eventType)) return "Choose the kind of event.";
  if (!event.hostName) return "Add your name.";
  if (!event.email) return "Add your email so the café can reply.";
  if (event.partySize < 1) return "Enter how many people are coming.";
  if (event.partySize > space.capacity) return `The ${space.name.toLowerCase()} fits up to ${space.capacity} people.`;
  if (event.date < addDays(today, space.noticeDays)) return space.noticeDays ? `Please request at least ${space.noticeDays} ${space.noticeDays === 1 ? "day" : "days"} ahead.` : "Choose a date that hasn’t passed.";
  if (event.date > addDays(today, 365)) return "Choose a date within the next year.";
  if (!space.days.includes(weekday(event.date))) return `The space isn’t available on ${WEEKDAYS[weekday(event.date)]}s. Try another day.`;
  if (event.startTime < space.opensAt || event.endTime > space.closesAt) return `Pick a time between ${formatTime(space.opensAt)} and ${formatTime(space.closesAt)}.`;
  return { ...event, title: event.title || `${event.eventType} · ${event.hostName}` };
}

/** UTC instant for a Pacific wall-clock date + time. */
export function pacificToUtc(date: string, time: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  const guess = Date.UTC(year, month - 1, day, hours, minutes);
  const offset = (instant: number) => {
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(instant).map(part => [part.type, part.value]));
    return Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute)) - instant;
  };
  return new Date(guess - offset(guess - offset(guess)));
}

const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

type CalendarEvent = { id: string; title: string; date: string; startTime: string; endTime: string; description: string; location: string };

/** An .ics file (one event) that Google, Apple, and Outlook calendars can import. */
export function icsFile(event: CalendarEvent): string {
  const escape = (value: string) => value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, match => `\\${match}`);
  const fold = (line: string) => line.length <= 74 ? line : (line.match(/.{1,74}/g) ?? [line]).join("\r\n ");
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Adgyn//Cafe events//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "BEGIN:VEVENT",
    `UID:${event.id}@adgyn.com`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(pacificToUtc(event.date, event.startTime))}`, `DTEND:${stamp(pacificToUtc(event.date, event.endTime))}`,
    `SUMMARY:${escape(event.title)}`, `DESCRIPTION:${escape(event.description)}`, `LOCATION:${escape(event.location)}`, "END:VEVENT", "END:VCALENDAR"].map(fold).join("\r\n") + "\r\n";
}

export function googleCalendarUrl(event: CalendarEvent): string {
  const params = new URLSearchParams({ action: "TEMPLATE", text: event.title, dates: `${stamp(pacificToUtc(event.date, event.startTime))}/${stamp(pacificToUtc(event.date, event.endTime))}`, details: event.description, location: event.location });
  return `https://calendar.google.com/calendar/render?${params}`;
}
