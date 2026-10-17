"use client";

import { useRef, useState } from "react";
import {
  CAFE,
  SURFACE_TYPES,
  type Surface,
  type SurfaceType,
  type QrExperience,
} from "./_data";
import { PhonePreview, type PreviewCard } from "./preview";

const DEST_LABEL: Record<QrExperience, string> = {
  board: "Community board",
  ads: "Local advertisers",
  link: "Custom link",
};

// Multi-touchpoint QR management + per-surface analytics — the "manage &
// measure every physical surface in one place" story that sets us apart from a
// café that already generates its own QR codes.
export function SurfacesView({
  surfaces,
  setSurfaces,
  adCards,
  linkLabel,
  linkUrl,
}: {
  surfaces: Surface[];
  setSurfaces: (s: Surface[]) => void;
  adCards: PreviewCard[];
  linkLabel: string;
  linkUrl: string;
}) {
  const [selectedId, setSelectedId] = useState<string | undefined>(surfaces[0]?.id);
  const [adding, setAdding] = useState(false);
  // Monotonic counter for new-surface ids (Date.now()/Math.random() are impure).
  const nextId = useRef(0);

  const update = (id: string, patch: Partial<Surface>) =>
    setSurfaces(surfaces.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const remove = (id: string) => setSurfaces(surfaces.filter((s) => s.id !== id));
  const add = (type: SurfaceType) => {
    const id = `new-${nextId.current++}`;
    setSurfaces([
      ...surfaces,
      {
        id,
        type,
        label: `New ${SURFACE_TYPES[type].label.toLowerCase()}`,
        destination: "link",
        customUrl: CAFE.appUrl,
        scans: 0,
        active: true,
      },
    ]);
    setSelectedId(id);
    setAdding(false);
  };

  const selected = surfaces.find((s) => s.id === selectedId) ?? surfaces[0];
  const maxScans = Math.max(1, ...surfaces.map((s) => s.scans));
  const totalScans = surfaces.reduce((n, s) => n + s.scans, 0);
  const sorted = [...surfaces].sort((a, b) => b.scans - a.scans);

  const previewLinkLabel =
    selected?.destination === "link" ? selected.label : linkLabel;
  const previewLinkUrl =
    selected?.destination === "link" ? selected.customUrl || linkUrl : linkUrl;

  return (
    <div className="grid md:grid-cols-[1fr_320px] gap-8 items-start">
      <div>
        {/* Scans by surface — the differentiating analytics view */}
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-serif font-bold text-lg">Scans by surface</h3>
            <span className="text-xs text-gray-400">
              last 30 days · {totalScans.toLocaleString()} total
            </span>
          </div>
          <div className="space-y-2.5">
            {sorted.map((s) => (
              <div key={s.id} className="flex items-center gap-3">
                <div className="w-36 shrink-0 text-sm truncate">
                  {SURFACE_TYPES[s.type].icon} {s.label}
                </div>
                <div className="flex-1 h-5 rounded bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded"
                    style={{
                      width: `${(s.scans / maxScans) * 100}%`,
                      background: `linear-gradient(to right, ${CAFE.gradientFrom}, ${CAFE.gradientTo})`,
                    }}
                  />
                </div>
                <div className="w-14 text-right text-sm font-medium">
                  {s.scans.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">
            See which physical touchpoint actually drives scans — your sidewalk
            A-frame may be out-pulling the sleeves you paid to print.
          </p>
        </div>

        {/* Manage surfaces */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-serif font-bold text-lg">Your QR surfaces</h3>
            <button
              onClick={() => setAdding((v) => !v)}
              className="text-sm font-semibold text-white px-3 py-1.5 rounded-lg"
              style={{ backgroundColor: CAFE.accent }}
            >
              + Add surface
            </button>
          </div>

          {adding && (
            <div className="grid grid-cols-3 gap-2 mb-4">
              {(Object.keys(SURFACE_TYPES) as SurfaceType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => add(t)}
                  className="rounded-xl border-2 border-gray-200 hover:border-gray-300 p-3 text-center transition"
                >
                  <div className="text-xl mb-1">{SURFACE_TYPES[t].icon}</div>
                  <div className="text-xs font-semibold">{SURFACE_TYPES[t].label}</div>
                </button>
              ))}
            </div>
          )}

          <div className="space-y-2">
            {surfaces.map((s) => {
              const active = s.id === selected?.id;
              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  className={`rounded-xl border-2 p-3 cursor-pointer transition ${
                    active ? "border-transparent ring-2" : "border-gray-100 hover:border-gray-200"
                  }`}
                  style={active ? { boxShadow: `0 0 0 2px ${CAFE.accent}` } : undefined}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-xl">{SURFACE_TYPES[s.type].icon}</div>
                    <input
                      value={s.label}
                      onChange={(e) => update(s.id, { label: e.target.value })}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 min-w-0 font-semibold text-sm bg-transparent border-b border-transparent focus:border-gray-300 outline-none"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        update(s.id, { active: !s.active });
                      }}
                      className={`text-[11px] font-semibold px-2 py-1 rounded-full ${
                        s.active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {s.active ? "Live" : "Paused"}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-2 pl-8">
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {SURFACE_TYPES[s.type].label} · points to
                    </span>
                    <select
                      value={s.destination}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) =>
                        update(s.id, { destination: e.target.value as QrExperience })
                      }
                      className="text-xs rounded-lg border border-gray-200 px-2 py-1 bg-white"
                    >
                      {(Object.keys(DEST_LABEL) as QrExperience[]).map((d) => (
                        <option key={d} value={d}>
                          {DEST_LABEL[d]}
                        </option>
                      ))}
                    </select>
                    <span className="ml-auto text-xs text-gray-400 whitespace-nowrap">
                      {s.scans.toLocaleString()} scans
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        remove(s.id);
                      }}
                      className="text-xs text-gray-300 hover:text-red-500"
                      aria-label="Remove surface"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {selected && (
        <PhonePreview
          destination={selected.destination}
          adCards={adCards}
          linkLabel={previewLinkLabel}
          linkUrl={previewLinkUrl}
        />
      )}
    </div>
  );
}
