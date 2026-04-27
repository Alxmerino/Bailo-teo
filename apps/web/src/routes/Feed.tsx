import { useState } from 'react'
import { startOfDay, format, parseISO, isSameDay } from 'date-fns'
import { useEvents } from '@/hooks/useEvents'
import EventCard from '@/components/EventCard'
import EditEventSheet from '@/components/sheets/EditEventSheet'
import type { BailoteoEvent } from '@bailoteo/shared'

function groupByDay(events: BailoteoEvent[]) {
  const groups: { date: Date; events: BailoteoEvent[] }[] = []
  const seen = new Map<string, number>()

  for (const event of events) {
    const day = startOfDay(parseISO(event.started_at))
    const key = day.toISOString()
    if (!seen.has(key)) {
      seen.set(key, groups.length)
      groups.push({ date: day, events: [] })
    }
    groups[seen.get(key)!].events.push(event)
  }

  return groups
}

function dayLabel(date: Date): string {
  if (isSameDay(date, new Date())) return 'Today'
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (isSameDay(date, yesterday)) return 'Yesterday'
  return format(date, 'EEEE, MMMM d')
}

export default function Feed() {
  const { data: events = [], isLoading } = useEvents(30)
  const [editingEvent, setEditingEvent] = useState<BailoteoEvent | null>(null)
  const groups = groupByDay(events)

  return (
    <div className="min-h-full bg-background">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold">Activity Feed</h1>
      </div>

      {isLoading && (
        <div className="space-y-3 px-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 rounded-2xl bg-secondary animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && groups.length === 0 && (
        <div className="flex flex-col items-center justify-center pt-20 text-muted-foreground">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-sm">No events yet — start logging!</p>
        </div>
      )}

      {groups.map((group) => (
        <div key={group.date.toISOString()}>
          <div className="sticky top-0 z-10 bg-background/90 px-4 py-2 backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {dayLabel(group.date)}
            </p>
          </div>
          <div className="divide-y divide-border/40">
            {group.events.map((event) => (
              <EventCard key={event.id} event={event} onEdit={setEditingEvent} />
            ))}
          </div>
        </div>
      ))}

      <EditEventSheet event={editingEvent} onClose={() => setEditingEvent(null)} />
    </div>
  )
}
