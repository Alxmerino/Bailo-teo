import { useState } from 'react'
import { Droplets } from 'lucide-react'
import { useLogEvent } from '@/hooks/useEvents'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import BottomSheet from './BottomSheet'
import type { DiaperKind } from '@bailoteo/shared'

interface Props { open: boolean; onClose: () => void }

const OPTIONS: { value: DiaperKind; label: string; emoji: string }[] = [
  { value: 'wet', label: 'Wet', emoji: '💧' },
  { value: 'poop', label: 'Poop', emoji: '💩' },
  { value: 'both', label: 'Both', emoji: '💩💧' },
]

export default function DiaperSheet({ open, onClose }: Props) {
  const [kind, setKind] = useState<DiaperKind>('wet')
  const [notes, setNotes] = useState('')
  const logEvent = useLogEvent()

  async function handleSave() {
    await logEvent.mutateAsync({ type: 'diaper', data: { kind, notes: notes.trim() || undefined } })
    toast.success(`Diaper logged — ${kind}`)
    onClose()
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Diaper Change" icon={<Droplets className="text-yellow-400" />}>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setKind(opt.value)}
              className={cn(
                'flex flex-col items-center gap-2 rounded-2xl border-2 py-5 transition-all active:scale-95',
                kind === opt.value
                  ? 'border-yellow-400 bg-yellow-400/10'
                  : 'border-border bg-secondary'
              )}
            >
              <span className="text-2xl">{opt.emoji}</span>
              <span className="text-sm font-medium">{opt.label}</span>
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
