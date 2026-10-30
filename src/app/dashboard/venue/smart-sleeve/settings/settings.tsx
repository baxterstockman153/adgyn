"use client";

import { useCallback, useState, useTransition, type FormEvent, type ReactNode } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { saveBranding, saveBusiness, saveProfile } from "../actions";
import { Badge, Button, Field, Icon, Notice, Toast } from "../ui";

type Business = { name: string; websiteUrl: string; street: string; suite: string; city: string; state: string; zip: string };
type Branding = { logoUrl: string | null; iconUrl: string | null };

function Section({ id, title, description, children }: { id: string; title: string; description: string; children: ReactNode }) {
  return <section id={id} className="ss-card ss-section"><div className="ss-card-header"><div><h3>{title}</h3><p>{description}</p></div></div><div className="ss-card-pad">{children}</div></section>;
}

export function Settings({ canEdit, profile, business, legacyAddress, branding }: { canEdit: boolean; profile: { name: string; email: string }; business: Business; legacyAddress: string; branding: Branding }) {
  const router = useRouter();
  const [toast, setToast] = useState("");
  const clearToast = useCallback(() => setToast(""), []);
  const saved = (message: string) => { setToast(message); router.refresh(); };
  return <>
    <div className="ss-heading"><div><div className="ss-eyebrow">Settings</div><h1>Settings</h1><p>Manage your profile, business, branding, and plan.</p></div></div>
    <nav className="ss-filter-tabs ss-section-tabs" aria-label="Settings sections">{[["profile", "Profile"], ["business", "Business details"], ["branding", "Branding"], ["plan", "Plan"]].map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}</nav>
    <ProfileForm initial={profile} onSaved={() => saved("Profile updated.")} />
    <BusinessForm initial={business} legacyAddress={legacyAddress} canEdit={canEdit} onSaved={() => saved("Business details updated. Future sleeve orders ship to this address.")} />
    <BrandingForm initial={branding} canEdit={canEdit} onSaved={() => saved("Branding saved. Customer pages and new sleeve orders will use it.")} />
    <Section id="plan" title="Plan" description="Your Adgyn plan and billing.">
      <div className="ss-plan"><div><strong>Pilot</strong> <Badge tone="green">Active</Badge><p className="ss-detail-text">Campaigns, QR codes, Community Board, and sleeve ordering are all included during the pilot. Billing is handled directly with the Adgyn team, so there’s nothing to set up here yet.</p></div></div>
      <p className="ss-detail-text" style={{ marginTop: 14 }}>Questions about your plan? Email hello@adgyn.com.</p>
    </Section>
    <Toast message={toast} onClose={clearToast} />
  </>;
}

function useSave() {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const save = (work: () => Promise<{ ok: boolean; error?: string }>, onSaved: () => void) => (event?: FormEvent) => {
    event?.preventDefault();
    setError("");
    startTransition(async () => { const result = await work(); if (result.ok) onSaved(); else setError(result.error ?? "Something went wrong."); });
  };
  return { error, pending, save, setError };
}

function ProfileForm({ initial, onSaved }: { initial: { name: string; email: string }; onSaved: () => void }) {
  const [name, setName] = useState(initial.name);
  const { error, pending, save } = useSave();
  return <Section id="profile" title="Your profile" description="How you appear to your team and to businesses you invite.">
    <form onSubmit={save(() => saveProfile({ name }), onSaved)}>
      <div className="ss-fields-two"><Field label="Full name"><input value={name} maxLength={120} onChange={event => setName(event.target.value)} /></Field><Field label="Email" hint="Used for sign-in and order emails."><input value={initial.email} disabled /></Field></div>
      {error && <p className="ss-error" role="alert">{error}</p>}
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save profile"}</Button>
    </form>
  </Section>;
}

function BusinessForm({ initial, legacyAddress, canEdit, onSaved }: { initial: Business; legacyAddress: string; canEdit: boolean; onSaved: () => void }) {
  const [value, setValue] = useState(initial);
  const { error, pending, save } = useSave();
  const field = (key: keyof Business) => ({ value: value[key], disabled: !canEdit, onChange: (event: { target: { value: string } }) => setValue({ ...value, [key]: event.target.value }) });
  return <Section id="business" title="Business details" description="Shown on customer pages and used as your default shipping address.">
    <form onSubmit={save(() => saveBusiness(value), onSaved)}>
      {legacyAddress && <div style={{ marginBottom: 18 }}><Notice>We have your address on file as “{legacyAddress}”. Add it below in separate fields so we can ship sleeves to you.</Notice></div>}
      <div className="ss-fields-two"><Field label="Business name"><input maxLength={100} {...field("name")} /></Field><Field label="Website (optional)"><input type="url" placeholder="https://" maxLength={2048} {...field("websiteUrl")} /></Field></div>
      <div className="ss-fields-two"><Field label="Street address"><input maxLength={200} autoComplete="address-line1" {...field("street")} /></Field><Field label="Suite / unit (optional)"><input maxLength={60} autoComplete="address-line2" {...field("suite")} /></Field></div>
      <div className="ss-fields-three"><Field label="City"><input maxLength={100} autoComplete="address-level2" {...field("city")} /></Field><Field label="State"><input maxLength={2} placeholder="CA" autoComplete="address-level1" {...field("state")} /></Field><Field label="ZIP code"><input maxLength={10} inputMode="numeric" autoComplete="postal-code" {...field("zip")} /></Field></div>
      {error && <p className="ss-error" role="alert">{error}</p>}
      {canEdit ? <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save details"}</Button> : <p className="ss-detail-text">Only café owners can change business details.</p>}
    </form>
  </Section>;
}

function ImageField({ label, hint, value, disabled, onChange, onError }: { label: string; hint: string; value: string | null; disabled: boolean; onChange: (url: string | null) => void; onError: (message: string) => void }) {
  const [uploading, setUploading] = useState(false);
  async function upload(file: File) {
    if (file.size > 2 * 1024 * 1024) { onError("Image must be 2 MB or smaller."); return; }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/upload/logo", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok || !result.url) onError(result.error || "Upload failed. Please try again.");
      else onChange(result.url);
    } catch { onError("Upload failed. Please try again."); }
    finally { setUploading(false); }
  }
  return <div className="ss-field"><span>{label}</span><div className="ss-upload">{value ? <Image src={value} alt={`${label} preview`} width={56} height={56} unoptimized /> : <div className="ss-upload-empty"><Icon name="plus" size={18} /></div>}{!disabled && <label className="ss-button ss-button-secondary">{uploading ? "Uploading…" : value ? "Replace" : "Upload"}<input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" hidden disabled={uploading} onChange={event => { const file = event.target.files?.[0]; if (file) void upload(file); }} /></label>}{value && !disabled && <button type="button" className="ss-button ss-button-quiet" onClick={() => onChange(null)}>Remove</button>}</div><small>{hint}</small></div>;
}

function BrandingForm({ initial, canEdit, onSaved }: { initial: Branding; canEdit: boolean; onSaved: () => void }) {
  const [value, setValue] = useState(initial);
  const { error, pending, save, setError } = useSave();
  return <Section id="branding" title="Branding" description="Used on your Smart Sleeves and the pages customers see when they scan.">
    <ImageField label="Full logo" hint="Horizontal logo with your business name. Transparent PNG or SVG works best, up to 2 MB." value={value.logoUrl} disabled={!canEdit} onChange={logoUrl => setValue({ ...value, logoUrl })} onError={setError} />
    <ImageField label="Business icon" hint="Square image, at least 256 × 256 px. PNG, JPG, or SVG up to 2 MB." value={value.iconUrl} disabled={!canEdit} onChange={iconUrl => setValue({ ...value, iconUrl })} onError={setError} />
    {error && <p className="ss-error" role="alert">{error}</p>}
    {canEdit && <Button disabled={pending} onClick={save(() => saveBranding(value), onSaved)}>{pending ? "Saving…" : "Save branding"}</Button>}
  </Section>;
}
