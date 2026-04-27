import { useState } from 'react'
import { Moon, Sun, Baby, Milk, FileText, Droplets, Droplet, Bath, type LucideIcon } from 'lucide-react'
import { useActiveSession, useUpdateEvent } from '@/hooks/useEvents'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { durationSince, formatTime } from '@/lib/time'
import SleepSheet from './sheets/SleepSheet'
import BreastfeedSheet from './sheets/BreastfeedSheet'
import BottleSheet from './sheets/BottleSheet'
import DiaperSheet from './sheets/DiaperSheet'
import BathSheet from './sheets/BathSheet'
import NoteSheet from './sheets/NoteSheet'
import PumpSheet from './sheets/PumpSheet'

type SheetType = 'sleep' | 'breastfeed' | 'bottle' | 'diaper' | 'bath' | 'note' | 'pump' | null

interface QuickButton {
  id: SheetType
  label: string
  icon: LucideIcon
  color: string
}

const BUTTONS: QuickButton[] = [
  { id: 'breastfeed', label: 'Feed', icon: Baby, color: 'text-pink-400' },
  { id: 'pump', label: 'Pump', icon: Droplet, color: 'text-purple-400' },
  { id: 'bottle', label: 'Bottle', icon: Milk, color: 'text-blue-400' },
  { id: 'diaper', label: 'Diaper', icon: Droplets, color: 'text-yellow-400' },
  { id: 'bath', label: 'Bath', icon: Bath, color: 'text-cyan-400' },
  { id: 'note', label: 'Note', icon: FileText, color: 'text-emerald-400' },
]

export default function QuickLogBar() {
  const [open, setOpen] = useState<SheetType>(null)
  const { data: activeSession } = useActiveSession()
  const updateEvent = useUpdateEvent()
  const isSleeping = !!activeSession

  async function handleWakeUp() {
    if (!activeSession) return
    const now = new Date()
    await updateEvent.mutateAsync({
      id: activeSession.id,
      updates: { ended_at: now.toISOString() },
    })
    toast.success(`Woke at ${formatTime(now)} · slept ${durationSince(activeSession.started_at)}`)
  }

  return (
    <>
      <div className="grid grid-cols-4 gap-2 px-4 pt-4">
        {/* Sleep / Wake Up toggle */}
        <button
          onClick={isSleeping ? handleWakeUp : () => setOpen('sleep')}
          disabled={updateEvent.isPending}
          className={cn(
            'flex flex-col items-center justify-center gap-1.5 rounded-2xl py-4 transition-all active:scale-95',
            isSleeping ? 'bg-indigo-400/20' : 'bg-secondary hover:bg-secondary/80'
          )}
        >
          {isSleeping
            ? <Sun size={26} strokeWidth={1.75} className="text-indigo-400" />
            : <Moon size={26} strokeWidth={1.75} className="text-indigo-400" />}
          <span className="text-xs font-medium">{isSleeping ? 'Wake Up' : 'Sleep'}</span>
        </button>

        {BUTTONS.map(({ id, label, icon: Icon, color }) => (
          <button
            key={id}
            onClick={() => setOpen(id)}
            className="flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-secondary py-4 transition-all active:scale-95 hover:bg-secondary/80"
          >
            <Icon size={26} strokeWidth={1.75} className={color} />
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
      </div>

      <SleepSheet open={open === 'sleep'} onClose={() => setOpen(null)} />
      <BreastfeedSheet open={open === 'breastfeed'} onClose={() => setOpen(null)} />
      <PumpSheet open={open === 'pump'} onClose={() => setOpen(null)} />
      <BottleSheet open={open === 'bottle'} onClose={() => setOpen(null)} />
      <DiaperSheet open={open === 'diaper'} onClose={() => setOpen(null)} />
      <BathSheet open={open === 'bath'} onClose={() => setOpen(null)} />
      <NoteSheet open={open === 'note'} onClose={() => setOpen(null)} />
    </>
  )
}
