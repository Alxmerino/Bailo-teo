import { useNavigate, useParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { caregiverSignupSchema } from '@bailoteo/shared'
import type { z } from 'zod'
import { signUpCaregiver } from '@/lib/auth'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

export default function Join() {
  const { code: paramCode } = useParams<{ code?: string }>()
  const navigate = useNavigate()
  const { refreshProfile } = useAuth()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof caregiverSignupSchema>>({
    resolver: zodResolver(caregiverSignupSchema),
    defaultValues: { inviteCode: paramCode ?? '' },
  })

  async function onSubmit(data: z.infer<typeof caregiverSignupSchema>) {
    try {
      await signUpCaregiver(data.inviteCode, data.displayName, data.pin)
      await refreshProfile()
      toast.success('Welcome to the family!')
      navigate('/')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to join')
    }
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
