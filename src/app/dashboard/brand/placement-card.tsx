"use client";

import { useState } from "react";

export type Breakdown = { label: string; count: number }[];

export type AdvancedCardData = {
  spendLabel: string;
  costPerClickLabel: string;
  cpmLabel: string;
  viewsByDay: number[];
  clicksByDay: number[];
  maxViews: number;
  maxClicks: number;
  firstDayLabel: string;
};

export type PlacementCardData = {
  id: string;
  venueName: string;
  campaignName: string;
  isActive: boolean;
  tagline: string;
  sleeveViews: number;
  clicks: number;
  ctr: string;
  clickTotal: number;
  devices: Breakdown;
  platform: Breakdown;
  cities: Breakdown;
  advanced: AdvancedCardData | null;
};

export function PlacementCard({ placement: p }: { placement: PlacementCardData }) {
  const [open, setOpen] = useState(false);
  const hasAudience = p.clickTotal > 0;

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Header — the venue anchors the whole card; click to expand */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full text-left flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50/60 hover:bg-gray-100/60 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              p.isActive ? "bg-green-500" : "bg-gray-300"
            }`}
          />
          <span className="shrink-0 text-gray-400" aria-hidden="true">📍</span>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">Your ad at {p.venueName}</p>
            <p className="text-xs text-gray-400 truncate">&ldquo;{p.tagline}&rdquo;</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-gray-500 bg-white border border-gray-200 rounded-full px-2 py-0.5">
            {p.campaignName}
          </span>
          <svg
            viewBox="0 0 16 16"
            className={`h-4 w-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>

      {/* This placement's headline numbers */}
      <div className="grid grid-cols-3 gap-2 p-3 pb-0">
        <MiniStat
          label="Sleeve views"
          value={p.sleeveViews}
          tooltip="Scans of this venue's sleeve. Shared by every business on the sleeve — not views of your ad alone."
        />
        <MiniStat label="Your clicks" value={p.clicks} tooltip="Taps on your ad on this sleeve." />
        <MiniStat label="CTR" value={`${p.ctr}%`} tooltip="Your clicks ÷ this sleeve's views." />
      </div>

      {/* Cost framing for THIS ad (flagged) */}
      {p.advanced && (
        <div className="grid grid-cols-3 gap-2 px-3 pt-2 pb-3">
          <MiniStat label="Spend" value={p.advanced.spendLabel} tooltip="What you paid for this placement." />
          <MiniStat
            label="Cost / click"
            value={p.advanced.costPerClickLabel}
            tooltip="This ad's spend ÷ its clicks — what each tap here has cost."
          />
          <MiniStat
            label="Cost / 1k views"
            value={p.advanced.cpmLabel}
            tooltip="This ad's spend ÷ sleeve views × 1,000 (CPM). Handy vs. other ad channels."
          />
        </div>
      )}
      {!p.advanced && <div className="pb-3" />}

      {/* Expandable audience + trend detail for THIS placement */}
      {open && (
        <div className="border-t border-gray-100 px-4 py-4 space-y-5">
          {p.advanced && (
            <div>
              <p className="text-xs font-medium text-gray-400 mb-2">
                Last 14 days at {p.venueName}
              </p>
              <MiniTrend label="Sleeve views" data={p.advanced.viewsByDay} max={p.advanced.maxViews} color="bg-purple-300" />
              <MiniTrend label="Your clicks" data={p.advanced.clicksByDay} max={p.advanced.maxClicks} color="bg-purple-600" />
              <div className="flex justify-between text-[10px] text-gray-300 mt-1 px-0.5">
                <span>{p.advanced.firstDayLabel}</span>
                <span>Today</span>
              </div>
            </div>
          )}
          <p className="text-xs font-medium text-gray-400 mb-3">
            Who tapped your ad here
          </p>
          {hasAudience ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <BreakdownList title="Devices" rows={p.devices} total={p.clickTotal} color="bg-purple-500" capitalize />
              <BreakdownList title="Platform" rows={p.platform} total={p.clickTotal} color="bg-blue-500" />
              <div>
                <h4 className="text-xs font-medium text-gray-400 mb-2">Top cities</h4>
                {p.cities.length > 0 ? (
                  p.cities.map((r) => (
                    <div key={r.label} className="flex justify-between items-center mb-1.5">
                      <span className="text-sm">{r.label}</span>
                      <span className="text-xs text-gray-400">
                        {r.count} {r.count === 1 ? "click" : "clicks"}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-300">No location data yet</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">
              No clicks yet — audience details show up here once people start tapping your ad.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function BreakdownList({
  title,
  rows,
  total,
  color,
  capitalize,
}: {
  title: string;
  rows: Breakdown;
  total: number;
  color: string;
  capitalize?: boolean;
}) {
  return (
    <div>
      <h4 className="text-xs font-medium text-gray-400 mb-2">{title}</h4>
      {rows.length === 0 ? (
        <p className="text-xs text-gray-300">No data yet</p>
      ) : (
        rows.map((r) => (
          <div key={r.label} className="flex justify-between items-center mb-1.5">
            <span className={`text-sm ${capitalize ? "capitalize" : ""}`}>{r.label}</span>
            <div className="flex items-center gap-2">
              <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${color} rounded-full`}
                  style={{ width: `${(r.count / total) * 100}%` }}
                />
              </div>
              <span className="text-xs text-gray-400 w-8 text-right">
                {Math.round((r.count / total) * 100)}%
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function MiniTrend({
  label,
  data,
  max,
  color,
}: {
  label: string;
  data: number[];
  max: number;
  color: string;
}) {
  const total = data.reduce((a, b) => a + b, 0);
  return (
    <div className="mb-3">
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-xs text-gray-500">{label}</span>
        <span className="text-xs text-gray-400">{total.toLocaleString()} total</span>
      </div>
      <div className="flex items-end gap-[3px] h-10">
        {data.map((v, i) => (
          <div key={i} className="flex-1 bg-gray-100 rounded-sm relative overflow-hidden h-full">
            <div
              className={`absolute bottom-0 left-0 right-0 ${color} rounded-sm`}
              style={{ height: `${Math.max(v > 0 ? 8 : 0, (v / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tooltip,
}: {
  label: string;
  value: number | string;
  tooltip?: string;
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-2 text-center">
      <p className="text-sm font-bold">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      <div className="flex items-center justify-center gap-0.5">
        <p className="text-[10px] text-gray-400">{label}</p>
        {tooltip && <InfoTooltip label={label} text={tooltip} />}
      </div>
    </div>
  );
}

function InfoTooltip({ label, text }: { label: string; text: string }) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-label={`What is ${label}?`}
        onClick={(e) => e.stopPropagation()}
        className="flex h-3.5 w-3.5 items-center justify-center rounded-full text-gray-300 hover:text-gray-500 focus:text-gray-500 focus:outline-none"
      >
        <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
          <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 3a.9.9 0 110 1.8A.9.9 0 018 4zm1 8H7a.5.5 0 010-1h.5V7.5H7a.5.5 0 010-1h1a.5.5 0 01.5.5V11H9a.5.5 0 010 1z" />
        </svg>
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 w-48 -translate-x-1/2 rounded-lg bg-gray-900 px-2.5 py-1.5 text-center text-[11px] leading-snug text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}
