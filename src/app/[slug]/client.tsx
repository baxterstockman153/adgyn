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
      className="min-h-screen flex flex-col items-center px-3 py-5"
      style={{ background: "#F5F0EB" }}
    >
      {/* Venue Header */}
      <header className="text-center mb-4">
        {venue.logoUrl && (
          <img
            src={venue.logoUrl}
            alt={venue.name}
            className="w-[72px] h-[72px] object-contain mx-auto mb-1"
          />
        )}
        <h1 className="font-serif text-[clamp(1.5rem,6vw,2.2rem)] font-bold tracking-wider uppercase">
          {venue.name}
        </h1>
        <div className="w-9 h-0.5 bg-gray-900 mx-auto mt-2" />
      </header>

      <h2 className="font-serif text-[clamp(1.3rem,5.5vw,1.9rem)] font-bold text-center mb-1">
        Discover Local Spots
      </h2>
      <p className="text-[clamp(0.78rem,3vw,0.92rem)] text-gray-500 text-center mb-4">
        Scanned at {venue.name}
      </p>

      {/* Card Grid */}
      <div className="grid grid-cols-2 gap-2.5 w-full max-w-[580px]">
        {placements.map((p) => (
          <div
            key={p.id}
            className="bg-white rounded-xl shadow-sm p-3 flex flex-col items-center gap-1.5 text-center"
          >
            <div className="w-20 h-20 flex items-center justify-center">
              {p.logoUrl ? (
                <img
                  src={p.logoUrl}
                  alt={p.brandName}
                  className="max-w-[80px] max-h-[80px] object-contain"
                />
              ) : (
                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center text-lg font-bold text-gray-400">
                  {p.brandName[0]}
                </div>
              )}
            </div>
            <p className="font-serif text-[clamp(0.72rem,2.4vw,0.9rem)] font-bold leading-tight">
              {p.brandName}
            </p>
            <p className="text-[clamp(0.67rem,2vw,0.8rem)] text-gray-500 leading-snug flex-1">
              {p.tagline}
            </p>
            <a
              href={`/api/click/${p.id}?url=${encodeURIComponent(p.ctaUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-2 rounded-lg text-white text-[clamp(0.68rem,2vw,0.82rem)] font-semibold text-center mt-1 transition-opacity hover:opacity-85"
              style={{ backgroundColor: p.buttonColor }}
            >
              {p.ctaText}
            </a>
          </div>
        ))}
      </div>

      <footer className="mt-6 text-xs text-gray-400">
        Powered by <strong className="text-gray-500">adgyn</strong>
      </footer>
    </div>
  );
}
