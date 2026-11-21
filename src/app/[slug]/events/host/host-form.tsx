"use client";

import { useState, type FormEvent } from "react";
import { formatEventDate, formatTime, formatTimeRange, WEEKDAYS, type EventInput, type EventSpace } from "@/lib/cafe-page";
import { Icon } from "@/app/dashboard/venue/smart-sleeve/ui";
import { requestEvent } from "./actions";

const EMPTY: EventInput = { title: "", eventType: "", date: "", startTime: "", endTime: "", partySize: 0, isPublic: false, description: "", hostName: "", email: "", phone: "", notes: "" };

export function HostForm({ slug, cafeName, space, earliest }: { slug: string; cafeName: string; space: EventSpace; earliest: string }) {
  const [form, setForm] = useState<EventInput>({ ...EMPTY, eventType: space.eventTypes[0] ?? "" });
  const [website, setWebsite] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const set = (patch: Partial<EventInput>) => setForm(current => ({ ...current, ...patch }));
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setPending(true); setError("");
    try {
      const result = await requestEvent(slug, { ...form, website });
      if (result.ok) setSent(true); else setError(result.error);
    } catch { setError("Please check your connection and try again."); }
    finally { setPending(false); }
  }
  if (sent) return <div className="ss-customer-done"><Icon name="check" size={26} /><strong>Request sent!</strong><span>{cafeName} will review it and email you at {form.email}. We sent you a copy of your request.</span><span>{formatEventDate(form.date, { long: true })} · {formatTimeRange(form.startTime, form.endTime)}</span></div>;
  const days = space.days.length === 7 ? "any day" : space.days.map(day => WEEKDAYS[day]).join(", ");
  return <form className="ss-host-form" onSubmit={submit}>
    <label><span>Kind of event</span><select value={form.eventType} onChange={event => set({ eventType: event.target.value })}>{space.eventTypes.map(type => <option key={type}>{type}</option>)}</select></label>
    <label><span>Event name <small>(optional)</small></span><input value={form.title} maxLength={100} placeholder="Maya’s 30th" onChange={event => set({ title: event.target.value })} /></label>
    <label><span>Date</span><input type="date" required min={earliest} value={form.date} onChange={event => set({ date: event.target.value })} /><small>Open {days}{space.noticeDays ? `, at least ${space.noticeDays} ${space.noticeDays === 1 ? "day" : "days"} ahead` : ""}.</small></label>
    <div className="ss-host-row">
      <label><span>Start</span><input type="time" required min={space.opensAt} max={space.closesAt} step={900} value={form.startTime} onChange={event => set({ startTime: event.target.value })} /></label>
      <label><span>End</span><input type="time" required min={space.opensAt} max={space.closesAt} step={900} value={form.endTime} onChange={event => set({ endTime: event.target.value })} /></label>
    </div>
    <small className="ss-host-hint">Between {formatTime(space.opensAt)} and {formatTime(space.closesAt)}.</small>
    <label><span>How many people?</span><input type="number" required min={1} max={space.capacity} inputMode="numeric" value={form.partySize || ""} onChange={event => set({ partySize: Number(event.target.value) })} /><small>Up to {space.capacity}.</small></label>
    <label><span>Your name</span><input required value={form.hostName} maxLength={120} autoComplete="name" onChange={event => set({ hostName: event.target.value })} /></label>
    <label><span>Email</span><input type="email" required value={form.email} maxLength={254} autoComplete="email" onChange={event => set({ email: event.target.value })} /></label>
    <label><span>Phone <small>(optional)</small></span><input type="tel" value={form.phone} maxLength={30} autoComplete="tel" onChange={event => set({ phone: event.target.value })} /></label>
    <label><span>Anything else? <small>(optional)</small></span><textarea value={form.notes} maxLength={1000} placeholder="Setup needs, food and drinks, accessibility…" onChange={event => set({ notes: event.target.value })} /></label>
    <label className="ss-host-check"><input type="checkbox" checked={form.isPublic} onChange={event => set({ isPublic: event.target.checked })} /><span>Anyone can come. List it on {cafeName}’s events page if it’s approved.</span></label>
    {form.isPublic && <label><span>Short description for the events page</span><textarea value={form.description} maxLength={600} placeholder="Bring your sketchbook. All levels welcome." onChange={event => set({ description: event.target.value })} /></label>}
    <input className="ss-honeypot" tabIndex={-1} autoComplete="off" aria-hidden="true" value={website} onChange={event => setWebsite(event.target.value)} />
    {space.policies && <div className="ss-offer-terms"><strong>Good to know</strong><p>{space.policies}</p></div>}
    {error && <p className="ss-error" role="alert">{error}</p>}
    <button type="submit" className="ss-customer-cta" disabled={pending}>{pending ? "Sending…" : "Send request"}<Icon name="arrow" size={17} /></button>
    <small className="ss-customer-url">Only {cafeName} sees your contact details.</small>
  </form>;
}
