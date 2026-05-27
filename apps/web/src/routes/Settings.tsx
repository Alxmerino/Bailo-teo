import { useState, useEffect, useCallback } from 'react'
import { LogOut, Copy, Link, Bell, BellOff, Download, Plus, Trash2, Clock } from 'lucide-react'
import { formatDuration } from '@/lib/time'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { signOut } from '@/lib/auth'
import { subscribeToPush, unsubscribeFromPush } from '@/lib/push'
import { supabase } from '@/lib/supabase'
import { useEvents } from '@/hooks/useEvents'
import type { ReminderSettings, InviteCode, Profile } from '@bailoteo/shared'

function exportCSV(events: ReturnType<typeof useEvents>['data']) {
  if (!events?.length) { toast.error('No events to export'); return }
  const rows = [
    ['id', 'type', 'started_at', 'ended_at', 'logged_by', 'data'],
    ...events.map((e) => [
      e.id, e.type, e.started_at, e.ended_at ?? '',
      e.profile?.display_name ?? e.logged_by,
      JSON.stringify(e.data),
    ]),
  ]
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `bailoteo-export-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function Settings() {
  const { profile, family, refreshProfile } = useAuth()
  const { data: events = [] } = useEvents(90)
  const [members, setMembers] = useState<Profile[]>([])
  const [activeCodes, setActiveCodes] = useState<InviteCode[]>([])
  const [generating, setGenerating] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [reminderSettings, setReminderSettings] = useState<ReminderSettings | null>(null)
  const [babyName, setBabyName] = useState(family?.baby_name ?? '')
  const [showNextEvent, setShowNextEvent] = useState(() => localStorage.getItem('bailoteo_show_next_event') === 'true')

  const loadCodes = useCallback(async () => {
    if (!family) return
    const { data } = await supabase
      .from('invite_codes')
      .select('*')
      .eq('family_id', family.id)
      .order('created_at', { ascending: false })
    if (data) setActiveCodes(data as InviteCode[])
  }, [family?.id])

  useEffect(() => {
    if (!family) return

    loadCodes()

    supabase
      .from('profiles')
      .select('id, display_name, is_parent, created_at, family_id, login_slug')
      .eq('family_id', family.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => { if (data) setMembers(data as Profile[]) })

    supabase
      .from('reminder_settings')
      .select('*')
      .eq('family_id', family.id)
      .maybeSingle()
      .then(({ data }) => { if (data) setReminderSettings(data as ReminderSettings) })

    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready.then((reg) =>
        reg.pushManager.getSubscription().then((sub) => setPushEnabled(!!sub))
      )
    }
  }, [family?.id])

  async function handleGenerateCode() {
    setGenerating(true)
    try {
      const { data, error } = await supabase.rpc('generate_invite_code', { p_expires_hours: 24 })
      if (error) throw error
      await loadCodes()
      toast.success(`Code ${data} generated`)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to generate code')
    } finally {
      setGenerating(false)
    }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code)
    toast.success('Code copied')
  }

  function copyLink(code: string) {
    const url = `${window.location.origin}/join/${code}`
    navigator.clipboard.writeText(url)
    toast.success('Link copied')
  }

  async function deleteCode(code: string) {
    await supabase.from('invite_codes').delete().eq('code', code)
    setActiveCodes((prev) => prev.filter((ic) => ic.code !== code))
    toast.success('Code deleted')
  }

  async function saveBabyName() {
    if (!family) return
    await supabase.from('families').update({ baby_name: babyName.trim() || null }).eq('id', family.id)
    await refreshProfile()
    toast.success('Saved')
  }

  async function togglePush() {
    if (!profile || !family) return
    if (pushEnabled) {
      await unsubscribeFromPush()
      setPushEnabled(false)
      toast.success('Notifications disabled')
    } else {
      const ok = await subscribeToPush(profile.id, family.id)
      if (ok) { setPushEnabled(true); toast.success('Notifications enabled') }
      else toast.error('Notification permission denied')
    }
  }

  function toggleShowNextEvent() {
    const next = !showNextEvent
    setShowNextEvent(next)
    localStorage.setItem('bailoteo_show_next_event', JSON.stringify(next))
  }

  async function updateReminder(field: 'feed_threshold_min' | 'sleep_threshold_min', value: number) {
    if (!family) return
    const updates = { ...reminderSettings, [field]: value, family_id: family.id }
    setReminderSettings(updates as ReminderSettings)
    await supabase.from('reminder_settings').upsert(updates)
  }

  async function handleSignOut() {
    await signOut()
  }

  return (
    <div className="min-h-full bg-background pb-4">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">{family?.name}</p>
      </div>

      {/* Baby name */}
      <section className="mx-4 mb-4 rounded-2xl border border-border bg-card p-4">
        <h2 className="font-semibold mb-3">Baby</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={babyName}
            onChange={(e) => setBabyName(e.target.value)}
            placeholder="Baby's name (e.g. Teo)"
            className="flex-1 rounded-xl border border-border bg-secondary px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={saveBabyName}
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground active:scale-95 transition-transform"
          >
            Save
          </button>
        </div>
        {family?.family_code && (
          <div className="mt-4 rounded-xl bg-secondary px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Family login code</p>
                <p className="font-mono font-bold tracking-widest text-primary text-lg">{family.family_code}</p>
              </div>
              <button
                onClick={() => { navigator.clipboard.writeText(family.family_code); toast.success('Copied') }}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-card text-muted-foreground hover:text-foreground"
                title="Copy family code"
              >
                <Copy size={15} />
              </button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Members use this + name + PIN to log back in</p>
          </div>
        )}
      </section>

      {/* Members */}
      {profile?.is_parent && members.length > 0 && (
        <section className="mx-4 mb-4 rounded-2xl border border-border bg-card p-4">
          <h2 className="font-semibold mb-3">Members</h2>
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-xl bg-secondary px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium">{m.display_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Joined {format(parseISO(m.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  m.is_parent
                    ? 'bg-primary/15 text-primary'
                    : 'bg-secondary border border-border text-muted-foreground'
                }`}>
                  {m.is_parent ? 'Parent' : 'Member'}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Invite codes */}
      <section className="mx-4 mb-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Invite caregivers</h2>
          <button
            onClick={handleGenerateCode}
            disabled={generating}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-medium text-primary-foreground active:scale-95 transition-transform disabled:opacity-50"
          >
            <Plus size={14} />
            {generating ? 'Generating...' : 'New code'}
          </button>
        </div>

        {activeCodes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No codes yet — generate one to invite caregivers.</p>
        ) : (
          <div className="space-y-2">
            {activeCodes.map((ic) => {
              const expired = !!ic.expires_at && new Date(ic.expires_at) < new Date()
              return (
                <div key={ic.code} className={`flex items-center gap-2 rounded-xl px-3 py-2.5 ${expired ? 'bg-secondary/40 opacity-60' : 'bg-secondary'}`}>
                  <div className="flex-1 min-w-0">
                    <span className={`font-mono font-bold tracking-widest text-lg ${expired ? 'text-muted-foreground' : 'text-primary'}`}>
                      {ic.code}
                    </span>
                    {ic.expires_at && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {expired ? 'expired' : `exp ${format(parseISO(ic.expires_at), 'h:mm a')}`}
                      </span>
                    )}
                  </div>
                  {!expired && (
                    <>
                      <button
                        onClick={() => copyCode(ic.code)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-card text-muted-foreground hover:text-foreground"
                        title="Copy code"
                      >
                        <Copy size={15} />
                      </button>
                      <button
                        onClick={() => copyLink(ic.code)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-card text-muted-foreground hover:text-foreground"
                        title="Copy invite link"
                      >
                        <Link size={15} />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => deleteCode(ic.code)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-card text-muted-foreground hover:text-destructive"
                    title="Delete code"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
        <p className="mt-2 text-xs text-muted-foreground">Codes expire after 24 hours · link opens join page with code prefilled</p>
      </section>

      {/* Notifications */}
      <section className="mx-4 mb-4 rounded-2xl border border-border bg-card p-4">
        <h2 className="font-semibold mb-3">Notifications</h2>

        <button
          onClick={togglePush}
          className="flex w-full items-center justify-between rounded-xl bg-secondary px-4 py-3 mb-3"
        >
          <div className="flex items-center gap-2">
            {pushEnabled ? <Bell size={16} className="text-primary" /> : <BellOff size={16} />}
            <span className="text-sm">Push notifications</span>
          </div>
          <span className={`text-xs font-medium ${pushEnabled ? 'text-primary' : 'text-muted-foreground'}`}>
            {pushEnabled ? 'On' : 'Off'}
          </span>
        </button>

        <button
          onClick={toggleShowNextEvent}
          className="flex w-full items-center justify-between rounded-xl bg-secondary px-4 py-3 mb-3"
        >
          <div className="flex items-center gap-2">
            <Clock size={16} className={showNextEvent ? 'text-primary' : ''} />
            <span className="text-sm">Show next event time</span>
          </div>
          <span className={`text-xs font-medium ${showNextEvent ? 'text-primary' : 'text-muted-foreground'}`}>
            {showNextEvent ? 'On' : 'Off'}
          </span>
        </button>

        {reminderSettings && (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">
                Feed reminder after {formatDuration(reminderSettings.feed_threshold_min)}
              </label>
              <input
                type="range"
                min={60} max={360} step={30}
                value={reminderSettings.feed_threshold_min}
                onChange={(e) => updateReminder('feed_threshold_min', Number(e.target.value))}
                className="w-full mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">
                Sleep alert after {formatDuration(reminderSettings.sleep_threshold_min)}
              </label>
              <input
                type="range"
                min={60} max={360} step={30}
                value={reminderSettings.sleep_threshold_min}
                onChange={(e) => updateReminder('sleep_threshold_min', Number(e.target.value))}
                className="w-full mt-1"
              />
            </div>
          </div>
        )}

        <p className="mt-2 text-xs text-muted-foreground">
          iOS: notifications only work after installing as app (Add to Home Screen)
        </p>
      </section>

      {/* Export */}
      <section className="mx-4 mb-4 rounded-2xl border border-border bg-card p-4">
        <h2 className="font-semibold mb-3">Data</h2>
        <button
          onClick={() => exportCSV(events)}
          className="flex w-full items-center gap-2 rounded-xl bg-secondary px-4 py-3 text-sm"
        >
          <Download size={16} />
          Export last 90 days to CSV
        </button>
      </section>

      {/* Sign out */}
      <div className="mx-4">
        <button
          onClick={handleSignOut}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/40 py-3 text-destructive text-sm font-medium active:scale-95 transition-transform"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </div>
  )
}
