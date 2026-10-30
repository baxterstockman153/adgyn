"use client";

import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import Image from "next/image";

const paths: Record<string, ReactNode> = {
  home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z" /></>,
  qr: <><rect x="3" y="3" width="6" height="6" rx="1" /><rect x="15" y="3" width="6" height="6" rx="1" /><rect x="3" y="15" width="6" height="6" rx="1" /><path d="M15 15h3v3h3m-6 3h3m3-9v3M3 12h5m4-9v5m0 4h3m-3 3v6" /></>,
  heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 6 9 7 9-7" /></>,
  cup: <><path d="M4 8h12v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4Zm12 1h2a3 3 0 1 1 0 6h-2M7 3v2m4-2v2m4-2v2" /></>,
  arrow: <><path d="M5 12h14m-6-6 6 6-6 6" /></>,
  external: <><path d="M14 3h7v7m0-7L10 14m0-11H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="m5 12 4 4L19 6" />,
  chevron: <path d="m9 5 7 7-7 7" />,
  download: <><path d="M12 3v12m-5-5 5 5 5-5M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" /></>,
  copy: <><rect x="8" y="8" width="12" height="13" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></>,
  ticket: <><path d="M3 7a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v3a2 2 0 0 0 0 4v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-3a2 2 0 0 0 0-4Zm12-1v2m0 3v2m0 3v2" /></>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  pin: <><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6m0-10v1" /></>,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  edit: <><path d="m15 5 4 4M4 20l5-1L21 7a2.8 2.8 0 0 0-4-4L5 15Zm0 0h16" /></>,
  leaf: <><path d="M20 3C9 2 2 6 5 15s16 6 15-12ZM5 20 16 9" /></>,
  pause: <><path d="M8 5v14M16 5v14" /></>,
  play: <path d="M7 4v16l13-8Z" />,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></>,
  chart: <><path d="M3 3v18h18" /><path d="M7 15v2m4-6v6m4-9v9m4-12v12" /></>,
  users: <><circle cx="9" cy="8" r="4" /><path d="M2 21v-1a6 6 0 0 1 12 0v1m2-17a4 4 0 0 1 0 8m6 9v-1a6 6 0 0 0-4-5.6" /></>,
  archive: <><rect x="3" y="4" width="18" height="5" rx="1" /><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9m-9 4h4" /></>,
  link: <><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" /></>,
};

export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] ?? paths.arrow}</svg>;
}

export function Button({ children, variant = "primary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "quiet"; children: ReactNode }) {
  return <button type="button" {...props} className={`ss-button ss-button-${variant} ${className}`}>{children}</button>;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="ss-field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "green" | "amber" }) {
  return <span className={`ss-badge ss-badge-${tone}`}>{children}</span>;
}

export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onClose, 4500);
    return () => clearTimeout(timer);
  }, [message, onClose]);
  if (!message) return null;
  return <div className="ss-toast" role="status">{message}<button type="button" aria-label="Dismiss notification" onClick={onClose}><Icon name="close" size={14} /></button></div>;
}

export function Modal({ title, description, onClose, children }: { title: string; description?: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return <div className="ss-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><div className="ss-modal" role="dialog" aria-modal="true" aria-label={title}><div className="ss-modal-header"><div><h2>{title}</h2>{description && <p>{description}</p>}</div><button type="button" className="ss-modal-close" aria-label="Close" onClick={onClose}><Icon name="close" size={16} /></button></div>{children}</div></div>;
}

export function Notice({ children }: { children: ReactNode }) {
  return <div className="ss-notice"><Icon name="info" size={17} /><div>{children}</div></div>;
}

export function downloadText(filename: string, content: string, mime = "text/plain") {
  const url = URL.createObjectURL(new Blob([content], { type: `${mime};charset=utf-8` }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function copyText(content: string) {
  if (!navigator.clipboard) throw new Error("Copy is unavailable in this browser. Use Download instead.");
  await navigator.clipboard.writeText(content);
}

export function QrCode({ value, label = "QR code", filename = "adgyn-qr", onError }: { value: string; label?: string; filename?: string; onError?: (message: string) => void }) {
  const [result, setResult] = useState<{ value: string; image: string } | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    import("qrcode").then(encoder => encoder.toDataURL(value, { width: 560, margin: 4, errorCorrectionLevel: "M", color: { dark: "#241a15", light: "#ffffff" } }))
      .then(image => { if (!cancelled) { setResult({ value, image }); setError(false); } })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [value]);
  const image = result?.value === value ? result.image : null;
  async function download(format: "png" | "svg") {
    try {
      if (format === "svg") {
        const encoder = await import("qrcode");
        downloadText(`${filename}.svg`, await encoder.toString(value, { type: "svg", margin: 4, errorCorrectionLevel: "M" }), "image/svg+xml");
      } else if (image) {
        const anchor = document.createElement("a");
        anchor.href = image;
        anchor.download = `${filename}.png`;
        anchor.click();
      }
    } catch {
      onError?.("The QR download didn’t finish. Please try again.");
    }
  }
  return <div className="ss-qr"><div className="ss-qr-image">{image ? <Image src={image} width={180} height={180} alt={label} unoptimized /> : <span role="status">{error ? "QR unavailable. Try again." : "Preparing your QR…"}</span>}</div><div className="ss-button-row"><Button variant="secondary" disabled={!image} onClick={() => download("png")}><Icon name="download" size={16} /> PNG</Button><Button variant="secondary" disabled={!image} onClick={() => download("svg")}>SVG</Button></div></div>;
}
