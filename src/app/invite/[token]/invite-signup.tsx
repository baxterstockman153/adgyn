"use client";

import { useState, useTransition } from "react";
import { acceptInvite } from "./actions";

export function InviteSignup({
  token,
  lockedEmail,
}: {
  token: string;
  lockedEmail: string | null;
}) {
  const [email, setEmail] = useState(lockedEmail || "");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    startTransition(async () => {
      try {
        await acceptInvite({ token, email, password, name });
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Something went wrong."
        );
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          readOnly={!!lockedEmail}
          className={`w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
            lockedEmail ? "bg-gray-50 text-gray-500" : ""
          }`}
          placeholder="you@company.com"
        />
        {lockedEmail && (
          <p className="text-xs text-gray-400 mt-1">
            This invite is for this email address.
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          placeholder="At least 6 characters"
        />
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-gray-900 text-white py-2.5 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
      >
        {isPending ? "Creating account..." : "Create Account & Join"}
      </button>
    </form>
  );
}
