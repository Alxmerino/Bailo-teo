import { useState } from 'react'
import { Milk, Minus, Plus } from 'lucide-react'
import { useLogEvent } from '@/hooks/useEvents'
import { toast } from 'sonner'
import BottomSheet from './BottomSheet'

interface Props { open: boolean; onClose: () => void }

const PRESETS = [1, 2, 3, 4, 5]

export default function BottleSheet({ open, onClose }: Props) {
  const [oz, setOz] = useState(3)
  const [notes, setNotes] = useState('')
  const logEvent = useLogEvent()

  async function handleSave() {
    await logEvent.mutateAsync({ type: 'bottle', data: { oz, notes: notes.trim() || undefined } })
    toast.success(`Bottle logged — ${oz} oz`)
    onClose()
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Bottle Feed" icon={<Milk className="text-blue-400" />}>
      <div className="space-y-5">
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={() => setOz((v) => Math.max(0.5, v - 0.5))}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary active:scale-95 transition-transform"
          >
            <Minus size={20} />
          </button>
          <div className="text-center">
            <span className="text-5xl font-bold tabular-nums">{oz}</span>
            <span className="ml-1 text-lg text-muted-foreground">oz</span>
          </div>
          <button
            onClick={() => setOz((v) => Math.min(12, v + 0.5))}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary active:scale-95 transition-transform"
          >
            <Plus size={20} />
          </button>
        </div>

        <div className="flex gap-2 justify-center">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setOz(p)}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                oz === p ? 'bg-primary text-primary-foreground' : 'bg-secondary'
              }`}
            >
              {p}
            </button>
          ))}
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
          disabled={logEvent.isPending}
          className="w-full rounded-2xl bg-primary py-4 text-primary-foreground font-semibold text-base active:scale-95 transition-transform disabled:opacity-50"
        >
          Save
        </button>
      </div>
    </BottomSheet>
  )
}
