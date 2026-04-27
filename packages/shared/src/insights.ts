import { differenceInMinutes, startOfDay, getHours, parseISO } from 'date-fns'
import type { BailoteoEvent, Insights } from './types'

function percentile(sorted: number[], p: number): number {
  const idx = (p / 100) * (sorted.length - 1)
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo)
}

export function computeInsights(events: BailoteoEvent[], windowDays: 7 | 14 | 30): Insights {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - windowDays)

  const filtered = events.filter(
    (e) => !e.deleted_at && new Date(e.started_at) >= cutoff
  )

  // Sleep insights
  const sleepEvents = filtered.filter((e) => e.type === 'sleep' && e.ended_at)
  const sleepDurationsMin = sleepEvents.map((e) =>
    differenceInMinutes(parseISO(e.ended_at!), parseISO(e.started_at))
  )

  const sortedDurations = [...sleepDurationsMin].sort((a, b) => a - b)
  const napDurationRange =
    sortedDurations.length >= 2
      ? { p25: percentile(sortedDurations, 25), p75: percentile(sortedDurations, 75) }
      : null

  // Total sleep per day
  const sleepByDay: Record<string, number> = {}
  for (const e of sleepEvents) {
    const day = startOfDay(parseISO(e.started_at)).toISOString()
    const dur = differenceInMinutes(parseISO(e.ended_at!), parseISO(e.started_at))
    sleepByDay[day] = (sleepByDay[day] ?? 0) + dur
  }
  const dailySleepValues = Object.values(sleepByDay)
  const avgTotalSleepPerDayMin =
    dailySleepValues.length > 0
      ? dailySleepValues.reduce((a, b) => a + b, 0) / dailySleepValues.length
      : null

  const longestSleepStretchMin =
    sleepDurationsMin.length > 0 ? Math.max(...sleepDurationsMin) : null

  // First nap per day
  const firstNapByDay: Record<string, number> = {}
  for (const e of sleepEvents) {
    const day = startOfDay(parseISO(e.started_at)).toISOString()
    const minuteOfDay =
      getHours(parseISO(e.started_at)) * 60 + parseISO(e.started_at).getMinutes()
    if (firstNapByDay[day] === undefined || minuteOfDay < firstNapByDay[day]) {
      firstNapByDay[day] = minuteOfDay
    }
  }
  const firstNapValues = Object.values(firstNapByDay)
  const avgFirstNapMinuteOfDay =
    firstNapValues.length > 0
      ? firstNapValues.reduce((a, b) => a + b, 0) / firstNapValues.length
      : null

  // Feed intervals
  const feedEvents = filtered
    .filter((e) => e.type === 'breastfeed' || e.type === 'bottle')
    .sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime())

  const feedIntervals: number[] = []
  for (let i = 1; i < feedEvents.length; i++) {
    feedIntervals.push(
      differenceInMinutes(
        parseISO(feedEvents[i].started_at),
        parseISO(feedEvents[i - 1].started_at)
      )
    )
  }
  const avgTimeBetweenFeedsMin =
    feedIntervals.length > 0
      ? feedIntervals.reduce((a, b) => a + b, 0) / feedIntervals.length
      : null

  // Feed type split
  const bfCount = filtered.filter((e) => e.type === 'breastfeed').length
  const btCount = filtered.filter((e) => e.type === 'bottle').length
  const totalFeeds = bfCount + btCount
  const feedTypeSplit = {
    breastfeed: totalFeeds > 0 ? bfCount / totalFeeds : 0,
    bottle: totalFeeds > 0 ? btCount / totalFeeds : 0,
  }

  // Diapers per day
  const diaperEvents = filtered.filter((e) => e.type === 'diaper')
  const diaperDays = new Set(
    diaperEvents.map((e) => startOfDay(parseISO(e.started_at)).toISOString())
  ).size
  const avgDiapersPerDay =
    diaperDays > 0 ? diaperEvents.length / diaperDays : 0

  // Caregiver activity by hour (hour 0-23, count of events)
  const caregiverActivityByHour: Record<string, number[]> = {}
  for (const e of filtered) {
    const name = e.profile?.display_name ?? e.logged_by
    if (!caregiverActivityByHour[name]) {
      caregiverActivityByHour[name] = Array(24).fill(0)
    }
    caregiverActivityByHour[name][getHours(parseISO(e.started_at))]++
  }

  return {
    avgFirstNapMinuteOfDay,
    napDurationRange,
    avgTimeBetweenFeedsMin,
    avgTotalSleepPerDayMin,
    longestSleepStretchMin,
    caregiverActivityByHour,
    avgDiapersPerDay,
    feedTypeSplit,
    totalEvents: filtered.length,
  }
}
