import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// @ts-ignore
import webPush from 'npm:web-push'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!
const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@bailoteo.app'

webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

const supabase = createClient(supabaseUrl, supabaseServiceKey)

Deno.serve(async () => {
  try {
    await Promise.all([sendFeedReminders(), sendSleepReminders()])
    return new Response('OK', { status: 200 })
  } catch (err) {
    console.error(err)
    return new Response('Error', { status: 500 })
  }
})

async function sendFeedReminders() {
  const { data: settings } = await supabase
    .from('reminder_settings')
    .select('family_id, feed_threshold_min')
    .eq('enabled', true)

  if (!settings?.length) return

  await Promise.all(
    settings.map(async (s) => {
      const { data: lastFeed } = await supabase
        .from('events')
        .select('started_at, ended_at')
        .eq('family_id', s.family_id)
        .in('type', ['breastfeed', 'bottle'])
        .is('deleted_at', null)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!lastFeed) return

      const feedTime = new Date(lastFeed.ended_at ?? lastFeed.started_at)
      const minutesSince = (Date.now() - feedTime.getTime()) / 60_000

      if (minutesSince >= s.feed_threshold_min) {
        const label = fmtDuration(minutesSince)
        await sendToFamily(s.family_id, {
          title: 'Feed reminder 🍼',
          body: `Last feed was ${label} ago`,
          data: { type: 'feed_reminder', url: '/' },
        })
      }
    })
  )
}

async function sendSleepReminders() {
  const { data: settings } = await supabase
    .from('reminder_settings')
    .select('family_id, sleep_threshold_min')
    .eq('enabled', true)

  if (!settings?.length) return

  await Promise.all(
    settings.map(async (s) => {
      const { data: active } = await supabase
        .from('events')
        .select('started_at')
        .eq('family_id', s.family_id)
        .eq('type', 'sleep')
        .is('ended_at', null)
        .is('deleted_at', null)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!active) return

      const minutesAsleep = (Date.now() - new Date(active.started_at).getTime()) / 60_000

      if (minutesAsleep >= s.sleep_threshold_min) {
        const label = fmtDuration(minutesAsleep)
        await sendToFamily(s.family_id, {
          title: 'Sleep alert 😴',
          body: `Baby sleeping for ${label}`,
          data: { type: 'sleep_reminder', url: '/' },
        })
      }
    })
  )
}

async function sendToFamily(
  familyId: string,
  notification: { title: string; body: string; data?: Record<string, unknown> }
) {
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('family_id', familyId)

  if (!subs?.length) return

  const payload = JSON.stringify({
    title: notification.title,
    body: notification.body,
    data: notification.data,
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
  })

  await Promise.allSettled(
    subs.map((sub) =>
      webPush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      )
    )
  )
}

function fmtDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = Math.floor(minutes % 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}
