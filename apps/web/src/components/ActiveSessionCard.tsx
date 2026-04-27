import { useState, useEffect } from 'react'
import { Moon, StopCircle } from 'lucide-react'
import { useActiveSession, useUpdateEvent } from '@/hooks/useEvents'
import { useAuth } from '@/contexts/AuthContext'
import { durationSince, durationSinceMinutes, formatTime } from '@/lib/time'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export default function ActiveSessionCard() {
  const { data: session } = useActiveSession()
  const updateEvent = useUpdateEvent()
  const { family } = useAuth()
  const [, forceRender] = useState(0)
  const babyName = family?.baby_name ?? 'Baby'

  useEffect(() => {
    if (!session) return
    const id = setInterval(() => forceRender((n) => n + 1), 60_000)
    return () => clearInterval(id)
  }, [session?.id])

  if (!session) return null

  const minutes = durationSinceMinutes(session.started_at)
  const isLong = minutes > 120

  async function handleWake() {
    if (!session) return
    await updateEvent.mutateAsync({
      id: session.id,
      updates: { ended_at: new Date().toISOString() },
    })
    toast.success('Sleep ended — ' + durationSince(session.started_at))
  }

  return (
    <div className={cn(
      'mx-4 mt-4 rounded-2xl border p-4 transition-colors',
      isLong ? 'border-accent/50 bg-accent/10' : 'border-primary/30 bg-primary/10'
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            'flex h-10 w-10 items-center justify-center rounded-full',
            isLong ? 'bg-accent/20' : 'bg-primary/20'
          )}>
            <Moon size={20} className={isLong ? 'text-accent' : 'text-primary'} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{babyName} sleeping since {formatTime(session.started_at)}</p>
            <p className={cn(
              'text-2xl font-semibold tabular-nums',
              isLong ? 'text-accent' : 'text-primary'
            )}>
              {durationSince(session.started_at)}
            </p>
            {isLong && (
              <p className="text-xs text-accent mt-0.5">Consider waking to feed</p>
            )}
          </div>
        </div>
        <button
          onClick={handleWake}
          disabled={updateEvent.isPending}
          className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/90 text-destructive-foreground active:scale-95 transition-transform disabled:opacity-50"
        >
          <StopCircle size={26} />
        </button>
      </div>
    </div>
  )
}
