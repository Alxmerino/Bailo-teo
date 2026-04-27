# BailoTeo — Deployment Guide

## Prerequisites

```bash
npm install -g supabase
# Cloudflare account (free) — cloudflare.com
# Supabase account (free) — supabase.com
```

---

## 1. Supabase Cloud Project

1. Go to [supabase.com](https://supabase.com) → New project
2. Note your **Project URL** and **anon key** (Settings → API)
3. Note your **Project Ref** (Settings → General — looks like `abcdefghijklmnop`)

### Link local project to cloud

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

### Push migrations to production

```bash
supabase db push
```

This applies `0001_initial.sql` (schema + RLS + functions) to the cloud DB.

---

## 2. VAPID Keys (Web Push)

Generate once and save somewhere safe — you cannot recover the private key later.

```bash
npx web-push generate-vapid-keys
```

Output:
```
Public Key:  BAxxxxxx...
Private Key: xxxxxxxx...
```

---

## 3. Deploy Edge Function

```bash
supabase functions deploy send-reminders --project-ref YOUR_PROJECT_REF
```

### Set Edge Function secrets

```bash
supabase secrets set \
  VAPID_PUBLIC_KEY="YOUR_VAPID_PUBLIC_KEY" \
  VAPID_PRIVATE_KEY="YOUR_VAPID_PRIVATE_KEY" \
  VAPID_SUBJECT="mailto:you@example.com" \
  --project-ref YOUR_PROJECT_REF
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.

---

## 4. Schedule Push Reminders (pg_cron)

### Enable extensions first (Dashboard UI — cannot be done via SQL)

1. Supabase Dashboard → **Database** → **Extensions**
2. Search `pg_cron` → **Enable**
3. Search `pg_net` → **Enable**

Both must show as enabled before running the SQL below.

### Schedule the cron job (SQL Editor)

In the Supabase dashboard → **SQL Editor**, run:

```sql
SELECT cron.schedule(
  'send-reminders',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

Replace `YOUR_PROJECT_REF` and `YOUR_SERVICE_ROLE_KEY` (Settings → API → service_role key).

### Verify cron is running

```sql
SELECT * FROM cron.job;
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

---

## 5. Cloudflare Pages Deployment

### Option A — Connect GitHub (recommended)

1. Push repo to GitHub
2. Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git
3. Select repo, set:
   - **Build command**: `pnpm build`
   - **Build output directory**: `apps/web/dist`
   - **Root directory**: `/` (monorepo root)

### Option B — Direct upload (no GitHub)

```bash
pnpm build
npx wrangler pages deploy apps/web/dist --project-name bailoteo
```

### Environment variables in Cloudflare Pages

Dashboard → Pages → bailoteo → Settings → Environment variables → Production:

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://YOUR_PROJECT_REF.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | anon key from Supabase Settings → API |
| `VITE_VAPID_PUBLIC_KEY` | public key from step 2 |

> Add these to both **Production** and **Preview** environments.

---

## 6. PWA Icons

Icons must exist before the app is installable as a PWA.

Place in `apps/web/public/icons/`:
- `icon-192.png` — 192×192px
- `icon-512.png` — 512×512px  
- `badge-72.png` — 72×72px (optional, for push notification badge)

Quick generation: [favicon.io](https://favicon.io) or [maskable.app](https://maskable.app)

---

## 7. Custom Domain (optional)

Cloudflare Pages → bailoteo → Custom domains → Add domain.

Update Supabase auth redirect URLs (Authentication → URL Configuration):
```
https://yourdomain.com
```

Update `supabase/config.toml` for future local dev:
```toml
[auth]
additional_redirect_urls = ["https://yourdomain.com"]
```

---

## 8. Prevent Supabase Inactivity Pause

Free tier projects pause after 7 days of inactivity. Active newborn tracking prevents this naturally. If needed, enable **no pause** on paid tier or use a simple uptime monitor (UptimeRobot free tier pinging your Supabase URL every 5 minutes).

---

## Post-Deploy Checklist

- [ ] `supabase db push` succeeded — check Tables in Dashboard
- [ ] Edge Function deployed — Dashboard → Edge Functions → send-reminders
- [ ] Secrets set — Dashboard → Edge Functions → Manage secrets
- [ ] pg_cron scheduled — `SELECT * FROM cron.job` returns 1 row
- [ ] Cloudflare env vars set (all 3)
- [ ] Icons in `public/icons/` — PWA installable
- [ ] Test signup on prod URL
- [ ] Install as PWA on iOS (Share → Add to Home Screen) to test push

---

## Local Dev Reference

```bash
pnpm db:start          # start Supabase docker
pnpm dev               # start Vite dev server
pnpm db:reset          # reset DB + re-apply migrations
pnpm db:stop           # stop Supabase docker
pnpm db:types          # regenerate TypeScript types from DB schema

# Test Edge Function locally
supabase functions serve send-reminders
curl http://localhost:54321/functions/v1/send-reminders
```
