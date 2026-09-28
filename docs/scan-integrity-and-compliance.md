# Scan Integrity, Verifiability & Compliance

**Status:** Backlog / design proposal — not yet implemented
**Last updated:** 2026-09-28
**Owner:** TBD

## Why this exists

Adgyn sells impressions (QR scans) and clicks to advertisers (brands). Those
numbers are only worth what advertisers can trust. Today we **cannot prove**
that reported scans are (a) real and not fabricated by outsiders, or (b) not
fabricated or altered by us, the platform. This doc captures the plan to close
that gap so we can implement it later.

There are **two distinct problems**, and they need different solutions:

1. **Authenticity** — are the scans real QR loads, not bots/scripts?
2. **Non-repudiation** — can we prove *we* didn't fabricate, inflate, or delete
   scans? (Harder: we control the database.)

## Current state (the gaps)

- `POST /api/scan` is an **open, unauthenticated endpoint**. Anyone can `curl`
  it with a `campaignId` and inflate the count. A recorded scan is not tied to
  an actual sleeve-page render.
- Scan/click rows are **fully mutable** by anyone with DB access. There is no
  append-only guarantee and no tamper-evidence. (Data has already been created
  and deleted directly via admin scripts during setup/testing.)
- We *do* already capture: `sessionHash` (hashed IP+UA+hour), `visitorId`
  cookie, geo (city/region/country), device/OS/browser, and bot + rapid-repeat
  flagging (`isBot`, `botReason`). This helps authenticity but does nothing for
  non-repudiation.
- **No privacy disclosure** on the sleeve/scan page, despite collecting IP-derived
  geolocation and per-visitor identifiers from end users.

## Proposed measures (priority order)

### A. Un-forgeable scan capture *(foundational — do first)*
The sleeve page issues a short-lived **signed nonce** on render; `/api/scan`
only accepts a scan whose nonce it minted for that specific page load, and
rejects replays/reuse. Without this, every downstream integrity control is
"garbage in, verified garbage out."
- Nonce signed server-side (HMAC), tied to `campaignId` + issue time.
- Short TTL (e.g. 2–5 min); single-use (store used nonces / jti).
- Rejects direct/scripted POSTs that never loaded the page.

### B. Append-only, hash-chained scan log *(directly answers "did you fabricate?")*
Each scan row stores `hash( this_scan_fields + previous_scan_hash )`. Deleting,
inserting, or editing any row breaks the chain visibly and detectably.
- Keep the existing mutable dashboard tables for fast queries, **plus** a
  separate immutable/append-only log as the source of truth for audits.
- Periodically verify chain integrity; expose a "verify" routine.

### C. Mirror events to a store we can't silently rewrite *(independent record)*
Cheapest first:
- **Vercel edge/runtime logs** already record every `/api/scan` request,
  independent of our DB — retain them as a cross-check. (Free.)
- **Supabase point-in-time backups** — independent snapshots.
- Stronger: stream each scan to a **WORM / object-locked bucket** (e.g. S3
  Object Lock) or an external log service (Logtail/Datadog). An outside record
  that matches our DB is strong evidence.

### D. Periodic cryptographic timestamping *(gold standard — later)*
Hash the day's scan log and anchor that hash somewhere public/immutable
(OpenTimestamps, a git commit, a public post). Proves the data existed at a
given time and was not backdated. Overkill pre-scale; the endgame for formal
verification.

### E. Retain raw corroborating evidence per scan
Hashed IP, full UA, Vercel edge region, precise timestamp. Thousands of
*plausibly diverse* raw records are hard to fabricate convincingly and easy to
spot-audit. (Mind retention/privacy — see below.)

### F. Transparency & documented methodology *(cheap credibility)*
- Give brands **live read-only access** to their own numbers (brand dashboards
  already do this — they see what we see).
- Publish a **measurement methodology**: what counts as one impression, the
  dedup window, bot-exclusion rules (align with IAB definitions / IAB bots &
  spiders list). Formal MRC accreditation is overkill for a local platform, but
  adopting IAB-style definitions buys real credibility.

## Compliance / privacy (separate, more immediate)

We collect **IP → geolocation, device, and per-visitor IDs** from end users who
scan. This triggers GDPR/CCPA-style obligations:
- Add a short **privacy disclosure** on the sleeve/scan page (what we collect,
  why, retention). Currently missing.
- Define a **retention policy** for raw scan evidence.
- We already hash IPs (`sessionHash`) rather than storing them raw — keep that;
  it reduces exposure.

## Recommended phasing

- **Phase 1 (pre-launch trust):** **A + B + F** — converts analytics from
  self-reported to defensible, plus a privacy line on the sleeve page.
- **Phase 2 (a brand demands verification):** **C** (external/WORM mirror) + **E**.
- **Phase 3 (scale / formal audit):** **D** (cryptographic timestamping),
  IAB/MRC alignment.

## Open decisions (resolve before implementing)

- Nonce TTL and single-use storage mechanism.
- Keep mutable dashboard tables *plus* immutable log, or make the log primary?
- Raw-evidence retention window (privacy vs. audit tradeoff).
- Which external mirror (Vercel logs only vs. S3 Object Lock vs. log service).
