import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cafeOf, loadPublicCafe } from "@/lib/cafe-events-server";
import { addDays } from "@/lib/cafe-page";
import { todayPacific } from "@/lib/smart-sleeves";
import { CafeFrame } from "@/app/dashboard/venue/smart-sleeve/cafe-page-view";
import { Icon } from "@/app/dashboard/venue/smart-sleeve/ui";
import { HostForm } from "./host-form";
import "@/app/dashboard/venue/smart-sleeve/workspace.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const cafe = await loadPublicCafe((await params).slug);
  if (!cafe?.space.enabled) return {};
  return { title: `Host an event at ${cafe.venue.name}`, description: `Request ${cafe.venue.name}’s ${cafe.space.name.toLowerCase()} for your next event.` };
}

export default async function HostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cafe = await loadPublicCafe(slug);
  if (!cafe?.space.enabled) notFound();
  const { venue, page, space } = cafe;
  return <div className="ss"><main className="ss-public"><CafeFrame cafe={cafeOf(venue)} tagline={page.tagline}>
    <Link className="ss-public-back" href={`/${venue.slug}/events`}><Icon name="chevron" size={14} /> Events</Link>
    <span className="ss-customer-eyebrow">Host an event</span>
    <h2>Request our {space.name.toLowerCase()}</h2>
    <p>Tell {venue.name} about your event. They’ll review it and reply by email.</p>
    <HostForm slug={venue.slug} cafeName={venue.name} space={space} earliest={addDays(todayPacific(), space.noticeDays)} />
  </CafeFrame></main></div>;
}
