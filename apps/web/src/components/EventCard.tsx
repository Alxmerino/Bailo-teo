import { useState, type ReactNode } from 'react'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useDeleteEvent } from '@/hooks/useEvents'
import { formatTime, formatDuration } from '@/lib/time'
import type { BailoteoEvent, BreastfeedData, BottleData, DiaperData, PumpData } from '@bailoteo/shared'
import { cn } from '@/lib/utils'

const TYPE_ICONS: Record<string, string> = {
  sleep: '😴',
  breastfeed: '🤱',
  bottle: '🍼',
  diaper: '🩲',
  bath: '🛁',
  note: '📝',
  pump: '🧴',
}

const TYPE_LABELS: Record<string, string> = {
  sleep: 'Sleep',
  breastfeed: 'Breastfeed',
  bottle: 'Bottle',
  diaper: 'Diaper',
  bath: 'Bath',
  note: 'Note',
  pump: 'Pump',
}

function EventDetail({ event }: { event: BailoteoEvent }) {
  let main: ReactNode = null
  let notes: string | undefined

  switch (event.type) {
    case 'sleep': {
      const d = event.data as { notes?: string }
      notes = d.notes
      if (!event.ended_at) { main = <span className="text-primary">Active</span>; break }
      const dur = formatDuration(
        (new Date(event.ended_at).getTime() - new Date(event.started_at).getTime()) / 60_000
      )
      main = <span>{dur}</span>
      break
    }
    case 'breastfeed': {
      const d = event.data as BreastfeedData
      notes = d.notes
      main = <span className="capitalize">{d.sides ?? '—'}</span>
      break
    }
    case 'pump': {
      const d = event.data as PumpData
      const ozStr = d.oz ? ` · ${d.oz} oz` : ''
      main = <span className="capitalize">{d.sides ?? '—'}{ozStr}</span>
      break
    }
    case 'bottle': {
      const d = event.data as BottleData
      notes = d.notes
      main = <span>{d.oz} oz</span>
      break
    }
    case 'diaper': {
      const d = event.data as DiaperData
      notes = d.notes
      main = <span className="capitalize">{d.kind}</span>
      break
    }
    case 'bath': {
      const d = event.data as { notes?: string }
      notes = d.notes
      main = null
      break
    }
    case 'note': {
      const d = event.data as { text: string }
      main = <span className="line-clamp-2 text-muted-foreground">{d.text}</span>
      break
    }
  }

  return (
    <>
      {main}
      {notes && (
        <p className="mt-0.5 text-xs text-muted-foreground italic">"{notes}"</p>
      )}
    </>
  )
}

interface Props {
  event: BailoteoEvent
  onEdit?: (event: BailoteoEvent) => void
}

export default function EventCard({ event, onEdit }: Props) {
  const [showMenu, setShowMenu] = useState(false)
  const deleteEvent = useDeleteEvent()

  async function handleDelete() {
    setShowMenu(false)
    await deleteEvent.mutateAsync(event.id)
    toast.success('Event deleted')
  }

  return (
    <div className="relative flex items-start gap-3 px-4 py-3">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-secondary text-lg">
        {TYPE_ICONS[event.type]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-medium text-sm">{TYPE_LABELS[event.type]}</span>
          <span className="text-xs text-muted-foreground flex-shrink-0">{formatTime(event.started_at)}</span>
        </div>
        <div className="text-sm text-foreground/80 mt-0.5">
          <EventDetail event={event} />
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {event.profile?.display_name ?? 'Unknown'}
        </p>
      </div>

      <div className="relative">
        <button
          onClick={() => setShowMenu((v) => !v)}
          className="tap-target flex items-center justify-center rounded-lg p-1 text-muted-foreground hover:text-foreground"
        >
          <MoreHorizontal size={16} />
        </button>

        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowMenu(false)}
            />
            <div className="absolute right-0 top-8 z-50 w-36 rounded-xl border border-border bg-card shadow-lg overflow-hidden">
              {onEdit && (
                <button
                  onClick={() => { setShowMenu(false); onEdit(event) }}
                  className="flex w-full items-center gap-2 px-3 py-3 text-sm hover:bg-secondary"
                >
                  <Pencil size={14} /> Edit
                </button>
              )}
              <button
                onClick={handleDelete}
                className="flex w-full items-center gap-2 px-3 py-3 text-sm text-destructive hover:bg-destructive/10"
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
