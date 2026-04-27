# BailoTeo

A mobile-first baby activity tracker PWA built for new parents and caregivers. Dark mode by default. Designed for one-handed use.

## Features

- **Parent + caregiver auth** — parents sign in with email/password; caregivers join via invite code + 4-digit PIN
- **Activity logging** — sleep, breastfeed (side), bottle, diaper, bath, pump, and free-text notes
- **Sleep tracking** — log when baby went to sleep with a time picker; QuickLogBar toggles to "Wake Up" while sleeping
- **Edit events** — change the time or details of any logged event from the activity feed
- **Invite links** — generate shareable URLs that prefill the invite code on the join page
- **Push notifications** — feed and sleep reminders via Web Push (Supabase Edge Function + pg_cron)
- **Offline support** — mutations queue to IndexedDB and flush when back online
- **Insights** — avg sleep, feed intervals, diaper counts, caregiver activity
- **CSV export** — download last 90 days of events
- **PWA** — installable, works offline, custom icons

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Vite + React 18 + TypeScript |
| Styling | Tailwind CSS (dark-first) + shadcn/ui |
| State | TanStack Query v5 + Supabase Realtime |
| Auth | Supabase Auth (email/pw + synthetic caregiver accounts) |
| Database | Supabase Postgres + RLS |
| Push | Web Push VAPID via vite-plugin-pwa (Workbox injectManifest) |
| Offline | IndexedDB via `idb` |
| Hosting | Cloudflare Pages |
| Cron | Supabase pg_cron → Edge Function |

See [ARCHITECTURE.md](./ARCHITECTURE.md) for a detailed breakdown of data models, auth flow, offline strategy, and security decisions.

## Project Structure

```
.
├── apps/web/          # Vite + React PWA
│   ├── src/
│   │   ├── components/   # UI components + bottom sheets
│   │   ├── contexts/     # AuthContext
│   │   ├── hooks/        # useEvents, useActiveSession, etc.
│   │   ├── lib/          # supabase, auth, push, offline queue, time utils
│   │   ├── routes/       # Home, Feed, Insights, Settings, Login, Signup, Join
│   │   └── sw/           # Workbox service worker
│   └── public/icons/     # PWA icons (192, 512, badge-72)
├── packages/shared/   # Shared TypeScript types + Zod schemas
├── supabase/
│   ├── migrations/    # Postgres schema + RLS
│   └── functions/     # send-reminders Edge Function
└── DEPLOY.md          # Full deployment guide
```

## Development

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (for local Supabase)
- Supabase CLI

### Setup

```bash
# Install dependencies
pnpm install

# Start local Supabase (Docker required)
pnpm db:start

# Copy env and fill in values from `supabase status` output
cp apps/web/.env.local.example apps/web/.env.local

# Start dev server
pnpm dev
```

### Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Vite dev server |
| `pnpm build` | Production build (tsc + vite) |
| `pnpm db:start` | Start local Supabase stack |
| `pnpm db:stop` | Stop local Supabase stack |

## Deployment

Full step-by-step instructions including Supabase setup, VAPID key generation, Edge Function deployment, pg_cron configuration, and Cloudflare Pages hosting:

**[→ DEPLOY.md](./DEPLOY.md)**

## Notes

- **iOS push notifications** require iOS 16.4+ and the app must be installed via "Add to Home Screen"
- Caregiver accounts use a synthetic email pattern (`slug@familyid.bailoteo.local`) so no real email is needed — the invite code + PIN are the only credentials
- All events use soft deletes (`deleted_at`) — nothing is permanently removed from the database
- The anon key is intentionally public (embedded in the JS bundle); Postgres RLS enforces all access control
