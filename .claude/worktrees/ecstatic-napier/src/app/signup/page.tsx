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
      },
    })

    if (signupError) {
      setError(signupError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      // Insert profile row
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email: form.email,
        full_name: form.fullName,
        company_name: form.companyName,
        role: 'owner',
        subscription_tier: 'starter',
        subscription_status: 'trialing',
      })
      router.push('/dashboard')
      router.refresh()
    }
  }

  const update = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

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
          <span className="font-bold text-xl" style={{ color: '#1E3A5F' }}>ClosePilot AI</span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
          <h1 className="text-xl font-bold mb-1 text-center" style={{ color: '#1E3A5F' }}>Start your free 14-day trial</h1>
          <p className="text-sm text-gray-400 text-center mb-7">No credit card required · Cancel anytime</p>

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Full name</label>
                <input type="text" value={form.fullName} onChange={update('fullName')} required placeholder="Jane Smith"
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Company name</label>
                <input type="text" value={form.companyName} onChange={update('companyName')} required placeholder="Acme Inc."
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Work email</label>
              <input type="email" value={form.email} onChange={update('email')} required placeholder="jane@acme.com"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Password</label>
              <input type="password" value={form.password} onChange={update('password')} required placeholder="Min. 8 characters" minLength={8}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all" />
            </div>

            {error && (
              <div className="px-3 py-2.5 rounded-lg text-sm bg-red-50 text-red-600 border border-red-100">{error}</div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-white text-sm transition-opacity hover:opacity-90 disabled:opacity-60 mt-2"
              style={{ background: '#1E3A5F' }}>
              {loading ? 'Creating account...' : 'Create free account →'}
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-5">
            By signing up you agree to our{' '}
            <Link href="/terms" className="underline">Terms</Link> and{' '}
            <Link href="/privacy" className="underline">Privacy Policy</Link>
          </p>
        </div>

        <p className="text-center text-sm text-gray-500 mt-5">
          Already have an account?{' '}
          <Link href="/login" className="font-medium" style={{ color: '#2E75B6' }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}
