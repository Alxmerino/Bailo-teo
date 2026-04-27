import { useEvents } from '@/hooks/useEvents'
import { relativeTime, formatDuration } from '@/lib/time'
import type { BailoteoEvent, BreastfeedData, BottleData } from '@bailoteo/shared'

function describeEvent(e: BailoteoEvent): string {
  switch (e.type) {
    case 'breastfeed': {
      const d = e.data as BreastfeedData
      return d.sides ?? 'breastfeed'
    }
    case 'bottle': {
      const d = e.data as BottleData
      return `${d.oz} oz`
    }
    case 'diaper': {
      const d = e.data as { kind: string }
      return d.kind
    }
    case 'sleep':
      return e.ended_at
        ? `slept ${formatDuration(
            (new Date(e.ended_at).getTime() - new Date(e.started_at).getTime()) / 60_000
          )}`
        : 'sleeping'
    case 'bath': return 'bath'
    case 'note': return 'note'
    default: return e.type
  }
}

const TYPE_ICONS: Record<string, string> = {
  sleep: '😴',
  breastfeed: '🤱',
  bottle: '🍼',
  diaper: '🩲',
  bath: '🛁',
  note: '📝',
}

export default function LastEventStrip() {
  const { data: events = [] } = useEvents(1)

  const feedEvents = events.filter((e) =>
    (e.type === 'breastfeed' || e.type === 'bottle') && !e.deleted_at
  )
  const lastFeed = feedEvents[0]

  if (!lastFeed) return null

  const who = lastFeed.profile?.display_name ?? 'someone'

  return (
    <div className="mx-4 mt-3 rounded-xl bg-secondary/60 px-4 py-3">
      <p className="text-xs text-muted-foreground">Last feed</p>
      <p className="mt-0.5 text-sm font-medium">
        {TYPE_ICONS[lastFeed.type]} {describeEvent(lastFeed)}
        <span className="text-muted-foreground font-normal">
          {' '}· {relativeTime(lastFeed.started_at)} by {who}
        </span>
      </p>
    </div>
  )
}
