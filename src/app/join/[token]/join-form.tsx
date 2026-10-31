"use client";

import { useState, useTransition, type FormEvent } from "react";
import Image from "next/image";
import { CustomerExperience } from "@/app/dashboard/venue/smart-sleeve/customer-experience";
import { newExperience } from "@/lib/smart-sleeves";
import { Field, Icon } from "@/app/dashboard/venue/smart-sleeve/ui";
import { submitSponsorProfile } from "./actions";

type Value = { businessName: string; email: string; offer: string; url: string; logoUrl: string | null; price: number };

export function JoinForm({ token, cafeName, cafeLogo, headline, message, invited, initial, submitted }: { token: string; cafeName: string; cafeLogo: string | null; headline: string; message: string; invited: boolean; initial: Value; submitted: boolean }) {
  const [value, setValue] = useState(initial);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  async function upload(file: File) {
    if (file.size > 2 * 1024 * 1024) { setError("Image must be 2 MB or smaller."); return; }
    setUploading(true); setError("");
    try {
      const form = new FormData();
      form.append("file", file); form.append("joinToken", token);
      const response = await fetch("/api/upload/logo", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok || !result.url) setError(result.error || "Upload failed. Please try again.");
      else setValue(current => ({ ...current, logoUrl: result.url }));
    } catch { setError("Upload failed. Please try again."); }
    finally { setUploading(false); }
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await submitSponsorProfile(token, value);
      if (result.ok) setDone(true); else setError(result.error);
    });
  }
  if (done) return <div className="ss-card ss-card-pad ss-empty"><Icon name="check" size={30} /><h3>Request sent</h3><p>{cafeName} will review your listing. You’ll hear from them once it’s live.</p></div>;
  const board = { ...newExperience("board", cafeName), headline, message };
  return <div className="ss-join-grid">
    <form className="ss-card ss-card-pad" onSubmit={submit}>
      {submitted && <p className="ss-notice" style={{ marginBottom: 18 }}>You’ve already sent this. Update anything below and send it again.</p>}
      <Field label="Business name"><input required value={value.businessName} maxLength={100} placeholder="Alder Street Books" onChange={event => setValue({ ...value, businessName: event.target.value })} /></Field>
      <div className="ss-field"><span>Logo <small>(optional)</small></span><div className="ss-upload">{value.logoUrl ? <Image src={value.logoUrl} alt="Uploaded logo preview" width={56} height={56} unoptimized /> : <div className="ss-upload-empty"><Icon name="plus" size={18} /></div>}<label className="ss-button ss-button-secondary">{uploading ? "Uploading…" : value.logoUrl ? "Replace" : "Upload your logo"}<input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" hidden disabled={uploading} onChange={event => { const file = event.target.files?.[0]; if (file) void upload(file); }} /></label>{value.logoUrl && <button type="button" className="ss-button ss-button-quiet" onClick={() => setValue({ ...value, logoUrl: null })}>Remove logo</button>}</div><small>PNG, JPG, or SVG up to 2 MB. Square works best.</small></div>
      <Field label="Special offer" hint="What customers see when they scan."><input required value={value.offer} maxLength={200} placeholder="15% off any paperback" onChange={event => setValue({ ...value, offer: event.target.value })} /></Field>
      <Field label="Link (optional)" hint="Where customers go when they tap your offer."><input type="text" inputMode="url" autoCapitalize="off" value={value.url} maxLength={2048} placeholder="https://alderstreetbooks.com" onChange={event => setValue({ ...value, url: event.target.value })} /></Field>
      <div className="ss-fields-two"><Field label="Contact email"><input required type="email" value={value.email} maxLength={254} placeholder="hello@business.com" onChange={event => setValue({ ...value, email: event.target.value })} /></Field>{invited ? <Field label="Cost"><input value={value.price ? `$${value.price}` : "Free"} disabled /></Field> : <Field label="Your sponsorship ($)" hint="The café confirms the final amount."><input type="number" min={0} max={100000} step="any" value={value.price} onChange={event => setValue({ ...value, price: Number(event.target.value) || 0 })} /></Field>}</div>
      {error && <p className="ss-error" role="alert">{error}</p>}
      <button type="submit" className="ss-button ss-button-primary" disabled={pending || uploading} style={{ width: "100%", marginTop: 8 }}>{pending ? "Sending…" : "Request to join"}</button>
      <p className="ss-detail-text" style={{ marginTop: 12, textAlign: "center" }}>No payment is taken here. {cafeName} will be in touch about payment.</p>
    </form>
    <aside className="ss-preview-column"><div className="ss-preview-label">Preview</div><div className="ss-phone"><div className="ss-phone-top"><span /></div><CustomerExperience cafe={{ id: "", name: cafeName, slug: "", accent: "#2f5d4c", logoUrl: cafeLogo }} experience={board} sponsors={[{ id: "you", name: value.businessName || "Your business", offer: value.offer || "Your offer", url: value.url, logoUrl: value.logoUrl }]} preview /></div></aside>
  </div>;
}
