"use client";

import { useEffect, useState } from "react";
import type { Cafe, Channel, Experience } from "@/lib/smart-sleeves";
import { CustomerExperience } from "@/app/dashboard/venue/smart-sleeve/customer-experience";

export function PublicExperience({ cafe, experience, channel, preview }: { cafe: Cafe; experience: Experience; channel: Channel; preview: boolean }) {
  const [claimId, setClaimId] = useState<string>();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  useEffect(() => {
    if (preview) return;
    fetch(`/api/smart-experiences/${experience.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "visit", channel }) }).catch(() => {});
  }, [experience.id, channel, preview]);
  async function claim() {
    if (pending || preview) return;
    setPending(true); setError("");
    try {
      const response = await fetch(`/api/smart-experiences/${experience.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "claim", channel }) });
      const result = await response.json();
      if (!response.ok || !result.id) { setError(result.error || "We couldn’t save your offer. Please try again."); return; }
      setClaimId(result.id);
    } catch { setError("Please check your connection and try again."); }
    finally { setPending(false); }
  }
  const linkFor = (entryId?: string) => `/q/${experience.id}/go?channel=${channel}${entryId ? `&entry=${encodeURIComponent(entryId)}` : ""}`;
  return <CustomerExperience cafe={cafe} experience={experience} preview={preview} claimId={claimId} onClaim={claim} pending={pending} error={error} linkFor={linkFor} />;
}
