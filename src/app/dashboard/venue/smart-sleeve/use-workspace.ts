"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { initialScenario, parseExperience, sampleExperiences, type Cafe, type Experience, type Scenario } from "@/lib/smart-sleeves";
import { INITIAL_CONTENT, type ContentDraft } from "./content-composer";
import { INITIAL_SLEEVES, type SleeveDraft } from "./sleeve-estimate";

type WorkspaceState = { drafts: Experience[]; scenario: Scenario; content: ContentDraft; sleeves: SleeveDraft };
const subscribe = (callback: () => void) => {
  window.addEventListener("storage", callback);
  window.addEventListener("adgyn-workspace-change", callback);
  return () => { window.removeEventListener("storage", callback); window.removeEventListener("adgyn-workspace-change", callback); };
};
const serverSnapshot = () => null;

function restore(raw: string | null, fallback: WorkspaceState): WorkspaceState {
  if (!raw) return fallback;
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== "object") return fallback;
    const drafts = Array.isArray(value.drafts) ? value.drafts.flatMap((draft: unknown) => { const parsed = parseExperience(draft); return parsed ? [parsed] : []; }).slice(0, 100) : fallback.drafts;
    const scenario = value.scenario;
    const validScenario = scenario && ["months", "monthlyFee", "packaging", "shipping", "processing", "other"].every(key => typeof scenario[key] === "number" && Number.isFinite(scenario[key]) && scenario[key] >= 0 && scenario[key] <= 1000000) && typeof scenario.costsComplete === "boolean" && Array.isArray(scenario.sponsors) && scenario.sponsors.length <= 12 && scenario.sponsors.every((sponsor: Record<string, unknown>) => sponsor && typeof sponsor.id === "string" && typeof sponsor.name === "string" && typeof sponsor.amount === "number" && Number.isFinite(sponsor.amount) && sponsor.amount >= 0 && sponsor.amount <= 1000000 && typeof sponsor.included === "boolean");
    const content = value.content;
    const validContent = content && ["subject", "introduction", "template"].every(key => typeof content[key] === "string") && ["email", "social"].includes(content.channel) && Array.isArray(content.selected) && content.selected.every((id: unknown) => typeof id === "string");
    const sleeves = value.sleeves;
    const validSleeves = sleeves && ["kraft", "brand", "white"].includes(sleeves.design) && [300, 1000, 2500, 5000].includes(sleeves.quantity) && Number.isInteger(sleeves.locations) && sleeves.locations > 0 && sleeves.locations <= 100 && typeof sleeves.bringOwn === "boolean";
    return { drafts, scenario: validScenario ? scenario : fallback.scenario, content: validContent ? content : fallback.content, sleeves: validSleeves ? sleeves : fallback.sleeves };
  } catch { return fallback; }
}

export function useWorkspace(cafe: Cafe, demo: boolean) {
  const key = `adgyn-workspace-v2:${demo ? "demo" : "live"}:${cafe.id}`;
  const fallback = useMemo<WorkspaceState>(() => ({ drafts: demo ? sampleExperiences(cafe) : [], scenario: initialScenario(), content: INITIAL_CONTENT, sleeves: INITIAL_SLEEVES }), [cafe, demo]);
  const getSnapshot = useCallback(() => { try { return localStorage.getItem(key); } catch { return null; } }, [key]);
  const raw = useSyncExternalStore(subscribe, getSnapshot, serverSnapshot);
  const state = useMemo(() => restore(raw, fallback), [raw, fallback]);
  const setState = (update: (previous: WorkspaceState) => WorkspaceState): boolean => {
    try {
      localStorage.setItem(key, JSON.stringify(update(restore(getSnapshot(), fallback))));
      window.dispatchEvent(new Event("adgyn-workspace-change"));
      return true;
    } catch { return false; }
  };
  return { state, setState };
}
