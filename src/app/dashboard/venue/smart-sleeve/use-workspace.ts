"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { initialScenario, parseExperience, sampleExperiences, type Cafe, type Experience, type Scenario } from "@/lib/smart-sleeves";
import { INITIAL_CONTENT, type ContentDraft } from "./content-composer";
import { INITIAL_SLEEVES, type SleeveDraft } from "./sleeve-estimate";
import { INITIAL_CONTACTS, INITIAL_GROUPS, type Contact, type Group } from "./address-book";

type WorkspaceState = { drafts: Experience[]; scenario: Scenario; content: ContentDraft; sleeves: SleeveDraft; contacts: Contact[]; groups: Group[] };
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
    const groups = Array.isArray(value.groups) && value.groups.length <= 100 && value.groups.every((group: Record<string, unknown>) => group && typeof group.id === "string" && typeof group.name === "string" && group.name.length <= 60) ? value.groups as Group[] : fallback.groups;
    const groupIds = new Set(groups.map(group => group.id));
    const contacts = Array.isArray(value.contacts) && value.contacts.length <= 5000 && value.contacts.every((contact: Record<string, unknown>) => contact && typeof contact.id === "string" && typeof contact.email === "string" && contact.email.length <= 254 && typeof contact.name === "string" && contact.name.length <= 120 && Array.isArray(contact.groupIds) && (contact.groupIds as unknown[]).every(id => typeof id === "string"))
      ? (value.contacts as Contact[]).map(contact => ({ ...contact, groupIds: contact.groupIds.filter(id => groupIds.has(id)) }))
      : fallback.contacts;
    return { drafts, scenario: validScenario ? scenario : fallback.scenario, content: validContent ? content : fallback.content, sleeves: validSleeves ? sleeves : fallback.sleeves, contacts, groups };
  } catch { return fallback; }
}

export function useWorkspace(cafe: Cafe, demo: boolean) {
  const key = `adgyn-workspace-v2:${demo ? "demo" : "live"}:${cafe.id}`;
  const fallback = useMemo<WorkspaceState>(() => ({ drafts: demo ? sampleExperiences(cafe) : [], scenario: initialScenario(), content: INITIAL_CONTENT, sleeves: INITIAL_SLEEVES, contacts: INITIAL_CONTACTS, groups: INITIAL_GROUPS }), [cafe, demo]);
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
