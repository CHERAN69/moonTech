'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const router = useRouter()
  const [form, setForm] = useState({ fullName: '', companyName: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()

    const { data, error: signupError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.fullName,
          company_name: form.companyName,
        },
        emailRedirectTo: `${window.location.origin}/auth/reset-password`,
      },
    })

    if (signupError) {
      setError(signupError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      // Insert profile row regardless — user ID is always returned
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email: form.email,
        full_name: form.fullName,
        company_name: form.companyName,
        role: 'owner',
        subscription_tier: 'starter',
        subscription_status: 'trialing',
      })

      if (data.session) {
        // Email confirmation disabled in Supabase — user is immediately active
        router.push('/dashboard')
        router.refresh()
      } else {
        // Email confirmation required — show check-your-email screen
        setEmailSent(true)
        setLoading(false)
      }
    }
  }

  const update = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8" style={{ background: '#F8FAFC' }}>
        <div className="w-full max-w-md text-center">
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#1E3A5F' }}>
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                <path d="M2 8L6 12L14 4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-bold text-xl" style={{ color: '#1E3A5F' }}>FinOpsAi</span>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
            <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-5">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2E75B6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
              </svg>
            </div>
            <h1 className="text-xl font-bold mb-2" style={{ color: '#1E3A5F' }}>Check your email</h1>
            <p className="text-sm text-gray-500 mb-1">We sent a confirmation link to</p>
            <p className="text-sm font-semibold text-gray-800 mb-5">{form.email}</p>
            <p className="text-xs text-gray-400 mb-6 leading-relaxed">
              Click the link in the email to verify your account and get started. Check your spam folder if you don't see it.
            </p>
            <Link
              href="/login"
              className="block w-full py-3 rounded-xl font-semibold text-white text-sm text-center transition-opacity hover:opacity-90"
              style={{ background: '#1E3A5F' }}
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ background: '#F8FAFC' }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#1E3A5F' }}>
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
              <path d="M2 8L6 12L14 4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="font-bold text-xl" style={{ color: '#1E3A5F' }}>FinOpsAi</span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
          <h1 className="text-xl font-bold mb-1 text-center" style={{ color: '#1E3A5F' }}>Start your free 14-day trial</h1>
          <p className="text-sm text-gray-400 text-center mb-7">No credit card required · Cancel anytime</p>

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="fullName" className="block text-xs font-medium text-gray-600 mb-1.5">Full name</label>
                <input id="fullName" type="text" value={form.fullName} onChange={update('fullName')} required placeholder="Jane Smith"
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all" />
              </div>
              <div>
                <label htmlFor="companyName" className="block text-xs font-medium text-gray-600 mb-1.5">Company name</label>
                <input id="companyName" type="text" value={form.companyName} onChange={update('companyName')} required placeholder="Acme Inc."
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all" />
              </div>
            </div>
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-gray-600 mb-1.5">Work email</label>
              <input id="email" type="email" value={form.email} onChange={update('email')} required placeholder="jane@acme.com"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all" />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-gray-600 mb-1.5">Password</label>
              <input id="password" type="password" value={form.password} onChange={update('password')} required placeholder="Min. 8 characters" minLength={8}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all" />
            </div>

            {/* Legal compliance checkbox — required before account creation */}
            <div className="flex items-start gap-3 pt-1">
              <input
                id="tos"
                type="checkbox"
                required
                className="mt-0.5 w-4 h-4 rounded border-gray-300 accent-blue-700"
                aria-required="true"
              />
              <label htmlFor="tos" className="text-xs text-gray-500 leading-relaxed cursor-pointer">
                I agree to the{' '}
                <Link href="/terms" className="underline font-medium" style={{ color: '#2E75B6' }}>Terms of Service</Link>
                {' '}and{' '}
                <Link href="/privacy" className="underline font-medium" style={{ color: '#2E75B6' }}>Privacy Policy</Link>
                . I understand that FinOpsAi stores and processes financial transaction data on my behalf.
              </label>
            </div>

            {error && (
              <div className="px-3 py-2.5 rounded-lg text-sm bg-red-50 text-red-600 border border-red-100" role="alert">{error}</div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-white text-sm transition-opacity hover:opacity-90 disabled:opacity-60 mt-2"
              style={{ background: '#1E3A5F' }}>
              {loading ? 'Creating account...' : 'Create free account →'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-5">
          Already have an account?{' '}
          <Link href="/login" className="font-medium" style={{ color: '#2E75B6' }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}
