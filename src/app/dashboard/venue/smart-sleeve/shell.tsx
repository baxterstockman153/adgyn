"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { initials, type Cafe } from "@/lib/smart-sleeves";
import { Icon } from "./ui";

export const BASE = "/dashboard/venue/smart-sleeve";

const NAV = [
  { href: BASE, label: "Dashboard", icon: "home" },
  { href: `${BASE}/campaigns`, label: "Campaigns", icon: "qr" },
  { href: `${BASE}/settings`, label: "Settings", icon: "settings" },
];

export function Shell({ cafe, hasOutreach, children }: { cafe: Cafe; hasOutreach: boolean; children: ReactNode }) {
  const pathname = usePathname();
  const current = NAV.slice().reverse().find(item => item.href === BASE ? pathname === BASE : pathname.startsWith(item.href));
  return <div className="ss">
    <a className="ss-skip" href="#ss-content">Skip to content</a>
    <aside className="ss-sidebar">
      <div className="ss-wordmark"><Icon name="cup" size={31} />adgyn<span style={{ color: "#c8784a" }}>.</span></div>
      <div className="ss-brand-subtitle">Smart Sleeves</div>
      <div className="ss-cafe-switch">{cafe.logoUrl ? <Image className="ss-avatar" src={cafe.logoUrl} alt="" width={35} height={35} unoptimized /> : <div className="ss-avatar">{initials(cafe.name)}</div>}<div><strong>{cafe.name}</strong><small>Café workspace</small></div></div>
      <nav className="ss-nav" aria-label="Café workspace">{NAV.map(item => <Link key={item.href} href={item.href} aria-current={current?.href === item.href ? "page" : undefined}><Icon name={item.icon} size={18} /><span>{item.label}</span></Link>)}</nav>
      <div className="ss-sidebar-bottom">
        {hasOutreach && <Link href="/dashboard/venue/outreach"><Icon name="heart" size={15} /> Sponsor conversations</Link>}
        <span className="ss-sidebar-help"><Icon name="mail" size={15} /> Help: hello@adgyn.com</span>
        <form action="/api/auth/signout" method="post"><button type="submit" className="ss-button ss-button-quiet">Sign out</button></form>
      </div>
    </aside>
    <div className="ss-main">
      <header className="ss-topbar"><div className="ss-topbar-left"><span>{cafe.name}</span><strong>{current?.label ?? "Dashboard"}</strong></div><div className="ss-topbar-right"><Link className="ss-button ss-button-primary" href={`${BASE}/campaigns/new`}><Icon name="plus" size={15} /> New campaign</Link></div></header>
      <main className="ss-content" id="ss-content">{children}</main>
    </div>
  </div>;
}
