"use client";

import { useState, useRef } from "react";

export function LogoUpload({
  value,
  onChange,
  label = "Logo",
}: {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/upload/logo", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Upload failed.");
        return;
      }
      onChange(data.url);
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">
        {label}
      </label>
      <div className="flex items-center gap-3">
        <div className="w-16 h-16 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value}
              alt="Logo preview"
              className="w-full h-full object-contain"
            />
          ) : (
            <span className="text-[10px] text-gray-300 text-center px-1">
              No logo
            </span>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            {uploading ? "Uploading…" : value ? "Replace" : "Upload logo"}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="text-xs text-gray-400 hover:text-gray-600 text-left"
            >
              Remove
            </button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
      </div>
      {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
      <p className="text-[11px] text-gray-400 mt-1.5">
        PNG, JPG, WEBP, SVG, or GIF · max 2MB
      </p>
    </div>
  );
}
