# CLAUDE.md — BailoTeo Agent Guide

## Build & Verify

```bash
pnpm install          # install all workspace deps
pnpm build            # tsc -b && vite build — must pass before any commit
pnpm dev              # dev server at http://localhost:5173
pnpm db:start         # local Supabase (Docker required)
pnpm db:stop
```

**Always run `pnpm build` before committing.** There is no test suite — the build is the gate.

---

## Monorepo Layout

```
apps/web/src/
  App.tsx                   # router + QueryClient + AuthProvider
  components/
    AppLayout.tsx            # Outlet + BottomNav wrapper
    BottomNav.tsx            # 4-tab fixed nav (Home/Feed/Insights/Settings)
    ActiveSessionCard.tsx    # live sleep card shown on Home when sleep active
    EventCard.tsx            # feed row — handles all event types + edit/delete menu
    LastEventStrip.tsx       # last feed/bottle summary on Home
    QuickLogBar.tsx          # 4-col grid of action buttons (sleep toggle + 6 event types)
    sheets/
      BottomSheet.tsx        # base sheet component (z-[60], above BottomNav z-50)
      SleepSheet.tsx         # time picker + notes
      BreastfeedSheet.tsx    # side (left/right/both) + time + notes
      PumpSheet.tsx          # side + oz + time
      BottleSheet.tsx        # oz + time + notes
      DiaperSheet.tsx        # kind (wet/poop/both) + time + notes
      BathSheet.tsx          # time + notes
      NoteSheet.tsx          # text
      EditEventSheet.tsx     # generic edit for all event types
  contexts/
    AuthContext.tsx          # session + profile + family state; refreshProfile()
  hooks/
    useEvents.ts             # useEvents, useActiveSession, useLogEvent, useUpdateEvent, useDeleteEvent
  lib/
    supabase.ts              # singleton Supabase client
    auth.ts                  # signUpParent, signInParent, signUpCaregiver, signInCaregiver, signOut
    push.ts                  # subscribeToPush, unsubscribeFromPush
    offline-queue.ts         # IndexedDB queue for offline mutations
    time.ts                  # formatDuration, relativeTime, formatTime, toLocalDatetimeInput, etc.
    utils.ts                 # cn() tailwind merge helper
  routes/
    Home.tsx                 # ActiveSessionCard + LastEventStrip + QuickLogBar
    Feed.tsx                 # grouped event list + EditEventSheet
    Insights.tsx             # stats view
    Settings.tsx             # invite codes, push, reminders, export, sign out
    Login.tsx                # parent (email/pw) + caregiver (code+name+PIN) tabs
    Signup.tsx               # parent account creation
    Join.tsx                 # caregiver join; reads /join/:code? path param
  sw/
    service-worker.ts        # Workbox injectManifest SW (excluded from main tsconfig)

packages/shared/src/
  types.ts                   # EventType, FeedSide, DiaperKind, all Data interfaces, BailoteoEvent
  schemas.ts                 # Zod schemas for all event data + auth forms
  insights.ts                # computeInsights() pure function
  index.ts                   # re-exports everything

supabase/
  config.toml                # project_id = "bailoteo", major_version = 17
  migrations/
    0001_initial.sql         # full schema: tables, RLS, SECURITY DEFINER functions
    0002_cron.sql            # pg_cron setup instructions (commented SQL, run manually in prod)
  functions/
    send-reminders/index.ts  # Deno edge function, reads VAPID_* from Supabase secrets
```

---

## Data Model

### Key tables
- `families` — id, name, timezone
- `profiles` — id (= auth.users.id), family_id, display_name, login_slug, is_parent
- `invite_codes` — code (PK), family_id, expires_at, uses
- `events` — id, family_id, logged_by (profile.id), type, started_at, ended_at, data (jsonb), deleted_at
- `push_subscriptions` — endpoint, p256dh, auth, profile_id, family_id
- `reminder_settings` — family_id (PK), feed_threshold_min, sleep_threshold_min, enabled

### Event types (CHECK constraint)
`sleep | breastfeed | bottle | note | diaper | bath | pump`

Adding a new event type requires:
1. `types.ts` — add to `EventType`, add `XxxData` interface, add to `EventData` union
2. `schemas.ts` — add Zod schema + to `eventTypeSchema`
3. `migrations/` — new migration updating the CHECK constraint
4. SQL in prod: `ALTER TABLE events DROP CONSTRAINT events_type_check; ALTER TABLE events ADD CONSTRAINT events_type_check CHECK (type IN (...));`
5. New `XxxSheet.tsx` in `sheets/`
6. `QuickLogBar.tsx` — add button
7. `EventCard.tsx` — add case in `EventDetail` switch + `TYPE_ICONS` + `TYPE_LABELS`
8. `LastEventStrip.tsx` — add case in `describeEvent` if it's a feed-type event

### Event data shapes
```typescript
SleepData:      { notes?: string }
BreastfeedData: { sides: FeedSide; notes?: string }
PumpData:       { sides: FeedSide; oz?: number }
BottleData:     { oz: number; notes?: string }
DiaperData:     { kind: DiaperKind; notes?: string }
BathData:       { notes?: string }
NoteData:       { text: string }
```

Active sleep = sleep event where `ended_at IS NULL`. Queried by `useActiveSession()`.

---

## Auth Architecture

### Parent login
Standard Supabase email/password. After `signUp`, call `create_parent_profile` RPC — **must have a session** (check `data.session !== null`; if null, email confirmation is still enabled in Supabase Dashboard).

### Caregiver login
Synthetic email: `${slug(displayName)}@${familyId}.bailoteo.local`
Password: `${pin}bt${pin}` (padded — Supabase min password is 6 chars)
Family looked up from `invite_codes` before signup.

### Profile loading
`AuthContext` loads `profiles` + `families` on session start. If profile is null after login, call `refreshProfile()`. This is needed after `signUp` because `onAuthStateChange` may fire before the RPC creates the profile row.

### RLS
All tables RLS-enabled. Key helper: `get_user_family_id()` SECURITY DEFINER — reads `profiles WHERE id = auth.uid()`.
`invite_codes` SELECT policy is `USING (true)` — public read needed for unauthenticated caregiver join flow.

---

## Key Patterns

### Logging an event
```typescript
const logEvent = useLogEvent()
await logEvent.mutateAsync({
  type: 'bath',
  data: { notes: 'optional' },
  started_at: new Date(localDatetimeInputValue).toISOString(), // optional, defaults to now
})
```

### Updating an event
```typescript
const updateEvent = useUpdateEvent()
await updateEvent.mutateAsync({ id: event.id, updates: { started_at, ended_at, data } })
```

### Datetime-local inputs
Use `toLocalDatetimeInput(date: Date): string` from `@/lib/time` to convert a Date to `YYYY-MM-DDTHH:mm` for `<input type="datetime-local">`. Convert back with `new Date(value).toISOString()`.

### Offline
`useLogEvent` / `useUpdateEvent` / `useDeleteEvent` all handle offline automatically via `queueMutation()` → IndexedDB → flushes on `window online` event. No special handling needed in sheets.

### Bottom sheets
All sheets use `<BottomSheet open={bool} onClose={fn} title="..." icon={<Icon />}>`. BottomSheet is `z-[60]`; BottomNav is `z-50`. Always use BottomSheet as wrapper — never raw divs.

### Side selectors (breastfeed/pump)
Use `FeedSide = 'left' | 'right' | 'both'` from `@bailoteo/shared`. Three buttons, one state. Colors: breastfeed = pink-400, pump = purple-400.

---

## Constraints & Gotchas

- **No test suite** — `pnpm build` is the only automated check
- **No CI** — builds and deployments are manual (zip `dist/` → Cloudflare Pages upload)
- **Service worker excluded** from main tsconfig (`"exclude": ["src/sw"]`) — vite-plugin-pwa compiles it separately with `/// <reference lib="webworker" />`
- **VITE_* vars are baked at build time** — changing Cloudflare env vars requires a local rebuild + re-upload
- **Caregiver PIN minimum** — Supabase enforces 6-char min password; PIN is padded as `${pin}bt${pin}` in `auth.ts:pinToPassword()`
- **Email confirmation must be OFF** in Supabase Dashboard → Auth → Providers → Email, or `signUp` returns `session: null` and the `create_parent_profile` RPC will fail (`auth.uid()` = null inside SECURITY DEFINER)
- **pg_cron** must be enabled via Supabase Dashboard UI (Extensions), not via SQL `CREATE EXTENSION` — the extension is pre-loaded
- **Pump/breastfeed `sides` is required** — sheets disable Save until a side is selected
- **Event soft-delete** — never hard-delete events; set `deleted_at`. All queries filter `is('deleted_at', null)`
- **`useActiveSession` polls every 10s** — sleep state is eventually consistent across devices
- **Share URL format** — invite links use path param `/join/:code`, not query string

---

## Supabase SECURITY DEFINER Functions

| Function | Purpose |
|----------|---------|
| `create_parent_profile(display_name, family_name, timezone)` | Creates family + profile + reminder_settings in one transaction |
| `join_family_with_code(code, display_name)` | Validates invite code, creates caregiver profile |
| `generate_invite_code(expires_hours?)` | Generates unique 6-char code, inserts into invite_codes |
| `get_user_family_id()` | Returns family_id for current auth.uid() — used in RLS policies |

---

## Environment Variables

| Var | Where | Notes |
|-----|-------|-------|
| `VITE_SUPABASE_URL` | `.env.local` / `.env.production` | `http://127.0.0.1:54321` local, cloud URL prod |
| `VITE_SUPABASE_ANON_KEY` | `.env.local` / `.env.production` | Public anon key — safe to embed |
| `VITE_VAPID_PUBLIC_KEY` | `.env.local` / `.env.production` | Public VAPID key — safe to embed |
| `VAPID_PUBLIC_KEY` | Supabase secrets | Edge function only |
| `VAPID_PRIVATE_KEY` | Supabase secrets | Edge function only — never commit |
| `VAPID_SUBJECT` | Supabase secrets | `mailto:you@example.com` |

`.env.production` is gitignored. Rebuild locally with correct vars before uploading to Cloudflare.

---

## Deployment Summary

1. `supabase link --project-ref YOUR_REF`
2. `supabase db push` — applies migrations
3. `supabase functions deploy send-reminders`
4. Set secrets: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
5. Enable pg_cron + pg_net via Dashboard → Extensions
6. Run cron SQL from `supabase/migrations/0002_cron.sql` in SQL Editor
7. Fill `apps/web/.env.production`, run `pnpm build`, zip `apps/web/dist/`, upload to Cloudflare Pages

Full details: [DEPLOY.md](./DEPLOY.md)
