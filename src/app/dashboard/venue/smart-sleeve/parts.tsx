import Link from "next/link";
import { EXPERIENCE_KINDS, ORDER_STATUSES, STATUS_LABELS, type CampaignStatus } from "@/lib/smart-sleeves";
import type { CampaignSummary } from "@/lib/smart-sleeves-server";
import { Badge, Icon } from "./ui";

const BASE = "/dashboard/venue/smart-sleeve";

export function StatusBadge({ status }: { status: CampaignStatus }) {
  return <Badge tone={status === "active" ? "green" : status === "draft" || status === "paused" ? "amber" : "neutral"}>{STATUS_LABELS[status]}</Badge>;
}

/** Daily scans as a bar chart. Server- and client-safe (no hooks). */
export function ScanChart({ series, label }: { series: { date: string; count: number }[]; label: string }) {
  const max = Math.max(1, ...series.map(point => point.count));
  const total = series.reduce((sum, point) => sum + point.count, 0);
  const short = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  if (!total) return <div className="ss-chart-empty"><Icon name="chart" size={26} /><strong>No activity in this period</strong><span>Scans will show up here as soon as customers start scanning.</span></div>;
  return <figure className="ss-chart" aria-label={`${label}: ${total} scans`}>
    <div className="ss-chart-bars">{series.map(point => <div key={point.date} className="ss-chart-bar" title={`${short(point.date)}: ${point.count} ${point.count === 1 ? "scan" : "scans"}`}><span style={{ height: `${Math.max(point.count ? 4 : 0, (point.count / max) * 100)}%` }} /></div>)}</div>
    <figcaption><span>{short(series[0].date)}</span><span>{short(series[series.length - 1].date)}</span></figcaption>
  </figure>;
}

export function CampaignRow({ campaign }: { campaign: CampaignSummary }) {
  const kind = EXPERIENCE_KINDS[campaign.experience.kind];
  const order = campaign.latestOrder && campaign.latestOrder.status !== "delivered" && campaign.latestOrder.status !== "canceled" ? campaign.latestOrder : null;
  return <Link href={`${BASE}/campaigns/${campaign.id}`} className="ss-experience-row ss-row-link">
    <div className={`ss-type-icon ss-type-icon-${campaign.experience.kind}`}><Icon name={kind.icon} size={20} /></div>
    <div className="ss-row-text"><strong>{campaign.experience.name}</strong><small>{kind.label} · {campaign.qrCodes} {campaign.qrCodes === 1 ? "QR code" : "QR codes"}{campaign.experience.kind === "board" ? ` · ${campaign.sponsors} ${campaign.sponsors === 1 ? "sponsor" : "sponsors"}` : ""}{order ? ` · Sleeves: ${ORDER_STATUSES[order.status].toLowerCase()}` : ""}</small></div>
    <div className="ss-row-metric"><strong>{campaign.scans30.toLocaleString()}</strong><small>scans · 30 days</small></div>
    <StatusBadge status={campaign.status} />
    <Icon name="chevron" size={16} />
  </Link>;
}
