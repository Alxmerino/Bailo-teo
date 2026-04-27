import { useState, useEffect } from 'react'
import { Pencil } from 'lucide-react'
import { useUpdateEvent } from '@/hooks/useEvents'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { toLocalDatetimeInput } from '@/lib/time'
import BottomSheet from './BottomSheet'
import type { BailoteoEvent, BreastfeedData, BottleData, DiaperData, NoteData, PumpData, FeedSide, DiaperKind, MilkType } from '@bailoteo/shared'

interface Props {
  event: BailoteoEvent | null
  onClose: () => void
}

const SIDES: FeedSide[] = ['left', 'right', 'both']
const DIAPER_KINDS: DiaperKind[] = ['wet', 'poop', 'both']
const MILK_TYPES: { id: MilkType; label: string }[] = [
  { id: 'breastmilk', label: 'Breastmilk' },
  { id: 'formula', label: 'Formula' },
  { id: 'combination', label: 'Combo' },
]

export default function EditEventSheet({ event, onClose }: Props) {
  const updateEvent = useUpdateEvent()
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [sides, setSides] = useState<FeedSide | null>(null)
  const [milkType, setMilkType] = useState<MilkType>('breastmilk')
  const [oz, setOz] = useState('')
  const [diaperKind, setDiaperKind] = useState<DiaperKind | null>(null)
  const [noteText, setNoteText] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!event) return
    setStartTime(toLocalDatetimeInput(new Date(event.started_at)))
    setEndTime(event.ended_at ? toLocalDatetimeInput(new Date(event.ended_at)) : '')

    const d = event.data as unknown as Record<string, unknown>
    if (event.type === 'breastfeed') setSides((d.sides as FeedSide) ?? null)
    if (event.type === 'pump') { setSides((d.sides as FeedSide) ?? null); setOz(String(d.oz ?? '')) }
    if (event.type === 'bottle') {
      setMilkType((d.milkType as MilkType) ?? 'breastmilk')
      setOz(String(d.oz ?? ''))
    }
    if (event.type === 'diaper') setDiaperKind((d.kind as DiaperKind) ?? null)
    if (event.type === 'note') setNoteText(String(d.text ?? ''))
    if ('notes' in d) setNotes(String(d.notes ?? ''))
  }, [event?.id])

  async function handleSave() {
    if (!event) return

    const started_at = new Date(startTime).toISOString()
    const ended_at = event.type === 'sleep' && endTime ? new Date(endTime).toISOString() : event.ended_at

    let data: Record<string, unknown> = { ...event.data }
    if (event.type === 'breastfeed') data = { sides, notes: notes.trim() || undefined }
    if (event.type === 'pump') data = { sides, oz: oz ? parseFloat(oz) : undefined }
    if (event.type === 'bottle') data = { milkType, oz: parseFloat(oz), notes: notes.trim() || undefined }
    if (event.type === 'diaper') data = { kind: diaperKind, notes: notes.trim() || undefined }
    if (event.type === 'bath') data = { notes: notes.trim() || undefined }
    if (event.type === 'note') data = { text: noteText }
    if (event.type === 'sleep') data = { notes: notes.trim() || undefined }

    await updateEvent.mutateAsync({
      id: event.id,
      updates: { started_at, ended_at, data: data as BailoteoEvent['data'] },
    })
    toast.success('Event updated')
    onClose()
  }

  if (!event) return null

  const sideColor = event.type === 'pump' ? 'purple' : 'pink'

  return (
    <BottomSheet open={!!event} onClose={onClose} title="Edit Event" icon={<Pencil className="text-muted-foreground" size={20} />}>
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
            {event.type === 'sleep' ? 'Sleep started' : 'Time'}
          </label>
          <input
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {event.type === 'sleep' && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted-foreground">Wake time (optional)</label>
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        )}

        {(event.type === 'breastfeed' || event.type === 'pump') && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted-foreground">Side</label>
            <div className="grid grid-cols-3 gap-2">
              {SIDES.map((side) => (
                <button
                  key={side}
                  onClick={() => setSides(side)}
                  className={cn(
                    'rounded-2xl border-2 py-4 text-sm font-medium capitalize transition-all active:scale-95',
                    sides === side
                      ? `border-${sideColor}-400 bg-${sideColor}-400/10 text-${sideColor}-400`
                      : 'border-border bg-secondary'
                  )}
                >
                  {side}
                </button>
              ))}
            </div>
          </div>
        )}

        {event.type === 'bottle' && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted-foreground">Milk type</label>
            <div className="grid grid-cols-3 gap-2">
              {MILK_TYPES.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setMilkType(id)}
                  className={cn(
                    'rounded-2xl border-2 py-3 text-sm font-medium transition-all active:scale-95',
                    milkType === id
                      ? 'border-blue-400 bg-blue-400/10 text-blue-400'
                      : 'border-border bg-secondary'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {(event.type === 'bottle' || event.type === 'pump') && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
              {event.type === 'pump' ? 'Amount (oz, optional)' : 'Total oz'}
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="0.5"
              min="0"
              value={oz}
              onChange={(e) => setOz(e.target.value)}
              className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        )}

        {event.type === 'diaper' && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted-foreground">Type</label>
            <div className="grid grid-cols-3 gap-2">
              {DIAPER_KINDS.map((kind) => (
                <button
                  key={kind}
                  onClick={() => setDiaperKind(kind)}
                  className={cn(
                    'rounded-2xl border-2 py-4 text-sm font-medium capitalize transition-all active:scale-95',
                    diaperKind === kind
                      ? 'border-yellow-400 bg-yellow-400/10 text-yellow-400'
                      : 'border-border bg-secondary'
                  )}
                >
                  {kind}
                </button>
              ))}
            </div>
          </div>
        )}

        {event.type === 'note' && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted-foreground">Note</label>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>
        )}

        {event.type !== 'note' && (
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)..."
            rows={2}
            className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        )}

        <button
          onClick={handleSave}
          disabled={updateEvent.isPending}
          className="w-full rounded-2xl bg-primary py-4 text-primary-foreground font-semibold text-base active:scale-95 transition-transform disabled:opacity-50"
        >
          Save Changes
        </button>
      </div>
    </BottomSheet>
  )
}
