"use client";

import { useEffect } from "react";

interface Placement {
  id: string;
  brandName: string;
  logoUrl: string | null;
  tagline: string;
  ctaText: string;
  ctaUrl: string;
  buttonColor: string;
}

/** Get or create a persistent visitor ID (cookie lasts 1 year) */
function getVisitorId(): string {
  const key = "adgyn_vid";
  const match = document.cookie.match(new RegExp(`(?:^|; )${key}=([^;]*)`));
  if (match) return match[1];

  const vid = crypto.randomUUID();
  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${key}=${vid}; expires=${expires}; path=/; SameSite=Lax`;
  return vid;
}

export function SleevePageClient({
  venue,
  campaignId,
  placements,
}: {
  venue: { name: string; logoUrl: string | null };
  campaignId: string;
  placements: Placement[];
}) {
  // Track scan on page load, sending persistent visitor ID
  useEffect(() => {
    const visitorId = getVisitorId();
    fetch("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId, visitorId }),
    }).catch(() => {});
  }, [campaignId]);

  // Click tracking uses server-side redirect — no client JS needed.
  // The visitor ID cookie is sent automatically with the redirect request.

  return (
    <div
      className="min-h-[100dvh]"
      style={{ background: "#F5F0EB" }}
    >
    <div
      className="flex flex-col items-center justify-between px-3 py-3 mx-auto max-w-md min-h-[100dvh]"
    >
      {/* Venue Header — scales with viewport */}
      <header className="text-center w-full">
        {venue.logoUrl ? (
          <img
            src={venue.logoUrl}
            alt={venue.name}
            style={{ maxWidth: "min(140px, 35vw)", maxHeight: "min(140px, 35vw)" }}
            className="object-contain mx-auto mb-1"
          />
        ) : null}
        <h1 className="font-serif text-sm font-bold tracking-wider uppercase">
          {venue.name}
        </h1>
        <div className="w-6 h-[1px] bg-gray-900 mx-auto mt-1" />
        <p className="text-xs text-gray-500 mt-1">Discover Local Spots</p>
      </header>

      {/* Card Grid — the main content, gets priority space */}
      <div className="grid grid-cols-2 gap-2 w-full flex-1 my-3" style={{ alignContent: "center" }}>
        {placements.map((p, i) => {
          const isLastOdd =
            placements.length % 2 === 1 && i === placements.length - 1;
          return (
          <div
            key={p.id}
            className={`bg-white rounded-xl shadow-sm p-3 flex flex-col items-center gap-1 text-center ${
              isLastOdd ? "col-start-1 col-end-3 w-1/2 justify-self-center" : ""
            }`}
          >
            <div className="w-full flex items-center justify-center" style={{ height: "clamp(50px, 10dvh, 80px)" }}>
              {p.logoUrl ? (
                <img
                  src={p.logoUrl}
                  alt={p.brandName}
                  style={{ maxWidth: "100%", maxHeight: "100%" }}
                  className="object-contain"
                />
              ) : (
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-lg font-bold text-gray-400">
                  {p.brandName[0]}
                </div>
              )}
            </div>
            <p className="font-serif text-xs font-bold leading-tight">
              {p.brandName}
            </p>
            <p style={{ fontSize: "11px" }} className="text-gray-500 leading-snug flex-1">
              {p.tagline}
            </p>
            <a
              href={`/api/click/${p.id}?url=${encodeURIComponent(p.ctaUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-2 rounded-lg text-white text-xs font-semibold text-center transition-opacity hover:opacity-85"
              style={{ backgroundColor: p.buttonColor }}
            >
              {p.ctaText}
            </a>
          </div>
          );
        })}
      </div>

      <footer className="text-[10px] text-gray-400">
        Promote your business with <strong className="text-gray-500">adgyn</strong>
      </footer>
    </div>
    </div>
  );
}
