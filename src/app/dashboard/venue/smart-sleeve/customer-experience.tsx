"use client";

import { useState, type CSSProperties } from "react";
import { isExpired, validUrl, type Cafe, type Experience } from "@/lib/smart-sleeves";
import { Icon } from "./ui";

export function CustomerExperience({ cafe, experience, preview = false, claimId, onClaim, pending = false, error, linkFor }: {
  cafe: Cafe;
  experience: Experience;
  preview?: boolean;
  claimId?: string;
  onClaim?: () => void;
  pending?: boolean;
  error?: string;
  linkFor?: (entryId?: string) => string;
}) {
  const [sampleClaim, setSampleClaim] = useState(false);
  const expired = experience.kind === "offer" && !!experience.expiresOn && isExpired(experience.expiresOn);
  const claimed = !!claimId || sampleClaim;
  return <div className="ss-customer" style={{ "--cafe-accent": cafe.accent } as CSSProperties}>
    <header className="ss-customer-header"><div className="ss-customer-monogram">{cafe.name.split(" ").map(part => part[0]).slice(0, 2).join("")}</div><strong>{cafe.name}</strong><span>A little closer to your neighborhood.</span></header>
    <div className="ss-customer-body">
      {experience.kind === "link" && <><div className="ss-customer-symbol"><Icon name="cup" size={32} /></div><h2>{experience.headline || "Your next coffee, one tap away."}</h2><p>Good things are waiting for you.</p>{preview ? <button className="ss-customer-cta" type="button" disabled>Open destination <Icon name="arrow" size={17} /></button> : <a className="ss-customer-cta" href={linkFor?.() || experience.url}>Continue <Icon name="arrow" size={17} /></a>}<small className="ss-customer-url">{validUrl(experience.url) ? new URL(experience.url).hostname : "Your destination will appear here"}</small></>}
      {experience.kind === "offer" && <><span className="ss-customer-eyebrow">A neighborhood treat</span><h2>{experience.headline || "Something good is coming."}</h2><p>At <strong>{experience.business || "your local partner"}</strong></p><div className="ss-offer-ticket"><Icon name={claimed ? "check" : "ticket"} size={30} /><strong>{expired ? "This offer has ended" : claimed ? "Your offer is saved" : "Made for our neighbors"}</strong><span>{claimed ? "Show this screen to the participating business." : "Claim it now. Enjoy it when you visit."}</span>{claimed && <code>{claimId ? claimId.slice(0, 8).toUpperCase() : "DEMO-ONLY"}</code>}{experience.code && <small>Offer code: {experience.code}</small>}</div><button type="button" className="ss-customer-cta" disabled={expired || claimed || pending || (!preview && !onClaim)} onClick={() => preview ? setSampleClaim(true) : onClaim?.()}>{expired ? "Offer expired" : claimed ? "Saved — show this to staff" : pending ? "Saving your offer…" : preview ? "Try claiming this offer" : "Claim this offer"}{!expired && !claimed && <Icon name="arrow" size={17} />}</button>{error && <p className="ss-error" role="alert">{error}</p>}<div className="ss-offer-terms"><strong>The good-to-know</strong><p>{experience.terms || "Add the offer details and any exclusions."}</p>{experience.expiresOn && <p>Valid through {experience.expiresOn} · Pacific time</p>}<p>{preview ? "Preview only. This does not create a claim or redemption." : "Claiming saves your offer. Redemption is confirmed separately by an authorized café owner after the business honors it."}</p></div></>}
      {(experience.kind === "board" || experience.kind === "ads") && <><span className="ss-customer-eyebrow">{experience.kind === "ads" ? "Meet our local partners" : "Around the corner"}</span><h2>{experience.headline || (experience.kind === "ads" ? "Good neighbors. Great finds." : "Meet your neighborhood.")}</h2><p>A few good things, picked by {cafe.name}.</p><div className="ss-customer-list">{experience.entries.length ? experience.entries.map(entry => <a key={entry.id} className="ss-customer-listing" href={preview ? undefined : linkFor?.(entry.id) || entry.url} aria-disabled={preview || undefined}><span>{entry.category === "Sponsor" ? "Sponsored" : entry.category}</span><strong>{entry.name}</strong><p>{entry.description}</p><Icon name="external" size={15} /></a>) : <div className="ss-customer-empty"><Icon name="leaf" size={30} /><p>Your first listing will appear here.</p></div>}</div></>}
    </div><footer className="ss-customer-footer">Brought together with <strong>adgyn</strong>{preview && <span>Customer preview · no activity recorded</span>}</footer>
  </div>;
}
