'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useTheme } from 'next-themes'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Notification {
  id: string
  title: string
  body: string
  read: boolean
  created_at: string
}

interface TopBarProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  closeScore?: number
}

export function TopBar({ title, subtitle, actions, closeScore }: TopBarProps) {
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const [menuOpen, setMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifLoading, setNotifLoading] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const fetchNotifications = useCallback(async () => {
    setNotifLoading(true)
    try {
      const res = await fetch('/api/notifications?limit=10')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications ?? [])
        setUnreadCount(data.unreadCount ?? 0)
      }
    } finally {
      setNotifLoading(false)
    }
  }, [])

  // Fetch unread count on mount and every 60 seconds
  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60_000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  // Close dropdowns on outside click
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const openNotifications = async () => {
    setNotifOpen(v => !v)
    if (!notifOpen) await fetchNotifications()
  }

  const markAllRead = async () => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_all_read' }),
    })
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  const markRead = async (id: string) => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_read', id }),
    })
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const scoreColor = closeScore !== undefined
    ? closeScore >= 80 ? '#16A34A' : closeScore >= 50 ? '#D97706' : '#DC2626'
    : undefined

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60_000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-gray-100 bg-white sticky top-0 z-10">
      <div>
        <h1 className="font-semibold text-gray-900 text-base">{title}</h1>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        {closeScore !== undefined && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border" style={{ borderColor: scoreColor, background: `${scoreColor}10` }}>
            <div className="w-2 h-2 rounded-full" style={{ background: scoreColor }} aria-hidden="true"></div>
            <span className="text-xs font-semibold" style={{ color: scoreColor }}>
              Close Score: {closeScore}/100
            </span>
          </div>
        )}

        {actions}

        {/* Dark mode toggle */}
        {mounted && (
          <button
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle dark mode"
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
          >
            {resolvedTheme === 'dark' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>
        )}

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
            aria-haspopup="true"
            aria-expanded={notifOpen}
            onClick={openNotifications}
            className="relative p-2 rounded-lg hover:bg-gray-50 transition-colors text-gray-400 hover:text-gray-600"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center" aria-hidden="true">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div
              role="dialog"
              aria-label="Notifications"
              className="absolute right-0 top-11 w-80 bg-white rounded-xl border border-gray-100 shadow-lg z-50 overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="text-sm font-semibold text-gray-900">Notifications</span>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs font-medium" style={{ color: '#2E75B6' }}>
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto">
                {notifLoading && notifications.length === 0 ? (
                  <div className="py-8 text-center text-xs text-gray-400">Loading…</div>
                ) : notifications.length === 0 ? (
                  <div className="py-8 text-center">
                    <div className="text-2xl mb-2">🔔</div>
                    <p className="text-xs text-gray-400">No notifications yet</p>
                  </div>
                ) : (
                  notifications.map(n => (
                    <button
                      key={n.id}
                      onClick={() => markRead(n.id)}
                      className={`w-full text-left flex gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 ${!n.read ? 'bg-blue-50/40' : ''}`}
                    >
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!n.read ? 'bg-blue-500' : 'bg-transparent'}`} aria-hidden="true" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate">{n.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                        <p className="text-[10px] text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="User menu"
            aria-haspopup="true"
            aria-expanded={menuOpen}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
            style={{ background: '#1E3A5F' }}
          >
            C
          </button>
          {menuOpen && (
            <div role="menu" className="absolute right-0 top-10 w-44 bg-white rounded-xl border border-gray-100 shadow-lg py-1 z-50">
              <button role="menuitem" className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => router.push('/settings')}>Profile</button>
              <button role="menuitem" className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => router.push('/settings')}>Settings</button>
              <div className="border-t border-gray-100 my-1" role="separator"></div>
              <button role="menuitem" className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50" onClick={handleSignOut}>Sign out</button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
