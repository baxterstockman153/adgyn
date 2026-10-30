import Link from "next/link";

export default function NotFound() {
  return <div className="ss-card ss-empty"><h3>We couldn’t find that campaign</h3><p>It may have been removed, or the link is out of date.</p><Link className="ss-button ss-button-secondary" href="/dashboard/venue/smart-sleeve/campaigns">Back to Campaigns</Link></div>;
}
