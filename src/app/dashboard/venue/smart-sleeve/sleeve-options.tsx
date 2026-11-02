"use client";

import { useEffect, useState, useTransition, type ChangeEvent } from "react";
import { cents, SLEEVE_DESIGNS, SLEEVE_SIZES, SLEEVE_TIERS, sleeveQuote } from "@/lib/smart-sleeves";
import { saveShippingAddress } from "./actions";
import { Button, Field, Icon } from "./ui";

export type SleeveDraft = { quantity: number; size: string; design: string; instructions: string };
export const DEFAULT_SLEEVES: SleeveDraft = { quantity: 1000, size: "12 oz", design: "Classic Kraft", instructions: "" };

// The café's short name for the sleeve: "Gratitude Coffee Bar" prints as "Gratitude".
function sleeveName(name: string) {
  const short = name.replace(/\s+(coffee|caf[eé]|bar|roasters?|co\.?|company|house|shop|&)+(\s+(coffee|caf[eé]|bar|roasters?|co\.?|company|house|shop|&))*$/i, "").trim();
  return short || name;
}

export function SleevePreview({ cafeName, logoUrl, design, label }: { cafeName: string; logoUrl?: string | null; design: string; label: string }) {
  const look = SLEEVE_DESIGNS.find(item => item.id === design) ?? SLEEVE_DESIGNS[0];
  const [qr, setQr] = useState("");
  useEffect(() => {
    let cancelled = false;
    // Sample code for the preview; the real one is created at launch.
    import("qrcode").then(encoder => encoder.toDataURL("https://app.adgyn.com/q/sleeve-preview", { width: 240, margin: 0, errorCorrectionLevel: "M", color: { dark: "#241a15", light: "#ffffff" } }))
      .then(image => { if (!cancelled) setQr(image); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);
  const name = sleeveName(cafeName);
  return <div className="ss-sleeve-card">
    <div className="ss-sleeve-card-head"><span>Live preview</span><Icon name="palette" size={20} /></div>
    <div className="ss-sleeve-shape" style={{ color: look.color }}>
      <svg viewBox="0 0 440 210" preserveAspectRatio="none" aria-hidden="true">
        <path d="M30 22 Q220 58 410 22 L382 192 Q220 214 58 192 Z" fill="#00000014" />
        <path d="M6 10 Q220 46 434 10 L398 180 Q220 202 42 180 Z" fill={look.background} />
        <path d="M22 26 Q220 62 418 26" fill="none" stroke="currentColor" strokeOpacity=".55" strokeWidth="2" strokeDasharray="6 6" />
      </svg>
      <div className="ss-sleeve-content">
        <div className="ss-sleeve-brand">{logoUrl ? <img src={logoUrl} alt="" /> : <span>{name.charAt(0).toUpperCase()}</span>}<strong>{name}</strong></div>
        <div className="ss-sleeve-code">{qr ? <img src={qr} alt="" /> : <i />}<small>{label || "Scan for perks"}</small></div>
      </div>
    </div>
    <ul className="ss-sleeve-notes"><li>Logo pulled from your brand kit in Settings.</li><li>QR code is permanent — change experiences without reprinting.</li></ul>
  </div>;
}

export function SleeveOptions({ value, onChange }: { value: SleeveDraft; onChange: (value: SleeveDraft) => void }) {
  return <>
    <h3 className="ss-mini-heading">Design</h3>
    <div className="ss-choice-grid ss-choice-grid-3">{SLEEVE_DESIGNS.map(design => <button key={design.id} type="button" className="ss-choice" aria-pressed={value.design === design.id} onClick={() => onChange({ ...value, design: design.id })}><span className="ss-swatch" style={{ background: design.background, borderColor: design.color }} /><strong>{design.id}</strong><small>{design.description}</small></button>)}</div>
    <h3 className="ss-mini-heading">Size</h3>
    <div className="ss-choice-grid">{SLEEVE_SIZES.map(size => <button key={size.id} type="button" className="ss-choice" aria-pressed={value.size === size.id} onClick={() => onChange({ ...value, size: size.id })}><strong>{size.id}</strong><small>{size.description}</small></button>)}</div>
    <h3 className="ss-mini-heading">Quantity</h3>
    {SLEEVE_TIERS.map(tier => <button key={tier.quantity} type="button" className="ss-quantity-option" aria-pressed={value.quantity === tier.quantity} onClick={() => onChange({ ...value, quantity: tier.quantity })}><strong>{tier.quantity.toLocaleString()} sleeves</strong><small>${tier.unitPrice.toFixed(2)} each</small></button>)}
    <div style={{ marginTop: 18 }}><Field label="Design instructions (optional)" hint="Anything our design team should know: colors to avoid, a tagline, placement notes."><textarea value={value.instructions} maxLength={1000} onChange={event => onChange({ ...value, instructions: event.target.value })} /></Field></div>
  </>;
}

export function OrderSummary({ value, shipTo }: { value: SleeveDraft; shipTo: string }) {
  const quote = sleeveQuote(value.quantity);
  return <div className="ss-order-lines">
    <div className="ss-money-row"><span>{quote.quantity.toLocaleString()} × {value.size} · {value.design}</span><strong>{cents(quote.subtotal)}</strong></div>
    <div className="ss-money-row"><span>Design & setup</span><strong>Included</strong></div>
    <div className="ss-money-row"><span>Shipping · Standard</span><strong>{cents(quote.shipping)}</strong></div>
    <div className="ss-money-row"><span>Estimated tax</span><strong>{cents(quote.tax)}</strong></div>
    <div className="ss-money-total"><strong>{cents(quote.total)}</strong><p>Nothing is charged now. We’ll email you a proof and an invoice before printing.</p></div>
    <div className="ss-ship-to"><span>Ship to</span>{shipTo ? <pre>{shipTo}</pre> : <p className="ss-detail-text">Add your café’s address below before ordering.</p>}</div>
  </div>;
}

/** Saves the café's address without leaving the order, so nothing typed so far is lost. */
export function ShipToForm({ onSaved }: { onSaved: () => void }) {
  const [value, setValue] = useState({ street: "", suite: "", city: "", state: "", zip: "" });
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const set = (key: keyof typeof value) => (event: ChangeEvent<HTMLInputElement>) => setValue({ ...value, [key]: event.target.value });
  return <div className="ss-ship-to-form">
    <h4>Where should we ship?</h4>
    <Field label="Street address"><input value={value.street} maxLength={200} autoComplete="address-line1" onChange={set("street")} /></Field>
    <Field label="Suite / unit (optional)"><input value={value.suite} maxLength={60} autoComplete="address-line2" onChange={set("suite")} /></Field>
    <div className="ss-fields-three"><Field label="City"><input value={value.city} maxLength={100} autoComplete="address-level2" onChange={set("city")} /></Field><Field label="State"><input value={value.state} maxLength={2} placeholder="CA" autoComplete="address-level1" onChange={set("state")} /></Field><Field label="ZIP"><input value={value.zip} maxLength={10} inputMode="numeric" autoComplete="postal-code" onChange={set("zip")} /></Field></div>
    {error && <p className="ss-error" role="alert">{error}</p>}
    <Button variant="secondary" disabled={pending} onClick={() => startTransition(async () => {
      setError("");
      const result = await saveShippingAddress(value);
      if (!result.ok) { setError(result.error); return; }
      onSaved();
    })}>{pending ? "Saving…" : "Save address"}</Button>
  </div>;
}
