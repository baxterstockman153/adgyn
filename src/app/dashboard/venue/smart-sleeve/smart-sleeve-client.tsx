"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EXPERIENCE_KINDS, SURFACES, experiencePath, isExpired, newExperience, validateExperience, type Cafe, type Claim, type Experience, type ExperienceKind } from "@/lib/smart-sleeves";
import { publishExperience, pauseExperience, confirmRedemption } from "./actions";
import { Badge, Button, Icon, Notice, QrCode, copyText } from "./ui";
import { ExperienceEditor } from "./experience-editor";
import { Sponsorship } from "./sponsorship";
import { CommunityBoard } from "./community-board";
import { ContentComposer } from "./content-composer";
import { SleeveEstimate } from "./sleeve-estimate";
import { Overview } from "./overview";
import { useWorkspace } from "./use-workspace";
import "./workspace.css";

type View = "overview" | "experiences" | "board" | "content" | "sleeves";
const NAV: { id: View; label: string; mobile: string; icon: string }[] = [
  { id: "overview", label: "Overview", mobile: "Home", icon: "home" },
  { id: "experiences", label: "QR codes", mobile: "QR codes", icon: "qr" },
  { id: "board", label: "Community board", mobile: "Board", icon: "grid" },
  { id: "content", label: "Newsletter & posts", mobile: "Share", icon: "mail" },
  { id: "sleeves", label: "Order sleeves", mobile: "Sleeves", icon: "cup" },
];

export function SmartSleeveApp({ cafe, demo = false, initialExperiences = [], claims = [], canPublish = true, hasOutreach = false }: { cafe: Cafe; demo?: boolean; initialExperiences?: Experience[]; claims?: Claim[]; canPublish?: boolean; hasOutreach?: boolean }) {
  const router = useRouter();
  const { state, setState } = useWorkspace(cafe, demo);
  const [view, setView] = useState<View>("overview");
  const [editing, setEditing] = useState<Experience | null>(null);
  const [sharing, setSharing] = useState<Experience | null>(null);
  const [toast, setToast] = useState("");
  const [location, setLocation] = useState("all");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "offer" | "published" | "draft">("all");
  const [pending, setPending] = useState(false);
  const [showCalc, setShowCalc] = useState(false);
  const contentRef = useRef<HTMLElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const liveIds = new Set(initialExperiences.map(experience => experience.id));
  const draftIds = new Set(state.drafts.map(experience => experience.id));
  const experiences = [...state.drafts, ...initialExperiences.filter(experience => !draftIds.has(experience.id))];
  const visible = experiences.filter(experience => location === "all" || experience.location === location);
  // Community boards get their own section, so keep them out of the QR-codes list.
  const feed = visible.filter(experience => experience.kind !== "board");
  const boards = visible.filter(experience => experience.kind === "board");
  const published = initialExperiences.filter(experience => experience.published && (location === "all" || experience.location === location));
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);
  function notify(message: string) {
    setToast(message);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToast(""), 6000);
  }
  function navigate(next: View) {
    if (editing) saveDraft(editing);
    setView(next); setEditing(null); setSharing(null);
    contentRef.current?.focus();
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function saveDraft(value: Experience) {
    const success = setState(previous => ({ ...previous, drafts: [{ ...value, published: false }, ...previous.drafts.filter(experience => experience.id !== value.id)] }));
    notify(success ? "Draft saved on this device." : "Your browser couldn’t save this draft. Please allow local storage and try again.");
  }
  // Boards have their own tab, so editing one should return there, not to QR codes.
  const homeView = (kind: ExperienceKind): View => (kind === "board" ? "board" : "experiences");
  function create(kind: ExperienceKind = "link") { setEditing(newExperience(cafe, kind)); setSharing(null); setView(homeView(kind)); window.scrollTo({ top: 0, behavior: "instant" }); }
  async function publish(value: Experience) {
    const error = validateExperience(value);
    if (error) return error;
    const result = await publishExperience(value);
    if (!result.ok) return result.error;
    setState(previous => ({ ...previous, drafts: previous.drafts.filter(experience => experience.id !== value.id) }));
    setEditing(null); setSharing({ ...value, id: result.id, published: true }); router.refresh();
    notify("Published. Your QR link stays the same when you update this experience.");
    return null;
  }
  async function pause(value: Experience) {
    setPending(true);
    try {
      const result = await pauseExperience(value.id);
      if (!result.ok) { notify(result.error || "Unable to pause this experience."); return; }
      setState(previous => ({ ...previous, drafts: previous.drafts.filter(experience => experience.id !== value.id) }));
      setSharing(null); router.refresh(); notify("Experience paused. Printed codes now show a friendly unavailable message.");
    } catch { notify("We couldn’t pause this experience. Please try again."); }
    finally { setPending(false); }
  }
  async function redeem(id: string) {
    setPending(true);
    try {
      const result = await confirmRedemption(id);
      notify(result.ok ? "Redemption confirmed. This is now counted separately from claims." : result.error || "Unable to confirm redemption.");
      if (result.ok) router.refresh();
    } catch { notify("We couldn’t confirm the redemption. Please try again."); }
    finally { setPending(false); }
  }
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const shareUrl = sharing ? sharing.published ? `${origin}${experiencePath(sharing.id)}` : `${origin}/demo/experience?cafe=${cafe.slug}&experience=${encodeURIComponent(JSON.stringify(sharing))}` : "";
  function row(experience: Experience) {
    const hasLiveVersion = liveIds.has(experience.id) && draftIds.has(experience.id);
    return <div className="ss-experience-row" key={experience.id}><div className={`ss-type-icon ss-type-icon-${experience.kind}`}><Icon name={EXPERIENCE_KINDS[experience.kind].icon} size={19} /></div><div className="ss-row-text"><strong>{experience.name || "Untitled QR code"}</strong><small>{SURFACES[experience.surface]} · {experience.location}</small></div><div className="ss-row-actions"><Badge tone={experience.published ? "green" : "neutral"}>{experience.published ? "Published" : hasLiveVersion ? "Draft changes" : liveIds.has(experience.id) ? "Paused" : demo ? "Sample / draft" : "Draft"}</Badge><Button variant="quiet" onClick={() => setEditing(experience)} aria-label={`Edit ${experience.name || "experience"}`}><Icon name="edit" size={15} /> Edit</Button>{(experience.published || demo) && <Button variant="secondary" onClick={() => setSharing(experience)}>{experience.published ? "Get QR" : "Preview QR"}<Icon name="qr" size={14} /></Button>}</div></div>;
  }
  const list = feed.filter(experience => (!query || `${experience.name} ${experience.location} ${experience.business}`.toLowerCase().includes(query.toLowerCase())) && (filter === "all" || filter === "offer" && experience.kind === "offer" || filter === "published" && experience.published || filter === "draft" && !experience.published));
  return <div className="ss">
    <a href="#workspace-main" className="ss-skip">Skip to workspace</a>
    <aside className="ss-sidebar"><div className="ss-wordmark"><Icon name="cup" size={31} />adgyn<span style={{ color: "#c8784a" }}>.</span></div><div className="ss-brand-subtitle">Smart Sleeves workspace</div><div className="ss-cafe-switch"><div className="ss-avatar">{cafe.name.split(" ").map(part => part[0]).slice(0, 2).join("")}</div><div><strong>{cafe.name}</strong><small>Café workspace</small></div></div><nav className="ss-nav" aria-label="Café workspace">{NAV.map(item => <button type="button" key={item.id} aria-label={item.label} aria-current={view === item.id ? "page" : undefined} onClick={() => navigate(item.id)}><Icon name={item.icon} size={18} /><span className="ss-nav-desktop">{item.label}</span><span className="ss-nav-mobile">{item.mobile}</span></button>)}</nav><div className="ss-sidebar-bottom">{hasOutreach && <Link href="/dashboard/venue/outreach"><Icon name="heart" size={15} /> Sponsor conversations</Link>}<a href="mailto:hello@adgyn.com"><Icon name="mail" size={15} /> Help</a>{demo ? <Link href="/login">Sign in to your café<Icon name="arrow" size={14} /></Link> : <form action="/api/auth/signout" method="post"><button type="submit" className="ss-button ss-button-quiet">Sign out</button></form>}</div></aside>
    <div className="ss-main"><header className="ss-topbar"><div className="ss-topbar-left"><strong>{cafe.name}</strong><span>/</span><span>{NAV.find(item => item.id === view)?.label}</span></div><div className="ss-topbar-right"><Icon name="pin" size={15} /><label><span className="sr-only">Filter by location</span><select className="ss-location-filter" value={location} onChange={event => setLocation(event.target.value)}><option value="all">All locations</option>{cafe.locations.map(item => <option key={item}>{item}</option>)}</select></label><div className="ss-avatar" style={{ width: 29, height: 29, fontSize: 10 }}>MY</div></div></header>
      {demo && <div className="ss-demo-strip"><span>Interactive demo · sample content · drafts stay on this device</span><Link href={`/demo/smart-sleeves?cafe=${cafe.slug === "gratitude" ? "nirvana" : "gratitude"}`}>Try {cafe.slug === "gratitude" ? "Nirvana Soul" : "Gratitude"}</Link></div>}
      <main ref={contentRef} id="workspace-main" tabIndex={-1} className="ss-content">
        {!canPublish && !demo && <div style={{ marginBottom: 25 }}><Notice>Café owners can publish experiences. You can prepare drafts, explore pricing, and export campaign content.</Notice></div>}
        {editing ? <ExperienceEditor key={editing.id} cafe={cafe} initial={editing} demo={demo} canPublish={canPublish} onSave={saveDraft} onPublish={publish} onDraftChange={setEditing} onDiscard={() => { if (!setState(previous => ({ ...previous, drafts: previous.drafts.filter(draft => draft.id !== editing.id) }))) { notify("Your browser couldn’t discard the draft. Please try again."); return; } setView(homeView(editing.kind)); setEditing(null); notify("Draft discarded."); }} onBack={() => { setView(homeView(editing.kind)); setEditing(null); }} /> : sharing ? <>
          <button type="button" className="ss-back" onClick={() => setSharing(null)}><Icon name="arrow" size={16} /> Back to your workspace</button><div className="ss-card ss-card-pad ss-share-panel"><div className={`ss-type-icon ss-type-icon-${sharing.kind}`}><Icon name="qr" size={23} /></div><h2>{sharing.published ? "Your QR code is ready" : "Preview this QR code"}</h2><p>{sharing.published ? "Download it for your printed materials. You can change what it shows later without reprinting." : "This scannable code opens a sample preview. It doesn’t publish your QR code or record activity."}</p><QrCode value={shareUrl} onError={notify} /><div className="ss-share-box">{shareUrl}</div><div className="ss-button-row"><Button variant="secondary" onClick={async () => { try { await copyText(shareUrl); notify("Link copied."); } catch { notify("Copy is unavailable. Select the link above to copy it."); } }}><Icon name="copy" size={15} /> Copy link</Button><a href={sharing.published ? `${origin}${experiencePath(sharing.id, "direct")}&preview=1` : shareUrl} target="_blank" rel="noopener noreferrer" className="ss-button ss-button-secondary">Open preview<Icon name="external" size={15} /></a>{sharing.published && <Button variant="quiet" disabled={pending} onClick={() => pause(sharing)}><Icon name="pause" size={15} /> Pause</Button>}</div></div>
        </> : <>
          {view === "overview" && <Overview cafe={cafe} demo={demo} experiences={feed} published={published} create={create} edit={setEditing} share={setSharing} navigate={navigate} renderRow={row} />}
          {view === "experiences" && <>
            <div className="ss-heading"><div><div className="ss-eyebrow">QR codes</div><h1>Your QR codes</h1><p>Each one shows something when scanned — a link, an offer, or sponsors. Community boards live in their own tab.</p></div><Button onClick={() => create()}><Icon name="plus" size={16} /> New QR code</Button></div>
            <div className="ss-toolbar"><div className="ss-search"><input aria-label="Search experiences" placeholder="Find a QR code or local partner…" value={query} onChange={event => setQuery(event.target.value)} /></div><div className="ss-filter-tabs">{([ ["all", "All"], ["offer", "Offers"], ["published", "Published"], ["draft", "Drafts"] ] as const).map(([value, label]) => <button type="button" key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</div></div>
            <div className="ss-card">{list.length ? list.map(row) : <div className="ss-empty"><Icon name="qr" size={32} /><h3>{experiences.length ? "No QR codes match." : "No QR codes yet."}</h3><p>{experiences.length ? "Try another search, location, or filter." : "Start with a link to your app, or a simple local offer."}</p><Button variant="secondary" onClick={() => { if (experiences.length) { setQuery(""); setFilter("all"); setLocation("all"); } else create(); }}>{experiences.length ? "Clear filters" : "New QR code"}</Button></div>}</div>
            {published.length > 0 && <section className="ss-card" style={{ marginTop: 22 }}><div className="ss-card-header"><div><h3>Customer actions · all time</h3><p>Clicks are destination actions. Claims and confirmed redemptions are separate.</p></div></div>{published.map(experience => <div className="ss-experience-row" key={experience.id}><div className="ss-row-text"><strong>{experience.name}</strong><small>{experience.visits} visits · {experience.clicks} clicks · {experience.claims} claims · {experience.redemptions} confirmed redemptions</small><small>Visits by source: QR {experience.channelVisits?.qr ?? 0} · Email {experience.channelVisits?.email ?? 0} · Social {experience.channelVisits?.social ?? 0} · Direct {experience.channelVisits?.direct ?? 0}</small></div><Button variant="quiet" onClick={() => setSharing(experience)}>Get QR<Icon name="arrow" size={14} /></Button></div>)}</section>}
            {claims.length > 0 && <section className="ss-card" style={{ marginTop: 22 }}><div className="ss-card-header"><div><h3>Confirm offer redemptions</h3><p>Only confirm after the participating business honors the customer’s offer. Latest 100 claims.</p></div></div>{claims.filter(claim => location === "all" || initialExperiences.some(experience => experience.id === claim.experienceId && experience.location === location)).map(claim => <div className="ss-claim-row" key={claim.id}><code>{claim.id.slice(0, 8).toUpperCase()}</code><div className="ss-row-text"><strong>{claim.business}</strong><small>{claim.headline}</small></div>{claim.redeemedAt ? <Badge tone="green">Confirmed</Badge> : isExpired(claim.expiresOn) ? <Badge>Expired</Badge> : <Button variant="secondary" disabled={pending} onClick={() => redeem(claim.id)}>Confirm redemption</Button>}</div>)}</section>}
          </>}
          {view === "board" && <CommunityBoard cafe={cafe} boards={boards} create={create} renderRow={row} />}
          {view === "content" && <ContentComposer cafe={cafe} experiences={experiences} draft={state.content} onChange={value => { if (!setState(previous => ({ ...previous, content: value }))) notify("Your browser couldn’t save this draft."); }} origin={origin} notify={notify} onCreate={() => create()} />}
          {view === "sleeves" && <>
            <SleeveEstimate cafe={cafe} draft={state.sleeves} onChange={value => { if (!setState(previous => ({ ...previous, sleeves: value }))) notify("Your browser couldn’t save this estimate."); }} monthlyFee={state.scenario.monthlyFee} onFeeChange={value => { if (!setState(previous => ({ ...previous, scenario: { ...previous.scenario, monthlyFee: value } }))) notify("Your browser couldn’t save this estimate."); }} notify={notify} />
            <section className="ss-card ss-card-pad" style={{ marginTop: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <div><h3>Will sponsorship cover the cost?</h3><p className="ss-detail-text" style={{ marginTop: 6, maxWidth: 520 }}>Sleeves and the platform are a monthly cost. See how many local sponsors it takes to cover it — the plan price above flows straight into this calculator.</p></div>
                <Button variant={showCalc ? "secondary" : "primary"} onClick={() => setShowCalc(value => !value)}>{showCalc ? "Hide calculator" : "Open the calculator"}<Icon name={showCalc ? "chevron" : "arrow"} size={15} /></Button>
              </div>
            </section>
            {showCalc && <div style={{ marginTop: 20 }}><Sponsorship embedded scenario={state.scenario} onChange={value => { if (!setState(previous => ({ ...previous, scenario: value }))) notify("Your browser couldn’t save these changes."); }} onOutreach={hasOutreach ? () => router.push("/dashboard/venue/outreach") : undefined} /></div>}
          </>}
        </>}
      </main>
    </div>
    {toast && <div className="ss-toast" role="status"><Icon name="check" size={16} /><span>{toast}</span><button type="button" onClick={() => setToast("")} aria-label="Dismiss notification"><Icon name="close" size={15} /></button></div>}
  </div>;
}
