"use client";

import { useEffect, useState } from "react";

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
  const [vh, setVh] = useState<number | null>(null);

  useEffect(() => {
    // Use window.innerHeight for the real visible viewport (works on all mobile browsers)
    const update = () => setVh(window.innerHeight);
    update();
    window.addEventListener("resize", update);

    // Prevent any scrolling / rubber-banding
    const prevent = (e: TouchEvent) => e.preventDefault();
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";
    document.body.style.height = "100%";
    document.addEventListener("touchmove", prevent, { passive: false });

    // Track scan
    const visitorId = getVisitorId();
    fetch("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId, visitorId }),
    }).catch(() => {});

    return () => {
      window.removeEventListener("resize", update);
      document.removeEventListener("touchmove", prevent);
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.height = "";
    };
  }, [campaignId]);

  const cardRows = Math.ceil(placements.length / 2);

  return (
    <div
      className="overflow-hidden w-full"
      style={{
        background: "#F5F0EB",
        height: vh ? `${vh}px` : "100svh",
      }}
    >
      <div
        className="flex flex-col mx-auto max-w-sm h-full"
        style={{ padding: "12px 12px 8px" }}
      >
        {/* Venue Header — compact, fixed size */}
        <header className="text-center shrink-0 mb-1">
          {venue.logoUrl ? (
            <img
              src={venue.logoUrl}
              alt={venue.name}
              style={{ maxWidth: "min(120px, 30vw)", maxHeight: "min(100px, 14vh)" }}
              className="object-contain mx-auto"
            />
          ) : null}
          <h1 style={{ fontSize: "13px" }} className="font-serif font-bold tracking-wider uppercase mt-1">
            {venue.name}
          </h1>
          <p style={{ fontSize: "11px" }} className="text-gray-400 mt-0.5">
            Discover Local Spots
          </p>
        </header>

        {/* Card Grid — stretches to fill all remaining space */}
        <div
          className="grid grid-cols-2 w-full flex-1 min-h-0"
          style={{
            gap: "8px",
            gridTemplateRows: `repeat(${cardRows}, 1fr)`,
          }}
        >
          {placements.map((p, i) => {
            const isLastOdd =
              placements.length % 2 === 1 && i === placements.length - 1;
            return (
              <div
                key={p.id}
                className={`bg-white rounded-xl shadow-sm flex flex-col items-center text-center min-h-0 overflow-hidden ${
                  isLastOdd
                    ? "col-start-1 col-end-3 w-1/2 justify-self-center"
                    : ""
                }`}
                style={{ padding: "8px 10px" }}
              >
                {/* Logo — grows to fill available space */}
                <div className="w-full flex-1 flex items-center justify-center min-h-0">
                  {p.logoUrl ? (
                    <img
                      src={p.logoUrl}
                      alt={p.brandName}
                      className="object-contain"
                      style={{ maxWidth: "100%", maxHeight: "100%" }}
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-base font-bold text-gray-400">
                      {p.brandName[0]}
                    </div>
                  )}
                </div>
                {/* Text + CTA — fixed size, won't shrink */}
                <p
                  className="font-serif font-bold leading-tight shrink-0 mt-1"
                  style={{ fontSize: "12px" }}
                >
                  {p.brandName}
                </p>
                <p
                  className="text-gray-500 leading-snug shrink-0 mt-0.5"
                  style={{ fontSize: "10px" }}
                >
                  {p.tagline}
                </p>
                <a
                  href={`/api/click/${p.id}?url=${encodeURIComponent(p.ctaUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full rounded-lg text-white font-semibold text-center shrink-0 transition-opacity hover:opacity-85"
                  style={{
                    backgroundColor: p.buttonColor,
                    fontSize: "12px",
                    padding: "7px 0",
                    marginTop: "6px",
                  }}
                >
                  {p.ctaText}
                </a>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <p className="text-center shrink-0 mt-1.5" style={{ fontSize: "9px", color: "#aaa" }}>
          Promote your business with <strong style={{ color: "#888" }}>adgyn</strong>
        </p>
      </div>
    </div>
  );
}
