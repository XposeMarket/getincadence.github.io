'use client'

import { useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import { VERTICALS, VERTICAL_CATEGORIES, VerticalId } from '@/lib/verticals'

function SignupForm() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [orgName, setOrgName] = useState('')
  const [industryType, setIndustryType] = useState<VerticalId>('default')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // Get redirect URL and plan from query params
  const redirectTo = searchParams.get('redirect') || '/dashboard'
  const selectedPlan = searchParams.get('plan')
  const billingPeriod = searchParams.get('period') || 'monthly'

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            full_name: fullName,
            org_name: orgName,
            industry_type: industryType,
          },
        },
      })

      if (authError) {
        if (authError.message.includes('rate limit')) {
          setError('Too many signup attempts. Please try again in a few minutes or use a different email address.')
        } else if (authError.message.includes('User already registered')) {
          setError('An account with this email already exists. Please sign in instead.')
        } else {
          setError(authError.message)
        }
        setLoading(false)
        return
      }

      if (!authData.user) {
        setError('Failed to create account. Please try again.')
        setLoading(false)
        return
      }

      // Check if email confirmation is required
      if (authData.session) {
        // No confirmation needed - set up account immediately
        const res = await fetch('/api/auth/setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: authData.user.id,
            email,
            fullName,
            orgName,
            industryType,
          }),
        })

        if (!res.ok) {
          const data = await res.json()
          setError(data.error || 'Failed to set up account')
          setLoading(false)
          return
        }

        // If user selected a paid plan, go directly to Stripe checkout
        if (selectedPlan && ['starter', 'team', 'growth'].includes(selectedPlan)) {
          try {
            const checkoutRes = await fetch('/api/stripe/checkout', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                plan: selectedPlan, 
                period: billingPeriod 
              }),
            })

            const checkoutData = await checkoutRes.json()

            if (checkoutRes.ok && checkoutData.url) {
              // Redirect directly to Stripe checkout
              window.location.href = checkoutData.url
              return
            }
          } catch (err) {
            console.error('Auto-checkout error:', err)
            // Fall through to dashboard if checkout fails
          }
        }

        // No plan selected or checkout failed - go to dashboard
        router.push('/dashboard')
        router.refresh()
      } else {
        // Email confirmation required - redirect to verification page
        if (selectedPlan) {
          sessionStorage.setItem('pendingPlan', selectedPlan)
          sessionStorage.setItem('pendingPeriod', billingPeriod)
        }
        router.push('/verify-email')
      }
    } catch (err) {
      console.error('Signup error:', err)
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  // Build login link with redirect params
  const loginParams = new URLSearchParams()
  if (redirectTo !== '/dashboard') loginParams.set('redirect', redirectTo)
  if (selectedPlan) loginParams.set('plan', selectedPlan)
  if (billingPeriod !== 'monthly') loginParams.set('period', billingPeriod)
  const loginHref = loginParams.toString() ? `/login?${loginParams.toString()}` : '/login'

  return (
    <div className="animate-fade-in">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Create your account</h2>
      <p className="text-gray-600 mb-8">Start managing your relationships with Cadence</p>

      {selectedPlan && (
        <div className="mb-6 p-3 bg-primary-50 border border-primary-200 rounded-lg text-sm text-primary-700">
          Create an account to start your <span className="font-semibold capitalize">{selectedPlan}</span> plan 14-day trial
        </div>
      )}

      <form onSubmit={handleSignup} className="space-y-5">
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1.5">
            Full name
          </label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="John Smith"
            required
            className="input"
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
            Email address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            required
            className="input"
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="orgName" className="block text-sm font-medium text-gray-700 mb-1.5">
            Company / Organization name
          </label>
          <input
            id="orgName"
            type="text"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            placeholder="Acme Inc"
            required
            className="input"
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="industryType" className="block text-sm font-medium text-gray-700 mb-1.5">
            Industry type
          </label>
          <select
            id="industryType"
            value={industryType}
            onChange={(e) => setIndustryType(e.target.value as VerticalId)}
            className="input"
            disabled={loading}
          >
            {Object.entries(VERTICAL_CATEGORIES).map(([catId, cat]) => (
              <optgroup key={catId} label={cat.label}>
                {cat.verticals.map((vId) => (
                  <option key={vId} value={vId}>
                    {VERTICALS[vId].label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-gray-500">
            {VERTICALS[industryType].description}
          </p>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
              className="input pr-10"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              disabled={loading}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <p className="mt-1.5 text-xs text-gray-500">Must be at least 8 characters</p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary w-full h-11"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin mr-2" />
              {selectedPlan ? 'Creating account & starting trial...' : 'Creating account...'}
            </>
          ) : (
            selectedPlan ? `Start ${selectedPlan} trial` : 'Create account'
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        Already have an account?{' '}
        <Link href={loginHref} className="font-medium text-primary-600 hover:text-primary-500">
          Sign in
        </Link>
      </p>
    </div>
  )
}

function SignupFormFallback() {
  return (
    <div className="animate-fade-in">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Create your account</h2>
      <p className="text-gray-600 mb-8">Start managing your relationships with Cadence</p>
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="md" />
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={<SignupFormFallback />}>
      <SignupForm />
    </Suspense>
  )
}
