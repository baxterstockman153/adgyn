"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import Image from "next/image";
import { initials, isExpired, validUrl, type Cafe, type Experience, type PublicSponsor } from "@/lib/smart-sleeves";
import { Icon } from "./ui";

export type SignupInput = { name: string; email: string; phone: string };

// What a customer sees after scanning. Rendered live on /q/[id] and as the
// in-dashboard preview (`preview` disables tracking and real submissions).
export function CustomerExperience({ cafe, experience, sponsors = [], preview = false, claimId, onClaim, onSignup, pending = false, error, linkFor }: {
  cafe: Cafe;
  experience: Experience;
  sponsors?: PublicSponsor[];
  preview?: boolean;
  claimId?: string;
  onClaim?: () => void;
  onSignup?: (input: SignupInput) => Promise<boolean>;
  pending?: boolean;
  error?: string;
  linkFor?: (entryId?: string) => string;
}) {
  const [sampleClaim, setSampleClaim] = useState(false);
  const [joined, setJoined] = useState(false);
  const [form, setForm] = useState<SignupInput>({ name: "", email: "", phone: "" });
  const expired = experience.kind === "offer" && !!experience.expiresOn && isExpired(experience.expiresOn);
  const claimed = !!claimId || sampleClaim;
  async function signup(event: FormEvent) {
    event.preventDefault();
    if (preview) { setJoined(true); return; }
    if (await onSignup?.(form)) setJoined(true);
  }
  const href = (id?: string, url?: string) => preview ? undefined : linkFor?.(id) || url;
  return <div className="ss-customer" style={{ "--cafe-accent": cafe.accent } as CSSProperties}>
    <header className="ss-customer-header">{cafe.logoUrl ? <Image className="ss-customer-logo" src={cafe.logoUrl} alt={cafe.name} width={48} height={48} unoptimized /> : <div className="ss-customer-monogram">{initials(cafe.name)}</div>}<strong>{cafe.name}</strong><span>A little closer to your neighborhood.</span></header>
    <div className="ss-customer-body">
      {experience.kind === "link" && <><div className="ss-customer-symbol"><Icon name="cup" size={32} /></div><h2>{experience.headline || "Your next coffee, one tap away."}</h2>{experience.message && <p>{experience.message}</p>}{preview ? <button className="ss-customer-cta" type="button" disabled>{experience.buttonLabel || "Continue"} <Icon name="arrow" size={17} /></button> : <a className="ss-customer-cta" href={href(undefined, experience.url)}>{experience.buttonLabel || "Continue"} <Icon name="arrow" size={17} /></a>}<small className="ss-customer-url">{validUrl(experience.url) ? new URL(experience.url).hostname : "Your destination will appear here"}</small></>}

      {experience.kind === "offer" && <><span className="ss-customer-eyebrow">A neighborhood treat</span><h2>{experience.headline || "Something good is coming."}</h2><p><strong>{experience.message}</strong>{experience.business && experience.business !== cafe.name ? <> at {experience.business}</> : null}</p><div className="ss-offer-ticket"><Icon name={claimed ? "check" : "ticket"} size={30} /><strong>{expired ? "This offer has ended" : claimed ? "Your coupon is saved" : "Made for our neighbors"}</strong><span>{claimed ? "Show this screen at the register." : expired ? "Thanks for stopping by. Keep an eye out for the next one." : "Save it now. Use it when you visit."}</span>{claimed && <code>{claimId ? claimId.slice(0, 8).toUpperCase() : "PREVIEW"}</code>}{experience.code && <small>Code: {experience.code}</small>}</div><button type="button" className="ss-customer-cta" disabled={expired || claimed || pending || (!preview && !onClaim)} onClick={() => preview ? setSampleClaim(true) : onClaim?.()}>{expired ? "Offer ended" : claimed ? "Saved — show this to staff" : pending ? "Saving…" : "Save this coupon"}{!expired && !claimed && <Icon name="arrow" size={17} />}</button>{error && <p className="ss-error" role="alert">{error}</p>}<div className="ss-offer-terms"><strong>Good to know</strong><p>{experience.terms || "Add how to redeem it and any exclusions."}</p>{experience.expiresOn && <p>Valid through {experience.expiresOn} (Pacific time)</p>}</div></>}

      {(experience.kind === "newsletter" || experience.kind === "loyalty") && <><div className="ss-customer-symbol"><Icon name={experience.kind === "loyalty" ? "heart" : "mail"} size={30} /></div><h2>{experience.headline}</h2>{experience.message && <p>{experience.message}</p>}{experience.kind === "loyalty" && experience.reward && <div className="ss-offer-ticket"><strong>{experience.reward}</strong>{experience.stampsNeeded > 0 && <span>Collect {experience.stampsNeeded} visits to earn it.</span>}</div>}{experience.kind === "newsletter" && experience.incentive && <div className="ss-offer-ticket"><Icon name="ticket" size={26} /><strong>{experience.incentive}</strong><span>Our thank-you for signing up.</span></div>}
        {joined ? <div className="ss-customer-done"><Icon name="check" size={26} /><strong>{experience.kind === "loyalty" ? "You’re in!" : "You’re on the list!"}</strong><span>{experience.kind === "loyalty" ? "Mention your email at the register so we can count your visits." : "Watch your inbox for good things from us."}</span></div>
        : <form className="ss-customer-form" onSubmit={signup}><input aria-label="Your name" placeholder="Your name" value={form.name} maxLength={120} onChange={event => setForm({ ...form, name: event.target.value })} /><input aria-label="Email" type="email" required placeholder="Email" value={form.email} maxLength={254} onChange={event => setForm({ ...form, email: event.target.value })} />{experience.kind === "loyalty" && <input aria-label="Phone (optional)" type="tel" placeholder="Phone (optional)" value={form.phone} maxLength={30} onChange={event => setForm({ ...form, phone: event.target.value })} />}<button type="submit" className="ss-customer-cta" disabled={pending}>{pending ? "Saving…" : experience.buttonLabel || "Sign me up"}<Icon name="arrow" size={17} /></button>{error && <p className="ss-error" role="alert">{error}</p>}<small className="ss-customer-url">Only {cafe.name} sees your details. Unsubscribe anytime.</small></form>}</>}

      {experience.kind === "board" && <><span className="ss-customer-eyebrow">Around the corner</span><h2>{experience.headline || "Meet your neighborhood."}</h2>{experience.message && <p>{experience.message}</p>}
        <div className="ss-customer-list">
          {sponsors.map(sponsor => <a key={sponsor.id} className="ss-customer-listing ss-customer-sponsor" href={sponsor.url ? href(sponsor.id, sponsor.url) : undefined} aria-disabled={preview || !sponsor.url || undefined}>{sponsor.logoUrl ? <Image src={sponsor.logoUrl} alt="" width={44} height={44} unoptimized /> : <span className="ss-customer-sponsor-mark">{initials(sponsor.name)}</span>}<div><span>Local partner</span><strong>{sponsor.name}</strong><p>{sponsor.offer}</p></div>{sponsor.url && <Icon name="external" size={15} />}</a>)}
          {experience.entries.map(entry => <a key={entry.id} className="ss-customer-listing" href={entry.url ? href(entry.id, entry.url) : undefined} aria-disabled={preview || !entry.url || undefined}><span>{entry.category}</span><strong>{entry.name}</strong>{entry.description && <p>{entry.description}</p>}{entry.url && <Icon name="external" size={15} />}</a>)}
          {!sponsors.length && !experience.entries.length && <div className="ss-customer-empty"><Icon name="leaf" size={30} /><p>Local businesses you approve will appear here.</p></div>}
        </div></>}
    </div>
    <footer className="ss-customer-footer">Powered by <strong>adgyn</strong>{preview && <span>Customer preview · no activity recorded</span>}</footer>
  </div>;
}
