"use client";

import { useTransition } from "react";
import { activateCampaign, completeCampaign, revertToDraft } from "../actions";

export function CampaignActions({
  campaignId,
  status,
}: {
  campaignId: string;
  status: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleAction(action: (id: string) => Promise<void>) {
    startTransition(async () => {
      await action(campaignId);
    });
  }

  return (
    <div className="flex items-center gap-2">
      {/* Status badge */}
      <span
        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          status === "active"
            ? "bg-green-50 text-green-700"
            : status === "draft"
            ? "bg-yellow-50 text-yellow-700"
            : "bg-gray-100 text-gray-500"
        }`}
      >
        {status}
      </span>

      {/* Action buttons */}
      {status === "draft" && (
        <button
          onClick={() => handleAction(activateCampaign)}
          disabled={isPending}
          className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          {isPending ? "..." : "Activate"}
        </button>
      )}

      {status === "active" && (
        <button
          onClick={() => handleAction(completeCampaign)}
          disabled={isPending}
          className="text-xs px-3 py-1.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          {isPending ? "..." : "Complete"}
        </button>
      )}

      {(status === "active" || status === "completed") && (
        <button
          onClick={() => handleAction(revertToDraft)}
          disabled={isPending}
          className="text-xs px-3 py-1.5 border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {isPending ? "..." : "→ Draft"}
        </button>
      )}
    </div>
  );
}
