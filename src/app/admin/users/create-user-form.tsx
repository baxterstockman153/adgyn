"use client";

import { useState } from "react";
import { createUser } from "../actions";

export function CreateUserForm({
  venues,
  brands,
}: {
  venues: { id: string; name: string }[];
  brands: { id: string; name: string }[];
}) {
  const [orgType, setOrgType] = useState<"venue" | "brand">("venue");

  return (
    <form
      action={createUser}
      className="bg-white rounded-xl shadow-sm p-4 mb-6 flex flex-wrap gap-3 items-end"
    >
      <div className="min-w-[180px]">
        <label className="block text-xs text-gray-400 mb-1">Email</label>
        <input
          name="email"
          type="email"
          required
          placeholder="user@example.com"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
      </div>
      <div className="min-w-[120px]">
        <label className="block text-xs text-gray-400 mb-1">Name</label>
        <input
          name="name"
          placeholder="Optional"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
      </div>
      <div className="min-w-[100px]">
        <label className="block text-xs text-gray-400 mb-1">Type</label>
        <select
          name="orgType"
          value={orgType}
          onChange={(e) => setOrgType(e.target.value as "venue" | "brand")}
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
      <button
        type="submit"
        className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
      >
        + Add User
      </button>
    </form>
  );
}
