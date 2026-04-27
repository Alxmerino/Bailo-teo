import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { parentSignupSchema } from '@bailoteo/shared'
import type { z } from 'zod'
import { signUpParent } from '@/lib/auth'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

export default function Signup() {
  const navigate = useNavigate()
  const { refreshProfile } = useAuth()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof parentSignupSchema>>({
    resolver: zodResolver(parentSignupSchema),
  })

  async function onSubmit(data: z.infer<typeof parentSignupSchema>) {
    try {
      await signUpParent(data.email, data.password, data.displayName, data.familyName)
      await refreshProfile()
      toast.success('Account created!')
      navigate('/')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Signup failed')
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-center text-3xl font-bold">Create account</h1>
        <p className="mb-8 text-center text-sm text-muted-foreground">Set up your family on BailoTeo</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Your name</label>
            <input
              type="text"
              autoComplete="name"
              {...register('displayName')}
              className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.displayName && <p className="mt-1 text-xs text-destructive">{errors.displayName.message}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Family name</label>
            <input
              type="text"
              placeholder="e.g. The Garcias"
              {...register('familyName')}
              className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.familyName && <p className="mt-1 text-xs text-destructive">{errors.familyName.message}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Email</label>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              {...register('email')}
              className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Password</label>
            <input
              type="password"
              autoComplete="new-password"
              {...register('password')}
              className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-2xl bg-primary py-4 text-primary-foreground font-semibold text-base active:scale-95 transition-transform disabled:opacity-50"
          >
            {isSubmitting ? 'Creating...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="text-primary underline-offset-2 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
