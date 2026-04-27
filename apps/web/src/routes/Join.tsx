import { useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { caregiverSignupSchema } from '@bailoteo/shared'
import type { z } from 'zod'
import { signUpCaregiver } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { Copy } from 'lucide-react'

export default function Join() {
  const { code: paramCode } = useParams<{ code?: string }>()
  const navigate = useNavigate()
  const { refreshProfile } = useAuth()
  const [familyCode, setFamilyCode] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof caregiverSignupSchema>>({
    resolver: zodResolver(caregiverSignupSchema),
    defaultValues: { inviteCode: paramCode ?? '' },
  })

  async function onSubmit(data: z.infer<typeof caregiverSignupSchema>) {
    try {
      await signUpCaregiver(data.inviteCode, data.displayName, data.pin)
      await refreshProfile()
      // Fetch family code to display on success screen
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: prof } = await supabase.from('profiles').select('family_id').eq('id', user.id).maybeSingle()
        if (prof) {
          const { data: fam } = await supabase.from('families').select('family_code').eq('id', prof.family_id).maybeSingle()
          if (fam?.family_code) { setFamilyCode(fam.family_code); return }
        }
      }
      navigate('/')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to join')
    }
  }

  if (familyCode) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm text-center">
          <div className="mb-4 text-5xl">🎉</div>
          <h1 className="mb-2 text-2xl font-bold">You're in!</h1>
          <p className="mb-6 text-sm text-muted-foreground">
            Save your family code — you'll need it along with your name and PIN to log back in.
          </p>
          <div className="mb-6 rounded-2xl border border-border bg-card p-5">
            <p className="mb-1 text-xs text-muted-foreground">Family login code</p>
            <p className="mb-3 font-mono text-3xl font-bold tracking-widest text-primary">{familyCode}</p>
            <button
              onClick={() => { navigator.clipboard.writeText(familyCode); toast.success('Copied') }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-secondary py-2.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <Copy size={14} /> Copy code
            </button>
          </div>
          <button
            onClick={() => navigate('/')}
            className="w-full rounded-2xl bg-primary py-4 text-primary-foreground font-semibold text-base active:scale-95 transition-transform"
          >
            Get started
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-center text-3xl font-bold">Join family</h1>
        <p className="mb-8 text-center text-sm text-muted-foreground">
          Enter the invite code from a family member
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Invite code</label>
            <input
              type="text"
              placeholder="XXXXXX"
              autoCapitalize="characters"
              defaultValue={paramCode ?? ''}
              {...register('inviteCode')}
              className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-base uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.inviteCode && <p className="mt-1 text-xs text-destructive">{errors.inviteCode.message}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Your name</label>
            <input
              type="text"
              autoComplete="name"
              placeholder="What should we call you?"
              {...register('displayName')}
              className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.displayName && <p className="mt-1 text-xs text-destructive">{errors.displayName.message}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Choose a 4-digit PIN</label>
            <p className="mb-2 text-xs text-muted-foreground">Used to sign in on new devices</p>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              autoComplete="new-password"
              {...register('pin')}
              className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-base tracking-widest focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.pin && <p className="mt-1 text-xs text-destructive">{errors.pin.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-2xl bg-primary py-4 text-primary-foreground font-semibold text-base active:scale-95 transition-transform disabled:opacity-50"
          >
            {isSubmitting ? 'Joining...' : 'Join Family'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already joined?{' '}
          <Link to="/login" className="text-primary underline-offset-2 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
