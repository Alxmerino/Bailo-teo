import { useState, useEffect } from 'react'
import { Baby } from 'lucide-react'
import { useLogEvent } from '@/hooks/useEvents'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { toLocalDatetimeInput } from '@/lib/time'
import BottomSheet from './BottomSheet'
import type { FeedSide } from '@bailoteo/shared'

interface Props { open: boolean; onClose: () => void }

const SIDES: FeedSide[] = ['left', 'right', 'both']

export default function BreastfeedSheet({ open, onClose }: Props) {
  const logEvent = useLogEvent()
  const [sides, setSides] = useState<FeedSide | null>(null)
  const [notes, setNotes] = useState('')
  const [startTime, setStartTime] = useState(toLocalDatetimeInput(new Date()))

  useEffect(() => {
    if (open) setStartTime(toLocalDatetimeInput(new Date()))
    else { setSides(null); setNotes('') }
  }, [open])

  async function handleSave() {
    if (!sides) return
    await logEvent.mutateAsync({
      type: 'breastfeed',
      data: { sides, notes: notes.trim() || undefined },
      started_at: new Date(startTime).toISOString(),
    })
    toast.success('Feed logged')
    onClose()
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Breastfeed" icon={<Baby className="text-pink-400" />}>
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-muted-foreground">Time</label>
          <input
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

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
                    ? 'border-pink-400 bg-pink-400/10 text-pink-400'
                    : 'border-border bg-secondary'
                )}
              >
                {side}
              </button>
            ))}
          </div>
        </div>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional)..."
          rows={2}
          className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
        <button
          onClick={handleSave}
          disabled={!sides || logEvent.isPending}
          className="w-full rounded-2xl bg-primary py-4 text-primary-foreground font-semibold text-base active:scale-95 transition-transform disabled:opacity-50"
        >
          Save Feed
        </button>
      </div>
    </BottomSheet>
  )
}
