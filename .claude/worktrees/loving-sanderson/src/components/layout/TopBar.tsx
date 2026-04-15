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
    ? closeScore >= 80 ? '#16A34A' : closeScore >= 50 ? '#D97706' : '#DC2626'
    : undefined

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-gray-100 bg-white sticky top-0 z-10">
      <div>
        <h1 className="font-semibold text-gray-900 text-base">{title}</h1>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        {/* Close Confidence Score Badge */}
        {closeScore !== undefined && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border" style={{ borderColor: scoreColor, background: `${scoreColor}10` }}>
            <div className="w-2 h-2 rounded-full" style={{ background: scoreColor }}></div>
            <span className="text-xs font-semibold" style={{ color: scoreColor }}>
              Close Score: {closeScore}/100
            </span>
          </div>
        )}

        {actions}

        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-gray-50 transition-colors text-gray-400 hover:text-gray-600">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500"></span>
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
            style={{ background: '#1E3A5F' }}
          >
            C
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-10 w-44 bg-white rounded-xl border border-gray-100 shadow-lg py-1 z-50">
              <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Profile</button>
              <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => router.push('/settings')}>Settings</button>
              <div className="border-t border-gray-100 my-1"></div>
              <button className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50" onClick={handleSignOut}>Sign out</button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
