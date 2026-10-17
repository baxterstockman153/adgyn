"use client";

import { useState } from "react";
import { EXPERIENCE_KINDS, SURFACES, type Cafe, type Experience, type ExperienceKind, type Listing, type SurfaceKind } from "@/lib/smart-sleeves";
import { CustomerExperience } from "./customer-experience";
import { Badge, Button, Field, Icon, Notice } from "./ui";

export function ExperienceEditor({ cafe, initial, demo, canPublish, onSave, onPublish, onBack, onDraftChange, onDiscard }: {
  cafe: Cafe; initial: Experience; demo: boolean; canPublish: boolean;
  onSave: (value: Experience) => void;
  onPublish: (value: Experience) => Promise<string | null>;
  onBack: () => void;
  onDraftChange: (value: Experience) => void;
  onDiscard: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [approved, setApproved] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const update = (patch: Partial<Experience>) => { const next = { ...draft, ...patch }; setDraft(next); onDraftChange(next); setError(""); setApproved(false); };
  const updateListing = (id: string, patch: Partial<Listing>) => update({ entries: draft.entries.map(entry => entry.id === id ? { ...entry, ...patch } : entry) });
  async function publish() {
    if (!approved) { setError("Please confirm these details are approved before publishing."); return; }
    setPending(true);
    try {
      const message = await onPublish(draft);
      if (message) setError(message);
    } catch {
      setError("Publishing didn’t finish. Save your draft and try again.");
    } finally {
      setPending(false);
    }
  }
  return <>
    <button type="button" className="ss-back" onClick={() => { onSave(draft); onBack(); }} disabled={pending}><Icon name="arrow" size={16} /> Save draft & go back</button>
    <div className="ss-heading"><div><div className="ss-eyebrow">Create a connection</div><h1>{initial.name ? "Make it your own." : "What happens after the scan?"}</h1><p>Choose a purpose, add your details, and see exactly what customers see.</p></div><Badge>{demo ? "Demo draft" : "Draft"}</Badge></div>
    <div className="ss-editor-grid">
      <div className="ss-card">
        <section className="ss-editor-section"><div className="ss-section-label"><span className="ss-section-number">1</span><h3>Choose the experience</h3></div><div className="ss-choice-grid">{(Object.keys(EXPERIENCE_KINDS) as ExperienceKind[]).map(kind => <button key={kind} type="button" className="ss-choice" aria-pressed={draft.kind === kind} onClick={() => update({ kind })}><Icon name={EXPERIENCE_KINDS[kind].icon} /><strong>{EXPERIENCE_KINDS[kind].label}</strong><small>{EXPERIENCE_KINDS[kind].description}</small>{draft.kind === kind && <span className="ss-choice-check"><Icon name="check" size={15} /></span>}</button>)}</div></section>
        <section className="ss-editor-section"><div className="ss-section-label"><span className="ss-section-number">2</span><h3>Add the good stuff</h3></div>
          <Field label="Experience name" hint="Only for your team. A clear name makes it easy to find."><input value={draft.name} maxLength={100} onChange={event => update({ name: event.target.value })} placeholder="e.g. Downtown order-ahead sign" /></Field>
          <Field label={draft.kind === "offer" ? "What’s the offer?" : "Customer headline"}><input value={draft.headline} maxLength={200} onChange={event => update({ headline: event.target.value })} placeholder={draft.kind === "offer" ? "e.g. 15% off your first visit" : "e.g. Good things are just around the corner"} /></Field>
          {draft.kind === "link" && <><Field label="Where should customers go?" hint="Use your existing app, ordering, rewards, or newsletter signup link."><input type="url" inputMode="url" value={draft.url} maxLength={2048} onChange={event => update({ url: event.target.value })} placeholder="https://" /></Field><Button variant="quiet" onClick={() => update({ url: cafe.appUrl })}><Icon name="cup" size={15} /> Use our ordering link</Button></>}
          {draft.kind === "offer" && <><Field label="Participating business"><input value={draft.business} maxLength={100} onChange={event => update({ business: event.target.value })} placeholder="Business honoring this offer" /></Field><div className="ss-fields-two"><Field label="Valid through" hint="Through the end of this date, Pacific time."><input type="date" value={draft.expiresOn} onChange={event => update({ expiresOn: event.target.value })} /></Field><Field label="Offer code (optional)"><input value={draft.code} maxLength={40} onChange={event => update({ code: event.target.value })} placeholder="e.g. NEIGHBORS" /></Field></div><Field label="Terms & how to use it"><textarea value={draft.terms} maxLength={1500} onChange={event => update({ terms: event.target.value })} placeholder="e.g. New customers only. Show your saved offer in store. One per person. Cannot be combined with other discounts." /></Field><Notice>A claim means someone saved the offer. After the business honors it, an authorized café owner confirms the redemption separately.</Notice></>}
          {(draft.kind === "board" || draft.kind === "ads") && <>{draft.entries.map((entry, index) => <div key={entry.id} className="ss-listing-editor"><div className="ss-listing-editor-header"><h3>Listing {index + 1}</h3><Button variant="quiet" aria-label={`Remove listing ${index + 1}`} onClick={() => update({ entries: draft.entries.filter(item => item.id !== entry.id) })}><Icon name="close" size={15} /></Button></div><Field label="Business or event name"><input value={entry.name} maxLength={100} onChange={event => updateListing(entry.id, { name: event.target.value })} /></Field><Field label="Category"><select value={entry.category} onChange={event => updateListing(entry.id, { category: event.target.value as Listing["category"] })}>{["Business", "Event", "Nonprofit", "Sponsor"].map(category => <option key={category}>{category}</option>)}</select></Field><Field label="Short description"><textarea value={entry.description} maxLength={400} onChange={event => updateListing(entry.id, { description: event.target.value })} /></Field><Field label="Website or event link"><input type="url" value={entry.url} maxLength={2048} onChange={event => updateListing(entry.id, { url: event.target.value })} placeholder="https://" /></Field></div>)}<Button variant="secondary" disabled={draft.entries.length >= 12} onClick={() => update({ entries: [...draft.entries, { id: crypto.randomUUID(), name: "", description: "", url: "", category: draft.kind === "ads" ? "Sponsor" : "Business" }] })}><Icon name="plus" size={16} /> Add a listing</Button></>}
        </section>
        <section className="ss-editor-section"><div className="ss-section-label"><span className="ss-section-number">3</span><h3>Where will people find it?</h3></div><div className="ss-fields-two"><Field label="Location"><select value={draft.location} onChange={event => update({ location: event.target.value })}>{cafe.locations.map(location => <option key={location}>{location}</option>)}</select></Field><Field label="Physical placement"><select value={draft.surface} onChange={event => update({ surface: event.target.value as SurfaceKind })}>{(Object.keys(SURFACES) as SurfaceKind[]).map(surface => <option key={surface} value={surface}>{SURFACES[surface]}</option>)}</select></Field></div><Notice>Use one QR for each placement to measure them separately. Keep its printed promise consistent when updating the experience.</Notice>{!demo && <label className="ss-check-label"><input type="checkbox" checked={approved} onChange={event => setApproved(event.target.checked)} /> These details, links, and any offer are approved by the participating business.</label>}{error && <p className="ss-error" role="alert">{error}</p>}</section>
        <div className="ss-editor-footer"><small>{demo ? "Saved on this device. Nothing goes live." : "Drafts stay on this device until published."}</small><div className="ss-button-row"><Button variant="quiet" disabled={pending} onClick={() => { if (window.confirm("Discard this draft? Any published version stays available.")) onDiscard(); }}>Discard draft</Button><Button variant="secondary" disabled={pending} onClick={() => onSave(draft)}>Save draft</Button>{demo ? <Button onClick={() => { onSave(draft); onBack(); }}><Icon name="check" size={16} /> Save demo</Button> : <Button disabled={pending || !canPublish} onClick={publish}>{pending ? "Publishing…" : "Publish & get QR"}<Icon name="arrow" size={16} /></Button>}</div></div>
      </div>
      <aside className="ss-preview-column"><div className="ss-preview-label">Live customer preview</div><div className="ss-phone"><div className="ss-phone-top"><span /></div><CustomerExperience key={draft.kind} cafe={cafe} experience={draft} preview /></div><p className="ss-preview-caption">Your brand. Your neighborhood.<br />Updates appear here as you type.</p></aside>
    </div>
  </>;
}
