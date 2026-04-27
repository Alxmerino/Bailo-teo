import { useState, useEffect } from 'react'
import { Droplet } from 'lucide-react'
import { useLogEvent } from '@/hooks/useEvents'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { toLocalDatetimeInput } from '@/lib/time'
import BottomSheet from './BottomSheet'
import type { FeedSide } from '@bailoteo/shared'

interface Props { open: boolean; onClose: () => void }

const SIDES: FeedSide[] = ['left', 'right', 'both']

export default function PumpSheet({ open, onClose }: Props) {
  const logEvent = useLogEvent()
  const [sides, setSides] = useState<FeedSide | null>(null)
  const [oz, setOz] = useState('')
  const [startTime, setStartTime] = useState(toLocalDatetimeInput(new Date()))

  useEffect(() => {
    if (open) setStartTime(toLocalDatetimeInput(new Date()))
    else { setSides(null); setOz('') }
  }, [open])

  async function handleSave() {
    if (!sides) return
    await logEvent.mutateAsync({
      type: 'pump',
      data: { sides, oz: oz ? parseFloat(oz) : undefined },
      started_at: new Date(startTime).toISOString(),
    })
    toast.success('Pump logged')
    onClose()
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Pump" icon={<Droplet className="text-purple-400" />}>
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
                    ? 'border-purple-400 bg-purple-400/10 text-purple-400'
                    : 'border-border bg-secondary'
                )}
              >
                {side}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-muted-foreground">Amount (oz, optional)</label>
          <input
            type="number"
            inputMode="decimal"
            step="0.5"
            min="0"
            placeholder="e.g. 3.5"
            value={oz}
            onChange={(e) => setOz(e.target.value)}
            className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={!sides || logEvent.isPending}
          className="w-full rounded-2xl bg-primary py-4 text-primary-foreground font-semibold text-base active:scale-95 transition-transform disabled:opacity-50"
        >
          Save Pump
        </button>
      </div>
    </BottomSheet>
  )
}
