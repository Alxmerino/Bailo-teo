import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  icon?: ReactNode
  children: ReactNode
}

export default function BottomSheet({ open, onClose, title, icon, children }: Props) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 z-[60] rounded-t-3xl border-t border-border bg-card',
          'safe-bottom animate-in slide-in-from-bottom duration-300'
        )}
      >
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-border" />
        <div className="flex items-center justify-between px-4 pb-3 pt-4">
          <div className="flex items-center gap-2">
            {icon && <span className="text-xl">{icon}</span>}
            <h2 className="text-lg font-semibold">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground"
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-4 pb-6">{children}</div>
      </div>
    </>
  )
}
