"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogoUpload } from "@/components/logo-upload";
import { saveGuestProfile, type PlacementEdit } from "./actions";

type PlacementInit = PlacementEdit & { venueName: string; campaignName: string; slot: number };

export function ProfileForm({
  brandName,
  initialWebsiteUrl,
  initialLogoUrl,
  initialPlacements,
}: {
  brandName: string;
  initialWebsiteUrl: string;
  initialLogoUrl: string;
  initialPlacements: PlacementInit[];
}) {
  const router = useRouter();
  const [websiteUrl, setWebsiteUrl] = useState(initialWebsiteUrl);
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl);
  const [placements, setPlacements] = useState<PlacementInit[]>(initialPlacements);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function updatePlacement(id: string, patch: Partial<PlacementEdit>) {
    setPlacements((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...patch } : p))
    );
    setSaved(false);
  }

  async function handleSave() {
    setError(null);
    setSaving(true);
    setSaved(false);
    const result = await saveGuestProfile({
      websiteUrl,
      defaultLogoUrl: logoUrl,
      placements: placements.map(({ id, logoUrl, tagline, ctaText, ctaUrl, buttonColor }) => ({
        id,
        logoUrl,
        tagline,
        ctaText,
        ctaUrl,
        buttonColor,
      })),
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  const inputClass =
    "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300";

  return (
    <div className="space-y-8">
      {/* Business profile */}
      <section className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="font-serif text-lg font-bold mb-1">{brandName}</h2>
        <p className="text-sm text-gray-400 mb-5">
          Your business details. Your logo is used as the default across your ads.
        </p>
        <div className="space-y-5">
          <LogoUpload value={logoUrl} onChange={(u) => { setLogoUrl(u); setSaved(false); }} label="Business logo" />
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Website
            </label>
            <input
              type="text"
              value={websiteUrl}
              onChange={(e) => { setWebsiteUrl(e.target.value); setSaved(false); }}
              placeholder="yourbusiness.com"
              className={inputClass}
            />
          </div>
        </div>
      </section>

      {/* Ad creatives */}
      <section>
        <h2 className="font-serif text-lg font-bold mb-1">Your Ads</h2>
        <p className="text-sm text-gray-400 mb-4">
          This is what customers see on the coffee sleeve. Make it count.
        </p>
        {placements.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400">
            No ads to edit yet. Once you&apos;re placed in a campaign, it&apos;ll show up here.
          </div>
        ) : (
          <div className="space-y-4">
            {placements.map((p) => (
              <div key={p.id} className="bg-white rounded-2xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="font-medium text-sm">{p.venueName}</p>
                  <span className="text-xs text-gray-400">
                    {p.campaignName} · slot {p.slot}
                  </span>
                </div>
                <div className="space-y-4">
                  <LogoUpload
                    value={p.logoUrl}
                    onChange={(u) => updatePlacement(p.id, { logoUrl: u })}
                    label="Ad logo (defaults to your business logo)"
                  />
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">
                      Tagline
                    </label>
                    <input
                      type="text"
                      value={p.tagline}
                      onChange={(e) => updatePlacement(p.id, { tagline: e.target.value })}
                      placeholder="A short line that sells you"
                      className={inputClass}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">
                        Button text
                      </label>
                      <input
                        type="text"
                        value={p.ctaText}
                        onChange={(e) => updatePlacement(p.id, { ctaText: e.target.value })}
                        placeholder="Book now"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">
                        Button color
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={/^#[0-9a-fA-F]{6}$/.test(p.buttonColor) ? p.buttonColor : "#1a1a1a"}
                          onChange={(e) => updatePlacement(p.id, { buttonColor: e.target.value })}
                          className="h-9 w-12 rounded border border-gray-200 bg-white cursor-pointer"
                        />
                        <span className="text-xs text-gray-400">{p.buttonColor}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">
                      Destination link (where the button goes)
                    </label>
                    <input
                      type="text"
                      value={p.ctaUrl}
                      onChange={(e) => updatePlacement(p.id, { ctaUrl: e.target.value })}
                      placeholder="yourbusiness.com/offer"
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Save bar */}
      <div className="sticky bottom-4 flex items-center gap-3 bg-white rounded-2xl shadow-lg border border-gray-100 px-5 py-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 rounded-lg bg-purple-700 text-white text-sm font-medium hover:bg-purple-800 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        {saved && <span className="text-sm text-green-600">✓ Saved</span>}
        {error && <span className="text-sm text-red-500">{error}</span>}
      </div>
    </div>
  );
}
