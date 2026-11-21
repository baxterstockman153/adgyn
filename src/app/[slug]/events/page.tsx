import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cafeOf, loadPublicCafe, upcomingPublicEvents } from "@/lib/cafe-events-server";
import { formatTime, WEEKDAYS } from "@/lib/cafe-page";
import { CafeFrame, EventCard } from "@/app/dashboard/venue/smart-sleeve/cafe-page-view";
import { Icon } from "@/app/dashboard/venue/smart-sleeve/ui";
import "@/app/dashboard/venue/smart-sleeve/workspace.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const cafe = await loadPublicCafe((await params).slug);
  if (!cafe) return {};
  return { title: `Events at ${cafe.venue.name}`, description: `Upcoming events at ${cafe.venue.name}, and how to host your own in our ${cafe.space.name.toLowerCase()}.` };
}

/** "Mon–Fri" style summary of the bookable days. */
function daysText(days: number[]) {
  if (days.length === 7) return "Every day";
  return days.map(day => WEEKDAYS[day]).join(", ");
}

export default async function EventsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cafe = await loadPublicCafe(slug);
  if (!cafe) notFound();
  const { venue, page, space } = cafe;
  const events = await upcomingPublicEvents(venue.id);
  if (!space.enabled && !events.length) notFound();
  return <div className="ss"><main className="ss-public"><CafeFrame cafe={cafeOf(venue)} tagline={page.tagline}>
    {page.enabled && <Link className="ss-public-back" href={`/${venue.slug}`}><Icon name="chevron" size={14} /> {venue.name}</Link>}
    <span className="ss-customer-eyebrow">Events</span>
    <h2>What’s happening at {venue.name}</h2>
    <section className="ss-event-list" aria-label="Upcoming events">
      {events.length ? events.map(event => <EventCard key={event.id} event={event} />) : <div className="ss-customer-empty"><Icon name="calendar" size={28} /><p>No public events on the calendar right now. Check back soon.</p></div>}
    </section>
    {space.enabled && <section className="ss-host-card">
      <span className="ss-customer-eyebrow">Host your own</span>
      <h3>Book our {space.name.toLowerCase()}</h3>
      {space.description && <p>{space.description}</p>}
      <ul><li><Icon name="users" size={15} /> Up to {space.capacity} people</li><li><Icon name="calendar" size={15} /> {daysText(space.days)}, {formatTime(space.opensAt)} – {formatTime(space.closesAt)}</li></ul>
      <Link className="ss-customer-cta" href={`/${venue.slug}/events/host`}>Request a date <Icon name="arrow" size={17} /></Link>
      <small className="ss-customer-url">{venue.name} reviews every request and replies by email.</small>
    </section>}
  </CafeFrame></main></div>;
}
