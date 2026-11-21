"use client";

import { useCallback, useMemo, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { todayPacific } from "@/lib/smart-sleeves";
import { formatEventDate, formatTime, formatTimeRange, googleCalendarUrl, icsFile, overlaps, WEEKDAYS, type CafeEventView, type EventInput, type EventSpace } from "@/lib/cafe-page";
import { addCafeEvent, decideEvent, saveEventSpace } from "../actions";
import { Badge, Button, copyText, downloadText, Field, Icon, Modal, Notice, Toast } from "../ui";

type Tab = "requests" | "calendar" | "settings";
type Decision = { event: CafeEventView; status: "approved" | "declined" | "canceled" };

export function EventsView({ canEdit, events, space, publicUrl, location }: { canEdit: boolean; events: CafeEventView[]; space: EventSpace; publicUrl: string; location: string }) {
  const router = useRouter();
  const pending = events.filter(event => event.status === "pending");
  const booked = events.filter(event => event.status === "approved");
  const [tab, setTab] = useState<Tab>(pending.length ? "requests" : space.enabled ? "calendar" : "settings");
  const [toast, setToast] = useState("");
  const [decision, setDecision] = useState<Decision | null>(null);
  const [open, setOpen] = useState<CafeEventView | null>(null);
  const [adding, setAdding] = useState<string | null>(null); // the date to start the new event on
  const clearToast = useCallback(() => setToast(""), []);
  const done = (message: string) => { setToast(message); router.refresh(); };
  async function copy() {
    try { await copyText(publicUrl); setToast("Link copied."); } catch (error) { setToast(error instanceof Error ? error.message : "Copy didn’t work."); }
  }
  return <>
    <div className="ss-heading"><div><div className="ss-eyebrow">Events</div><h1>Events</h1><p>Requests to use your {space.name.toLowerCase()}, and everything on your calendar.</p></div>{canEdit && <Button onClick={() => setAdding(todayPacific())}><Icon name="plus" size={15} /> Add event</Button>}</div>
    <div className="ss-card ss-card-pad ss-section ss-events-share">
      <div><h3>Your events page</h3><p className="ss-detail-text">{space.enabled ? "Share it on Instagram, Google Maps, your website, or in a text. People see your public events and can request your space." : "Turn on requests in Settings so people can ask to book your space from this page."}</p></div>
      <div className="ss-share-box">{publicUrl}</div>
      <div className="ss-button-row"><Button variant="secondary" onClick={copy}><Icon name="copy" size={15} /> Copy link</Button><a className="ss-button ss-button-quiet" href={publicUrl} target="_blank" rel="noopener"><Icon name="external" size={15} /> Open</a></div>
    </div>
    <div className="ss-filter-tabs ss-section-tabs">
      {([["requests", `Requests${pending.length ? ` (${pending.length})` : ""}`], ["calendar", "Calendar"], ["settings", "Settings"]] as const).map(([id, label]) => <button key={id} type="button" aria-pressed={tab === id} onClick={() => setTab(id)}>{label}</button>)}
    </div>
    {tab === "requests" && <div className="ss-card">{pending.length ? pending.map(event => <RequestRow key={event.id} event={event} booked={booked} canEdit={canEdit} onDecide={status => setDecision({ event, status })} />) : <div className="ss-empty"><Icon name="calendar" size={32} /><h3>No requests waiting</h3><p>{space.enabled ? "New requests from your events page show up here, and we email you about each one." : "Turn on event requests in Settings to start getting them."}</p></div>}</div>}
    {tab === "calendar" && <Calendar events={events} onOpen={setOpen} onAdd={canEdit ? setAdding : undefined} />}
    {tab === "settings" && <SpaceSettings initial={space} canEdit={canEdit} onSaved={() => done("Event space saved.")} />}
    {decision && <DecisionModal decision={decision} onClose={() => setDecision(null)} onDone={message => { setDecision(null); setOpen(null); done(message); }} />}
    {open && <EventModal event={open} location={location} canEdit={canEdit} onClose={() => setOpen(null)} onCancel={() => setDecision({ event: open, status: "canceled" })} onDecide={status => setDecision({ event: open, status })} />}
    {adding && <AddEventModal space={space} date={adding} booked={booked} onClose={() => setAdding(null)} onDone={() => { setAdding(null); done("Event added to your calendar."); }} />}
    <Toast message={toast} onClose={clearToast} />
  </>;
}

function RequestRow({ event, booked, canEdit, onDecide }: { event: CafeEventView; booked: CafeEventView[]; canEdit: boolean; onDecide: (status: "approved" | "declined") => void }) {
  const conflict = booked.find(other => overlaps(event, other));
  return <div className="ss-request">
    <div className="ss-request-main">
      <div className="ss-request-title"><strong>{event.title}</strong><Badge>{event.eventType}</Badge>{event.isPublic && <Badge tone="green">Open to the public</Badge>}</div>
      <p className="ss-request-when"><Icon name="calendar" size={15} /> {formatEventDate(event.date, { long: true })} · {formatTimeRange(event.startTime, event.endTime)} · {event.partySize} {event.partySize === 1 ? "person" : "people"}</p>
      <p className="ss-detail-text">{event.hostName} · <a href={`mailto:${event.email}`}>{event.email}</a>{event.phone && <> · <a href={`tel:${event.phone}`}>{event.phone}</a></>}</p>
      {event.notes && <p className="ss-request-notes">“{event.notes}”</p>}
      {conflict && <p className="ss-request-conflict"><Icon name="info" size={14} /> Overlaps with {conflict.title} ({formatTimeRange(conflict.startTime, conflict.endTime)})</p>}
    </div>
    {canEdit && <div className="ss-button-row"><Button onClick={() => onDecide("approved")}><Icon name="check" size={15} /> Approve</Button><Button variant="secondary" onClick={() => onDecide("declined")}>Decline</Button></div>}
  </div>;
}

function monthKey(date: string) { return date.slice(0, 7); }
function shiftMonth(month: string, by: number) {
  const [year, index] = month.split("-").map(Number);
  const next = new Date(Date.UTC(year, index - 1 + by, 1));
  return next.toISOString().slice(0, 7);
}

function Calendar({ events, onOpen, onAdd }: { events: CafeEventView[]; onOpen: (event: CafeEventView) => void; onAdd?: (date: string) => void }) {
  const today = todayPacific();
  const [month, setMonth] = useState(monthKey(today));
  const cells = useMemo(() => {
    const first = new Date(`${month}-01T12:00:00Z`);
    const start = new Date(first);
    start.setUTCDate(1 - first.getUTCDay());
    return Array.from({ length: 42 }, (_, index) => { const day = new Date(start); day.setUTCDate(start.getUTCDate() + index); return day.toISOString().slice(0, 10); });
  }, [month]);
  const byDate = useMemo(() => {
    const map = new Map<string, CafeEventView[]>();
    for (const event of events) map.set(event.date, [...(map.get(event.date) ?? []), event]);
    return map;
  }, [events]);
  const upcoming = events.filter(event => event.status === "approved" && event.date >= today);
  const label = new Date(`${month}-01T12:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  const visibleRows = cells.slice(35).some(date => monthKey(date) === month) ? 6 : 5;
  return <>
    <div className="ss-card ss-section">
      <div className="ss-card-header"><div><h3>{label}</h3><p>Booked events, with pending requests dashed.</p></div><div className="ss-button-row"><Button variant="secondary" aria-label="Previous month" onClick={() => setMonth(shiftMonth(month, -1))}><Icon name="chevron" size={15} /></Button><Button variant="secondary" onClick={() => setMonth(monthKey(today))}>Today</Button><Button variant="secondary" aria-label="Next month" onClick={() => setMonth(shiftMonth(month, 1))}><Icon name="chevron" size={15} /></Button></div></div>
      <div className="ss-calendar-scroll"><div className="ss-calendar" role="grid" aria-label={label}>
        {WEEKDAYS.map(day => <div key={day} className="ss-calendar-weekday" role="columnheader">{day}</div>)}
        {cells.slice(0, visibleRows * 7).map(date => <div key={date} role="gridcell" className={`ss-calendar-day${monthKey(date) !== month ? " ss-calendar-out" : ""}${date === today ? " ss-calendar-today" : ""}`}>
          {onAdd && date >= today ? <button type="button" className="ss-calendar-number" aria-label={`Add an event on ${formatEventDate(date)}`} onClick={() => onAdd(date)}>{Number(date.slice(8))}</button> : <span className="ss-calendar-number">{Number(date.slice(8))}</span>}
          {(byDate.get(date) ?? []).map(event => <button key={event.id} type="button" className={`ss-calendar-event${event.status === "pending" ? " ss-calendar-pending" : ""}`} onClick={() => onOpen(event)} title={`${event.title} · ${formatTimeRange(event.startTime, event.endTime)}`}><span>{formatTime(event.startTime)}</span> {event.title}</button>)}
        </div>)}
      </div></div>
    </div>
    <div className="ss-card"><div className="ss-card-header"><div><h3>Coming up</h3><p>Everything booked from today on.</p></div></div>
      {upcoming.length ? upcoming.map(event => <button key={event.id} type="button" className="ss-experience-row ss-upcoming-row" onClick={() => onOpen(event)}>
        <div className="ss-event-date" aria-hidden="true"><span>{new Date(`${event.date}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })}</span><strong>{Number(event.date.slice(8))}</strong></div>
        <div className="ss-row-text"><strong>{event.title}</strong><small>{formatEventDate(event.date)} · {formatTimeRange(event.startTime, event.endTime)}{event.partySize ? ` · ${event.partySize} people` : ""}</small></div>
        {event.isPublic ? <Badge tone="green">Public</Badge> : <Badge>Private</Badge>}
        <Icon name="chevron" size={16} />
      </button>) : <div className="ss-empty"><Icon name="calendar" size={30} /><h3>Nothing booked yet</h3><p>Approved requests and events you add show up here.</p></div>}
    </div>
  </>;
}

function EventModal({ event, location, canEdit, onClose, onCancel, onDecide }: { event: CafeEventView; location: string; canEdit: boolean; onClose: () => void; onCancel: () => void; onDecide: (status: "approved" | "declined") => void }) {
  const calendar = { id: event.id, title: event.title, date: event.date, startTime: event.startTime, endTime: event.endTime, description: [event.hostName && `Host: ${event.hostName}`, event.email, event.phone, event.notes].filter(Boolean).join("\n"), location };
  return <Modal title={event.title} description={`${formatEventDate(event.date, { long: true })} · ${formatTimeRange(event.startTime, event.endTime)}`} onClose={onClose}>
    <dl className="ss-summary ss-summary-flat">
      <div><dt>Status</dt><dd>{event.status === "pending" ? "Waiting for your answer" : "Booked"} · {event.isPublic ? "Shown on your events page" : "Private"}</dd></div>
      <div><dt>Type</dt><dd>{event.eventType}{event.partySize ? ` · ${event.partySize} people` : ""}</dd></div>
      {(event.hostName || event.email) && <div><dt>Host</dt><dd>{event.hostName}{event.email && <> · <a href={`mailto:${event.email}`}>{event.email}</a></>}{event.phone && <> · {event.phone}</>}</dd></div>}
      {event.description && <div><dt>Description</dt><dd>{event.description}</dd></div>}
      {event.notes && <div><dt>Notes</dt><dd>{event.notes}</dd></div>}
      {event.replyNote && <div><dt>Your note</dt><dd>{event.replyNote}</dd></div>}
    </dl>
    <div className="ss-modal-actions">
      {event.status === "approved" ? <>
        <a className="ss-button ss-button-secondary" href={googleCalendarUrl(calendar)} target="_blank" rel="noopener"><Icon name="calendar" size={15} /> Google Calendar</a>
        <Button variant="secondary" onClick={() => downloadText(`${event.title.replace(/[^\w-]+/g, "-").toLowerCase() || "event"}.ics`, icsFile(calendar), "text/calendar")}><Icon name="download" size={15} /> .ics file</Button>
        {canEdit && <Button variant="secondary" className="danger" onClick={onCancel}>Cancel event</Button>}
      </> : canEdit && <><Button variant="secondary" onClick={() => onDecide("declined")}>Decline</Button><Button onClick={() => onDecide("approved")}><Icon name="check" size={15} /> Approve</Button></>}
    </div>
  </Modal>;
}

function DecisionModal({ decision, onClose, onDone }: { decision: Decision; onClose: () => void; onDone: (message: string) => void }) {
  const { event, status } = decision;
  const [note, setNote] = useState("");
  const [isPublic, setIsPublic] = useState(event.isPublic);
  const [notify, setNotify] = useState(!!event.email && event.source === "request");
  const [error, setError] = useState("");
  const [busy, startTransition] = useTransition();
  const canEmail = !!event.email && event.source === "request";
  const copy = {
    approved: { title: "Approve this event", button: "Approve", placeholder: "See you then! We’ll have the patio set up by 5:30." },
    declined: { title: "Decline this request", button: "Decline", placeholder: "We’re booked that evening. Would the 14th work?" },
    canceled: { title: "Cancel this event", button: "Cancel event", placeholder: "Sorry, we have to close early that day." },
  }[status];
  function submit(form: FormEvent) {
    form.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await decideEvent(event.id, { status, note, isPublic, notify });
      if (!result.ok) { setError(result.error); return; }
      const verb = status === "approved" ? "Approved" : status === "declined" ? "Declined" : "Canceled";
      onDone(`${verb}.${notify ? result.emailed ? ` We emailed ${event.hostName || event.email}.` : " The email didn’t send, so let them know directly." : ""}`);
    });
  }
  return <Modal title={copy.title} description={`${event.title} · ${formatEventDate(event.date)} · ${formatTimeRange(event.startTime, event.endTime)}`} onClose={onClose}>
    <form onSubmit={submit}>
      {status === "approved" && <label className="ss-check-label" style={{ marginTop: 0, marginBottom: 14 }}><input type="checkbox" checked={isPublic} onChange={changed => setIsPublic(changed.target.checked)} /><span><strong>Show it on your public events page</strong><br />{event.isPublic ? "The host said anyone can come." : "The host didn’t ask for this, so it’s off by default."}</span></label>}
      {canEmail && <Field label={`Message to ${event.hostName || "the host"} (optional)`}><textarea value={note} maxLength={1000} placeholder={copy.placeholder} onChange={changed => setNote(changed.target.value)} /></Field>}
      {canEmail && <label className="ss-check-label"><input type="checkbox" checked={notify} onChange={changed => setNotify(changed.target.checked)} /><span>Email {event.email}{status === "approved" ? " with a calendar invite" : ""}</span></label>}
      {status === "canceled" && !canEmail && <Notice>This event was added by you, so there’s no one to email.</Notice>}
      {error && <p className="ss-error" role="alert">{error}</p>}
      <div className="ss-modal-actions"><Button variant="secondary" onClick={onClose}>Back</Button><Button type="submit" className={status === "approved" ? "" : "danger"} variant={status === "approved" ? "primary" : "secondary"} disabled={busy}>{busy ? "Saving…" : copy.button}</Button></div>
    </form>
  </Modal>;
}

function AddEventModal({ space, date, booked, onClose, onDone }: { space: EventSpace; date: string; booked: CafeEventView[]; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState<EventInput>({ title: "", eventType: space.eventTypes[0] ?? "Other", date, startTime: "18:00", endTime: "20:00", partySize: 0, isPublic: true, description: "", hostName: "", email: "", phone: "", notes: "" });
  const [error, setError] = useState("");
  const [busy, startTransition] = useTransition();
  const set = (patch: Partial<EventInput>) => setForm(current => ({ ...current, ...patch }));
  const conflict = booked.find(other => overlaps(form, other));
  function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    startTransition(async () => { const result = await addCafeEvent(form); if (result.ok) onDone(); else setError(result.error); });
  }
  return <Modal title="Add an event" description="For your own events, or a booking someone made in person or by phone. It’s booked right away." onClose={onClose}>
    <form onSubmit={submit}>
      <div className="ss-fields-two"><Field label="Event name"><input required value={form.title} maxLength={100} placeholder="Open mic night" onChange={event => set({ title: event.target.value })} /></Field><Field label="Type"><select value={form.eventType} onChange={event => set({ eventType: event.target.value })}>{[...new Set([...space.eventTypes, "Other"])].map(type => <option key={type}>{type}</option>)}</select></Field></div>
      <div className="ss-fields-three"><Field label="Date"><input type="date" required value={form.date} onChange={event => set({ date: event.target.value })} /></Field><Field label="Start"><input type="time" required step={900} value={form.startTime} onChange={event => set({ startTime: event.target.value })} /></Field><Field label="End"><input type="time" required step={900} value={form.endTime} onChange={event => set({ endTime: event.target.value })} /></Field></div>
      {conflict && <p className="ss-request-conflict"><Icon name="info" size={14} /> Overlaps with {conflict.title} ({formatTimeRange(conflict.startTime, conflict.endTime)})</p>}
      <label className="ss-check-label" style={{ marginBottom: 14 }}><input type="checkbox" checked={form.isPublic} onChange={event => set({ isPublic: event.target.checked })} /><span>Show it on your public events page</span></label>
      {form.isPublic && <Field label="Description (optional)" hint="Shown on your events page."><textarea value={form.description} maxLength={600} onChange={event => set({ description: event.target.value })} /></Field>}
      <details className="ss-kind-switch"><summary>Host details (optional)</summary>
        <div className="ss-fields-two"><Field label="Host name"><input value={form.hostName} maxLength={120} onChange={event => set({ hostName: event.target.value })} /></Field><Field label="People"><input type="number" min={0} max={1000} value={form.partySize || ""} onChange={event => set({ partySize: Number(event.target.value) })} /></Field></div>
        <div className="ss-fields-two"><Field label="Email"><input type="email" value={form.email} maxLength={254} onChange={event => set({ email: event.target.value })} /></Field><Field label="Phone"><input type="tel" value={form.phone} maxLength={30} onChange={event => set({ phone: event.target.value })} /></Field></div>
        <Field label="Notes" hint="Only you see these."><textarea value={form.notes} maxLength={1000} onChange={event => set({ notes: event.target.value })} /></Field>
      </details>
      {error && <p className="ss-error" role="alert">{error}</p>}
      <div className="ss-modal-actions"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? "Adding…" : "Add event"}</Button></div>
    </form>
  </Modal>;
}

function SpaceSettings({ initial, canEdit, onSaved }: { initial: EventSpace; canEdit: boolean; onSaved: () => void }) {
  const [space, setSpace] = useState(initial);
  const [types, setTypes] = useState(initial.eventTypes.join("\n"));
  const [error, setError] = useState("");
  const [busy, startTransition] = useTransition();
  const set = (patch: Partial<EventSpace>) => setSpace(current => ({ ...current, ...patch }));
  function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    const eventTypes = types.split("\n").map(type => type.trim()).filter(Boolean);
    startTransition(async () => { const result = await saveEventSpace({ ...space, eventTypes }); if (result.ok) onSaved(); else setError(result.error); });
  }
  return <form className="ss-card ss-card-pad" onSubmit={submit}>
    <label className="ss-toggle-row"><input type="checkbox" checked={space.enabled} disabled={!canEdit} onChange={event => set({ enabled: event.target.checked })} /><span><strong>Take event requests</strong><small>People can request your space from your events page. You approve every request.</small></span></label>
    <div className="ss-fields-two"><Field label="Space name" hint="e.g. Patio, Back room"><input required value={space.name} maxLength={60} disabled={!canEdit} onChange={event => set({ name: event.target.value })} /></Field><Field label="Capacity" hint="Most people you can host."><input type="number" min={1} max={1000} value={space.capacity} disabled={!canEdit} onChange={event => set({ capacity: Number(event.target.value) || 1 })} /></Field></div>
    <Field label="Description (optional)" hint="Shown on your events page."><textarea value={space.description} maxLength={600} disabled={!canEdit} placeholder="A shaded patio with string lights, six tables, and a speaker you can plug into." onChange={event => set({ description: event.target.value })} /></Field>
    <div className="ss-field"><span>Days people can book</span><div className="ss-day-picker">{WEEKDAYS.map((label, day) => <label key={label}><input type="checkbox" checked={space.days.includes(day)} disabled={!canEdit} onChange={event => set({ days: event.target.checked ? [...space.days, day].sort() : space.days.filter(item => item !== day) })} /><span>{label}</span></label>)}</div></div>
    <div className="ss-fields-three"><Field label="Earliest start"><input type="time" step={900} value={space.opensAt} disabled={!canEdit} onChange={event => set({ opensAt: event.target.value })} /></Field><Field label="Latest end"><input type="time" step={900} value={space.closesAt} disabled={!canEdit} onChange={event => set({ closesAt: event.target.value })} /></Field><Field label="Days of notice"><input type="number" min={0} max={60} value={space.noticeDays} disabled={!canEdit} onChange={event => set({ noticeDays: Number(event.target.value) || 0 })} /></Field></div>
    <Field label="Event types" hint="One per line. People pick one when they request."><textarea rows={6} value={types} disabled={!canEdit} onChange={event => setTypes(event.target.value)} /></Field>
    <Field label="House rules (optional)" hint="Deposits, cleanup, outside food… shown on the request form."><textarea value={space.policies} maxLength={1000} disabled={!canEdit} onChange={event => set({ policies: event.target.value })} /></Field>
    {error && <p className="ss-error" role="alert">{error}</p>}
    {canEdit ? <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save event space"}</Button> : <p className="ss-detail-text">Only café owners can change these settings.</p>}
  </form>;
}
