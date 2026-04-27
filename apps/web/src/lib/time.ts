import {
  formatDistanceToNow,
  differenceInMinutes,
  differenceInSeconds,
  format,
  parseISO,
} from 'date-fns'

export function relativeTime(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function formatDuration(minutes: number): string {
  if (minutes < 1) return '<1m'
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export function durationSinceMinutes(startAt: string): number {
  return differenceInMinutes(new Date(), parseISO(startAt))
}

export function durationSince(startAt: string): string {
  return formatDuration(durationSinceMinutes(startAt))
}

export function secondsSince(startAt: string): number {
  return differenceInSeconds(new Date(), parseISO(startAt))
}

export function formatTime(date: string | Date): string {
  return format(new Date(date), 'h:mm a')
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'EEE, MMM d')
}

export function toLocalDatetimeInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function minuteOfDayToTime(minuteOfDay: number): string {
  const h = Math.floor(minuteOfDay / 60) % 12 || 12
  const m = Math.floor(minuteOfDay % 60)
  const ampm = minuteOfDay < 720 ? 'am' : 'pm'
  return `${h}:${String(m).padStart(2, '0')}${ampm}`
}
