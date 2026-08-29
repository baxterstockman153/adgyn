"use client";

import { useState, useTransition } from "react";
import { createCampaign, type AdSlot } from "./actions";

const DEFAULT_COLORS = ["#2563EB", "#DC2626", "#7C3AED", "#15803D"];

function emptyAd(index: number): AdSlot {
  return {
    businessName: "",
    logoUrl: "",
    tagline: "",
    ctaText: "Learn More",
    ctaUrl: "",
    buttonColor: DEFAULT_COLORS[index % DEFAULT_COLORS.length],
  };
}

export function CampaignForm() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [sleeveCount, setSleeveCount] = useState(300);
  const [revenueTarget, setRevenueTarget] = useState<number | "">(200);
  const [ads, setAds] = useState<AdSlot[]>([emptyAd(0)]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const pricePerSlot =
    ads.length > 0 && typeof revenueTarget === "number"
      ? Math.round(revenueTarget / ads.length)
      : 0;

  function updateAd(index: number, field: keyof AdSlot, value: string) {
    setAds((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function addAd() {
    if (ads.length < 4) setAds((prev) => [...prev, emptyAd(prev.length)]);
  }

  function removeAd(index: number) {
    if (ads.length > 1) setAds((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit() {
    setError(null);

    // Validate
    if (!name.trim()) return setError("Campaign name is required.");
    if (typeof revenueTarget !== "number" || revenueTarget <= 0)
      return setError("Enter a revenue target.");

    const filledAds = ads.filter((a) => a.businessName.trim());
    if (filledAds.length === 0)
      return setError("Add at least one ad.");

    for (const ad of filledAds) {
      if (!ad.tagline.trim()) return setError(`"${ad.businessName}" needs a tagline.`);
      if (!ad.ctaUrl.trim()) return setError(`"${ad.businessName}" needs a link.`);
    }

    startTransition(async () => {
      try {
        await createCampaign({
          name,
          sleeveCount,
          revenueTarget: revenueTarget as number,
          ads: filledAds,
        });
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress steps */}
      <div className="flex items-center gap-3 mb-8">
        {[1, 2].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step >= s
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {s}
            </div>
            <span className={`text-sm ${step >= s ? "text-gray-900" : "text-gray-400"}`}>
              {s === 1 ? "Campaign" : "Ads"}
            </span>
            {s === 1 && <div className="w-8 h-px bg-gray-200" />}
          </div>
        ))}
      </div>

      {/* Step 1: Campaign basics */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Campaign Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Batch 9 — September"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              How much do you want to earn?
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                $
              </span>
              <input
                type="number"
                value={revenueTarget}
                onChange={(e) =>
                  setRevenueTarget(e.target.value === "" ? "" : Number(e.target.value))
                }
                placeholder="200"
                min={1}
                className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              We&apos;ll calculate the price per ad slot based on this.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sleeve Count
            </label>
            <input
              type="number"
              value={sleeveCount}
              onChange={(e) => setSleeveCount(Number(e.target.value))}
              min={100}
              step={50}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-1">
              How many coffee sleeves in this batch.
            </p>
          </div>

          <button
            onClick={() => {
              if (!name.trim()) return setError("Campaign name is required.");
              if (typeof revenueTarget !== "number" || revenueTarget <= 0)
                return setError("Enter a revenue target.");
              setError(null);
              setStep(2);
            }}
            className="w-full py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Next: Add Ads →
          </button>
        </div>
      )}

      {/* Step 2: Ad slots */}
      {step === 2 && (
        <div className="space-y-6">
          {/* Pricing summary */}
          <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Revenue target</p>
              <p className="text-lg font-bold">
                ${typeof revenueTarget === "number" ? revenueTarget : 0}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">
                Price per slot ({ads.length} {ads.length === 1 ? "ad" : "ads"})
              </p>
              <p className="text-lg font-bold text-green-600">${pricePerSlot}</p>
            </div>
          </div>

          {/* Ad cards */}
          {ads.map((ad, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-700">
                  Ad Slot {i + 1}
                </h3>
                {ads.length > 1 && (
                  <button
                    onClick={() => removeAd(i)}
                    className="text-xs text-red-400 hover:text-red-600"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">
                    Business Name
                  </label>
                  <input
                    type="text"
                    value={ad.businessName}
                    onChange={(e) => updateAd(i, "businessName", e.target.value)}
                    placeholder="e.g. Yoga Sol"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">
                    Logo URL <span className="text-gray-300">(optional)</span>
                  </label>
                  <input
                    type="url"
                    value={ad.logoUrl}
                    onChange={(e) => updateAd(i, "logoUrl", e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">
                    Tagline
                  </label>
                  <input
                    type="text"
                    value={ad.tagline}
                    onChange={(e) => updateAd(i, "tagline", e.target.value)}
                    placeholder="e.g. First class free. All levels welcome."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Button Text
                  </label>
                  <input
                    type="text"
                    value={ad.ctaText}
                    onChange={(e) => updateAd(i, "ctaText", e.target.value)}
                    placeholder="Learn More"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Button Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={ad.buttonColor}
                      onChange={(e) => updateAd(i, "buttonColor", e.target.value)}
                      className="w-8 h-8 rounded border border-gray-200 cursor-pointer"
                    />
                    <span className="text-xs text-gray-400">{ad.buttonColor}</span>
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">
                    Link URL
                  </label>
                  <input
                    type="url"
                    value={ad.ctaUrl}
                    onChange={(e) => updateAd(i, "ctaUrl", e.target.value)}
                    placeholder="https://www.example.com"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Preview */}
              {ad.businessName && (
                <div className="mt-2 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-400 mb-2">Preview</p>
                  <div className="bg-white rounded-xl shadow-sm p-3 flex flex-col items-center gap-1.5 text-center max-w-[200px] mx-auto border border-gray-100">
                    <div className="w-14 h-14 flex items-center justify-center">
                      {ad.logoUrl ? (
                        <img
                          src={ad.logoUrl}
                          alt={ad.businessName}
                          className="max-w-[56px] max-h-[56px] object-contain"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-lg font-bold text-gray-400">
                          {ad.businessName[0]}
                        </div>
                      )}
                    </div>
                    <p className="font-serif text-xs font-bold leading-tight">
                      {ad.businessName}
                    </p>
                    <p className="text-[10px] text-gray-500 leading-snug">
                      {ad.tagline || "Tagline goes here"}
                    </p>
                    <div
                      className="w-full py-1.5 rounded-lg text-white text-[10px] font-semibold text-center"
                      style={{ backgroundColor: ad.buttonColor }}
                    >
                      {ad.ctaText || "Learn More"}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Add ad button */}
          {ads.length < 4 && (
            <button
              onClick={addAd}
              className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-gray-300 hover:text-gray-500 transition-colors"
            >
              + Add Ad Slot ({ads.length}/4)
            </button>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={isPending}
              className="flex-1 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {isPending ? "Creating..." : "Create Campaign"}
            </button>
          </div>
        </div>
      )}

      {/* Error for step 1 */}
      {step === 1 && error && (
        <div className="mt-4 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
    </div>
  );
}
