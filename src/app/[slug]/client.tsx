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
      className="min-h-screen flex flex-col items-center px-4 py-5 mx-auto max-w-md"
      style={{ background: "#F5F0EB" }}
    >
      {/* Venue Header */}
      <header className="text-center mb-3 w-full">
        {venue.logoUrl ? (
          <img
            src={venue.logoUrl}
            alt={venue.name}
            style={{ maxWidth: "240px", maxHeight: "240px" }}
            className="object-contain mx-auto mb-2"
          />
        ) : null}
        <h1 className="font-serif text-lg font-bold tracking-wider uppercase">
          {venue.name}
        </h1>
        <div className="w-7 h-[1.5px] bg-gray-900 mx-auto mt-1.5" />
      </header>

      <h2 className="font-serif text-base font-bold text-center mb-0.5">
        Discover Local Spots
      </h2>
      <p className="text-sm text-gray-500 text-center mb-4">
        Scanned at {venue.name}
      </p>

      {/* Card Grid — full width, 2 cols on all screens */}
      <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
        {placements.map((p, i) => {
          const isLastOdd =
            placements.length % 2 === 1 && i === placements.length - 1;
          return (
          <div
            key={p.id}
            className={`bg-white rounded-xl shadow-sm p-4 flex flex-col items-center gap-2 text-center ${
              isLastOdd ? "col-start-1 col-end-3 w-1/2 justify-self-center" : ""
            }`}
          >
            <div className="w-full flex items-center justify-center" style={{ height: "80px" }}>
              {p.logoUrl ? (
                <img
                  src={p.logoUrl}
                  alt={p.brandName}
                  style={{ maxWidth: "100%", maxHeight: "80px" }}
                  className="object-contain"
                />
              ) : (
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-xl font-bold text-gray-400">
                  {p.brandName[0]}
                </div>
              )}
            </div>
            <p className="font-serif text-sm font-bold leading-tight">
              {p.brandName}
            </p>
            <p className="text-xs text-gray-500 leading-snug flex-1">
              {p.tagline}
            </p>
            <a
              href={`/api/click/${p.id}?url=${encodeURIComponent(p.ctaUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-2.5 rounded-lg text-white text-sm font-semibold text-center mt-1 transition-opacity hover:opacity-85"
              style={{ backgroundColor: p.buttonColor }}
            >
              {p.ctaText}
            </a>
          </div>
          );
        })}
      </div>

      <footer className="mt-6 text-xs text-gray-400">
        Promote your business with <strong className="text-gray-500">adgyn</strong>
      </footer>
    </div>
  );
}
