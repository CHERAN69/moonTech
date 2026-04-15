# ClosePilot AI — Setup Guide

## What's Built
This is your complete MVP codebase — a production-quality Next.js 14 application.

**Pages:** Landing, Login, Signup, Dashboard, ReconcileAI, CloseOS, Reports, Settings  
**API Routes:** Reconcile engine, AI analyze, Stripe checkout + webhook  
**Core Engine:** 3-pass matching algorithm (exact → fuzzy AI → anomaly detection)  
**AI Layer:** OpenAI GPT-4o-mini for anomaly explanations, GL suggestions, journal entry drafting, CFO briefing  
**Auth:** Supabase Auth with middleware protection  
**Database:** Complete PostgreSQL schema with RLS  

---

## Step 1 — Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your keys:

```bash
cp .env.local.example .env.local
```

Then open `.env.local` and fill in:

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role key |
| `OPENAI_API_KEY` | platform.openai.com → API keys |
| `STRIPE_SECRET_KEY` | dashboard.stripe.com → Developers → API keys |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Same Stripe page |

---

## Step 2 — Run the Database Schema

1. Open Supabase Dashboard → SQL Editor
2. Copy the entire contents of `supabase/migrations/001_core_schema.sql`
3. Paste it into the SQL Editor
4. Click **Run**

You should see: "Success. No rows returned."

---

## Step 3 — Create Stripe Products (Optional for testing)

1. Go to stripe.com → Products → Add Product
2. Create 3 products: Starter ($499/mo), Growth ($1,499/mo), Agency ($2,999/mo)
3. Copy the Price IDs into `.env.local`

For local testing you can leave the Stripe env vars empty — the app works fine without billing.

---

## Step 4 — Install and Run

```bash
npm install
npm run dev
```

Open **http://localhost:3000** — you'll see the landing page.  
Go to **http://localhost:3000/signup** to create your first account.

---

## Step 5 — Deploy to Vercel

1. Push this folder to a new GitHub repo
2. Go to vercel.com → New Project → Import your repo
3. Add all your `.env.local` variables as Vercel Environment Variables
4. Deploy — done.

---

## File Structure

```
src/
├── app/
│   ├── page.tsx              ← Landing page
│   ├── login/page.tsx        ← Login
│   ├── signup/page.tsx       ← Signup
│   ├── dashboard/page.tsx    ← Main dashboard (Close Confidence, AI CFO Briefing)
│   ├── reconcile/
│   │   ├── page.tsx          ← All reconciliation runs
│   │   ├── new/page.tsx      ← Upload wizard (3-step)
│   │   └── [id]/page.tsx     ← Results: matched/unmatched/flagged/AI explanations
│   ├── close/page.tsx        ← CloseOS: checklist + journal entries
│   ├── reports/page.tsx      ← P&L, board pack, reports
│   ├── settings/page.tsx     ← Profile, billing, integrations, team
│   └── api/
│       ├── reconcile/        ← POST: run reconciliation, GET: list sessions
│       ├── analyze/          ← POST: AI query, CFO briefing, journal draft
│       └── stripe/           ← Checkout + webhook handlers
├── lib/
│   ├── matching/
│   │   ├── engine.ts         ← 3-pass matching algorithm (Jaro-Winkler similarity)
│   │   └── csv-parser.ts     ← Universal CSV parser (auto-detects any format)
│   ├── openai/
│   │   └── analyze.ts        ← All OpenAI calls: explanations, GL, journal, CFO
│   └── supabase/
│       ├── client.ts         ← Browser client
│       └── server.ts         ← Server-side client
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx       ← Navigation sidebar
│   │   └── TopBar.tsx        ← Header with Close Score badge
│   └── dashboard/
│       ├── CloseConfidenceGauge.tsx
│       ├── CFOBriefingCard.tsx
│       ├── MetricCard.tsx
│       ├── RecentReconciliations.tsx
│       └── QuickActions.tsx
├── types/index.ts            ← All TypeScript types
└── middleware.ts             ← Auth route protection
supabase/
└── migrations/
    └── 001_core_schema.sql   ← Full PostgreSQL schema with RLS
```

---

## What to Build Next (Phase 2)

1. **QuickBooks sync** — Connect to QBO API for bi-directional journal entry sync
2. **Plaid bank feed** — Replace CSV upload with live bank connection
3. **Cash flow forecasting** — 13-week AI forecast using AR/AP data
4. **Board pack PDF export** — One-click board-ready financial package
5. **Multi-client firm dashboard** — Agency tier with white-label support

---

Built with ClosePilot AI · April 2026
