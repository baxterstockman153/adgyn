"use client";

import { useState } from "react";
import {
  CAFE,
  SLEEVE_DESIGNS,
  QTY_TIERS,
  PLANS,
  LINK_PRESETS,
  money,
  type QrExperience,
} from "./_data";
import { QrGlyph } from "./preview";

const EXPERIENCE_LABEL: Record<QrExperience, string> = {
  board: "Community board",
  ads: "Local advertisers",
  link: "Custom link",
};

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span
          className="w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center"
          style={{ backgroundColor: CAFE.accent }}
        >
          {n}
        </span>
        <h3 className="font-serif font-bold text-lg">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export function OrderSleeves({ initialDestination }: { initialDestination: QrExperience }) {
  const [design, setDesign] = useState(SLEEVE_DESIGNS[1].id);
  const [tier, setTier] = useState(QTY_TIERS[1].qty);
  const [exp, setExp] = useState<QrExperience>(initialDestination);
  const [plan, setPlan] = useState(PLANS[1].id);
  const [placed, setPlaced] = useState(false);

  const qtyTier = QTY_TIERS.find((t) => t.qty === tier)!;
  const selectedPlan = PLANS.find((p) => p.id === plan)!;
  const sleeveCost = qtyTier.qty * qtyTier.unitCents; // cents

  if (placed) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-10 text-center max-w-xl mx-auto">
        <div className="text-5xl mb-3">☕️</div>
        <h2 className="font-serif text-2xl font-bold mb-2">Order placed!</h2>
        <p className="text-gray-500 mb-6">
          {qtyTier.qty.toLocaleString()} {SLEEVE_DESIGNS.find((d) => d.id === design)!.name} sleeves
          are on the way to {CAFE.name}, each printed with a QR code pointing to your{" "}
          <strong>{EXPERIENCE_LABEL[exp]}</strong>. Your <strong>{selectedPlan.name}</strong> plan is
          active — you can change what the QR shows anytime.
        </p>
        <button
          onClick={() => setPlaced(false)}
          className="text-sm text-gray-500 underline hover:text-gray-800"
        >
          ← Back to order
        </button>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-[1fr_280px] gap-8 items-start">
      <div>
        <Section n={1} title="Choose a sleeve design">
          <div className="grid grid-cols-2 gap-3">
            {SLEEVE_DESIGNS.map((d) => (
              <button
                key={d.id}
                onClick={() => setDesign(d.id)}
                className={`text-left rounded-xl border-2 p-3 transition ${
                  design === d.id ? "border-transparent ring-2" : "border-gray-200 hover:border-gray-300"
                }`}
                style={design === d.id ? { boxShadow: `0 0 0 2px ${CAFE.accent}` } : undefined}
              >
                <div
                  className="h-16 rounded-lg mb-2 flex items-center justify-center"
                  style={
                    d.id === "d2"
                      ? { background: `linear-gradient(135deg, ${CAFE.gradientFrom}, ${CAFE.gradientTo})` }
                      : d.id === "d3"
                      ? { background: "#fff", border: "1px solid #eee" }
                      : d.id === "d4"
                      ? { background: "repeating-linear-gradient(45deg,#eee,#eee 6px,#f7f7f7 6px,#f7f7f7 12px)" }
                      : { background: "#C8A373" }
                  }
                >
                  <QrGlyph size={38} seed={d.id} />
                </div>
                <div className="font-semibold text-sm">{d.name}</div>
                <div className="text-xs text-gray-400">{d.note}</div>
              </button>
            ))}
          </div>
        </Section>

        <Section n={2} title="How many?">
          <div className="space-y-2">
            {QTY_TIERS.map((t) => (
              <button
                key={t.qty}
                onClick={() => setTier(t.qty)}
                className={`w-full flex items-center justify-between rounded-xl border-2 px-4 py-3 transition ${
                  tier === t.qty ? "border-transparent ring-2" : "border-gray-200 hover:border-gray-300"
                }`}
                style={tier === t.qty ? { boxShadow: `0 0 0 2px ${CAFE.accent}` } : undefined}
              >
                <span className="font-semibold text-sm">{t.label}</span>
                <span className="text-sm text-gray-500">{money(t.unitCents)}/sleeve</span>
              </button>
            ))}
          </div>
        </Section>

        <Section n={3} title="What should the QR show?">
          <div className="grid grid-cols-3 gap-3">
            {(["board", "ads", "link"] as QrExperience[]).map((e) => (
              <button
                key={e}
                onClick={() => setExp(e)}
                className={`rounded-xl border-2 p-3 text-center transition ${
                  exp === e ? "border-transparent ring-2" : "border-gray-200 hover:border-gray-300"
                }`}
                style={exp === e ? { boxShadow: `0 0 0 2px ${CAFE.accent}` } : undefined}
              >
                <div className="text-2xl mb-1">{e === "board" ? "📌" : e === "ads" ? "🤝" : "🔗"}</div>
                <div className="text-xs font-semibold">{EXPERIENCE_LABEL[e]}</div>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">You can switch this anytime without reordering.</p>
        </Section>

        <Section n={4} title="Pick a platform plan">
          <div className="grid md:grid-cols-3 gap-3">
            {PLANS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPlan(p.id)}
                className={`text-left rounded-xl border-2 p-4 transition relative ${
                  plan === p.id ? "border-transparent ring-2" : "border-gray-200 hover:border-gray-300"
                }`}
                style={plan === p.id ? { boxShadow: `0 0 0 2px ${CAFE.accent}` } : undefined}
              >
                {p.highlight && (
                  <span
                    className="absolute -top-2 right-3 text-[10px] text-white px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: CAFE.accent }}
                  >
                    Popular
                  </span>
                )}
                <div className="font-serif font-bold">{p.name}</div>
                <div className="text-2xl font-bold mt-1">
                  ${p.priceMonthly}
                  <span className="text-sm font-normal text-gray-400">/mo</span>
                </div>
                <ul className="mt-2 space-y-1">
                  {p.features.map((f) => (
                    <li key={f} className="text-xs text-gray-500 flex gap-1.5">
                      <span style={{ color: CAFE.accent }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </button>
            ))}
          </div>
        </Section>
      </div>

      {/* Order summary */}
      <div className="bg-white rounded-2xl shadow-sm p-5 md:sticky md:top-6">
        <h3 className="font-serif font-bold text-lg mb-4">Your order</h3>
        <dl className="space-y-2.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-500">Design</dt>
            <dd className="font-medium">{SLEEVE_DESIGNS.find((d) => d.id === design)!.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Sleeves</dt>
            <dd className="font-medium">{qtyTier.qty.toLocaleString()}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">QR shows</dt>
            <dd className="font-medium">{EXPERIENCE_LABEL[exp]}</dd>
          </div>
          <div className="border-t border-gray-100 pt-2.5">
            <div className="text-[11px] uppercase tracking-wider text-gray-400 mb-1">One-time</div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Sleeves ({money(qtyTier.unitCents)} ea)</dt>
              <dd className="font-medium">{money(sleeveCost)}</dd>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-2.5">
            <div className="text-[11px] uppercase tracking-wider text-gray-400 mb-1">Recurring</div>
            <div className="flex justify-between">
              <dt className="text-gray-500">{selectedPlan.name} platform plan</dt>
              <dd className="font-medium">${selectedPlan.priceMonthly}/mo</dd>
            </div>
          </div>
        </dl>
        <div className="border-t border-gray-100 mt-3 pt-3 flex justify-between items-baseline">
          <span className="font-semibold">Due today</span>
          <span className="font-serif text-xl font-bold">{money(sleeveCost)}</span>
        </div>
        <div className="text-xs text-gray-400 text-right">
          then ${selectedPlan.priceMonthly}/mo for the platform
        </div>
        <button
          onClick={() => setPlaced(true)}
          className="w-full mt-4 py-3 rounded-xl text-white font-semibold"
          style={{ backgroundColor: CAFE.accent }}
        >
          Place order
        </button>
        <p className="text-[11px] text-gray-400 text-center mt-2">Demo — no payment is taken</p>
      </div>
    </div>
  );
}

export function CreateQr() {
  const [mode, setMode] = useState<"experience" | "custom">("experience");
  const [exp, setExp] = useState<QrExperience>("link");
  const [url, setUrl] = useState(LINK_PRESETS[0].url);

  const target =
    mode === "custom" ? url : `${CAFE.name.toLowerCase().replace(/\s/g, "")}.adgyn.link/${exp}`;

  return (
    <div className="grid md:grid-cols-[1fr_300px] gap-8 items-start max-w-3xl">
      <div>
        <p className="text-gray-500 text-sm mb-5">
          Generate a standalone QR code for anything beyond sleeves — WiFi signs, your own cups,
          A-frames, table tents, or window clings. Point it at a Smart Sleeve experience or any link.
        </p>

        <div className="grid grid-cols-2 gap-2 mb-5">
          {(["experience", "custom"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`py-2.5 rounded-lg text-sm font-semibold transition ${
                mode === m ? "text-white" : "bg-gray-100 text-gray-600"
              }`}
              style={mode === m ? { backgroundColor: CAFE.accent } : undefined}
            >
              {m === "experience" ? "A Smart Sleeve experience" : "A custom link"}
            </button>
          ))}
        </div>

        {mode === "experience" ? (
          <div className="grid grid-cols-3 gap-3">
            {(["board", "ads", "link"] as QrExperience[]).map((e) => (
              <button
                key={e}
                onClick={() => setExp(e)}
                className={`rounded-xl border-2 p-3 text-center transition ${
                  exp === e ? "border-transparent ring-2" : "border-gray-200 hover:border-gray-300"
                }`}
                style={exp === e ? { boxShadow: `0 0 0 2px ${CAFE.accent}` } : undefined}
              >
                <div className="text-2xl mb-1">{e === "board" ? "📌" : e === "ads" ? "🤝" : "🔗"}</div>
                <div className="text-xs font-semibold capitalize">{EXPERIENCE_LABEL[e]}</div>
              </button>
            ))}
          </div>
        ) : (
          <div>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm"
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {LINK_PRESETS.map((p) => (
                <button
                  key={p.url}
                  onClick={() => setUrl(p.url)}
                  className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6 text-center md:sticky md:top-6">
        <div className="inline-block p-3 rounded-xl border border-gray-100">
          <QrGlyph size={150} seed={target} />
        </div>
        <div className="text-xs text-gray-400 mt-3 break-all">{target}</div>
        <button
          className="w-full mt-4 py-2.5 rounded-lg text-white font-semibold text-sm"
          style={{ backgroundColor: CAFE.accent }}
        >
          Download PNG
        </button>
        <button className="w-full mt-2 py-2.5 rounded-lg bg-gray-100 text-gray-700 font-semibold text-sm">
          Copy link
        </button>
      </div>
    </div>
  );
}
