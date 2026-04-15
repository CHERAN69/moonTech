'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface TopBarProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  closeScore?: number
}

export function TopBar({ title, subtitle, actions, closeScore }: TopBarProps) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const scoreColor = closeScore !== undefined
    ? closeScore >= 80 ? 'var(--success)' : closeScore >= 50 ? 'var(--warning)' : 'var(--error)'
    : undefined

  return (
    <header className="h-16 flex items-center justify-between px-6 sticky top-0 z-10"
      style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
      <div>
        <h1 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>{title}</h1>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        {closeScore !== undefined && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ border: `1px solid ${scoreColor}`, background: `${scoreColor}15` }}>
            <div className="w-2 h-2 rounded-full" style={{ background: scoreColor }}></div>
            <span className="text-xs font-semibold" style={{ color: scoreColor }}>
              Close Score: {closeScore}/100
            </span>
          </div>
        )}

        {actions}

        {/* Notifications */}
        <button className="relative p-2 rounded-lg transition-colors" style={{ color: 'var(--text-tertiary)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{ background: 'var(--error)' }}></span>
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
            style={{ background: 'var(--brand)' }}
          >
            C
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-10 w-44 rounded-xl py-1 z-50" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>
                <button className="w-full text-left px-4 py-2 text-sm transition-colors" style={{ color: 'var(--text-secondary)' }} onClick={() => router.push('/settings')}>Profile</button>
                <button className="w-full text-left px-4 py-2 text-sm transition-colors" style={{ color: 'var(--text-secondary)' }} onClick={() => router.push('/settings')}>Settings</button>
                <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }}></div>
                <button className="w-full text-left px-4 py-2 text-sm transition-colors" style={{ color: 'var(--error)' }} onClick={handleSignOut}>Sign out</button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
