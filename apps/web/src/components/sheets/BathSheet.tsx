import { useState } from 'react'
import { Bath } from 'lucide-react'
import { useLogEvent } from '@/hooks/useEvents'
import { toast } from 'sonner'
import BottomSheet from './BottomSheet'

interface Props { open: boolean; onClose: () => void }

export default function BathSheet({ open, onClose }: Props) {
  const [notes, setNotes] = useState('')
  const logEvent = useLogEvent()

  async function handleSave() {
    await logEvent.mutateAsync({ type: 'bath', data: { notes: notes.trim() || undefined } })
    toast.success('Bath logged')
    setNotes('')
    onClose()
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Bath" icon={<Bath className="text-cyan-400" />}>
      <div className="space-y-4">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional)..."
          rows={3}
          className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
        <button
          onClick={handleSave}
          disabled={logEvent.isPending}
          className="w-full rounded-2xl bg-primary py-4 text-primary-foreground font-semibold text-base active:scale-95 transition-transform disabled:opacity-50"
        >
          Log Bath
        </button>
      </div>
    </BottomSheet>
  )
}
