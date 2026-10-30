"use client";

import { cents, SLEEVE_DESIGNS, SLEEVE_SIZES, SLEEVE_TIERS, sleeveQuote } from "@/lib/smart-sleeves";
import { Field } from "./ui";

export type SleeveDraft = { quantity: number; size: string; design: string; instructions: string };
export const DEFAULT_SLEEVES: SleeveDraft = { quantity: 1000, size: "12 oz", design: "Classic Kraft", instructions: "" };

export function SleevePreview({ cafeName, design, label }: { cafeName: string; design: string; label: string }) {
  const look = SLEEVE_DESIGNS.find(item => item.id === design) ?? SLEEVE_DESIGNS[0];
  return <div className="ss-sleeve-preview" style={{ background: look.background, color: look.color }}><strong>{cafeName}</strong><span className="ss-sleeve-qr" aria-hidden="true" /><small>{label || "Scan for perks"}</small></div>;
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
    <div className="ss-ship-to"><span>Ship to</span>{shipTo ? <pre>{shipTo}</pre> : <p className="ss-error">Add your café’s address in Settings → Business details before ordering.</p>}</div>
  </div>;
}
