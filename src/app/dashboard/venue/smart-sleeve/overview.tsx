"use client";

import type { ReactNode } from "react";
import type { Cafe, Experience, ExperienceKind } from "@/lib/smart-sleeves";
import { Badge, Button, Icon } from "./ui";

export function Overview({ cafe, demo, experiences, published, create, edit, share, navigate, renderRow }: {
  cafe: Cafe; demo: boolean; experiences: Experience[]; published: Experience[];
  create: (kind?: ExperienceKind) => void; edit: (value: Experience) => void; share: (value: Experience) => void;
  navigate: (view: "experiences" | "sleeves") => void; renderRow: (value: Experience) => ReactNode;
}) {
  const total = (key: "visits" | "claims" | "redemptions") => published.reduce((sum, experience) => sum + experience[key], 0);
  const steps = [
    { title: "Make it yours", detail: "Choose a purpose and add your content.", done: experiences.length > 0, action: () => experiences.length ? edit(experiences[0]) : create() },
    { title: "Put it in the world", detail: "Publish, download, and test your QR.", done: published.length > 0, action: () => published.length ? share(published[0]) : navigate("experiences") },
    { title: "See what connects", detail: "Learn from visits, claims, and redemptions.", done: total("visits") > 0, action: () => navigate("experiences") },
  ];
  return <>
    <div className="ss-heading"><div><div className="ss-eyebrow">Your neighborhood, connected</div><h1>Good things start here.</h1><p>Turn everyday café moments into meaningful connections.</p></div><Button onClick={() => create()}><Icon name="plus" size={16} /> Create an experience</Button></div>
    <div className="ss-dashboard-grid"><div className="ss-stack">
      <section className="ss-hero"><div><div className="ss-eyebrow">Small code. Big possibilities.</div><h2>Your next connection is just a scan away.</h2><p>Bring customers to your app, share a local offer, or introduce a neighbor. You choose what comes next.</p><Button onClick={() => create(cafe.slug === "gratitude" ? "offer" : "link")}>Let’s create something<Icon name="arrow" size={15} /></Button></div><div className="ss-sleeve-art" aria-hidden="true"><div className="ss-paper-cup"><div className="ss-paper-sleeve"><Icon name="qr" size={30} /><span>good things, nearby.</span></div></div></div></section>
      <div><div className="ss-stats"><div className="ss-stat"><span>Published experiences</span><strong>{published.length}</strong><small>{demo ? "Nothing is live in this demo" : "Ready for your customers"}</small></div><div className="ss-stat"><span>Customer visits</span><strong>{total("visits")}</strong><small>{demo ? "No sample activity included" : "All channels · all time"}</small></div><div className="ss-stat"><span>Offers claimed</span><strong>{total("claims")}</strong><small>{total("redemptions")} confirmed redemptions</small></div></div><p className="ss-stat-note">{demo ? "These counts start at zero. Sample content never appears as customer results." : "Visits include tagged QR, email, social, and direct traffic. Repeat events within 30 minutes are counted once per session and channel."}</p></div>
      <section className="ss-card"><div className="ss-card-header"><div><h3>Your experiences</h3><p>A purpose for every little touchpoint.</p></div><Button variant="quiet" onClick={() => navigate("experiences")}>View all<Icon name="arrow" size={14} /></Button></div>{experiences.length ? experiences.slice(0, 3).map(renderRow) : <div className="ss-empty"><Icon name="qr" size={30} /><h3>Your first experience starts here.</h3><p>No setup maze. Choose what a scan should do, then make it yours.</p><Button variant="secondary" onClick={() => create()}>Create your first experience</Button></div>}</section>
    </div><aside className="ss-stack">
      <section className="ss-card ss-card-pad"><Badge tone="green">Your first little launch</Badge><h3 style={{ marginTop: 16 }}>Three steps to a new connection.</h3><div className="ss-progress-track"><div style={{ width: `${steps.filter(step => step.done).length / 3 * 100}%` }} /></div><div className="ss-checklist">{steps.map((step, index) => <button type="button" key={step.title} onClick={step.action}><span className={`ss-check-circle ${step.done ? "ss-check-circle-done" : ""}`}>{step.done ? <Icon name="check" size={13} /> : index + 1}</span><span><strong>{step.title}</strong><small>{step.detail}</small></span></button>)}</div></section>
      <section className="ss-tip"><Icon name="leaf" size={25} /><h3>Give people a reason to scan.</h3><p>A clear offer or a helpful next step works harder than “scan me.” Keep one promise on each printed placement.</p><Button variant="quiet" onClick={() => create("offer")}>Try an offer<Icon name="arrow" size={14} /></Button></section>
      <section className="ss-card ss-card-pad"><div className="ss-eyebrow">Your materials, your choice</div><h3>Already have packaging?</h3><p className="ss-detail-text" style={{ margin: "10px 0" }}>Keep your supplier. Use your QR on sleeves, signs, tables, or bags.</p><Button variant="quiet" onClick={() => navigate("sleeves")}>Explore your pilot<Icon name="arrow" size={14} /></Button></section>
    </aside></div>
  </>;
}
