"use client";

import { useEffect, useState } from "react";
import type { Cafe, Channel, Experience, PublicSponsor } from "@/lib/smart-sleeves";
import { CustomerExperience, type SignupInput } from "@/app/dashboard/venue/smart-sleeve/customer-experience";

export function PublicExperience({ cafe, experience, sponsors, qrCodeId, channel, preview, savedClaim }: { cafe: Cafe; experience: Experience; sponsors: PublicSponsor[]; qrCodeId: string; channel: Channel; preview: boolean; savedClaim?: string }) {
  const [claimId, setClaimId] = useState(savedClaim);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const endpoint = `/api/smart-experiences/${experience.id}`;
  useEffect(() => {
    if (preview) return;
    fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "visit", channel, qr: qrCodeId }) }).catch(() => {});
  }, [endpoint, channel, qrCodeId, preview]);
  async function post(body: object): Promise<Record<string, unknown> | null> {
    setPending(true); setError("");
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, channel, qr: qrCodeId }) });
      const result = await response.json();
      if (!response.ok) { setError(typeof result.error === "string" ? result.error : "That didn’t save. Please try again."); return null; }
      return result;
    } catch { setError("Please check your connection and try again."); return null; }
    finally { setPending(false); }
  }
  async function claim() {
    if (pending || preview) return;
    const result = await post({ action: "claim" });
    if (typeof result?.id === "string") setClaimId(result.id);
  }
  async function signup(input: SignupInput) {
    if (pending || preview) return false;
    return !!(await post({ action: "signup", ...input }));
  }
  const linkFor = (entryId?: string) => `/q/${qrCodeId}/go?channel=${channel}${entryId ? `&entry=${encodeURIComponent(entryId)}` : ""}`;
  return <CustomerExperience cafe={cafe} experience={experience} sponsors={sponsors} preview={preview} claimId={claimId} onClaim={claim} onSignup={signup} pending={pending} error={error} linkFor={linkFor} />;
}
