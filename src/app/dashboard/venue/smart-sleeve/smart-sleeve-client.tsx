"use client";

import { useEffect, useRef, useState } from "react";
import {
  CAFE,
  ANALYTICS,
  AD_PROSPECTS,
  LINK_PRESETS,
  type QrExperience,
  type AdProspect,
} from "./_data";
import { PhonePreview, type PreviewCard } from "./preview";
import { OrderSleeves, CreateQr } from "./order";

type View = "home" | "destination" | "order" | "qr";

const STORAGE_KEY = "adgyn_smartsleeve_demo_v1";

const EXPERIENCE: Record<QrExperience, { label: string; icon: string; blurb: string }> = {
  board: { label: "Community Board", icon: "📌", blurb: "A digital directory of local businesses, nonprofits & events — customers can browse or add their own." },
  ads: { label: "Local Advertisers", icon: "🤝", blurb: "Feature nearby businesses who pay to be on your sleeves. Invite them and set your price." },
  link: { label: "Custom Link", icon: "🔗", blurb: "Point the QR straight at your app, rewards program, newsletter or any page." },
};

function cards(prospects: AdProspect[]): PreviewCard[] {
  const invited = prospects.filter((p) => p.invited).slice(0, 3);
  const list: PreviewCard[] = invited.map((p) => ({
    name: p.name,
    tagline: `${p.category.split("·").slice(-1)[0].trim()} · ${p.distance}`,
    cta: "Learn more",
  }));
  list.push({ name: CAFE.name, tagline: "Order ahead on our app", cta: "Open the app" });
  return list.slice(0, 4);
}

type DemoState = {
  destination: QrExperience;
  linkLabel: string;
  linkUrl: string;
  prospects: AdProspect[];
};

const DEFAULT_STATE: DemoState = {
  destination: "board",
  linkLabel: LINK_PRESETS[0].label,
  linkUrl: LINK_PRESETS[0].url,
  prospects: AD_PROSPECTS,
};

export function SmartSleeveApp() {
  const [view, setView] = useState<View>("home");
  // One state object so the localStorage hydration below is a single setState.
  const [state, setState] = useState<DemoState>(DEFAULT_STATE);
  const { destination, linkLabel, linkUrl, prospects } = state;
  const loaded = useRef(false);

  const setDestination = (destination: QrExperience) => setState((s) => ({ ...s, destination }));
  const setLinkLabel = (linkLabel: string) => setState((s) => ({ ...s, linkLabel }));
  const setLinkUrl = (linkUrl: string) => setState((s) => ({ ...s, linkUrl }));
  const setProspects = (prospects: AdProspect[]) => setState((s) => ({ ...s, prospects }));

  // Hydrate the café's saved choices once on mount (frontend-only demo).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time localStorage hydration
      if (raw) setState((s) => ({ ...s, ...JSON.parse(raw) }));
    } catch {}
    loaded.current = true;
  }, []);

  // Persist on change, but never before the initial hydration has run (so we
  // don't clobber saved state with defaults on first mount).
  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  const adCards = cards(prospects);
  const invitedCount = prospects.filter((p) => p.invited).length;
  const monthlyAdRevenue = prospects.filter((p) => p.invited).reduce((s, p) => s + p.suggestedPrice, 0);

  const navItems: { id: View; label: string }[] = [
    { id: "home", label: "Home" },
    { id: "destination", label: "QR destination" },
    { id: "order", label: "Order sleeves" },
    { id: "qr", label: "QR codes" },
  ];

  return (
    <div>
      {/* Demo banner */}
      <div
        className="rounded-2xl p-5 mb-6 text-white"
        style={{ background: `linear-gradient(135deg, ${CAFE.gradientFrom}, ${CAFE.gradientTo})` }}
      >
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] opacity-80">Smart Sleeves · Demo</div>
            <div className="font-serif text-2xl font-bold">{CAFE.name}</div>
          </div>
          <div className="text-xs opacity-90 text-right">
            {CAFE.locations.length} locations · {CAFE.city}
          </div>
        </div>
      </div>

      {/* Nav */}
      <div className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
        {navItems.map((n) => (
          <button
            key={n.id}
            onClick={() => setView(n.id)}
            className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition ${
              view === n.id ? "text-gray-900" : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
            style={view === n.id ? { borderColor: CAFE.accent, color: "#1a1a1a" } : undefined}
          >
            {n.label}
          </button>
        ))}
      </div>

      {view === "home" && (
        <HomeView
          destination={destination}
          adCards={adCards}
          linkLabel={linkLabel}
          linkUrl={linkUrl}
          invitedCount={invitedCount}
          monthlyAdRevenue={monthlyAdRevenue}
          onChangeDestination={() => setView("destination")}
          onOrder={() => setView("order")}
          onQr={() => setView("qr")}
        />
      )}

      {view === "destination" && (
        <DestinationView
          destination={destination}
          setDestination={setDestination}
          linkLabel={linkLabel}
          setLinkLabel={setLinkLabel}
          linkUrl={linkUrl}
          setLinkUrl={setLinkUrl}
          prospects={prospects}
          setProspects={setProspects}
          adCards={adCards}
          monthlyAdRevenue={monthlyAdRevenue}
        />
      )}

      {view === "order" && <OrderSleeves initialDestination={destination} />}
      {view === "qr" && <CreateQr />}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <div className="font-serif text-3xl font-bold">{value}</div>
      <div className="text-xs uppercase tracking-wider text-gray-400 mt-1">{label}</div>
    </div>
  );
}

function HomeView(props: {
  destination: QrExperience;
  adCards: PreviewCard[];
  linkLabel: string;
  linkUrl: string;
  invitedCount: number;
  monthlyAdRevenue: number;
  onChangeDestination: () => void;
  onOrder: () => void;
  onQr: () => void;
}) {
  const exp = EXPERIENCE[props.destination];
  const max = Math.max(...ANALYTICS.weeklyScans);
  return (
    <div className="grid md:grid-cols-[1fr_320px] gap-8 items-start">
      <div>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Stat label="Scans" value={ANALYTICS.scans.toLocaleString()} />
          <Stat label="Clicks" value={ANALYTICS.clicks.toLocaleString()} />
          <Stat label="Views" value={ANALYTICS.views.toLocaleString()} />
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
          <div className="text-xs uppercase tracking-wider text-gray-400 mb-3">Scans · last 5 weeks</div>
          <div className="flex items-end gap-2 h-24">
            {ANALYTICS.weeklyScans.map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t"
                  style={{
                    height: `${(v / max) * 100}%`,
                    background: `linear-gradient(to top, ${CAFE.gradientTo}, ${CAFE.gradientFrom})`,
                  }}
                />
                <span className="text-[10px] text-gray-400">W{i + 1}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-gray-400">Your QR currently shows</div>
              <div className="font-serif text-xl font-bold mt-1">
                {exp.icon} {exp.label}
              </div>
              <p className="text-sm text-gray-500 mt-1 max-w-md">{exp.blurb}</p>
              {props.destination === "ads" && (
                <p className="text-sm text-gray-500 mt-1">
                  {props.invitedCount} advertisers · <strong>${props.monthlyAdRevenue}/mo</strong> potential
                </p>
              )}
            </div>
            <button
              onClick={props.onChangeDestination}
              className="text-sm font-semibold text-white px-4 py-2 rounded-lg shrink-0"
              style={{ backgroundColor: CAFE.accent }}
            >
              Change
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={props.onOrder}
            className="bg-white rounded-2xl shadow-sm p-5 text-left hover:shadow-md transition"
          >
            <div className="text-2xl mb-2">☕️</div>
            <div className="font-serif font-bold">Order sleeves</div>
            <div className="text-xs text-gray-400 mt-0.5">Design, quantity & pricing</div>
          </button>
          <button
            onClick={props.onQr}
            className="bg-white rounded-2xl shadow-sm p-5 text-left hover:shadow-md transition"
          >
            <div className="text-2xl mb-2">⬛️</div>
            <div className="font-serif font-bold">Create a QR code</div>
            <div className="text-xs text-gray-400 mt-0.5">For signs, cups & A-frames</div>
          </button>
        </div>
      </div>

      <PhonePreview
        destination={props.destination}
        adCards={props.adCards}
        linkLabel={props.linkLabel}
        linkUrl={props.linkUrl}
      />
    </div>
  );
}

function DestinationView(props: {
  destination: QrExperience;
  setDestination: (d: QrExperience) => void;
  linkLabel: string;
  setLinkLabel: (s: string) => void;
  linkUrl: string;
  setLinkUrl: (s: string) => void;
  prospects: AdProspect[];
  setProspects: (p: AdProspect[]) => void;
  adCards: PreviewCard[];
  monthlyAdRevenue: number;
}) {
  const setPrice = (id: string, price: number) =>
    props.setProspects(props.prospects.map((p) => (p.id === id ? { ...p, suggestedPrice: price } : p)));
  const toggleInvite = (id: string) =>
    props.setProspects(props.prospects.map((p) => (p.id === id ? { ...p, invited: !p.invited } : p)));

  return (
    <div className="grid md:grid-cols-[1fr_320px] gap-8 items-start">
      <div>
        {/* Switcher */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {(Object.keys(EXPERIENCE) as QrExperience[]).map((e) => {
            const active = props.destination === e;
            return (
              <button
                key={e}
                onClick={() => props.setDestination(e)}
                className={`rounded-xl border-2 p-4 text-center transition ${
                  active ? "border-transparent ring-2" : "border-gray-200 hover:border-gray-300"
                }`}
                style={active ? { boxShadow: `0 0 0 2px ${CAFE.accent}` } : undefined}
              >
                <div className="text-2xl mb-1">{EXPERIENCE[e].icon}</div>
                <div className="text-sm font-semibold">{EXPERIENCE[e].label}</div>
              </button>
            );
          })}
        </div>

        {/* Per-destination config */}
        {props.destination === "board" && (
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h3 className="font-serif font-bold text-lg mb-1">Community board</h3>
            <p className="text-sm text-gray-500 mb-4">
              Customers land on <strong>View</strong> to browse local businesses, nonprofits & events,
              and can tap <strong>Contribute</strong> to submit their own listing for you to approve.
            </p>
            <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">Listings on your board</div>
            <div className="text-sm text-gray-600">
              6 active · a mix of businesses, nonprofits and events. Edit or approve submissions here.
            </div>
          </div>
        )}

        {props.destination === "ads" && (
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-serif font-bold text-lg">Invite local advertisers</h3>
              <span className="text-sm text-gray-500">
                <strong>${props.monthlyAdRevenue}</strong>/mo potential
              </span>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Nearby businesses you can feature on your sleeves. Set your price and invite them.
            </p>
            <div className="space-y-2">
              {props.prospects.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-xl border border-gray-100 px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm truncate">{p.name}</div>
                    <div className="text-xs text-gray-400">{p.category} · {p.distance}</div>
                  </div>
                  <div className="flex items-center gap-0.5 text-sm">
                    <span className="text-gray-400">$</span>
                    <input
                      type="number"
                      value={p.suggestedPrice}
                      onChange={(e) => setPrice(p.id, Number(e.target.value) || 0)}
                      className="w-16 rounded-lg border border-gray-200 px-2 py-1 text-right"
                    />
                    <span className="text-gray-400 text-xs">/mo</span>
                  </div>
                  <button
                    onClick={() => toggleInvite(p.id)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg shrink-0 w-20 ${
                      p.invited ? "bg-emerald-100 text-emerald-700" : "text-white"
                    }`}
                    style={p.invited ? undefined : { backgroundColor: CAFE.accent }}
                  >
                    {p.invited ? "Invited ✓" : "Invite"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {props.destination === "link" && (
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h3 className="font-serif font-bold text-lg mb-1">Custom link</h3>
            <p className="text-sm text-gray-500 mb-4">
              Send everyone who scans straight to one destination — your app, rewards, newsletter or any page.
            </p>
            <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">Label</label>
            <input
              value={props.linkLabel}
              onChange={(e) => props.setLinkLabel(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm mb-3"
            />
            <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">URL</label>
            <input
              value={props.linkUrl}
              onChange={(e) => props.setLinkUrl(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {LINK_PRESETS.map((p) => (
                <button
                  key={p.url}
                  onClick={() => {
                    props.setLinkLabel(p.label);
                    props.setLinkUrl(p.url);
                  }}
                  className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <PhonePreview
        destination={props.destination}
        adCards={props.adCards}
        linkLabel={props.linkLabel}
        linkUrl={props.linkUrl}
      />
    </div>
  );
}
