import { useAuth } from '@/contexts/AuthContext'
import ActiveSessionCard from '@/components/ActiveSessionCard'
import LastEventStrip from '@/components/LastEventStrip'
import QuickLogBar from '@/components/QuickLogBar'
import { useActiveSession } from '@/hooks/useEvents'

export default function Home() {
  const { profile, family } = useAuth()
  const { data: activeSession } = useActiveSession()

  return (
    <div className="min-h-full bg-background pb-4">
      {/* Header */}
      <div className="px-4 pt-6 pb-2">
        <p className="text-xs text-muted-foreground">{family?.name ?? 'Loading...'}</p>
        <h1 className="text-2xl font-bold">
          {activeSession ? '😴 Baby is sleeping' : 'Good to see you'}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {profile?.display_name ?? ''}
        </p>
      </div>

      {/* Active sleep session */}
      <ActiveSessionCard />

      {/* Last feed summary */}
      <LastEventStrip />

      {/* Quick log */}
      <div className="mt-4 px-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Log activity
        </p>
      </div>
      <QuickLogBar />
    </div>
  )
}
