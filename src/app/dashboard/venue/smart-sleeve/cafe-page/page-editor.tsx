"use client";

import { useCallback, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { normalizeUrl, validUrl, type Cafe } from "@/lib/smart-sleeves";
import { LINK_KINDS, MAX_CUSTOM_LINKS, URL_KINDS, type CafePage, type PageLink } from "@/lib/cafe-page";
import { saveCafePage } from "../actions";
import { CafePageView, type ViewLink } from "../cafe-page-view";
import { Button, copyText, Field, Icon, Notice, QrCode, Toast } from "../ui";

const BASE = "/dashboard/venue/smart-sleeve";

export function PageEditor({ canEdit, cafe, initial, boards, eventsLive, spaceName, nextEvent, publicUrl, replacesLegacy }: {
  canEdit: boolean; cafe: Cafe; initial: CafePage; boards: { id: string; name: string }[]; eventsLive: boolean; spaceName: string; nextEvent: string; publicUrl: string; replacesLegacy: boolean;
}) {
  const router = useRouter();
  const [page, setPage] = useState(initial);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [busy, startTransition] = useTransition();
  const clearToast = useCallback(() => setToast(""), []);
  const dirty = JSON.stringify(page) !== JSON.stringify(initial);
  const update = (id: string, patch: Partial<PageLink>) => setPage(current => ({ ...current, links: current.links.map(link => link.id === id ? { ...link, ...patch } : link) }));
  const move = (index: number, by: number) => setPage(current => {
    const links = [...current.links];
    const [link] = links.splice(index, 1);
    links.splice(index + by, 0, link);
    return { ...current, links };
  });
  const customCount = page.links.filter(link => link.kind === "custom").length;
  // What customers would see right now (same rules as the public page).
  const preview: ViewLink[] = page.links.flatMap(link => {
    if (!link.visible) return [];
    if (link.kind === "events") return eventsLive ? [{ ...link, detail: nextEvent || `Host your event in our ${spaceName.toLowerCase()}` }] : [];
    if (link.kind === "board") return boards.length ? [{ ...link, detail: "Offers from our neighbors" }] : [];
    const url = normalizeUrl(link.url);
    return validUrl(url) ? [{ ...link, detail: link.kind === "instagram" ? "Follow along" : new URL(url).hostname.replace(/^www\./, "") }] : [];
  });
  function save(next = page) {
    const before = page;
    setError("");
    setPage(next);
    startTransition(async () => {
      const result = await saveCafePage(next);
      if (!result.ok) { setError(result.error); setPage(before); return; }
      setToast(next.enabled && !initial.enabled ? "Your café page is live." : !next.enabled && initial.enabled ? "Your café page is turned off." : "Café page saved.");
      router.refresh();
    });
  }
  async function copy() {
    try { await copyText(publicUrl); setToast("Link copied."); } catch (copyError) { setToast(copyError instanceof Error ? copyError.message : "Copy didn’t work."); }
  }
  return <>
    <div className="ss-heading"><div><div className="ss-eyebrow">Café page</div><h1>Café page</h1><p>One page with everything you want customers to find: events, your menu, the Community Board, and more. Share the link anywhere, or point your QR codes at it.</p></div></div>
    <div className="ss-editor-grid">
      <div className="ss-card">
        <section className="ss-editor-section">
          <label className="ss-toggle-row" style={{ marginBottom: 0 }}><input type="checkbox" checked={page.enabled} disabled={!canEdit || busy} onChange={event => save({ ...page, enabled: event.target.checked })} /><span><strong>{page.enabled ? "Your café page is live" : "Publish your café page"}</strong><small>{page.enabled ? <><a href={publicUrl} target="_blank" rel="noopener">{publicUrl.replace(/^https?:\/\//, "")}</a> is public. Anyone with the link can see it.</> : "It stays private until you turn this on."}</small></span></label>
          {replacesLegacy && !page.enabled && <div style={{ marginTop: 14 }}><Notice>Your original sleeve page is also at this address. Turning on your café page replaces it, so QR codes already printed with this link will open the café page instead.</Notice></div>}
        </section>
        <section className="ss-editor-section">
          <Field label="Tagline (optional)" hint="Shown under your name."><input value={page.tagline} maxLength={160} disabled={!canEdit} placeholder="Coffee, community, and good company" onChange={event => setPage({ ...page, tagline: event.target.value })} /></Field>
        </section>
        <section className="ss-editor-section">
          <div className="ss-subhead"><h3>Links</h3><p>Turn on what you want customers to see, in the order they’ll see it.</p></div>
          {page.links.map((link, index) => <div key={link.id} className={`ss-link-editor${link.visible ? "" : " ss-link-hidden"}`}>
            <div className="ss-link-editor-header">
              <label className="ss-link-toggle"><input type="checkbox" checked={link.visible} disabled={!canEdit} onChange={event => update(link.id, { visible: event.target.checked })} /><span className={`ss-type-icon ss-type-icon-${link.kind === "board" ? "board" : "link"}`}><Icon name={LINK_KINDS[link.kind].icon} size={17} /></span><span><strong>{link.label || LINK_KINDS[link.kind].label}</strong><small>{LINK_KINDS[link.kind].hint}</small></span></label>
              {canEdit && <div className="ss-link-order">
                <Button variant="quiet" aria-label={`Move ${link.label} up`} disabled={index === 0} onClick={() => move(index, -1)}><Icon name="up" size={15} /></Button>
                <Button variant="quiet" aria-label={`Move ${link.label} down`} disabled={index === page.links.length - 1} onClick={() => move(index, 1)}><Icon name="down" size={15} /></Button>
                {link.kind === "custom" && <Button variant="quiet" aria-label={`Remove ${link.label}`} onClick={() => setPage({ ...page, links: page.links.filter(item => item.id !== link.id) })}><Icon name="close" size={15} /></Button>}
              </div>}
            </div>
            {link.visible && <div className="ss-link-editor-body">
              <Field label="Label"><input value={link.label} maxLength={60} disabled={!canEdit} onChange={event => update(link.id, { label: event.target.value })} /></Field>
              {URL_KINDS.includes(link.kind) && <Field label={link.kind === "instagram" ? "Instagram profile link" : "Web address"}><input type="text" inputMode="url" autoCapitalize="off" placeholder={link.kind === "instagram" ? "https://instagram.com/yourcafe" : "https://"} value={link.url} maxLength={2048} disabled={!canEdit} onChange={event => update(link.id, { url: event.target.value })} onBlur={() => update(link.id, { url: normalizeUrl(link.url) })} /></Field>}
              {link.kind === "board" && (boards.length ? <Field label="Which Community Board?"><select value={link.campaignId} disabled={!canEdit} onChange={event => update(link.id, { campaignId: event.target.value })}><option value="">Newest active board</option>{boards.map(board => <option key={board.id} value={board.id}>{board.name}</option>)}</select></Field> : <p className="ss-detail-text">You don’t have an active Community Board, so this stays hidden. <Link href={`${BASE}/campaigns/new`}>Create one</Link>.</p>)}
              {link.kind === "events" && !eventsLive && <p className="ss-detail-text">This shows once you turn on event requests or add a public event. <Link href={`${BASE}/events`}>Go to Events</Link>.</p>}
            </div>}
          </div>)}
          {canEdit && <Button variant="secondary" disabled={customCount >= MAX_CUSTOM_LINKS} disabledReason={`You can add up to ${MAX_CUSTOM_LINKS} extra links.`} onClick={() => { const id = crypto.randomUUID(); setPage({ ...page, links: [...page.links, { id, kind: "custom", label: "", url: "", campaignId: "", visible: true }] }); }}><Icon name="plus" size={15} /> Add a link</Button>}
        </section>
        {canEdit && <div className="ss-editor-footer"><small>{dirty ? "You have unsaved changes." : "All changes saved."}</small>{error && <p className="ss-error" role="alert" style={{ flexBasis: "100%" }}>{error}</p>}<Button disabled={busy || !dirty} onClick={() => save()}>{busy ? "Saving…" : "Save changes"}</Button></div>}
      </div>
      <aside className="ss-preview-column">
        <div className="ss-preview-label">Customer preview</div>
        <div className="ss-phone"><div className="ss-phone-top"><span /></div><CafePageView cafe={cafe} tagline={page.tagline} links={preview} preview={!page.enabled} /></div>
        <div className="ss-card ss-card-pad ss-page-share">
          <h3>Share your café page</h3>
          <div className="ss-share-box">{publicUrl}</div>
          <div className="ss-button-row"><Button variant="secondary" onClick={copy}><Icon name="copy" size={15} /> Copy link</Button>{page.enabled && <a className="ss-button ss-button-quiet" href={publicUrl} target="_blank" rel="noopener"><Icon name="external" size={15} /> Open</a>}</div>
          <p className="ss-detail-text">Put it in your Instagram bio, on Google Maps, or on your website. To track scans from sleeves and signs, create a <Link href={`${BASE}/campaigns/new`}>Café Page campaign</Link>. Or download a plain QR code:</p>
          <QrCode value={publicUrl} label={`QR code for ${cafe.name}’s café page`} filename={`${cafe.slug}-cafe-page`} onError={setToast} />
        </div>
      </aside>
    </div>
    <Toast message={toast} onClose={clearToast} />
  </>;
}
