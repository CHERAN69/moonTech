'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

// ─── Icons ─────────────────────────────────────────────────────────────────

function FolderIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
      <line x1="12" y1="11" x2="12" y2="17"/>
      <line x1="9" y1="14" x2="15" y2="14"/>
    </svg>
  )
}

function InboxIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
    </svg>
  )
}

function ReviewIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <circle cx="10" cy="10" r="1.5" fill="currentColor" stroke="none"/>
    </svg>
  )
}

function BarChart3Icon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
      <polyline points="9 16 11 18 15 14"/>
    </svg>
  )
}

function FileTextIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  )
}

// ─── Badge ─────────────────────────────────────────────────────────────────

function NavBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
      {count > 99 ? '99+' : count}
    </span>
  )
}

// ─── Nav definition ────────────────────────────────────────────────────────

const NAV_WORKFLOW = [
  { label: 'Projects', href: '/projects', Icon: FolderIcon    },
  { label: 'Inbox',    href: '/inbox',    Icon: InboxIcon     },
  { label: 'Review',   href: '/review',   Icon: ReviewIcon    },
  { label: 'Close',    href: '/close',    Icon: CloseIcon     },
  { label: 'Reports',  href: '/reports',  Icon: BarChart3Icon },
]

const NAV_ADMIN = [
  { label: 'Audit',    href: '/audit',    Icon: FileTextIcon },
  { label: 'Settings', href: '/settings', Icon: SettingsIcon },
]

// ─── Sidebar ────────────────────────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname()
  const [reviewCount, setReviewCount] = useState(0)
  const [inboxCount, setInboxCount]   = useState(0)

  useEffect(() => {
    const fetchCounts = async () => {
      // Review badge: pending exceptions count
      try {
        const res = await fetch('/api/exceptions?resolution=pending&limit=1', { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          const total = data?.total ?? data?.exceptions?.length ?? 0
          setReviewCount(typeof total === 'number' ? total : 0)
        }
      } catch {
        // Silently fail — badge just won't show
      }

      // Inbox badge: unclassified uploads count (endpoint created in Phase 2)
      try {
        const res = await fetch('/api/inbox/count', { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          setInboxCount(data?.unclassified ?? 0)
        }
      } catch {
        // Silently fail — Phase 2 creates this endpoint
      }
    }

    fetchCounts()
    const interval = setInterval(fetchCounts, 60_000)
    return () => clearInterval(interval)
  }, [])

  return (
    <aside className="w-60 flex-shrink-0 flex flex-col border-r border-gray-100 bg-white h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-gray-100">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--navy)' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 8L6 12L14 4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <span className="font-bold text-base" style={{ color: 'var(--navy)' }}>FinOpsAi</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {/* Workflow */}
        <div className="space-y-0.5">
          <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Workflow</p>
          {NAV_WORKFLOW.map(({ label, href, Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            const badgeCount =
              label === 'Review' ? reviewCount :
              label === 'Inbox'  ? inboxCount  : 0

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  active
                    ? 'text-white'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                )}
                style={active ? { background: 'var(--navy)' } : {}}
              >
                <span className={active ? 'text-white' : 'text-gray-400'}>
                  <Icon />
                </span>
                <span className="flex-1">{label}</span>
                <NavBadge count={badgeCount} />
              </Link>
            )
          })}
        </div>

        {/* Divider */}
        <div className="my-3 border-t border-gray-100" />

        {/* Admin */}
        <div className="space-y-0.5">
          <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Admin</p>
          {NAV_ADMIN.map(({ label, href, Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  active
                    ? 'text-white'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                )}
                style={active ? { background: 'var(--navy)' } : {}}
              >
                <span className={active ? 'text-white' : 'text-gray-400'}>
                  <Icon />
                </span>
                <span className="flex-1">{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Bottom: upgrade card + security badge */}
      <div className="px-3 pb-4 space-y-3">
        <div className="rounded-xl p-4 bg-blue-50 dark:bg-blue-950/30">
          <div className="text-xs font-semibold mb-1" style={{ color: 'var(--navy)' }}>Starter Plan</div>
          <div className="text-xs text-gray-500 mb-3">876/1,000 transactions used</div>
          <div className="w-full h-1.5 bg-blue-100 dark:bg-blue-900/40 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: '87%', background: 'var(--blue)' }}></div>
          </div>
          <Link
            href="/settings/billing"
            className="mt-3 block text-center text-xs font-medium py-1.5 rounded-lg text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--blue)' }}
          >
            Upgrade to Growth →
          </Link>
        </div>

        {/* Security trust badge */}
        <Link
          href="/security"
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-100 bg-gray-50 hover:bg-green-50 hover:border-green-100 dark:border-gray-700 dark:bg-gray-800/50 dark:hover:bg-green-900/20 transition-colors group"
        >
          <span className="text-green-500 text-base">🔒</span>
          <div>
            <div className="text-[10px] font-semibold text-gray-700 group-hover:text-green-700">AES-256 · TLS 1.3</div>
            <div className="text-[9px] text-gray-400 group-hover:text-green-500">Your data is encrypted</div>
          </div>
        </Link>
      </div>
    </aside>
  )
}
