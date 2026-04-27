import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { signInParent, signInCaregiver } from '@/lib/auth'
import { toast } from 'sonner'

type Mode = 'parent' | 'caregiver'

const parentSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Required'),
})

const caregiverSchema = z.object({
  inviteCode: z.string().length(6, '6-character code required'),
  displayName: z.string().min(1, 'Required'),
  pin: z.string().regex(/^\d{4}$/, '4-digit PIN'),
})

export default function Login() {
  const [mode, setMode] = useState<Mode>('parent')
  const navigate = useNavigate()

  const parentForm = useForm<z.infer<typeof parentSchema>>({ resolver: zodResolver(parentSchema) })
  const caregiverForm = useForm<z.infer<typeof caregiverSchema>>({ resolver: zodResolver(caregiverSchema) })

  async function onParentSubmit(data: z.infer<typeof parentSchema>) {
    try {
      await signInParent(data.email, data.password)
      navigate('/')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Sign in failed')
    }
  }

  async function onCaregiverSubmit(data: z.infer<typeof caregiverSchema>) {
    try {
      await signInCaregiver(data.inviteCode, data.displayName, data.pin)
      navigate('/')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Sign in failed')
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-center text-3xl font-bold tracking-tight">BailoTeo</h1>
        <p className="mb-8 text-center text-sm text-muted-foreground">Baby activity tracker</p>

        <div className="mb-6 flex rounded-xl bg-secondary p-1">
          {(['parent', 'caregiver'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 rounded-lg py-2 text-sm font-medium capitalize transition-colors ${
                mode === m ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              {m === 'parent' ? 'Parent' : 'Caregiver'}
            </button>
          ))}
        </div>

        {mode === 'parent' ? (
          <form onSubmit={parentForm.handleSubmit(onParentSubmit)} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Email</label>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                {...parentForm.register('email')}
                className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {parentForm.formState.errors.email && (
                <p className="mt-1 text-xs text-destructive">{parentForm.formState.errors.email.message}</p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Password</label>
              <input
                type="password"
                autoComplete="current-password"
                {...parentForm.register('password')}
                className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button
              type="submit"
              disabled={parentForm.formState.isSubmitting}
              className="w-full rounded-2xl bg-primary py-4 text-primary-foreground font-semibold text-base active:scale-95 transition-transform disabled:opacity-50"
            >
              {parentForm.formState.isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        ) : (
          <form onSubmit={caregiverForm.handleSubmit(onCaregiverSubmit)} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Family invite code</label>
              <input
                type="text"
                placeholder="XXXXXX"
                autoCapitalize="characters"
                {...caregiverForm.register('inviteCode')}
                className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-base uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {caregiverForm.formState.errors.inviteCode && (
                <p className="mt-1 text-xs text-destructive">{caregiverForm.formState.errors.inviteCode.message}</p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Your name</label>
              <input
                type="text"
                autoComplete="name"
                {...caregiverForm.register('displayName')}
                className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">4-digit PIN</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                autoComplete="current-password"
                {...caregiverForm.register('pin')}
                className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-base tracking-widest focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button
              type="submit"
              disabled={caregiverForm.formState.isSubmitting}
              className="w-full rounded-2xl bg-primary py-4 text-primary-foreground font-semibold text-base active:scale-95 transition-transform disabled:opacity-50"
            >
              {caregiverForm.formState.isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        )}

        <div className="mt-6 space-y-2 text-center text-sm text-muted-foreground">
          {mode === 'parent' && (
            <p>
              New?{' '}
              <Link to="/signup" className="text-primary underline-offset-2 hover:underline">
                Create account
              </Link>
            </p>
          )}
          <p>
            Have an invite code?{' '}
            <Link to="/join" className="text-primary underline-offset-2 hover:underline">
              Join family
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
