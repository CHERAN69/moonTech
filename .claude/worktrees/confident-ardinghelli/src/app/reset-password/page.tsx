'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [hasSession, setHasSession] = useState<boolean | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session)
      if (!session) {
        setError('Invalid or expired reset link. Please request a new one.')
      }
    })
  }, [])

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)

    // Redirect to dashboard after brief delay
    setTimeout(() => {
      router.push('/dashboard')
      router.refresh()
    }, 2000)
  }

  // Loading session check
  if (hasSession === null) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div
          className="w-8 h-8 rounded-full animate-spin"
          style={{ border: '2px solid var(--border)', borderTopColor: 'var(--brand)' }}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg-primary)' }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-10">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--brand)' }}
          >
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
              <path d="M2 8L6 12L14 4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="font-bold text-xl" style={{ color: 'var(--text-primary)' }}>ClosePilot AI</span>
        </div>

        <div
          className="rounded-2xl p-8"
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
          }}
        >
          {success ? (
            /* ── Success ── */
            <div className="text-center py-4">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
                style={{ background: 'var(--success-bg)' }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17L4 12"/>
                </svg>
              </div>
              <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Password updated</h1>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Your password has been reset successfully. Redirecting to dashboard...
              </p>
            </div>
          ) : (
            /* ── Form ── */
            <>
              <div className="text-center mb-7">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ background: 'var(--info-bg)' }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
                <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Set new password</h1>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Choose a strong password for your account.
                </p>
              </div>

              <form onSubmit={handleReset} className="space-y-5">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    New password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoFocus
                    disabled={!hasSession}
                    minLength={8}
                    placeholder="Min. 8 characters"
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all disabled:opacity-50"
                    style={{
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                    }}
                    onFocus={e => e.target.style.borderColor = 'var(--border-focus)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Confirm new password
                  </label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                    disabled={!hasSession}
                    minLength={8}
                    placeholder="Re-enter your password"
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all disabled:opacity-50"
                    style={{
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                    }}
                    onFocus={e => e.target.style.borderColor = 'var(--border-focus)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
                </div>

                {/* Password strength hints */}
                {password.length > 0 && (
                  <div className="space-y-1.5">
                    {[
                      { label: 'At least 8 characters', met: password.length >= 8 },
                      { label: 'Contains a number', met: /\d/.test(password) },
                      { label: 'Contains uppercase & lowercase', met: /[a-z]/.test(password) && /[A-Z]/.test(password) },
                    ].map(({ label, met }) => (
                      <div key={label} className="flex items-center gap-2 text-xs">
                        <div
                          className="w-3.5 h-3.5 rounded-full flex items-center justify-center"
                          style={{ background: met ? 'var(--success-bg)' : 'var(--bg-tertiary)' }}
                        >
                          {met && (
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20 6L9 17L4 12"/>
                            </svg>
                          )}
                        </div>
                        <span style={{ color: met ? 'var(--success)' : 'var(--text-tertiary)' }}>{label}</span>
                      </div>
                    ))}
                  </div>
                )}

                {error && (
                  <div
                    className="px-4 py-3 rounded-xl text-sm"
                    style={{
                      background: 'var(--error-bg)',
                      color: 'var(--error)',
                      border: '1px solid var(--error-border)',
                    }}
                  >
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !hasSession}
                  className="w-full py-3 rounded-xl font-medium text-sm transition-all hover:opacity-90 disabled:opacity-50"
                  style={{
                    background: 'var(--brand)',
                    color: 'white',
                  }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span
                        className="w-4 h-4 rounded-full animate-spin"
                        style={{ border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white' }}
                      />
                      Updating password...
                    </span>
                  ) : (
                    'Update password'
                  )}
                </button>
              </form>

              {!hasSession && (
                <div className="mt-5 text-center">
                  <a
                    href="/forgot-password"
                    className="text-sm font-medium transition-opacity hover:opacity-80"
                    style={{ color: 'var(--brand)' }}
                  >
                    Request a new reset link
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
