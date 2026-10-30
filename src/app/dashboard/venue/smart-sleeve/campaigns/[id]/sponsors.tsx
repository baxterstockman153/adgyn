"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { cents, initials, type Cafe } from "@/lib/smart-sleeves";
import type { CampaignDetail } from "@/lib/smart-sleeves-server";
import { addSponsor, removeSponsor, resendSponsorInvite, updateSponsor } from "../../actions";
import { Badge, Button, copyText, Field, Icon, Modal } from "../../ui";

type Sponsor = CampaignDetail["sponsors"][number];

function sponsorState(sponsor: Sponsor): { label: string; tone: "green" | "amber" | "neutral"; hint: string } {
  if (sponsor.status === "approved") return { label: "Live", tone: "green", hint: sponsor.priceCents && !sponsor.paid ? "On your board · payment not yet received" : "On your board" };
  if (sponsor.status === "declined") return { label: "Declined", tone: "neutral", hint: "Not shown to customers" };
  if (sponsor.offer) return { label: "Needs review", tone: "amber", hint: "Profile complete. Approve to put it on your board." };
  return { label: "Invited", tone: "neutral", hint: "Waiting for them to finish their profile" };
}

export function Sponsors({ detail, origin, canEdit, notify }: { cafe: Cafe; detail: CampaignDetail; origin: string; canEdit: boolean; notify: (message: string) => void }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const inviteLink = `${origin}/join/${detail.inviteToken}`;
  const run = (work: () => Promise<{ ok: boolean; error?: string }>, message: string) => {
    setError("");
    startTransition(async () => {
      const result = await work();
      if (!result.ok) { setError(result.error ?? "Something went wrong."); return; }
      notify(message); router.refresh();
    });
  };
  const copy = async (link: string) => { try { await copyText(link); notify("Invite link copied."); } catch { notify(link); } };
  const order = { requested: 0, invited: 1, approved: 2, declined: 3 } as Record<string, number>;
  const sponsors = detail.sponsors.slice().sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9));

  return <div className="ss-card ss-section">
    <div className="ss-card-header"><div><h3>Community Board businesses</h3><p>Invite local businesses to be featured. Set a price per business, or $0 to feature them for free.</p></div>
      {canEdit && <div className="ss-button-row"><Button variant="secondary" onClick={() => copy(inviteLink)}><Icon name="link" size={15} /> Copy business invite link</Button><Button onClick={() => setAdding(true)}><Icon name="plus" size={15} /> Add business</Button></div>}</div>
    {error && <div className="ss-card-pad" style={{ paddingBlock: 0 }}><p className="ss-error" role="alert">{error}</p></div>}
    {sponsors.length ? sponsors.map(sponsor => {
      const state = sponsorState(sponsor);
      const ready = !!sponsor.offer;
      return <div key={sponsor.id} className="ss-experience-row ss-sponsor-row">
        {sponsor.logoUrl ? <Image className="ss-sponsor-logo" src={sponsor.logoUrl} alt="" width={43} height={43} unoptimized /> : <div className="ss-type-icon">{initials(sponsor.businessName)}</div>}
        <div className="ss-row-text"><strong>{sponsor.businessName} <Badge tone={state.tone}>{state.label}</Badge></strong><small>{sponsor.offer || sponsor.email} · {state.hint}</small></div>
        <div className="ss-row-metric"><strong>{sponsor.priceCents ? cents(sponsor.priceCents) : "Free"}</strong><small>{sponsor.priceCents ? (sponsor.paid ? "Paid" : "Unpaid") : "No charge"}</small></div>
        {canEdit && <div className="ss-row-actions">
          {sponsor.status !== "approved" && ready && <Button disabled={pending} onClick={() => run(() => updateSponsor(sponsor.id, { status: "approved" }), `${sponsor.businessName} is live on your board.`)}>Approve</Button>}
          {sponsor.status !== "approved" && !ready && <Button variant="secondary" disabled={pending} onClick={() => run(() => resendSponsorInvite(sponsor.id), "Reminder sent.")}>Send reminder</Button>}
          {sponsor.status === "approved" && sponsor.priceCents > 0 && <Button variant="secondary" disabled={pending} onClick={() => run(() => updateSponsor(sponsor.id, { paid: !sponsor.paid }), sponsor.paid ? "Marked as unpaid." : "Marked as paid.")}>{sponsor.paid ? "Mark unpaid" : "Mark paid"}</Button>}
          <SponsorMenu sponsor={sponsor} ready={ready} origin={origin} pending={pending} onCopy={copy} onRun={run} />
        </div>}
      </div>;
    }) : <div className="ss-empty"><Icon name="grid" size={30} /><h3>No businesses yet</h3><p>Add a business by email, or copy your invite link and share it with neighbors you’d like to feature.</p></div>}
    {adding && <AddSponsor campaignId={detail.experience.id} suggested={detail.experience.suggestedPrice} onClose={() => setAdding(false)} onDone={(message, link) => { setAdding(false); notify(message); if (link) void copyText(link).catch(() => {}); router.refresh(); }} />}
  </div>;
}

function SponsorMenu({ sponsor, ready, origin, pending, onCopy, onRun }: { sponsor: Sponsor; ready: boolean; origin: string; pending: boolean; onCopy: (link: string) => void; onRun: (work: () => Promise<{ ok: boolean; error?: string }>, message: string) => void }) {
  const [open, setOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  return <div className="ss-menu">
    <Button variant="quiet" aria-label={`More actions for ${sponsor.businessName}`} aria-expanded={open} onClick={() => setOpen(!open)}>•••</Button>
    {open && <div className="ss-menu-list" onMouseLeave={() => setOpen(false)}>
      <button type="button" onClick={() => { setOpen(false); onCopy(`${origin}/join/${sponsor.token}`); }}>Copy their invite link</button>
      {sponsor.status !== "approved" && ready && <button type="button" disabled={pending} onClick={() => { setOpen(false); onRun(() => resendSponsorInvite(sponsor.id), "Invite re-sent."); }}>Resend invite</button>}
      {sponsor.status === "approved" && <button type="button" disabled={pending} onClick={() => { setOpen(false); onRun(() => updateSponsor(sponsor.id, { status: "declined" }), `${sponsor.businessName} is off your board.`); }}>Take off the board</button>}
      {sponsor.status !== "approved" && sponsor.status !== "declined" && <button type="button" disabled={pending} onClick={() => { setOpen(false); onRun(() => updateSponsor(sponsor.id, { status: "declined" }), "Request declined."); }}>Decline</button>}
      <button type="button" className="danger" onClick={() => { setOpen(false); setConfirmRemove(true); }}>Remove</button>
    </div>}
    {confirmRemove && <Modal title={`Remove ${sponsor.businessName}?`} description="They’ll come off your board and their invite link will stop working." onClose={() => setConfirmRemove(false)}><div className="ss-modal-actions"><Button variant="secondary" onClick={() => setConfirmRemove(false)}>Cancel</Button><Button disabled={pending} onClick={() => { setConfirmRemove(false); onRun(() => removeSponsor(sponsor.id), "Business removed."); }}>Remove</Button></div></Modal>}
  </div>;
}

function AddSponsor({ campaignId, suggested, onClose, onDone }: { campaignId: string; suggested: number; onClose: () => void; onDone: (message: string, link?: string) => void }) {
  const [value, setValue] = useState({ businessName: "", email: "", price: String(suggested) });
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  return <Modal title="Add a business" description="We’ll email them a link to add their logo and an offer. You approve it before it goes live." onClose={onClose}>
    <Field label="Business name"><input value={value.businessName} maxLength={100} placeholder="Alder Street Books" onChange={event => setValue({ ...value, businessName: event.target.value })} autoFocus /></Field>
    <div className="ss-fields-two"><Field label="Contact email"><input type="email" value={value.email} maxLength={254} placeholder="hello@business.com" onChange={event => setValue({ ...value, email: event.target.value })} /></Field><Field label="Price for this campaign ($)" hint="0 = featured for free."><input type="number" min={0} max={100000} step={5} value={value.price} onChange={event => setValue({ ...value, price: event.target.value })} /></Field></div>
    <p className="ss-detail-text">There’s no online payment yet. Collect payment your usual way, then mark it paid here.</p>
    {error && <p className="ss-error" role="alert">{error}</p>}
    <div className="ss-modal-actions"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={pending} onClick={() => startTransition(async () => {
      const result = await addSponsor(campaignId, { businessName: value.businessName, email: value.email, price: Number(value.price) });
      if (!result.ok) { setError(result.error); return; }
      onDone(result.emailed ? `Invite emailed to ${value.email}.` : "Business added. The email didn’t send, so their invite link is copied to share directly.", result.emailed ? undefined : result.link);
    })}>{pending ? "Sending…" : "Send invite"}</Button></div>
  </Modal>;
}
