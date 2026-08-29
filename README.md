# adgyn

Local advertising on coffee sleeves. Venues place QR codes on their sleeves that link to a branded page with up to 4 local business ads. Customers scan, discover local spots, and click through.

## How It Works

```
┌─────────────┐     QR scan     ┌─────────────────┐     click     ┌──────────────┐
│  Coffee     │ ──────────────> │  Venue Page     │ ────────────> │  Brand Site  │
│  Sleeve     │                 │  (4 ad cards)   │               │              │
└─────────────┘                 └─────────────────┘               └──────────────┘
                                      │
                              tracks scan + click
                                      │
                                      ▼
                               ┌──────────────┐
                               │  Dashboard   │
                               │  (analytics) │
                               └──────────────┘
```

### Roles

- **Host (Venue)** — A coffee shop, café, or any business that serves drinks with sleeves. They place the QR code and earn revenue from the ad placements. _Example: Gratitude Coffee Bar._
- **Guest (Brand)** — A local business that advertises on the sleeve. They buy a placement in a campaign to reach the venue's customers. _Example: Yoga Sol, Jory's Flowers._
- **End User** — The coffee drinker who scans the QR code and sees the ads.

### Campaign Model

A **campaign** is one batch of printed sleeves (typically 300). Each campaign has up to 4 ad slots. When the sleeves run out, a new campaign starts with potentially different advertisers.

- Campaigns are named by batch number (e.g. "Batch 6 — August")
- Each slot has: brand logo, tagline, CTA button, and link
- Hosts set a **revenue target** — the platform calculates price per ad slot

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 (App Router, TypeScript) |
| Styling | Tailwind CSS |
| Database | PostgreSQL (Supabase) |
| ORM | Prisma 7 |
| Auth | Supabase Auth |
| Hosting | Vercel |
| QR Codes | QR Tiger (external) |

## Project Structure

```
src/
├── app/
│   ├── [slug]/              # Venue page (what end users see after scanning)
│   │   ├── page.tsx          # Server component — fetches active campaign
│   │   └── client.tsx        # Client component — renders ad cards, tracks scan
│   ├── api/
│   │   ├── scan/             # POST — records a QR scan with analytics
│   │   └── click/[placementId]/ # GET — server-side redirect, records click
│   ├── dashboard/
│   │   ├── venue/            # Host dashboard — campaign analytics
│   │   │   ├── page.tsx       # Campaign switcher, analytics computation
│   │   │   ├── campaign-dashboard.tsx  # Client component — stats, charts, ranking
│   │   │   └── campaigns/new/ # Campaign builder (feature-flagged)
│   │   └── brand/            # Guest dashboard — placement performance
│   └── login/                # Auth page
├── lib/
│   ├── prisma.ts             # Prisma client singleton
│   ├── analytics.ts          # UA parsing + IP geolocation
│   └── supabase/             # Supabase client helpers
└── generated/prisma/         # Generated Prisma client
```

## Analytics

Every scan and click captures:

| Field | Source |
|-------|--------|
| City, Region, Country | IP geolocation (ip-api.com) |
| Device type | User-Agent parsing |
| OS, Browser | User-Agent parsing |
| New vs Returning | Persistent cookie (`adgyn_vid`, 1 year) |
| Visitor ID | `crypto.randomUUID()` stored in cookie |

Click tracking uses a **server-side redirect** pattern (`/api/click/[placementId]?url=...`) — the click is recorded on the server before redirecting to the brand's site. This is the same pattern used by every major ad network and works reliably across all browsers including privacy-focused ones.

## Feature Flags

| Flag | Description |
|------|-------------|
| `NEXT_PUBLIC_FEATURE_CAMPAIGN_BUILDER` | Enables the "Create Campaign" flow for hosts |

## Data Model

```
Venue ──< Campaign ──< Placement >── Brand
                │           │
                │           └──< Click
                └──< Scan
```

- **Venue**: The host business (name, slug, logo)
- **Campaign**: One batch of sleeves (status: draft/active/completed, revenue target, sleeve count)
- **Placement**: One ad slot in a campaign (brand, tagline, CTA, button color, logo)
- **Scan**: A QR code scan event (visitor, device, location, timestamp)
- **Click**: A CTA button click event (visitor, device, location, timestamp)
- **Brand**: An advertiser business
- **User/Membership**: Auth accounts with venue or brand role

## URLs

| URL | Description |
|-----|-------------|
| `adgyn.vercel.app/[slug]` | Venue page (end user scans QR → lands here) |
| `adgyn.vercel.app/dashboard/venue` | Host dashboard |
| `adgyn.vercel.app/dashboard/brand` | Guest dashboard |
| `adgyn.vercel.app/login` | Sign in |

## Local Development

```bash
# Prerequisites: Node.js 22+, npm
nvm use 22

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Fill in Supabase + database credentials

# Run database migrations
npx prisma migrate dev

# Start dev server
npm run dev
```

## Deployment

Pushes to `main` auto-deploy to Vercel. Environment variables are managed in the Vercel dashboard.
