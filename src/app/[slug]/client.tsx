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

  const cardRows = Math.ceil(placements.length / 2);

  return (
    <div
      className="h-[100dvh] overflow-hidden"
      style={{ background: "#F5F0EB" }}
    >
    <div
      className="flex flex-col px-3 pt-3 pb-2 mx-auto max-w-md h-full"
    >
      {/* Venue Header — compact */}
      <header className="text-center shrink-0">
        {venue.logoUrl ? (
          <img
            src={venue.logoUrl}
            alt={venue.name}
            style={{ maxWidth: "min(140px, 35vw)", maxHeight: "min(140px, 18dvh)" }}
            className="object-contain mx-auto mb-1"
          />
        ) : null}
        <h1 className="font-serif text-sm font-bold tracking-wider uppercase">
          {venue.name}
        </h1>
        <p className="text-xs text-gray-400 mt-0.5 mb-2">Discover Local Spots</p>
      </header>

      {/* Card Grid — stretches to fill remaining space */}
      <div
        className="grid grid-cols-2 gap-2 w-full flex-1 min-h-0"
        style={{ gridTemplateRows: `repeat(${cardRows}, 1fr)` }}
      >
        {placements.map((p, i) => {
          const isLastOdd =
            placements.length % 2 === 1 && i === placements.length - 1;
          return (
          <div
            key={p.id}
            className={`bg-white rounded-xl shadow-sm p-3 flex flex-col items-center text-center min-h-0 ${
              isLastOdd ? "col-start-1 col-end-3 w-1/2 justify-self-center" : ""
            }`}
          >
            <div className="w-full flex-1 flex items-center justify-center min-h-0 mb-1">
              {p.logoUrl ? (
                <img
                  src={p.logoUrl}
                  alt={p.brandName}
                  className="object-contain max-w-full max-h-full"
                />
              ) : (
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-lg font-bold text-gray-400">
                  {p.brandName[0]}
                </div>
              )}
            </div>
            <p className="font-serif text-xs font-bold leading-tight shrink-0">
              {p.brandName}
            </p>
            <p className="text-[11px] text-gray-500 leading-snug mt-0.5 shrink-0">
              {p.tagline}
            </p>
            <a
              href={`/api/click/${p.id}?url=${encodeURIComponent(p.ctaUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-2 rounded-lg text-white text-xs font-semibold text-center mt-1.5 shrink-0 transition-opacity hover:opacity-85"
              style={{ backgroundColor: p.buttonColor }}
            >
              {p.ctaText}
            </a>
          </div>
          );
        })}
      </div>

      <footer className="text-[10px] text-gray-400 text-center mt-2 shrink-0">
        Promote your business with <strong className="text-gray-500">adgyn</strong>
      </footer>
    </div>
    </div>
  );
}
