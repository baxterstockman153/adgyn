"use client";

import { useState } from "react";
import type { Experience, ExperienceKind, Listing } from "@/lib/smart-sleeves";
import { EXPERIENCE_KINDS, todayPacific } from "@/lib/smart-sleeves";
import { Badge, Button, Field, Icon } from "./ui";

/** Template picker: the five campaign kinds plus a "coming soon" card. */
export function KindPicker({ value, onPick }: { value: ExperienceKind | null; onPick: (kind: ExperienceKind) => void }) {
  return <div className="ss-choice-grid ss-choice-grid-3">
    {(Object.keys(EXPERIENCE_KINDS) as ExperienceKind[]).map(kind => <button key={kind} type="button" className="ss-choice" aria-pressed={value === kind} onClick={() => onPick(kind)}><span className={`ss-type-icon ss-type-icon-${kind}`}><Icon name={EXPERIENCE_KINDS[kind].icon} size={19} /></span><strong>{EXPERIENCE_KINDS[kind].label}</strong><small>{EXPERIENCE_KINDS[kind].description}</small>{value === kind && <span className="ss-choice-check"><Icon name="check" size={15} /></span>}</button>)}
    <div className="ss-choice ss-choice-soon" aria-disabled="true"><span className="ss-type-icon"><Icon name="plus" size={19} /></span><strong>More Experiences <Badge>Coming soon</Badge></strong><small>Menus, events, surveys, and custom landing pages.</small></div>
  </div>;
}

/** The editable content for a campaign of any kind. */
export function ContentFields({ value, onChange }: { value: Experience; onChange: (patch: Partial<Experience>) => void }) {
  const updateListing = (id: string, patch: Partial<Listing>) => onChange({ entries: value.entries.map(entry => entry.id === id ? { ...entry, ...patch } : entry) });
  return <>
    <Field label="Headline"><input value={value.headline} maxLength={200} onChange={event => onChange({ headline: event.target.value })} /></Field>
    <Field label={value.kind === "offer" ? "The offer" : "Message"} hint={value.kind === "offer" ? "e.g. $1 off your next latte" : undefined}><textarea value={value.message} maxLength={500} onChange={event => onChange({ message: event.target.value })} /></Field>
    {value.kind === "link" && <><Field label="Destination URL" hint="Your app, online ordering, rewards, or any website."><input type="text" inputMode="url" autoCapitalize="off" placeholder="https://" value={value.url} maxLength={2048} onChange={event => onChange({ url: event.target.value })} /></Field><Field label="Button label"><input value={value.buttonLabel} maxLength={40} placeholder="Download our app" onChange={event => onChange({ buttonLabel: event.target.value })} /></Field></>}
    {value.kind === "offer" && <><div className="ss-fields-two"><Field label="Honored at"><input value={value.business} maxLength={100} onChange={event => onChange({ business: event.target.value })} /></Field><Field label="Code (optional)"><input value={value.code} maxLength={40} onChange={event => onChange({ code: event.target.value })} /></Field></div><Field label="Valid through (optional)" hint="Through the end of this date, Pacific time."><input type="date" min={todayPacific()} value={value.expiresOn} onChange={event => onChange({ expiresOn: event.target.value })} /></Field><Field label="How to redeem"><textarea value={value.terms} maxLength={1500} onChange={event => onChange({ terms: event.target.value })} /></Field></>}
    {value.kind === "newsletter" && <><Field label="Signup incentive (optional)" hint="e.g. Free pastry on your birthday"><input value={value.incentive} maxLength={200} onChange={event => onChange({ incentive: event.target.value })} /></Field><Field label="Button label"><input value={value.buttonLabel} maxLength={40} onChange={event => onChange({ buttonLabel: event.target.value })} /></Field></>}
    {value.kind === "loyalty" && <><div className="ss-fields-two"><Field label="Reward"><input value={value.reward} maxLength={120} placeholder="10th drink free" onChange={event => onChange({ reward: event.target.value })} /></Field><Field label="Visits needed" hint="Up to 50."><input type="number" min={0} max={50} value={value.stampsNeeded} onChange={event => onChange({ stampsNeeded: Math.max(0, Math.min(50, Number(event.target.value) || 0)) })} /></Field></div><Field label="Button label"><input value={value.buttonLabel} maxLength={40} onChange={event => onChange({ buttonLabel: event.target.value })} /></Field></>}
    {value.kind === "board" && <>
      <Field label="Suggested sponsorship ($)" hint="Shown to businesses on your invite page. You set each business’s final price."><input type="number" min={0} max={100000} step={5} value={value.suggestedPrice} onChange={event => onChange({ suggestedPrice: Math.max(0, Number(event.target.value) || 0) })} /></Field>
      <div className="ss-subhead"><h3>Your own listings</h3><p>Optional. Add events, causes, or friends of the café. Businesses you invite are managed on the campaign page.</p></div>
      {value.entries.map((entry, index) => <div key={entry.id} className="ss-listing-editor"><div className="ss-listing-editor-header"><strong>Listing {index + 1}</strong><Button variant="quiet" aria-label={`Remove listing ${index + 1}`} onClick={() => onChange({ entries: value.entries.filter(item => item.id !== entry.id) })}><Icon name="close" size={15} /></Button></div><div className="ss-fields-two"><Field label="Name"><input value={entry.name} maxLength={100} onChange={event => updateListing(entry.id, { name: event.target.value })} /></Field><Field label="Type"><select value={entry.category} onChange={event => updateListing(entry.id, { category: event.target.value as Listing["category"] })}>{["Business", "Event", "Nonprofit"].map(category => <option key={category}>{category}</option>)}</select></Field></div><Field label="Short description"><input value={entry.description} maxLength={400} onChange={event => updateListing(entry.id, { description: event.target.value })} /></Field><Field label="Link (optional)"><input type="text" inputMode="url" autoCapitalize="off" placeholder="https://" value={entry.url} maxLength={2048} onChange={event => updateListing(entry.id, { url: event.target.value })} /></Field></div>)}
      <Button variant="secondary" disabled={value.entries.length >= 12} onClick={() => onChange({ entries: [...value.entries, { id: crypto.randomUUID(), name: "", description: "", url: "", category: "Event" }] })}><Icon name="plus" size={15} /> Add a listing</Button>
    </>}
  </>;
}

/** "Runs until…" control. `endsOn` "" = until you stop it. */
export function DurationField({ value, onChange }: { value: string; onChange: (endsOn: string) => void }) {
  const in30 = () => todayPacific(Date.now() + 30 * 86_400_000);
  // Kept separately from `value`: a half-typed date reads as "" and must not flip the choice back.
  const [mode, setMode] = useState(value ? "custom" : "ongoing");
  const pick = (next: string) => { setMode(next); onChange(next === "ongoing" ? "" : next === "30" ? in30() : value || in30()); };
  return <div className="ss-fields-two"><Field label="How long should it run?"><select value={mode} onChange={event => pick(event.target.value)}><option value="ongoing">Until I stop it</option><option value="30">30 days</option><option value="custom">Until a date</option></select></Field>{mode !== "ongoing" && <Field label="Last day" hint={mode === "custom" && !value ? "Pick a date, or it will run until you stop it." : "Pacific time."}><input type="date" min={todayPacific()} value={value} disabled={mode === "30"} onChange={event => onChange(event.target.value)} /></Field>}</div>;
}
