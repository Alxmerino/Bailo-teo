export type EventType = 'sleep' | 'breastfeed' | 'bottle' | 'note' | 'diaper' | 'bath' | 'pump'
export type DiaperKind = 'poop' | 'wet' | 'both'
export type FeedSide = 'left' | 'right' | 'both'
export type MilkType = 'breastmilk' | 'formula' | 'combination'

export interface Family {
  id: string
  name: string
  baby_name: string | null
  timezone: string
  created_at: string
}

export interface Profile {
  id: string
  family_id: string
  display_name: string
  login_slug: string
  is_parent: boolean
  created_at: string
}

export interface InviteCode {
  code: string
  family_id: string
  created_by: string | null
  expires_at: string | null
  uses: number
  created_at: string
}

export interface SleepData { notes?: string }
export interface BreastfeedData { sides: FeedSide; notes?: string }
export interface BottleData {
  milkType: MilkType
  oz: number
  breastmilkOz?: number
  formulaOz?: number
  notes?: string
}
export interface NoteData { text: string }
export interface DiaperData { kind: DiaperKind; notes?: string }
export interface BathData { notes?: string }
export interface PumpData { sides: FeedSide; oz?: number }

export type EventData =
  | SleepData
  | BreastfeedData
  | BottleData
  | NoteData
  | DiaperData
  | BathData
  | PumpData

export interface BailoteoEvent {
  id: string
  family_id: string
  logged_by: string
  type: EventType
  started_at: string
  ended_at: string | null
  data: EventData
  deleted_at: string | null
  created_at: string
  updated_at: string
  profile?: Profile
}

export interface PushSubscriptionRow {
  id: string
  profile_id: string
  family_id: string
  endpoint: string
  p256dh: string
  auth: string
  created_at: string
}

export interface ReminderSettings {
  family_id: string
  feed_threshold_min: number
  sleep_threshold_min: number
  enabled: boolean
}

export interface Insights {
  avgFirstNapMinuteOfDay: number | null
  napDurationRange: { p25: number; p75: number } | null
  avgTimeBetweenFeedsMin: number | null
  avgTotalSleepPerDayMin: number | null
  longestSleepStretchMin: number | null
  caregiverActivityByHour: Record<string, number[]>
  avgDiapersPerDay: number
  feedTypeSplit: { breastfeed: number; bottle: number }
  totalEvents: number
}
