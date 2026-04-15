'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#F8FAFC' }}>
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-2/5 p-12" style={{ background: '#1E3A5F' }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 8L6 12L14 4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="font-bold text-white text-lg">FinOpsAi</span>
        </div>
        <div>
          <blockquote className="text-white text-xl font-medium leading-relaxed mb-6">
            &ldquo;We cut our month-end close from 8 days to under 2 days in the first week. The AI anomaly explanations alone are worth the price.&rdquo;
          </blockquote>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white bg-opacity-20 flex items-center justify-center text-white font-semibold">SL</div>
            <div>
              <div className="text-white font-medium">Sarah Lin</div>
              <div className="text-blue-200 text-sm">Controller, Series B SaaS company</div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { val: '20–50 hrs', label: 'saved/month' },
            { val: '100%', label: 'AI-native' },
            { val: 'Same day', label: 'setup' },
          ].map(({ val, label }) => (
            <div key={val}>
              <div className="text-white font-bold text-lg">{val}</div>
              <div className="text-blue-300 text-xs">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#1E3A5F' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 8L6 12L14 4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-bold text-lg" style={{ color: '#1E3A5F' }}>FinOpsAi</span>
          </div>

          <h1 className="text-2xl font-bold mb-1" style={{ color: '#1E3A5F' }}>Welcome back</h1>
          <p className="text-gray-500 mb-8">Sign in to your FinOpsAi account</p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@company.com"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <Link href="/forgot-password" className="text-sm" style={{ color: '#2E75B6' }}>Forgot password?</Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
              />
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl text-sm bg-red-50 text-red-600 border border-red-100">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-medium text-white text-sm transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ background: '#1E3A5F' }}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-medium" style={{ color: '#2E75B6' }}>Start your free trial</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
