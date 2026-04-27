# BailoTeo — Architecture & Product Decisions

> Baby activity tracking PWA. Mobile-first, dark mode default, one-handed use. Free tier only.

---

## Stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend | Vite + React + TypeScript | No SSR needed. Smaller bundle vs Next.js. vite-plugin-pwa for Workbox. |
| UI | Tailwind CSS + shadcn/ui | Dark-default trivial. Big tap targets via utilities. |
| Backend | Supabase | Auth + Postgres + Realtime + Edge Functions + pg_cron. One free tier. |
| Hosting | Cloudflare Pages | Unlimited bandwidth free. Vercel 100GB cap. |
| Push | Web Push API + VAPID | Free always. Server-sent via Supabase Edge Function on cron schedule. |
| Offline | idb (IndexedDB queue) | Queue mutations, flush on `online` event. Supabase client has no native offline. |
| Package manager | pnpm | |

---

## Repo Layout (Monorepo)

```
bailoteo/
  apps/
    web/                      vite + react + ts + tailwind + shadcn/ui
      src/
        routes/
          /login              parent email/pw OR caregiver invite code + name + PIN
          /signup             parent signup → creates family + profile
          /join/:code?        caregiver flow, prefill code from URL
          /                   Home (active session + quick-log)
          /feed               chronological event list, day grouping
          /insights           7/14/30d window stats
          /settings           invite codes, reminder thresholds, export, theme
        components/
          QuickLogBar         6 big buttons (2×3): Sleep | Feed | Bottle | Diaper | Bath | Note
          ActiveSessionCard   "Sleeping — 1h 23m" + End button, live timer
          LastEventStrip      "Last fed 2h 10m ago (L 8m, R 6m) by Rene"
          EventCard           type icon, time, logged-by, details, edit/delete
          EventEditSheet      bottom sheet for inline edit
          SleepSheet          start/end (end auto-calculated)
          BreastfeedSheet     L/R timers, "Both" toggle
          BottleSheet         oz numpad
          DiaperSheet         poop / wet / both selector
          BathSheet           textarea for notes (optional)
          NoteSheet           textarea
          InsightsCard        per-stat card
          DayTimeline         horizontal bar of day's events
        lib/
          supabase.ts
          auth.ts             parent + caregiver flows
          offline-queue.ts    idb queue + online listener flush
          push.ts             VAPID subscription management
          insights.ts         pure compute functions
          time.ts             duration/relative formatting utilities
        sw/
          service-worker.ts   workbox precache + push handler + notificationclick
      public/
        manifest.json
  supabase/
    migrations/               SQL migration files
    functions/
      send-reminders/         cron-triggered Edge Function for push notifications
    config.toml
  packages/
    shared/                   types, zod schemas, insight fns (shared web ↔ edge fn)
  package.json
  pnpm-workspace.yaml
```

---

## Auth Model

### Parent
- Supabase email + password signup
- Creates `families` row + own `profiles` row (`is_parent = true`)
- Generates invite codes for caregivers

### Caregiver
- Enters invite code on join screen → validates code → picks display name + 4-digit PIN
- Auth stored as synthetic Supabase user:
  - email: `${slug(display_name)}@${family_id}.bailoteo.local`
  - password: 4-digit PIN (hashed by Supabase Auth)
- Session persisted in localStorage

### Caregiver re-login (new device)
- Enter invite code (reusable — serves as family identifier) + display name + 4-digit PIN
- App reconstructs synthetic email → Supabase `signInWithPassword`
- Finds matching `profiles` row by `login_slug` + `family_id`

### Permissions
All users (parent + caregivers) have equal permissions — anyone can log/view/edit/delete all events.

---

## Database Schema

```sql
families (
  id         uuid pk default gen_random_uuid(),
  name       text,
  timezone   text default 'UTC',              -- single TZ per family
  created_at timestamptz default now()
)

profiles (
  id          uuid pk references auth.users(id) on delete cascade,
  family_id   uuid not null references families(id),
  display_name text not null,
  login_slug  text not null,                  -- slugified display_name, unique per family
  is_parent   bool default false,
  created_at  timestamptz default now(),
  unique (family_id, login_slug)
)

invite_codes (
  code        text pk,                        -- 4-6 char alphanumeric, no ambiguous chars
  family_id   uuid not null references families(id),
  created_by  uuid references profiles(id),
  expires_at  timestamptz,                    -- null = permanent family join code
  uses        int default 0,
  created_at  timestamptz default now()
)

events (
  id          uuid pk default gen_random_uuid(),
  family_id   uuid not null references families(id),
  logged_by   uuid not null references profiles(id),
  type        text not null check (type in ('sleep','breastfeed','bottle','note','diaper','bath')),
  started_at  timestamptz not null,
  ended_at    timestamptz,                    -- null = active session (sleep in progress)
  data        jsonb not null default '{}',   -- shape per type (see below)
  deleted_at  timestamptz,                   -- soft delete
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
)

-- Indexes
create index on events (family_id, started_at desc);
create index on events (family_id, type, started_at desc);
create index on events (family_id) where ended_at is null;     -- active sessions
create index on events (family_id) where deleted_at is null;   -- non-deleted filter

push_subscriptions (
  id          uuid pk default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  family_id   uuid not null references families(id),
  endpoint    text unique not null,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz default now()
)

reminder_settings (
  family_id            uuid pk references families(id),
  feed_threshold_min   int default 120,       -- minutes since last feed
  sleep_threshold_min  int default 120,       -- minutes active sleep before alert
  enabled              bool default true
)
```

### `events.data` shapes

| type | shape |
|---|---|
| `sleep` | `{}` (duration = ended_at - started_at) |
| `breastfeed` | `{ left_min: number, right_min: number }` |
| `bottle` | `{ oz: number }` |
| `note` | `{ text: string }` |
| `diaper` | `{ kind: "poop" \| "wet" \| "both" }` |
| `bath` | `{ notes?: string }` |

### RLS Policy (all tables)
```sql
family_id = (select family_id from profiles where id = auth.uid())
```

---

## Push Notifications

- **VAPID keys** stored in Supabase secrets
- **Trigger**: `pg_cron` every 15 min → calls Edge Function `send-reminders`
- **Logic**:
  - Query families where `now() - last_feed_time > feed_threshold_min`
  - Query families where active sleep `duration > sleep_threshold_min`
  - `reminder_settings.enabled = true`
  - Send Web Push to all `push_subscriptions` for matching families
- **iOS requirement**: Web Push only works on iOS 16.4+ AND after "Add to Home Screen" install. Must surface in onboarding.

---

## Offline Support

1. Mutation attempted → write to IndexedDB queue (idb)
2. If online: flush immediately
3. If offline: queue persists until `window.addEventListener('online', flush)`
4. On flush: replay mutations in order → Supabase upserts
5. Conflicts: `updated_at` timestamp wins (last-write-wins)

---

## Insights (computed client-side)

Window: user-selectable 7 / 14 / 30 days.

| Insight | Computation |
|---|---|
| Avg time of first nap per day | `min(started_at)` per day for sleep events, avg across window |
| Typical nap duration range | p25–p75 of `ended_at - started_at` for sleep |
| Avg time between feeds | diff between consecutive feed events, avg |
| Avg total sleep per day | sum durations per day, avg across window |
| Longest sleep stretch | `max(ended_at - started_at)` |
| Most active logging time | hour-bucket histogram per caregiver, find peak |
| Diaper frequency | avg per day, ratio poop/wet/both |
| Feed type split | breastfeed vs bottle % |

Updates near-real-time via Supabase Realtime subscription on `events` table.

---

## Environments

| Env | DB | Notes |
|---|---|---|
| Local dev | Supabase local docker (`supabase start`) | `supabase/config.toml` configures local |
| Production | Supabase cloud project | Env vars via `.env.production` / CF Pages secrets |

### Env vars needed
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_VAPID_PUBLIC_KEY
# Edge Function (Supabase secrets, not in .env):
VAPID_PRIVATE_KEY
VAPID_SUBJECT
```

---

## Free Tier Risk Audit

| Limit | Estimate | Status |
|---|---|---|
| Supabase DB 500MB | ~750KB/yr at 10 events/day | ✅ |
| Supabase Realtime 2M msg/mo | ~900 msg/mo (10 ev/day × 3 users × 30d) | ✅ |
| Supabase Edge Fn 500k inv/mo | 2,880 (cron q15m) | ✅ |
| Supabase Auth 50k MAU | 2–5 users | ✅ |
| Cloudflare Pages bandwidth | Unlimited | ✅ |
| Cloudflare Pages builds/mo | 500 | ✅ |
| Web Push | Free | ✅ |
| **Supabase inactivity pause** | 7d no activity → project pauses | ⚠️ daily newborn use = fine |
| **iOS Web Push** | Requires iOS 16.4+ + PWA installed | ⚠️ surface in onboarding |

---

## Build Order

1. Init monorepo (pnpm workspaces, shared package)
2. Supabase migrations + RLS policies + local docker setup
3. Vite app scaffold + Tailwind dark default + shadcn/ui
4. Auth flows (parent signup, caregiver join, caregiver re-login)
5. QuickLogBar + per-event sheets
6. Home screen (active session card + last event strip)
7. Feed page (chronological, day-grouped, edit/delete)
8. Insights page (window selector + stat cards)
9. Settings page (invite codes, thresholds, CSV export)
10. PWA manifest + service worker (workbox + push handler)
11. Offline queue (idb)
12. Edge Function `send-reminders` + pg_cron setup
13. Cloudflare Pages deploy config

---

## Notes for Sleep-Deprived UX

- Dark mode default (system override available in settings)
- All primary actions reachable in ≤2 taps from home
- Active session always visible on home screen with live timer
- No required typing except notes — tap-only for all event types
- "Wake" replaces "Sleep" button when sleep is active (big, red, unmissable)
