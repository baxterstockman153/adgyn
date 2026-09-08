"use client";

import { useState, useTransition } from "react";
import { createInvite } from "../actions";

export function InviteForm({
  venues,
  brands,
}: {
  venues: { id: string; name: string }[];
  brands: { id: string; name: string }[];
}) {
  const [orgType, setOrgType] = useState<"venue" | "brand">("venue");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const invite = await createInvite(formData);
      const host =
        typeof window !== "undefined" ? window.location.origin : "https://app.adgyn.com";
      setInviteLink(`${host}/invite/${invite.token}`);
      setCopied(false);
    });
  }

  function copyLink() {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
      <h3 className="text-sm font-medium text-gray-700 mb-3">
        Create Invite Link
      </h3>
      <form action={handleSubmit} className="flex flex-wrap gap-3 items-end">
        <div className="min-w-[100px]">
          <label className="block text-xs text-gray-400 mb-1">Type</label>
          <select
            name="orgType"
            value={orgType}
            onChange={(e) => {
              setOrgType(e.target.value as "venue" | "brand");
              setInviteLink(null);
            }}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            <option value="venue">Venue</option>
            <option value="brand">Brand</option>
          </select>
        </div>
        <div className="min-w-[180px]">
          <label className="block text-xs text-gray-400 mb-1">
            {orgType === "venue" ? "Venue" : "Brand"}
          </label>
          <select
            name="orgId"
            required
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            <option value="">Select...</option>
            {(orgType === "venue" ? venues : brands).map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[100px]">
          <label className="block text-xs text-gray-400 mb-1">Role</label>
          <select
            name="role"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            <option value="owner">Owner</option>
            <option value="member">Member</option>
          </select>
        </div>
        <div className="min-w-[160px]">
          <label className="block text-xs text-gray-400 mb-1">
            Email <span className="text-gray-300">(optional, locks invite)</span>
          </label>
          <input
            name="email"
            type="email"
            placeholder="anyone can use if empty"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          {isPending ? "Creating..." : "Generate Link"}
        </button>
      </form>

      {/* Show generated link */}
      {inviteLink && (
        <div className="mt-4 p-3 bg-green-50 rounded-lg flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-green-700 font-medium mb-1">
              Invite link created! Expires in 7 days.
            </p>
            <code className="text-xs text-green-800 bg-green-100 px-2 py-1 rounded block truncate">
              {inviteLink}
            </code>
          </div>
          <button
            onClick={copyLink}
            className="flex-shrink-0 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      )}
    </div>
  );
}
