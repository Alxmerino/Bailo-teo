import { supabase } from './supabase'

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function syntheticEmail(displayName: string, familyId: string): string {
  return `${slugify(displayName)}@${familyId}.bailoteo.local`
}

function pinToPassword(pin: string): string {
  return `${pin}bt${pin}`
}

export async function signUpParent(
  email: string,
  password: string,
  displayName: string,
  familyName: string,
  timezone: string = Intl.DateTimeFormat().resolvedOptions().timeZone
) {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw error
  if (!data.user) throw new Error('Signup failed')
  if (!data.session) throw new Error('Check your email to confirm your account, then sign in')

  const { error: rpcError } = await supabase.rpc('create_parent_profile', {
    p_display_name: displayName,
    p_family_name: familyName,
    p_timezone: timezone,
  })
  if (rpcError) throw rpcError

  return data
}

export async function signInParent(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signUpCaregiver(
  inviteCode: string,
  displayName: string,
  pin: string
) {
  // Look up invite code to get family_id (expiry validated by join_family_with_code RPC)
  const { data: codeRow, error: codeErr } = await supabase
    .from('invite_codes')
    .select('family_id')
    .eq('code', inviteCode.toUpperCase())
    .maybeSingle()

  if (codeErr) throw codeErr
  if (!codeRow) throw new Error('Invalid invite code')

  // Clear any existing session so signUp returns a clean caregiver session
  await supabase.auth.signOut()

  const email = syntheticEmail(displayName, codeRow.family_id)

  const { data, error } = await supabase.auth.signUp({ email, password: pinToPassword(pin) })
  if (error) throw error
  if (!data.user) throw new Error('Signup failed')
  if (!data.session) throw new Error('Check your email to confirm your account, then sign in')

  const { error: rpcError } = await supabase.rpc('join_family_with_code', {
    p_code: inviteCode.toUpperCase(),
    p_display_name: displayName,
  })
  if (rpcError) throw rpcError

  return data
}

export async function signInCaregiver(
  familyCode: string,
  displayName: string,
  pin: string
) {
  // Look up family_id from permanent family code (unauthenticated-safe SECURITY DEFINER fn)
  const { data: familyId, error: fnErr } = await supabase.rpc('get_family_id_by_code', {
    p_family_code: familyCode.toUpperCase(),
  })

  if (fnErr) throw fnErr
  if (!familyId) throw new Error('Family code not found')

  const email = syntheticEmail(displayName, familyId)

  const { data, error } = await supabase.auth.signInWithPassword({ email, password: pinToPassword(pin) })
  if (error) {
    if (error.message.includes('Invalid login')) {
      throw new Error('Name, PIN, or family code is incorrect')
    }
    throw error
  }
  return data
}

export async function signOut() {
  await supabase.auth.signOut()
}
