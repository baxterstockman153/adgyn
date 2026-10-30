"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EXPERIENCE_KINDS, newExperience, PLACEMENTS, validateExperience, type Cafe, type Experience, type ExperienceKind, type Placement } from "@/lib/smart-sleeves";
import { createCampaign } from "../../actions";
import { ContentFields, DurationField, KindPicker } from "../../content-fields";
import { CustomerExperience } from "../../customer-experience";
import { DEFAULT_SLEEVES, OrderSummary, SleeveOptions, SleevePreview, type SleeveDraft } from "../../sleeve-options";
import { Button, Field, Icon, Notice } from "../../ui";

const BASE = "/dashboard/venue/smart-sleeve";
type Launch = "sleeves" | "qr";
const STEPS = ["How to launch", "Details", "Experience", "Review"];

export function NewCampaign({ cafe, location, shipTo, canCreate }: { cafe: Cafe; location: string; shipTo: string; canCreate: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [launch, setLaunch] = useState<Launch | null>(null);
  const [name, setName] = useState("");
  const [endsOn, setEndsOn] = useState("");
  const [sleeves, setSleeves] = useState<SleeveDraft>(DEFAULT_SLEEVES);
  const [qr, setQr] = useState<{ label: string; placement: Placement }>({ label: "", placement: "signage" });
  const [experience, setExperience] = useState<Experience | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const full = experience ? { ...experience, name: name.trim(), location, endsOn } : null;
  const pick = (kind: ExperienceKind) => { setExperience(current => current?.kind === kind ? current : newExperience(kind, cafe.name, location)); setError(""); };
  const placement: Placement = launch === "sleeves" ? "sleeve" : qr.placement;

  function next() {
    setError("");
    if (step === 0 && !launch) return setError("Choose how you’d like to launch.");
    if (step === 1 && !name.trim()) return setError("Give your campaign a name so you can find it later.");
    if (step === 2) {
      if (!full) return setError("Choose what customers should experience.");
      const invalid = validateExperience(full);
      if (invalid) return setError(invalid);
    }
    setStep(step + 1);
  }

  function submit() {
    if (!full || !launch) return;
    setError("");
    startTransition(async () => {
      const result = await createCampaign({
        experience: full,
        qr: { name: launch === "sleeves" ? "Cup sleeves" : PLACEMENTS[qr.placement], placement, label: qr.label },
        order: launch === "sleeves" ? sleeves : null,
      });
      if (!result.ok) { setError(result.error); return; }
      router.push(`${BASE}/campaigns/${result.id}?created=${launch}`);
    });
  }

  return <>
    <Link className="ss-back" href={`${BASE}/campaigns`}><Icon name="arrow" size={16} /> Back to Campaigns</Link>
    <div className="ss-heading"><div><div className="ss-eyebrow">New campaign · Step {step + 1} of {STEPS.length}</div><h1>{["How would you like to launch your campaign?", launch === "sleeves" ? "Campaign & sleeve details" : "Campaign & QR details", "What should customers experience when they scan?", launch === "sleeves" ? "Review your order & launch" : "Review & create your QR code"][step]}</h1></div></div>
    <ol className="ss-steps">{STEPS.map((label, index) => <li key={label} aria-current={index === step ? "step" : undefined} className={index < step ? "done" : undefined}><span>{index < step ? <Icon name="check" size={12} /> : index + 1}</span>{label}</li>)}</ol>
    {!canCreate && <Notice>Only café owners can create campaigns.</Notice>}

    {step === 0 && <div className="ss-choice-grid ss-launch-grid">
      <button type="button" className="ss-choice ss-launch" aria-pressed={launch === "sleeves"} onClick={() => setLaunch("sleeves")}><Icon name="cup" size={26} /><strong>Order Smart Sleeves</strong><small>Create a campaign and order branded sleeves.</small><ul><li>Sleeves printed with your permanent QR code</li><li>Shipped to your café in 7–10 business days</li></ul></button>
      <button type="button" className="ss-choice ss-launch" aria-pressed={launch === "qr"} onClick={() => setLaunch("qr")}><Icon name="qr" size={26} /><strong>QR Code Only</strong><small>Launch a campaign without ordering sleeves.</small><ul><li>A QR code for signage, menus, and tabletops</li><li>Goes live the moment you finish</li></ul></button>
      <p className="ss-detail-text ss-span">Both options create a campaign with one permanent QR code. You can add more QR codes, order sleeves, or change what customers see anytime.</p>
    </div>}

    {step === 1 && <div className="ss-editor-grid"><div className="ss-card">
      <section className="ss-editor-section"><h3 className="ss-mini-heading">Campaign information</h3><Field label="Campaign name" hint="Customers won’t see this name. It’s how you’ll find the campaign later."><input value={name} maxLength={100} placeholder="e.g. Fall Favorites 2026" onChange={event => setName(event.target.value)} autoFocus /></Field><DurationField value={endsOn} onChange={setEndsOn} /></section>
      <section className="ss-editor-section">{launch === "sleeves" ? <SleeveOptions value={sleeves} onChange={setSleeves} /> : <><h3 className="ss-mini-heading">QR code details</h3><div className="ss-fields-two"><Field label="Where will it be placed?"><select value={qr.placement} onChange={event => setQr({ ...qr, placement: event.target.value as Placement })}>{(Object.keys(PLACEMENTS) as Placement[]).filter(key => key !== "sleeve").map(key => <option key={key} value={key}>{PLACEMENTS[key]}</option>)}</select></Field><Field label="QR label (optional)" hint="Printed under your code so customers know what they’ll get."><input value={qr.label} maxLength={60} placeholder="Scan for Wi-Fi & local perks" onChange={event => setQr({ ...qr, label: event.target.value })} /></Field></div></>}</section>
    </div>{launch === "sleeves" && <aside className="ss-preview-column"><div className="ss-preview-label">Sleeve preview</div><SleevePreview cafeName={cafe.name} design={sleeves.design} label={qr.label} /><p className="ss-preview-caption">Concept only. We’ll send a proof before printing. Your QR code is permanent, so you can change what it shows without reprinting.</p></aside>}</div>}

    {step === 2 && <div className="ss-editor-grid"><div className="ss-card">
      <section className="ss-editor-section"><p className="ss-detail-text" style={{ marginBottom: 16 }}>Start from a template. You can change it anytime, even after launch.</p><KindPicker value={experience?.kind ?? null} onPick={pick} /></section>
      {experience && <section className="ss-editor-section"><h3 className="ss-mini-heading">{EXPERIENCE_KINDS[experience.kind].label}</h3><ContentFields value={experience} onChange={patch => setExperience({ ...experience, ...patch })} /></section>}
    </div><aside className="ss-preview-column"><div className="ss-preview-label">Customer preview</div><div className="ss-phone"><div className="ss-phone-top"><span /></div>{experience ? <CustomerExperience key={experience.kind} cafe={cafe} experience={experience} preview /> : <div className="ss-customer-empty" style={{ paddingTop: 120 }}><Icon name="qr" size={30} /><p>Pick a template to preview it.</p></div>}</div><p className="ss-preview-caption">What customers see when they scan.</p></aside></div>}

    {step === 3 && full && <div className="ss-order-grid"><div className="ss-card">
      <div className="ss-card-header"><h3>Campaign summary</h3></div>
      <dl className="ss-summary">
        <div><dt>Name</dt><dd>{full.name}</dd></div>
        <div><dt>Runs</dt><dd>{full.endsOn ? `Through ${full.endsOn}` : "Until you stop it"}</dd></div>
        <div><dt>Experience</dt><dd>{EXPERIENCE_KINDS[full.kind].label} · “{full.headline}”</dd></div>
        <div><dt>QR code</dt><dd>{PLACEMENTS[placement]}{qr.label ? ` · “${qr.label}”` : ""}</dd></div>
        <div><dt>Sleeves</dt><dd>{launch === "sleeves" ? `${sleeves.quantity.toLocaleString()} × ${sleeves.size} · ${sleeves.design}` : "None (QR only)"}</dd></div>
      </dl>
      <div className="ss-card-pad"><h3 className="ss-mini-heading">What happens next</h3><ul className="ss-next-list">{launch === "sleeves" ? <><li>Your QR code is created and the campaign goes live right away.</li><li>We email you a sleeve proof and an invoice. Printing starts once you approve.</li><li>Track your order and scans from the campaign dashboard.</li></> : <><li>Your QR code is created and goes live immediately.</li><li>Download print-ready files and track scans from your campaign dashboard.</li><li>Want sleeves later? Order them from the dashboard using this same QR code.</li></>}</ul></div>
    </div>
    <aside className="ss-card ss-card-pad ss-order-summary">{launch === "sleeves" ? <><h3>Order summary</h3><OrderSummary value={sleeves} shipTo={shipTo} /></> : <><h3>Ready to go</h3><p className="ss-detail-text">There’s nothing to pay. Your QR code is ready as soon as you create it.</p></>}
      <Button disabled={pending || !canCreate || (launch === "sleeves" && !shipTo)} onClick={submit}>{pending ? "Creating…" : launch === "sleeves" ? "Place order & launch campaign" : "Create QR code"}<Icon name="arrow" size={16} /></Button>
      {launch === "sleeves" && !shipTo && <Link className="ss-button ss-button-secondary" href={`${BASE}/settings`}>Add your address</Link>}
    </aside></div>}

    {error && <p className="ss-error" role="alert">{error}</p>}
    <div className="ss-wizard-footer">{step > 0 ? <Button variant="secondary" disabled={pending} onClick={() => { setError(""); setStep(step - 1); }}>Back</Button> : <span />}{step < 3 && <Button onClick={next}>Continue<Icon name="arrow" size={16} /></Button>}</div>
  </>;
}
