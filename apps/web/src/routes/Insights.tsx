import { useState } from 'react'
import { useEvents } from '@/hooks/useEvents'
import { computeInsights } from '@bailoteo/shared'
import { formatDuration, minuteOfDayToTime } from '@/lib/time'

type Window = 7 | 14 | 30

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-4">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  )
}

function pct(n: number) { return `${Math.round(n * 100)}%` }

export default function Insights() {
  const [window, setWindow] = useState<Window>(7)
  const { data: events = [], isLoading } = useEvents(window)

  const insights = computeInsights(events, window)

  return (
    <div className="min-h-full bg-background pb-4">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold">Insights</h1>
      </div>

      {/* Window selector */}
      <div className="flex gap-2 px-4 mb-5">
        {([7, 14, 30] as Window[]).map((w) => (
          <button
            key={w}
            onClick={() => setWindow(w)}
            className={`flex-1 rounded-xl py-2 text-sm font-medium transition-colors ${
              window === w ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
            }`}
          >
            {w}d
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="grid grid-cols-2 gap-3 px-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-secondary animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && insights.totalEvents === 0 && (
        <div className="flex flex-col items-center justify-center pt-20 text-muted-foreground">
          <p className="text-4xl mb-3">📊</p>
          <p className="text-sm">No data for this period yet</p>
        </div>
      )}

      {!isLoading && insights.totalEvents > 0 && (
        <div className="grid grid-cols-2 gap-3 px-4">
          {insights.avgTotalSleepPerDayMin !== null && (
            <StatCard
              label="Avg sleep / day"
              value={formatDuration(insights.avgTotalSleepPerDayMin)}
            />
          )}
          {insights.longestSleepStretchMin !== null && (
            <StatCard
              label="Longest stretch"
              value={formatDuration(insights.longestSleepStretchMin)}
            />
          )}
          {insights.avgFirstNapMinuteOfDay !== null && (
            <StatCard
              label="Avg first nap"
              value={minuteOfDayToTime(insights.avgFirstNapMinuteOfDay)}
            />
          )}
          {insights.napDurationRange && (
            <StatCard
              label="Nap duration range"
              value={`${formatDuration(insights.napDurationRange.p25)}–${formatDuration(insights.napDurationRange.p75)}`}
            />
          )}
          {insights.avgTimeBetweenFeedsMin !== null && (
            <StatCard
              label="Avg between feeds"
              value={formatDuration(insights.avgTimeBetweenFeedsMin)}
            />
          )}
          {insights.avgDiapersPerDay > 0 && (
            <StatCard
              label="Avg diapers / day"
              value={insights.avgDiapersPerDay.toFixed(1)}
            />
          )}
          {(insights.feedTypeSplit.breastfeed > 0 || insights.feedTypeSplit.bottle > 0) && (
            <StatCard
              label="Feed split"
              value={`${pct(insights.feedTypeSplit.breastfeed)} breast`}
              sub={`${pct(insights.feedTypeSplit.bottle)} bottle`}
            />
          )}
        </div>
      )}

      {/* Caregiver activity */}
      {!isLoading && Object.keys(insights.caregiverActivityByHour).length > 0 && (
        <div className="mt-4 px-4">
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Who's up at 3am?
          </h2>
          <div className="space-y-3">
            {Object.entries(insights.caregiverActivityByHour).map(([name, hours]) => {
              const peak = hours.indexOf(Math.max(...hours))
              const total = hours.reduce((a, b) => a + b, 0)
              const nightCount = hours.slice(0, 6).reduce((a, b) => a + b, 0)
              return (
                <div key={name} className="rounded-2xl bg-card border border-border p-4">
                  <div className="flex justify-between items-baseline mb-2">
                    <p className="font-medium">{name}</p>
                    <p className="text-xs text-muted-foreground">{total} events</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Peak at {minuteOfDayToTime(peak * 60)} · {nightCount} overnight (12–6am)
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
