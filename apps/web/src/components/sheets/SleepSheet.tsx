import { useState } from 'react'
import { Moon } from 'lucide-react'
import { useLogEvent } from '@/hooks/useEvents'
import { toast } from 'sonner'
import BottomSheet from './BottomSheet'

interface Props { open: boolean; onClose: () => void }

export default function SleepSheet({ open, onClose }: Props) {
  const logEvent = useLogEvent()
  const [customTime, setCustomTime] = useState('')
  const [notes, setNotes] = useState('')

  async function handleLog() {
    const started_at = customTime
      ? new Date(customTime).toISOString()
      : new Date().toISOString()

    await logEvent.mutateAsync({ type: 'sleep', data: { notes: notes.trim() || undefined }, started_at })
    toast.success('Sleep started')
    setCustomTime('')
    setNotes('')
    onClose()
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Log Sleep" icon={<Moon className="text-indigo-400" />}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-muted-foreground mb-2">Start time (optional — defaults to now)</label>
          <input
            type="datetime-local"
            value={customTime}
            onChange={(e) => setCustomTime(e.target.value)}
            className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional)..."
          rows={2}
          className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
        <button
          onClick={handleLog}
          disabled={logEvent.isPending}
          className="w-full rounded-2xl bg-primary py-4 text-primary-foreground font-semibold text-base active:scale-95 transition-transform disabled:opacity-50"
        >
          Start Sleep
        </button>
      </div>
    </BottomSheet>
  )
}
