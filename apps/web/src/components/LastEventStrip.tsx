import { useEvents } from '@/hooks/useEvents'
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
  const { data: events = [] } = useEvents(2)

  const lastFeed = events.find((e) =>
    (e.type === 'breastfeed' || e.type === 'bottle') && !e.deleted_at
  )

  const lastWake = events.find((e) =>
    e.type === 'sleep' && e.ended_at && !e.deleted_at
  )

  if (!lastFeed && !lastWake) return null

  return (
    <div className="mx-4 mt-3 space-y-2">
      {lastFeed && (
        <div className="rounded-xl bg-secondary/60 px-4 py-3">
          <p className="text-xs text-muted-foreground">Last feed</p>
          <p className="mt-0.5 text-sm font-medium">
            {lastFeed.type === 'breastfeed' ? '🤱' : '🍼'} {describeFeed(lastFeed)}
            <span className="text-muted-foreground font-normal">
              {' '}· {relativeTime(lastFeed.started_at)}
              {lastFeed.profile?.display_name ? ` by ${lastFeed.profile.display_name}` : ''}
            </span>
          </p>
        </div>
      )}

      {lastWake && (
        <div className="rounded-xl bg-secondary/60 px-4 py-3">
          <p className="text-xs text-muted-foreground">Last woke up</p>
          <p className="mt-0.5 text-sm font-medium">
            ☀️ {formatTime(lastWake.ended_at!)}
            <span className="text-muted-foreground font-normal">
              {' '}· {relativeTime(lastWake.ended_at!)}
            </span>
          </p>
        </div>
      )}
    </div>
  )
}
