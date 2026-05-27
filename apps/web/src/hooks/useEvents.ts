import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queueMutation } from '@/lib/offline-queue'
import { useAuth } from '@/contexts/AuthContext'
import type { BailoteoEvent, EventType, EventData, ReminderSettings } from '@bailoteo/shared'
import { useEffect } from 'react'

export function useEvents(limitDays = 30) {
  const { family } = useAuth()
  const qc = useQueryClient()

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - limitDays)

  const query = useQuery({
    queryKey: ['events', family?.id, limitDays],
    enabled: !!family?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*, profile:profiles(id, display_name, login_slug, is_parent, family_id, created_at)')
        .eq('family_id', family!.id)
        .is('deleted_at', null)
        .gte('started_at', cutoff.toISOString())
        .order('started_at', { ascending: false })

      if (error) throw error
      return data as BailoteoEvent[]
    },
    staleTime: 1000 * 30,
  })

  return query
}

export function useEventsSubscription() {
  const { family } = useAuth()
  const qc = useQueryClient()

  useEffect(() => {
    if (!family?.id) return

    const channel = supabase
      .channel(`events-${family.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events', filter: `family_id=eq.${family.id}` },
        () => {
          qc.invalidateQueries({ queryKey: ['events', family.id] })
          qc.invalidateQueries({ queryKey: ['active-session', family.id] })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [family?.id, qc])
}

export function useActiveSession() {
  const { family } = useAuth()
  const qc = useQueryClient()

  return useQuery({
    queryKey: ['active-session', family?.id],
    enabled: !!family?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('events')
        .select('*')
        .eq('family_id', family!.id)
        .eq('type', 'sleep')
        .is('ended_at', null)
        .is('deleted_at', null)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      return data as BailoteoEvent | null
    },
    refetchInterval: 10_000,
  })
}

export function useLogEvent() {
  const { profile, family } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (args: {
      type: EventType
      data?: EventData
      started_at?: string
      ended_at?: string
    }) => {
      if (!profile || !family) throw new Error('Not authenticated')

      const event = {
        family_id: family.id,
        logged_by: profile.id,
        type: args.type,
        started_at: args.started_at ?? new Date().toISOString(),
        ended_at: args.ended_at ?? null,
        data: args.data ?? {},
      }

      if (navigator.onLine) {
        const { data, error } = await supabase.from('events').insert(event).select().single()
        if (error) throw error
        return data
      } else {
        await queueMutation({ table: 'events', operation: 'insert', data: { ...event, id: crypto.randomUUID() } })
        return null
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events', family?.id] })
      qc.invalidateQueries({ queryKey: ['active-session', family?.id] })
    },
  })
}

export function useUpdateEvent() {
  const { family } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (args: { id: string; updates: Partial<BailoteoEvent> }) => {
      if (navigator.onLine) {
        const { error } = await supabase
          .from('events')
          .update({ ...args.updates, updated_at: new Date().toISOString() })
          .eq('id', args.id)
        if (error) throw error
      } else {
        await queueMutation({
          table: 'events',
          operation: 'update',
          data: { id: args.id, ...args.updates },
        })
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events', family?.id] })
      qc.invalidateQueries({ queryKey: ['active-session', family?.id] })
    },
  })
}

export function useDeleteEvent() {
  const { family } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      if (navigator.onLine) {
        const { error } = await supabase
          .from('events')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', id)
        if (error) throw error
      } else {
        await queueMutation({ table: 'events', operation: 'soft_delete', data: { id } })
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events', family?.id] })
      qc.invalidateQueries({ queryKey: ['active-session', family?.id] })
    },
  })
}

export function useReminderSettings() {
  const { family } = useAuth()
  return useQuery({
    queryKey: ['reminder-settings', family?.id],
    enabled: !!family?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('reminder_settings')
        .select('*')
        .eq('family_id', family!.id)
        .maybeSingle()
      return data as ReminderSettings | null
    },
    staleTime: 1000 * 60 * 5,
  })
}
