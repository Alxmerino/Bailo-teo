import { useEvents, useActiveSession, useReminderSettings } from '@/hooks/useEvents'
import { useAuth } from '@/contexts/AuthContext'
import { relativeTime, formatTime } from '@/lib/time'
import type { BailoteoEvent, BreastfeedData, BottleData } from '@bailoteo/shared'

function describeFeed(e: BailoteoEvent): string {
  switch (e.type) {
    case 'breastfeed': return (e.data as BreastfeedData).sides ?? 'breastfeed'
    case 'bottle': {
      const d = e.data as BottleData
      return `${d.oz} oz`
    }
    default: return e.type
  }
}

export default function LastEventStrip() {
  const { family } = useAuth()
  const { data: events = [] } = useEvents(2)
  const { data: activeSession } = useActiveSession()
  const { data: reminderSettings } = useReminderSettings()
  const showNextEvent = localStorage.getItem('bailoteo_show_next_event') === 'true'
  const babyName = family?.baby_name ?? 'Baby'

  const lastFeed = events.find((e) =>
    (e.type === 'breastfeed' || e.type === 'bottle') && !e.deleted_at
  )

  const lastWake = events.find((e) =>
    e.type === 'sleep' && e.ended_at && !e.deleted_at
  )

  const showWake = !!(lastWake && !activeSession)
  const both = !!(lastFeed && showWake)

  const nextFeedAt = showNextEvent && reminderSettings && lastFeed
    ? new Date(new Date(lastFeed.started_at).getTime() + reminderSettings.feed_threshold_min * 60000)
    : null

  const nextSleepAt = showNextEvent && reminderSettings && lastWake
    ? new Date(new Date(lastWake.ended_at!).getTime() + reminderSettings.sleep_threshold_min * 60000)
    : null

  if (!lastFeed && !showWake) return null

  return (
    <div className={`mx-4 mt-3 gap-2 ${both ? 'grid grid-cols-2' : 'flex'}`}>
      {lastFeed && (
        <div className="flex-1 rounded-xl bg-secondary/60 px-3 py-3">
          <p className="text-xs text-muted-foreground">Last feed</p>
          <p className="mt-1 text-sm font-semibold">
            {lastFeed.type === 'breastfeed' ? '🤱' : '🍼'} {describeFeed(lastFeed)}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">{relativeTime(lastFeed.started_at)}</p>
          {nextFeedAt && (
            <p className="mt-0.5 text-xs text-primary/70">Next ~{formatTime(nextFeedAt)}</p>
          )}
        </div>
      )}

      {showWake && (
        <div className="flex-1 rounded-xl bg-secondary/60 px-3 py-3">
          <p className="text-xs text-muted-foreground">{babyName} woke up</p>
          <p className="mt-1 text-sm font-semibold">☀️ {formatTime(lastWake!.ended_at!)}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{relativeTime(lastWake!.ended_at!)}</p>
          {nextSleepAt && (
            <p className="mt-0.5 text-xs text-primary/70">Next sleep ~{formatTime(nextSleepAt)}</p>
          )}
        </div>
      )}
    </div>
  )
}
