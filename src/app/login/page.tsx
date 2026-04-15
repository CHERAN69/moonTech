'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const MAX_ATTEMPTS  = 5
const LOCKOUT_MS    = 5 * 60 * 1000  // 5 minutes

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [error, setError]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [attempts, setAttempts]     = useState(0)
  const [isLocked, setIsLocked]     = useState(false)
  const unlockTimerRef              = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (isLocked) {
      setError('Too many failed attempts. Account is temporarily locked for 5 minutes.')
      return
    }

    setLoading(true)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      const newAttempts = attempts + 1
      setAttempts(newAttempts)

      if (newAttempts >= MAX_ATTEMPTS) {
        setIsLocked(true)
        setError('Too many failed attempts. Account temporarily locked for 5 minutes.')
        // Auto-unlock after LOCKOUT_MS
        if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current)
        unlockTimerRef.current = setTimeout(() => {
          setIsLocked(false)
          setAttempts(0)
          setError('')
        }, LOCKOUT_MS)
      } else {
        const remaining = MAX_ATTEMPTS - newAttempts
        setError(
          `${authError.message}${remaining <= 2 ? ` (${remaining} attempt${remaining === 1 ? '' : 's'} remaining before lockout)` : ''}`
        )
      }
      setLoading(false)
    } else {
      // Reset on success
      setAttempts(0)
      setIsLocked(false)
      if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current)
      router.push('/inbox')
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
                disabled={isLocked}
                placeholder="you@company.com"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                disabled={isLocked}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Attempt counter warning */}
            {attempts > 0 && attempts < MAX_ATTEMPTS && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-100 text-xs text-amber-700">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                {MAX_ATTEMPTS - attempts} attempt{MAX_ATTEMPTS - attempts === 1 ? '' : 's'} remaining before lockout
              </div>
            )}

            {/* Lockout state */}
            {isLocked && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-100 text-xs text-red-700">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                Account locked · Try again in 5 minutes
              </div>
            )}

            {error && !isLocked && (
              <div className="px-4 py-3 rounded-xl text-sm bg-red-50 text-red-600 border border-red-100" role="alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || isLocked}
              className="w-full py-3 rounded-xl font-medium text-white text-sm transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: '#1E3A5F' }}
            >
              {loading ? 'Signing in…' : isLocked ? 'Account Locked' : 'Sign in'}
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
