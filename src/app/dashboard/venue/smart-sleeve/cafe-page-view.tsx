import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";
import { initials, type Cafe } from "@/lib/smart-sleeves";
import { formatEventDate, formatTimeRange, LINK_KINDS, URL_KINDS, type CafeEventView, type PageLinkKind } from "@/lib/cafe-page";
import { Icon } from "./ui";

export type ViewLink = { id: string; kind: PageLinkKind; label: string; href?: string; detail: string };

/** Café branding header + footer shared by the café page, events page, and host form. */
export function CafeFrame({ cafe, tagline, preview = false, children }: { cafe: Cafe; tagline?: string; preview?: boolean; children: ReactNode }) {
  return <div className="ss-customer" style={{ "--cafe-accent": cafe.accent } as CSSProperties}>
    <header className="ss-customer-header">{cafe.logoUrl ? <Image className="ss-customer-logo" src={cafe.logoUrl} alt={cafe.name} width={48} height={48} unoptimized /> : <div className="ss-customer-monogram">{initials(cafe.name)}</div>}<strong>{cafe.name}</strong><span>{tagline || "A little closer to your neighborhood."}</span></header>
    <div className="ss-customer-body">{children}</div>
    <footer className="ss-customer-footer">Powered by <strong>adgyn</strong>{preview && <span>Preview · not public yet</span>}</footer>
  </div>;
}

/** The link hub customers see at /<slug>. `href` is left out in the dashboard preview. */
export function CafePageView({ cafe, tagline, links, preview = false }: { cafe: Cafe; tagline: string; links: ViewLink[]; preview?: boolean }) {
  return <CafeFrame cafe={cafe} tagline={tagline} preview={preview}>
    <nav className="ss-hub-links" aria-label={`${cafe.name} links`}>
      {links.map(link => {
        const external = link.href ? /^https?:/.test(link.href) : URL_KINDS.includes(link.kind);
        const body = <><span className="ss-hub-icon"><Icon name={LINK_KINDS[link.kind].icon} size={19} /></span><span className="ss-hub-text"><strong>{link.label}</strong>{link.detail && <small>{link.detail}</small>}</span><Icon name={external ? "external" : "chevron"} size={15} /></>;
        return link.href ? <a key={link.id} className="ss-hub-link" href={link.href} {...(external ? { target: "_blank", rel: "noopener" } : {})}>{body}</a> : <div key={link.id} className="ss-hub-link">{body}</div>;
      })}
      {!links.length && <div className="ss-customer-empty"><Icon name="link" size={28} /><p>Links you turn on will appear here.</p></div>}
    </nav>
  </CafeFrame>;
}

/** One upcoming event, as customers see it. */
export function EventCard({ event }: { event: Pick<CafeEventView, "title" | "date" | "startTime" | "endTime" | "description" | "eventType"> }) {
  const date = new Date(`${event.date}T12:00:00Z`);
  return <article className="ss-event-card">
    <div className="ss-event-date" aria-hidden="true"><span>{date.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })}</span><strong>{date.getUTCDate()}</strong></div>
    <div><strong>{event.title}</strong><small>{formatEventDate(event.date)} · {formatTimeRange(event.startTime, event.endTime)}</small>{event.description && <p>{event.description}</p>}</div>
  </article>;
}
