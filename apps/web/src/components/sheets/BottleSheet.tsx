import { useState } from 'react'
import { Milk, Minus, Plus } from 'lucide-react'
import { useLogEvent } from '@/hooks/useEvents'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import BottomSheet from './BottomSheet'
import type { MilkType } from '@bailoteo/shared'

interface Props { open: boolean; onClose: () => void }

const MILK_TYPES: { id: MilkType; label: string }[] = [
  { id: 'breastmilk', label: 'Breastmilk' },
  { id: 'formula', label: 'Formula' },
  { id: 'combination', label: 'Combo' },
]

function OzStepper({ value, onChange, label }: { value: number; onChange: (v: number) => void; label?: string }) {
  return (
    <div className="space-y-1">
      {label && <p className="text-center text-xs text-muted-foreground">{label}</p>}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => onChange(Math.max(0, value - 0.5))}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary active:scale-95 transition-transform"
        >
          <Minus size={18} />
        </button>
        <div className="w-20 text-center">
          <span className="text-4xl font-bold tabular-nums">{value}</span>
          <span className="ml-1 text-base text-muted-foreground">oz</span>
        </div>
        <button
          onClick={() => onChange(Math.min(16, value + 0.5))}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary active:scale-95 transition-transform"
        >
          <Plus size={18} />
        </button>
      </div>
    </div>
  )
}

export default function BottleSheet({ open, onClose }: Props) {
  const [milkType, setMilkType] = useState<MilkType>('breastmilk')
  const [oz, setOz] = useState(3)
  const [breastmilkOz, setBreastmilkOz] = useState(2)
  const [formulaOz, setFormulaOz] = useState(1)
  const [notes, setNotes] = useState('')
  const logEvent = useLogEvent()

  const totalOz = milkType === 'combination' ? breastmilkOz + formulaOz : oz

  async function handleSave() {
    const data = milkType === 'combination'
      ? { milkType, oz: totalOz, breastmilkOz, formulaOz, notes: notes.trim() || undefined }
      : { milkType, oz, notes: notes.trim() || undefined }

    await logEvent.mutateAsync({ type: 'bottle', data })

    const label = milkType === 'combination'
      ? `${totalOz} oz (${breastmilkOz} BM + ${formulaOz} F)`
      : `${oz} oz ${milkType}`
    toast.success(`Bottle — ${label}`)
    onClose()
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Bottle Feed" icon={<Milk className="text-blue-400" />}>
      <div className="space-y-5">

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

        {milkType === 'combination' ? (
          <div className="grid grid-cols-2 gap-4 rounded-2xl bg-secondary/50 p-4">
            <OzStepper value={breastmilkOz} onChange={setBreastmilkOz} label="Breastmilk" />
            <OzStepper value={formulaOz} onChange={setFormulaOz} label="Formula" />
            <p className="col-span-2 text-center text-xs text-muted-foreground">
              Total: {totalOz} oz
            </p>
          </div>
        ) : (
          <OzStepper value={oz} onChange={setOz} />
        )}

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
