import { useEffect, useState } from 'react'
import { differenceInMinutes } from 'date-fns'
import { useAuth } from '@/contexts/AuthContext'
import { useEvents, useActiveSession } from '@/hooks/useEvents'
import { supabase } from '@/lib/supabase'
import type { ReminderSettings } from '@bailoteo/shared'

export default function HomeReminders() {
  const { family } = useAuth()
  const { data: events = [] } = useEvents(2)
  const { data: activeSession } = useActiveSession()
  const [settings, setSettings] = useState<ReminderSettings | null>(null)

  useEffect(() => {
    if (!family) return
    supabase
      .from('reminder_settings')
      .select('*')
      .eq('family_id', family.id)
      .maybeSingle()
      .then(({ data }) => { if (data) setSettings(data as ReminderSettings) })
  }, [family?.id])

  if (!settings?.enabled || activeSession) return null

  const babyName = family?.baby_name ?? 'Baby'
  const now = new Date()
  const reminders: { emoji: string; text: string }[] = []

  // Feed reminder
  const lastFeed = events.find((e) =>
    (e.type === 'breastfeed' || e.type === 'bottle') && !e.deleted_at
  )
  if (lastFeed) {
    const elapsed = differenceInMinutes(now, new Date(lastFeed.started_at))
    const warnAt = settings.feed_threshold_min - 30
    if (elapsed >= warnAt) {
      const remaining = settings.feed_threshold_min - elapsed
      reminders.push({
        emoji: '🍼',
        text: remaining > 0
          ? `${babyName} might be hungry in the next 30m`
          : `${babyName} may be due for a feed`,
      })
    }
  }

  // Nap reminder
  const lastWake = events.find((e) =>
    e.type === 'sleep' && e.ended_at && !e.deleted_at
  )
  if (lastWake?.ended_at) {
    const elapsed = differenceInMinutes(now, new Date(lastWake.ended_at))
    const warnAt = settings.sleep_threshold_min - 30
    if (elapsed >= warnAt) {
      const remaining = settings.sleep_threshold_min - elapsed
      reminders.push({
        emoji: '😴',
        text: remaining > 0
          ? `${babyName} might need a nap in the next 30m`
          : `${babyName} may be ready for a nap`,
      })
    }
  }

  if (!reminders.length) return null

  return (
    <div className="mx-4 mt-3 space-y-2">
      {reminders.map((r, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3"
        >
          <span className="text-lg">{r.emoji}</span>
          <p className="text-sm text-amber-300">{r.text}</p>
        </div>
      ))}
    </div>
  )
}
