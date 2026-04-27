-- Enable pg_cron and pg_net extensions
-- (enabled in Supabase cloud via Dashboard > Database > Extensions)
-- For local: these are pre-enabled in supabase/config.toml

-- Schedule the send-reminders Edge Function every 15 minutes
-- Run this AFTER deploying the Edge Function to production
-- Replace {PROJECT_REF} and {SERVICE_ROLE_KEY} with your actual values

-- Example (run in Supabase SQL editor for prod setup):
/*
SELECT cron.schedule(
  'send-reminders',
  '* /15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://{PROJECT_REF}.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer {SERVICE_ROLE_KEY}'
    ),
    body := '{}'::jsonb
  );
  $$
);
*/

-- For local dev: trigger manually via:
-- supabase functions serve send-reminders
-- curl http://localhost:54321/functions/v1/send-reminders
