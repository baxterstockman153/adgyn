"use client";

import type { ReactNode } from "react";
import type { Cafe, Experience, ExperienceKind } from "@/lib/smart-sleeves";
import { Button, Icon, Notice } from "./ui";
import { CustomerExperience } from "./customer-experience";

// The community board, promoted to its own section: a café curates the local
// businesses, events, and nonprofits a customer sees on scan. Under the hood
// each board is a "board"-kind experience, so it reuses the same editor,
// publishing, and QR flow as every other QR code.
export function CommunityBoard({ cafe, boards, create, renderRow }: {
  cafe: Cafe;
  boards: Experience[];
  create: (kind?: ExperienceKind) => void;
  renderRow: (value: Experience) => ReactNode;
}) {
  const preview = boards[0];
  return <>
    <div className="ss-heading"><div><div className="ss-eyebrow">Community board</div><h1>Community board</h1><p>Feature the local businesses, events & nonprofits your customers love — all in one scan.</p></div><Button onClick={() => create("board")}><Icon name="plus" size={16} /> New board</Button></div>
    {boards.length ? <div className="ss-editor-grid">
      <div>
        <div className="ss-card">{boards.map(renderRow)}</div>
        <div style={{ marginTop: 18 }}><Notice>A board can carry local businesses, events, and nonprofits. Edit it to add or approve listings, then publish to get its QR.</Notice></div>
      </div>
      <aside className="ss-preview-column"><div className="ss-preview-label">Live customer preview</div><div className="ss-phone"><div className="ss-phone-top"><span /></div><CustomerExperience key={preview.id} cafe={cafe} experience={preview} preview /></div><p className="ss-preview-caption">What customers see when they scan.</p></aside>
    </div> : <div className="ss-card"><div className="ss-empty"><Icon name="grid" size={32} /><h3>No community board yet.</h3><p>Pull your neighborhood together on one page — the shops, events, and causes your customers care about.</p><Button variant="secondary" onClick={() => create("board")}>Create your community board</Button></div></div>}
  </>;
}
