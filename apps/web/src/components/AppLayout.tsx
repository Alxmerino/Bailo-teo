import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'
import { useEventsSubscription } from '@/hooks/useEvents'

export default function AppLayout() {
  useEventsSubscription()

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
