import { useState } from 'react'
import { Milk, Minus, Plus } from 'lucide-react'
import { useLogEvent } from '@/hooks/useEvents'
import { toast } from 'sonner'
import BottomSheet from './BottomSheet'
import type { MilkType } from '@bailoteo/shared'

interface Props { open: boolean; onClose: () => void }

function OzStepper({
  value,
  onChange,
  label,
  color,
}: {
  value: number
  onChange: (v: number) => void
  label: string
  color: string
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <p className={`text-xs font-medium ${color}`}>{label}</p>
      <button
        onClick={() => onChange(Math.min(16, value + 0.5))}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary active:scale-95 transition-transform"
      >
        <Plus size={18} />
      </button>
      <div className="text-center">
        <span className="text-4xl font-bold tabular-nums">{value}</span>
        <span className="ml-1 text-sm text-muted-foreground">oz</span>
      </div>
      <button
        onClick={() => onChange(Math.max(0, value - 0.5))}
        disabled={value === 0}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary active:scale-95 transition-transform disabled:opacity-30"
      >
        <Minus size={18} />
      </button>
    </div>
  )
}

function deriveMilkType(bm: number, f: number): MilkType | null {
  if (bm > 0 && f > 0) return 'combination'
  if (bm > 0) return 'breastmilk'
  if (f > 0) return 'formula'
  return null
}

export default function BottleSheet({ open, onClose }: Props) {
  const [bmOz, setBmOz] = useState(0)
  const [fOz, setFOz] = useState(0)
  const [notes, setNotes] = useState('')
  const logEvent = useLogEvent()

  const totalOz = bmOz + fOz
  const milkType = deriveMilkType(bmOz, fOz)

  const bmPct = totalOz > 0 ? Math.round((bmOz / totalOz) * 100) : 0
  const fPct = totalOz > 0 ? Math.round((fOz / totalOz) * 100) : 0

  async function handleSave() {
    if (!milkType) return
    const data = milkType === 'combination'
      ? { milkType, oz: totalOz, breastmilkOz: bmOz, formulaOz: fOz, notes: notes.trim() || undefined }
      : { milkType, oz: totalOz, notes: notes.trim() || undefined }

    await logEvent.mutateAsync({ type: 'bottle', data })
    toast.success(`Bottle — ${totalOz} oz`)
    setBmOz(0)
    setFOz(0)
    setNotes('')
    onClose()
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Bottle Feed" icon={<Milk className="text-blue-400" />}>
      <div className="space-y-5">

        {/* Dual steppers */}
        <div className="grid grid-cols-2 gap-6 rounded-2xl bg-secondary/50 py-5 px-4">
          <OzStepper value={bmOz} onChange={setBmOz} label="Breastmilk" color="text-pink-400" />
          <OzStepper value={fOz} onChange={setFOz} label="Formula" color="text-blue-400" />
        </div>

        {/* Summary row */}
        <div className="flex items-center justify-center gap-2 text-sm">
          {totalOz === 0 ? (
            <span className="text-muted-foreground">Adjust amounts above</span>
          ) : milkType === 'combination' ? (
            <>
              <span className="font-semibold">{totalOz} oz total</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-pink-400">{bmPct}% BM</span>
              <span className="text-muted-foreground">/</span>
              <span className="text-blue-400">{fPct}% F</span>
            </>
          ) : (
            <span className="font-semibold capitalize">
              {totalOz} oz {milkType}
            </span>
          )}
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
          disabled={!milkType || logEvent.isPending}
          className="w-full rounded-2xl bg-primary py-4 text-primary-foreground font-semibold text-base active:scale-95 transition-transform disabled:opacity-50"
        >
          Save
        </button>
      </div>
    </BottomSheet>
  )
}
