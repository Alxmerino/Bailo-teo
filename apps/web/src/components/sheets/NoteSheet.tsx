import { useState } from 'react'
import { FileText } from 'lucide-react'
import { useLogEvent } from '@/hooks/useEvents'
import { toast } from 'sonner'
import BottomSheet from './BottomSheet'

interface Props { open: boolean; onClose: () => void }

export default function NoteSheet({ open, onClose }: Props) {
  const [text, setText] = useState('')
  const logEvent = useLogEvent()

  async function handleSave() {
    if (!text.trim()) return
    await logEvent.mutateAsync({ type: 'note', data: { text: text.trim() } })
    toast.success('Note saved')
    setText('')
    onClose()
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Note" icon={<FileText className="text-emerald-400" />}>
      <div className="space-y-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What's on your mind..."
          rows={5}
          autoFocus
          className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
        <button
          onClick={handleSave}
          disabled={!text.trim() || logEvent.isPending}
          className="w-full rounded-2xl bg-primary py-4 text-primary-foreground font-semibold text-base active:scale-95 transition-transform disabled:opacity-50"
        >
          Save Note
        </button>
      </div>
    </BottomSheet>
  )
}
