"use client";

export default function Error({ reset }: { reset: () => void }) {
  return <div className="ss-card ss-card-pad ss-empty"><h3>This page needs a moment.</h3><p>We couldn’t load your campaigns. Nothing you saved has been lost.</p><button type="button" onClick={reset} className="ss-button ss-button-primary">Try again</button></div>;
}
