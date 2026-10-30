"use client";

import { useCallback, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cents, EXPERIENCE_KINDS, isExpired, ORDER_STATUSES, PLACEMENTS, qrPath, type Cafe, type Experience, type Placement } from "@/lib/smart-sleeves";
import type { CampaignDetail } from "@/lib/smart-sleeves-server";
import { archiveQrCode, confirmRedemption, createQrCode, placeSleeveOrder, saveCampaignContent, setCampaignState, updateQrCode } from "../../actions";
import { ContentFields, DurationField } from "../../content-fields";
import { CustomerExperience } from "../../customer-experience";
import { ScanChart, StatusBadge } from "../../parts";
import { DEFAULT_SLEEVES, OrderSummary, SleeveOptions, type SleeveDraft } from "../../sleeve-options";
import { Sponsors } from "./sponsors";
import { Badge, Button, downloadText, Field, Icon, Modal, Notice, QrCode, Toast } from "../../ui";

const BASE = "/dashboard/venue/smart-sleeve";
type Code = CampaignDetail["qrCodes"][number];
type Dialog = { type: "rename" } | { type: "archive" } | { type: "qr"; code: Code } | { type: "qr-form"; code: Code | null } | { type: "order" } | null;

export function CampaignView({ cafe, detail, days, origin, shipTo, canEdit, created }: { cafe: Cafe; detail: CampaignDetail; days: number; origin: string; shipTo: string; canEdit: boolean; created: "sleeves" | "qr" | null }) {
  const router = useRouter();
  const [toast, setToast] = useState(created === "sleeves" ? "Campaign launched. Your sleeve order is in, and we’ll email you a proof." : created === "qr" ? "Campaign launched. Download your QR code below." : "");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const clearToast = useCallback(() => setToast(""), []);
  const { experience, status } = detail;
  const kind = EXPERIENCE_KINDS[experience.kind];

  function act(work: () => Promise<{ ok: boolean; error?: string }>, success: string, after?: () => void) {
    setError("");
    startTransition(async () => {
      const result = await work();
      if (!result.ok) { setError(result.error ?? "Something went wrong."); return; }
      setToast(success); after?.(); router.refresh();
    });
  }

  const conversion = detail.scans ? `${Math.round((detail.actions / detail.scans) * 100)}%` : "—";
  const revenue = detail.sponsors.filter(sponsor => sponsor.status === "approved" && sponsor.paid).reduce((total, sponsor) => total + sponsor.priceCents, 0);
  const activeSponsors = detail.sponsors.filter(sponsor => sponsor.status === "approved").length;

  return <>
    <Link className="ss-back" href={`${BASE}/campaigns`}><Icon name="arrow" size={16} /> Back to Campaigns</Link>
    <div className="ss-heading"><div><div className="ss-eyebrow">{kind.label}</div><h1 className="ss-title-row">{experience.name} <StatusBadge status={status} /></h1><p>{experience.endsOn ? `Runs through ${experience.endsOn}.` : "Runs until you stop it."} Your QR codes are permanent, so changes go live on the next scan with no reprinting.</p></div>
      {canEdit && status !== "archived" && <div className="ss-button-row">
        {status === "active" ? <Button variant="secondary" disabled={pending} onClick={() => act(() => setCampaignState(detail.experience.id, "pause"), "Campaign paused. Scans show a friendly “taking a break” page.")}><Icon name="pause" size={15} /> Pause</Button>
          : status !== "ended" && <Button disabled={pending} onClick={() => act(() => setCampaignState(detail.experience.id, "launch"), "Campaign is live. Scans go to your experience again.")}><Icon name="play" size={15} /> {status === "draft" ? "Launch" : "Resume"}</Button>}
        <Button variant="secondary" onClick={() => setDialog({ type: "rename" })}><Icon name="edit" size={15} /> Edit</Button>
        <Button variant="quiet" onClick={() => setDialog({ type: "archive" })}><Icon name="archive" size={15} /> Archive</Button>
      </div>}
      {canEdit && status === "archived" && <Button disabled={pending} onClick={() => act(() => setCampaignState(detail.experience.id, "launch"), "Campaign restored and live.")}>Restore campaign</Button>}
    </div>
    {status === "ended" && <div className="ss-section"><Notice>This campaign’s end date has passed, so scans show a “wrapped up” message. Choose a later end date under <strong>Edit</strong> to bring it back.</Notice></div>}
    {error && <p className="ss-error" role="alert">{error}</p>}

    <div className="ss-stats ss-stats-4">
      <div className="ss-stat"><span>QR scans</span><strong>{detail.scans.toLocaleString()}</strong><small>Last {days} days</small></div>
      <div className="ss-stat"><span>{kind.action}</span><strong>{detail.actions.toLocaleString()}</strong><small>Last {days} days</small></div>
      {experience.kind === "board" ? <div className="ss-stat"><span>Sponsor revenue</span><strong>{cents(revenue)}</strong><small>{activeSponsors} active {activeSponsors === 1 ? "sponsor" : "sponsors"}</small></div> : <div className="ss-stat"><span>Conversion rate</span><strong>{conversion}</strong><small>Scans that led to {kind.action.toLowerCase()}</small></div>}
      <div className="ss-stat"><span>QR codes</span><strong>{detail.qrCodes.length}</strong><small>{detail.orders.reduce((total, order) => order.status === "canceled" ? total : total + order.quantity, 0).toLocaleString()} sleeves ordered</small></div>
    </div>

    <div className="ss-card ss-section"><div className="ss-card-header"><div><h3>Performance</h3><p>Scans per day, last {days} days.</p></div><div className="ss-filter-tabs">{[7, 30, 90].map(range => <Link key={range} href={`?range=${range}`} scroll={false} aria-current={range === days ? "page" : undefined}>{range} days</Link>)}</div></div>
      <div className="ss-card-pad"><ScanChart series={detail.series} label={`Scans in the last ${days} days`} /></div>
      {detail.qrCodes.length > 1 && <table className="ss-table"><thead><tr><th>By QR code</th><th>Placement</th><th className="num">Scans</th><th className="num">Share</th></tr></thead><tbody>{detail.qrCodes.slice().sort((a, b) => b.scans - a.scans).map(code => <tr key={code.id}><td>{code.name}</td><td>{PLACEMENTS[code.placement as Placement] ?? code.placement}</td><td className="num">{code.scans.toLocaleString()}</td><td className="num">{detail.scans ? `${Math.round((code.scans / Math.max(1, detail.qrCodes.reduce((total, item) => total + item.scans, 0))) * 100)}%` : "—"}</td></tr>)}</tbody></table>}
    </div>

    <ExperienceCard cafe={cafe} detail={detail} canEdit={canEdit} editing={editing} setEditing={setEditing} onSaved={() => { setToast("Saved. Customers see the new content on their next scan."); router.refresh(); }} />

    {experience.kind === "board" && <Sponsors cafe={cafe} detail={detail} origin={origin} canEdit={canEdit} notify={setToast} />}

    <div className="ss-card ss-section"><div className="ss-card-header"><div><h3>QR codes</h3><p>Use one per placement (sleeves, A-frame, Wi-Fi sign) to see which one customers scan most.</p></div>{canEdit && <Button variant="secondary" onClick={() => setDialog({ type: "qr-form", code: null })}><Icon name="plus" size={15} /> New QR code</Button>}</div>
      {detail.qrCodes.map(code => <div key={code.id} className="ss-experience-row"><div className="ss-type-icon"><Icon name="qr" size={20} /></div><div className="ss-row-text"><strong>{code.name}</strong><small>{PLACEMENTS[code.placement as Placement] ?? code.placement}{code.label ? ` · “${code.label}”` : ""}</small></div><div className="ss-row-metric"><strong>{code.scans.toLocaleString()}</strong><small>scans · {days} days</small></div><div className="ss-row-actions"><Button variant="secondary" onClick={() => setDialog({ type: "qr", code })}><Icon name="download" size={15} /> Download</Button>{canEdit && <Button variant="quiet" aria-label={`Edit ${code.name}`} onClick={() => setDialog({ type: "qr-form", code })}><Icon name="edit" size={15} /></Button>}</div></div>)}
    </div>

    {(experience.kind === "newsletter" || experience.kind === "loyalty") && <div className="ss-card ss-section"><div className="ss-card-header"><div><h3>Customer contacts</h3><p>{detail.contacts.length ? `${detail.contacts.length.toLocaleString()} people signed up through this campaign.` : "People who sign up will appear here."}</p></div>{detail.contacts.length > 0 && <Button variant="secondary" onClick={() => downloadText(`${experience.name.replace(/[^\w-]+/g, "-").toLowerCase()}-contacts.csv`, ["name,email,phone,signed_up", ...detail.contacts.map(contact => [contact.name, contact.email, contact.phone, contact.createdAt.slice(0, 10)].map(field => `"${field.replace(/"/g, '""')}"`).join(","))].join("\n"), "text/csv")}><Icon name="download" size={15} /> Download CSV</Button>}</div>
      {detail.contacts.length ? detail.contacts.slice(0, 50).map(contact => <div key={contact.id} className="ss-claim-row"><div className="ss-row-text"><strong>{contact.name || contact.email}</strong><small>{contact.name ? contact.email : ""}{contact.phone ? ` · ${contact.phone}` : ""}</small></div><small className="ss-detail-text">{new Date(contact.createdAt).toLocaleDateString()}</small></div>) : <div className="ss-empty"><Icon name="users" size={28} /><p>Put this campaign’s QR code where customers linger: tables, the pickup counter, Wi-Fi signs.</p></div>}
    </div>}

    {experience.kind === "offer" && <div className="ss-card ss-section"><div className="ss-card-header"><div><h3>Saved coupons</h3><p>When a customer shows their code, confirm it here so redemptions are counted.</p></div></div>
      {detail.claims.length ? detail.claims.map(claim => <div key={claim.id} className="ss-claim-row"><code>{claim.id.slice(0, 8).toUpperCase()}</code><div className="ss-row-text"><strong>{claim.headline}</strong><small>Saved {new Date(claim.createdAt).toLocaleDateString()}{claim.redeemedAt ? ` · Redeemed ${new Date(claim.redeemedAt).toLocaleDateString()}` : ""}</small></div>{claim.redeemedAt ? <Badge tone="green">Redeemed</Badge> : claim.expiresOn && isExpired(claim.expiresOn) ? <Badge>Expired</Badge> : canEdit && <Button variant="secondary" disabled={pending} onClick={() => act(() => confirmRedemption(claim.id), "Redemption confirmed.")}>Confirm redemption</Button>}</div>) : <div className="ss-empty"><Icon name="ticket" size={28} /><p>No coupons saved yet.</p></div>}
    </div>}

    <div className="ss-card ss-section"><div className="ss-card-header"><div><h3>Sleeve orders</h3><p>Order status is separate from the campaign. It stays live while sleeves print.</p></div>{canEdit && status !== "archived" && <Button variant="secondary" onClick={() => setDialog({ type: "order" })}><Icon name="cup" size={15} /> Order more sleeves</Button>}</div>
      {detail.orders.length ? <table className="ss-table"><thead><tr><th>Ordered</th><th>Sleeves</th><th className="num">Total</th><th>Status</th></tr></thead><tbody>{detail.orders.map(order => <tr key={order.id}><td>{new Date(order.createdAt).toLocaleDateString()}</td><td>{order.quantity.toLocaleString()} × {order.size} · {order.design}</td><td className="num">{cents(order.totalCents)}</td><td><Badge tone={order.status === "delivered" ? "green" : order.status === "canceled" ? "neutral" : "amber"}>{ORDER_STATUSES[order.status] ?? order.status}</Badge></td></tr>)}</tbody></table> : <div className="ss-empty"><Icon name="cup" size={28} /><h3>No sleeves ordered yet</h3><p>Your QR codes work on any printed material. Order branded sleeves whenever you’re ready.</p></div>}
    </div>

    {dialog?.type === "rename" && <RenameDialog detail={detail} onClose={() => setDialog(null)} onSaved={() => { setDialog(null); setToast("Campaign updated."); router.refresh(); }} />}
    {dialog?.type === "archive" && <Modal title="Archive this campaign?" description="Its QR codes will show a “wrapped up” message. Past results stay in your reports, and you can restore it later." onClose={() => setDialog(null)}><div className="ss-modal-actions"><Button variant="secondary" onClick={() => setDialog(null)}>Cancel</Button><Button disabled={pending} onClick={() => act(() => setCampaignState(detail.experience.id, "archive"), "Campaign archived.", () => { setDialog(null); router.push(`${BASE}/campaigns`); })}>Archive campaign</Button></div></Modal>}
    {dialog?.type === "qr" && <Modal title={dialog.code.name} description="Print-ready files. This code is permanent: change what it shows anytime without reprinting." onClose={() => setDialog(null)}><QrCode value={`${origin}${qrPath(dialog.code.id)}`} label={`QR code for ${dialog.code.name}`} filename={`${cafe.slug}-${dialog.code.name.replace(/[^\w-]+/g, "-").toLowerCase()}`} onError={setToast} />{dialog.code.label && <p className="ss-qr-label">{dialog.code.label}</p>}<div className="ss-share-box">{origin}{qrPath(dialog.code.id)}</div><div className="ss-modal-actions"><a className="ss-button ss-button-secondary" href={`${qrPath(dialog.code.id)}&preview=1`} target="_blank" rel="noopener noreferrer">Preview<Icon name="external" size={14} /></a></div></Modal>}
    {dialog?.type === "qr-form" && <QrForm campaignId={detail.experience.id} code={dialog.code} canRemove={detail.qrCodes.length > 1} onClose={() => setDialog(null)} onDone={message => { setDialog(null); setToast(message); router.refresh(); }} />}
    {dialog?.type === "order" && <OrderDialog campaignId={detail.experience.id} shipTo={shipTo} onClose={() => setDialog(null)} onDone={() => { setDialog(null); setToast("Order placed. We’ll email you a proof and an invoice."); router.refresh(); }} />}
    <Toast message={toast} onClose={clearToast} />
  </>;
}

function ExperienceCard({ cafe, detail, canEdit, editing, setEditing, onSaved }: { cafe: Cafe; detail: CampaignDetail; canEdit: boolean; editing: boolean; setEditing: (value: boolean) => void; onSaved: () => void }) {
  const [draft, setDraft] = useState<Experience>(detail.experience);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const kind = EXPERIENCE_KINDS[detail.experience.kind];
  const preview = editing ? draft : detail.experience;
  function save() {
    setError("");
    startTransition(async () => {
      const result = await saveCampaignContent(detail.experience.id, draft);
      if (!result.ok) { setError(result.error); return; }
      setEditing(false); onSaved();
    });
  }
  return <div className="ss-card ss-section"><div className="ss-card-header"><div><h3>What customers see</h3><p>{kind.label}. Changes go live on the next scan.</p></div>{canEdit && !editing && <Button variant="secondary" onClick={() => { setDraft(detail.experience); setEditing(true); }}><Icon name="edit" size={15} /> Edit content</Button>}</div>
    <div className="ss-editor-grid ss-card-pad">
      <div>{editing ? <><ContentFields value={draft} onChange={patch => setDraft({ ...draft, ...patch })} />{error && <p className="ss-error" role="alert">{error}</p>}<div className="ss-button-row" style={{ marginTop: 18 }}><Button disabled={pending} onClick={save}>{pending ? "Saving…" : "Save changes"}</Button><Button variant="quiet" disabled={pending} onClick={() => { setEditing(false); setError(""); }}>Cancel</Button></div></>
        : <dl className="ss-summary ss-summary-flat"><div><dt>Headline</dt><dd>{detail.experience.headline}</dd></div>{detail.experience.message && <div><dt>{detail.experience.kind === "offer" ? "Offer" : "Message"}</dt><dd>{detail.experience.message}</dd></div>}{detail.experience.kind === "link" && <div><dt>Goes to</dt><dd className="ss-break">{detail.experience.url}</dd></div>}{detail.experience.kind === "loyalty" && <div><dt>Reward</dt><dd>{detail.experience.reward}</dd></div>}{detail.experience.kind === "board" && <div><dt>On the board</dt><dd>{detail.sponsors.filter(sponsor => sponsor.status === "approved").length} sponsors · {detail.experience.entries.length} of your own listings</dd></div>}</dl>}</div>
      <aside className="ss-preview-column"><div className="ss-phone ss-phone-small"><div className="ss-phone-top"><span /></div><CustomerExperience key={preview.kind} cafe={cafe} experience={preview} sponsors={detail.sponsors.filter(sponsor => sponsor.status === "approved").map(sponsor => ({ id: sponsor.id, name: sponsor.businessName, offer: sponsor.offer, url: sponsor.url, logoUrl: sponsor.logoUrl }))} preview /></div></aside>
    </div>
  </div>;
}

function RenameDialog({ detail, onClose, onSaved }: { detail: CampaignDetail; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(detail.experience.name);
  const [endsOn, setEndsOn] = useState(detail.experience.endsOn);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  return <Modal title="Edit campaign" description="Only you and your team see the name." onClose={onClose}>
    <Field label="Campaign name"><input value={name} maxLength={100} onChange={event => setName(event.target.value)} autoFocus /></Field>
    <DurationField value={endsOn} onChange={setEndsOn} />
    {error && <p className="ss-error" role="alert">{error}</p>}
    <div className="ss-modal-actions"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={pending} onClick={() => startTransition(async () => { const result = await saveCampaignContent(detail.experience.id, { ...detail.experience, name: name.trim(), endsOn }); if (result.ok) onSaved(); else setError(result.error); })}>Save</Button></div>
  </Modal>;
}

function QrForm({ campaignId, code, canRemove, onClose, onDone }: { campaignId: string; code: Code | null; canRemove: boolean; onClose: () => void; onDone: (message: string) => void }) {
  const [value, setValue] = useState({ name: code?.name ?? "", placement: (code?.placement ?? "signage") as Placement, label: code?.label ?? "" });
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const run = (work: () => Promise<{ ok: boolean; error?: string }>, message: string) => startTransition(async () => { const result = await work(); if (result.ok) onDone(message); else setError(result.error ?? "Something went wrong."); });
  return <Modal title={code ? "Edit QR code" : "New QR code"} description={code ? "Renaming doesn’t change the printed code." : "A new code for another placement. It shows the same experience and is tracked separately."} onClose={onClose}>
    <Field label="Name"><input value={value.name} maxLength={80} placeholder="e.g. Wi-Fi sign" onChange={event => setValue({ ...value, name: event.target.value })} autoFocus /></Field>
    <div className="ss-fields-two"><Field label="Placement"><select value={value.placement} onChange={event => setValue({ ...value, placement: event.target.value as Placement })}>{(Object.keys(PLACEMENTS) as Placement[]).map(key => <option key={key} value={key}>{PLACEMENTS[key]}</option>)}</select></Field><Field label="Printed label (optional)"><input value={value.label} maxLength={60} onChange={event => setValue({ ...value, label: event.target.value })} /></Field></div>
    {error && <p className="ss-error" role="alert">{error}</p>}
    <div className="ss-modal-actions">{code && canRemove && <Button variant="quiet" disabled={pending} onClick={() => run(() => archiveQrCode(code.id), "QR code removed. Printed copies now show a “no longer in use” message.")}>Remove</Button>}<Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={pending} onClick={() => run(() => code ? updateQrCode(code.id, value) : createQrCode(campaignId, value), code ? "QR code updated." : "QR code created. Download it from the list.")}>{code ? "Save" : "Create QR code"}</Button></div>
  </Modal>;
}

function OrderDialog({ campaignId, shipTo, onClose, onDone }: { campaignId: string; shipTo: string; onClose: () => void; onDone: () => void }) {
  const [value, setValue] = useState<SleeveDraft>(DEFAULT_SLEEVES);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  return <Modal title="Order more sleeves" description="Printed with this campaign’s permanent QR code." onClose={onClose}>
    <SleeveOptions value={value} onChange={setValue} />
    <OrderSummary value={value} shipTo={shipTo} />
    {error && <p className="ss-error" role="alert">{error}</p>}
    <div className="ss-modal-actions"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={pending || !shipTo} onClick={() => startTransition(async () => { const result = await placeSleeveOrder(campaignId, value); if (result.ok) onDone(); else setError(result.error); })}>{pending ? "Placing order…" : "Place order"}</Button></div>
  </Modal>;
}
