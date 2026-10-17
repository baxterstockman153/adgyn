"use client";

import { useState } from "react";
import type { Cafe } from "@/lib/smart-sleeves";
import { Badge, Button, Icon } from "./ui";

export type ProspectStatus = "new" | "contacted" | "replied";
export type Prospect = { id: string; name: string; category: string; distance: string; status: ProspectStatus; reply?: string };

export const INITIAL_PROSPECTS: Prospect[] = [
  { id: "p-gabbys", name: "Gabby’s Good Dogs", category: "Food · Hot dogs", distance: "0.1 mi", status: "replied", reply: "Love this idea — we’re in! What does it cost to be featured for a month?" },
  { id: "p-cbfit", name: "CB Fit", category: "Fitness · Gym", distance: "0.3 mi", status: "contacted" },
  { id: "p-pizza", name: "Pizza Bocca Lupo", category: "Restaurant · Italian", distance: "0.2 mi", status: "new" },
  { id: "p-breathe", name: "Breathe Together", category: "Fitness · Yoga", distance: "0.5 mi", status: "new" },
  { id: "p-tint", name: "Tint World", category: "Retail · Auto", distance: "0.6 mi", status: "new" },
  { id: "p-bloom", name: "Bloom & Co. Florals", category: "Retail · Florist", distance: "0.4 mi", status: "new" },
];

const STATUS: Record<ProspectStatus, { label: string; tone: "neutral" | "amber" | "green" }> = {
  new: { label: "Not contacted", tone: "neutral" },
  contacted: { label: "Contacted", tone: "amber" },
  replied: { label: "Replied", tone: "green" },
};

export function Outreach({ cafe, prospects, onUpdate, notify }: {
  cafe: Cafe;
  prospects: Prospect[];
  onUpdate: (next: Prospect[]) => void;
  notify: (message: string) => void;
}) {
  const [filter, setFilter] = useState<"all" | ProspectStatus>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const counts = { contacted: prospects.filter(p => p.status !== "new").length, replied: prospects.filter(p => p.status === "replied").length };
  const visible = prospects.filter(prospect => filter === "all" || prospect.status === filter);
  const open = prospects.find(prospect => prospect.id === openId) ?? null;

  const intro = (name: string) => `Hi ${name} team,\n\nWe’re ${cafe.name}, your neighbors just down the street. We put QR codes on our coffee sleeves and feature a few local businesses on them each month — hundreds of customers see them.\n\nWould you be interested in being featured? Happy to share the details.\n\nThanks,\n${cafe.name}`;

  function openProspect(prospect: Prospect) {
    setOpenId(prospect.id);
    setMessage(prospect.status === "new" ? intro(prospect.name) : "");
  }
  function send() {
    if (!open) return;
    onUpdate(prospects.map(prospect => prospect.id === open.id ? { ...prospect, status: open.status === "new" ? "contacted" : prospect.status } : prospect));
    notify(open.status === "replied" ? `Reply sent to ${open.name}.` : open.status === "contacted" ? `Follow-up sent to ${open.name}.` : `Intro sent to ${open.name}.`);
    setOpenId(null); setMessage("");
  }

  return <>
    <div className="ss-heading"><div><div className="ss-eyebrow">Outreach</div><h1>Find sponsors for your sleeves</h1><p>Invite local businesses to be featured. Send a friendly intro and track who replies.</p></div><div className="ss-badge">{counts.contacted} contacted · {counts.replied} replied</div></div>

    <div className="ss-compose-grid">
      <div>
        <div className="ss-filter-tabs" style={{ marginBottom: 16 }}>{([["all", "All"], ["new", "Not contacted"], ["contacted", "Contacted"], ["replied", "Replied"]] as const).map(([value, label]) => <button type="button" key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</div>
        <div className="ss-card">
          {visible.length ? visible.map(prospect => <div className="ss-contact" key={prospect.id}>
            <div className="av">{prospect.name.replace(/[^a-zA-Z]/g, "")[0]?.toUpperCase()}</div>
            <div className="who"><strong>{prospect.name}</strong><small>{prospect.category} · {prospect.distance}</small></div>
            <Badge tone={STATUS[prospect.status].tone}>{STATUS[prospect.status].label}</Badge>
            <Button variant={prospect.status === "new" ? "primary" : "secondary"} onClick={() => openProspect(prospect)}>{prospect.status === "replied" ? "View reply" : prospect.status === "contacted" ? "Follow up" : "Reach out"}</Button>
          </div>) : <div className="ss-empty"><Icon name="heart" size={30} /><h3>Nobody here.</h3><p>Try another filter.</p></div>}
        </div>
      </div>

      <aside style={{ position: "sticky", top: 25 }}>
        {open ? <div className="ss-card ss-card-pad">
          <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 14 }}>
            <div className="av" style={{ width: 40, height: 40, borderRadius: 11, background: "#f2e6de", color: "#885436", fontWeight: 700, display: "grid", placeItems: "center" }}>{open.name.replace(/[^a-zA-Z]/g, "")[0]?.toUpperCase()}</div>
            <div style={{ flex: 1, minWidth: 0 }}><strong style={{ fontSize: 14 }}>{open.name}</strong><div style={{ fontSize: 11.5, color: "var(--ss-muted)" }}>{open.category} · {open.distance}</div></div>
            <Badge tone={STATUS[open.status].tone}>{STATUS[open.status].label}</Badge>
          </div>

          {open.status === "replied" && <div style={{ background: "#eef3ec", border: "1px solid #dbe6d7", borderRadius: 11, padding: "11px 13px", marginBottom: 13 }}><div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#4e7257", marginBottom: 4 }}>{open.name} replied</div><p style={{ fontSize: 12.5, color: "#3f4a3e", lineHeight: 1.5 }}>“{open.reply}”</p></div>}

          {open.status === "contacted" && <p className="ss-detail-text" style={{ marginBottom: 12 }}>Intro sent — waiting to hear back. Send a friendly follow-up if it’s been a while.</p>}

          <label className="ss-field"><span>{open.status === "replied" ? "Your reply" : open.status === "contacted" ? "Follow-up" : "Your intro"}</span><textarea rows={open.status === "new" ? 9 : 4} value={message} onChange={event => setMessage(event.target.value)} placeholder={open.status === "replied" ? "Thanks for the interest! Here’s how it works…" : "Write a quick note…"} /></label>
          <div className="ss-button-row"><Button onClick={send} disabled={!message.trim()}><Icon name="mail" size={15} /> {open.status === "replied" ? "Send reply" : open.status === "contacted" ? "Send follow-up" : "Send intro"}</Button><Button variant="quiet" onClick={() => { setOpenId(null); setMessage(""); }}>Cancel</Button></div>
          <p className="ss-detail-text" style={{ marginTop: 12, fontSize: 11 }}>Demo — no email is actually sent.</p>
        </div> : <div className="ss-card ss-card-pad" style={{ textAlign: "center", color: "var(--ss-muted)" }}><div className="ss-type-icon ss-type-icon-offer" style={{ margin: "0 auto 12px" }}><Icon name="heart" size={20} /></div><h3 style={{ color: "var(--ss-ink)" }}>Grow your sponsor list</h3><p style={{ fontSize: 12.5, marginTop: 8, lineHeight: 1.6 }}>Pick a local business on the left and send a friendly intro. Replies show up right here.</p></div>}
      </aside>
    </div>
  </>;
}
