"use client";

import { useState } from "react";
import { CAFE, BOARD_ENTRIES, type QrExperience } from "./_data";

export type PreviewCard = { name: string; tagline: string; cta: string };

// A faux QR glyph — a deterministic pseudo-random grid that reads as a QR code
// without needing a real encoder. Frontend-only demo; not scannable by design.
export function QrGlyph({ size = 96, seed = "nirvana" }: { size?: number; seed?: string }) {
  const n = 11;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) & 0xffff;
  const cells: boolean[] = [];
  for (let i = 0; i < n * n; i++) {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    cells.push((h >> 8) % 2 === 0);
  }
  const isFinder = (r: number, c: number) => {
    const inBox = (br: number, bc: number) => r >= br && r < br + 3 && c >= bc && c < bc + 3;
    return inBox(0, 0) || inBox(0, n - 3) || inBox(n - 3, 0);
  };
  return (
    <svg width={size} height={size} viewBox={`0 0 ${n} ${n}`} className="rounded-sm">
      <rect width={n} height={n} fill="#fff" />
      {cells.map((on, i) => {
        const r = Math.floor(i / n);
        const c = i % n;
        if (isFinder(r, c)) return null;
        return on ? <rect key={i} x={c} y={r} width={1} height={1} fill="#1a1a1a" /> : null;
      })}
      {[
        [0, 0],
        [0, n - 3],
        [n - 3, 0],
      ].map(([r, c], k) => (
        <g key={k}>
          <rect x={c} y={r} width={3} height={3} fill="#1a1a1a" />
          <rect x={c + 0.6} y={r + 0.6} width={1.8} height={1.8} fill="#fff" />
          <rect x={c + 1} y={r + 1} width={1} height={1} fill="#1a1a1a" />
        </g>
      ))}
      <rect
        x={0.1}
        y={0.1}
        width={n - 0.2}
        height={n - 0.2}
        fill="none"
        stroke="#1a1a1a"
        strokeWidth={0.15}
      />
    </svg>
  );
}

function CafeHeader() {
  return (
    <div
      className="px-4 pt-5 pb-4 text-center text-white"
      style={{ background: `linear-gradient(135deg, ${CAFE.gradientFrom}, ${CAFE.gradientTo})` }}
    >
      <div className="font-serif text-xl font-bold tracking-wide">{CAFE.name}</div>
      <div className="text-[11px] uppercase tracking-[0.18em] opacity-90 mt-0.5">{CAFE.tagline}</div>
    </div>
  );
}

function BoardView() {
  const [tab, setTab] = useState<"view" | "contribute">("view");
  const [submitted, setSubmitted] = useState(false);
  return (
    <div className="flex flex-col h-full">
      <CafeHeader />
      <div className="px-3 pt-3">
        <div className="text-center text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
          Community Board
        </div>
        <div className="grid grid-cols-2 gap-1.5 mb-3">
          {(["view", "contribute"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-2 rounded-lg text-sm font-semibold capitalize transition ${
                tab === t ? "text-white" : "bg-gray-100 text-gray-600"
              }`}
              style={tab === t ? { backgroundColor: CAFE.accent } : undefined}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-4 min-h-0">
        {tab === "view" ? (
          <div className="space-y-2">
            {[...BOARD_ENTRIES]
              .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0))
              .map((e) => (
                <div
                  key={e.id}
                  className={`rounded-xl shadow-sm p-3 ${
                    e.featured ? "bg-white border-2" : "bg-white border border-gray-100"
                  }`}
                  style={e.featured ? { borderColor: CAFE.accent } : undefined}
                >
                  {e.featured && (
                    <div
                      className="text-[9px] font-bold uppercase tracking-wider mb-1"
                      style={{ color: CAFE.accent }}
                    >
                      ★ Featured
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-serif font-bold text-sm">{e.name}</div>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        e.kind === "nonprofit"
                          ? "bg-emerald-100 text-emerald-700"
                          : e.kind === "event"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-purple-100 text-purple-700"
                      }`}
                    >
                      {e.category.split("·")[0].trim()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 leading-snug">{e.blurb}</p>
                </div>
              ))}
          </div>
        ) : submitted ? (
          <div className="text-center text-sm text-gray-600 pt-10 px-4">
            <div className="text-3xl mb-2">🎉</div>
            Thanks! Your listing was submitted for {CAFE.name} to review.
          </div>
        ) : (
          <div className="space-y-2.5 pt-1">
            <p className="text-xs text-gray-500">Add your business or community group to the board.</p>
            {["Business / group name", "Category", "One-line description", "Link"].map((ph) => (
              <input
                key={ph}
                disabled
                placeholder={ph}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-gray-50 placeholder-gray-400"
              />
            ))}
            <button
              onClick={() => setSubmitted(true)}
              className="w-full py-2.5 rounded-lg text-white font-semibold text-sm"
              style={{ backgroundColor: CAFE.accent }}
            >
              Submit listing
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function AdsView({ cards }: { cards: PreviewCard[] }) {
  return (
    <div className="flex flex-col h-full">
      <CafeHeader />
      <div className="text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 pt-2.5 pb-1">
        Discover Local Spots
      </div>
      <div className="flex-1 grid grid-cols-2 gap-2 px-3 pb-3 min-h-0">
        {cards.slice(0, 4).map((c, i) => (
          <div
            key={i}
            className="bg-white rounded-xl shadow-sm flex flex-col items-center text-center p-2.5 min-h-0"
          >
            <div className="flex-1 flex items-center justify-center w-full min-h-0">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center text-base font-bold text-white"
                style={{ background: `linear-gradient(135deg, ${CAFE.gradientFrom}, ${CAFE.gradientTo})` }}
              >
                {c.name[0]}
              </div>
            </div>
            <p className="font-serif font-bold text-[12px] leading-tight mt-1">{c.name}</p>
            <p className="text-gray-500 text-[10px] leading-snug mt-0.5">{c.tagline}</p>
            <div
              className="w-full rounded-lg text-white font-semibold text-[11px] py-1.5 mt-1.5"
              style={{ backgroundColor: "#1a1a1a" }}
            >
              {c.cta}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LinkView({ label, url }: { label: string; url: string }) {
  return (
    <div className="flex flex-col h-full">
      <CafeHeader />
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <QrGlyph size={110} seed={url} />
        <div className="font-serif font-bold text-base mt-4">{label || "Visit our page"}</div>
        <div className="text-xs text-gray-400 mt-1 break-all">{url || "—"}</div>
        <div
          className="w-full rounded-lg text-white font-semibold text-sm py-2.5 mt-5"
          style={{ backgroundColor: CAFE.accent }}
        >
          Continue →
        </div>
        <div className="text-[10px] text-gray-400 mt-3">Opens automatically on scan</div>
      </div>
    </div>
  );
}

// The phone frame wrapping whichever experience the QR currently points to.
export function PhonePreview({
  destination,
  adCards,
  linkLabel,
  linkUrl,
}: {
  destination: QrExperience;
  adCards: PreviewCard[];
  linkLabel: string;
  linkUrl: string;
}) {
  return (
    <div className="mx-auto" style={{ width: 300 }}>
      <div className="rounded-[2.2rem] bg-gray-900 p-2.5 shadow-xl">
        <div className="rounded-[1.7rem] overflow-hidden bg-[#F5F0EB]" style={{ height: 560 }}>
          <div className="h-full flex flex-col">
            {destination === "board" && <BoardView />}
            {destination === "ads" && <AdsView cards={adCards} />}
            {destination === "link" && <LinkView label={linkLabel} url={linkUrl} />}
          </div>
        </div>
      </div>
      <div className="text-center text-[11px] text-gray-400 mt-2">
        Live preview — what a customer sees when they scan
      </div>
    </div>
  );
}
