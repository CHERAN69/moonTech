'use client'

import Link from 'next/link'

interface Props {
  openAnomalies?: number
  pendingJournals?: number
  closeReady?: boolean
}

export function QuickActions({ openAnomalies = 0, pendingJournals = 0, closeReady = false }: Props) {
  const actions = [
    {
      label: 'New Reconciliation',
      desc: 'Upload bank or invoice CSV',
      href: '/reconcile/new',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
        </svg>
      ),
      iconBg: 'var(--info-bg)',
    },
    {
      label: 'Review Anomalies',
      desc: openAnomalies > 0 ? `${openAnomalies} items need attention` : 'No anomalies',
      href: '/exceptions',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      ),
      iconBg: 'var(--warning-bg)',
      badge: openAnomalies > 0 ? String(openAnomalies) : undefined,
      badgeColor: 'var(--warning)',
    },
    {
      label: 'Approve Journal Entries',
      desc: pendingJournals > 0 ? `${pendingJournals} drafts pending` : 'None pending',
      href: '/close?tab=journal',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
        </svg>
      ),
      iconBg: 'var(--success-bg)',
      badge: pendingJournals > 0 ? String(pendingJournals) : undefined,
      badgeColor: 'var(--success)',
    },
    {
      label: 'Generate Board Pack',
      desc: 'One-click financial report',
      href: '/reports',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
      ),
      iconBg: 'var(--purple-bg)',
    },
    {
      label: 'Sign Off Close',
      desc: closeReady ? 'Ready for sign-off' : 'Not ready yet',
      href: '/close',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17L4 12"/>
        </svg>
      ),
      iconBg: 'var(--bg-tertiary)',
      disabled: !closeReady,
    },
  ]

  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
    >
      <h2 className="font-semibold text-sm mb-4" style={{ color: 'var(--text-primary)' }}>Quick Actions</h2>
      <div className="space-y-1.5">
        {actions.map(action => (
          <Link
            key={action.label}
            href={action.disabled ? '#' : action.href}
            className={`flex items-center gap-3 p-3 rounded-xl transition-all ${action.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
            style={action.disabled ? {} : {}}
            onMouseEnter={e => {
              if (!action.disabled) e.currentTarget.style.background = 'var(--bg-hover)'
            }}
            onMouseLeave={e => {
              if (!action.disabled) e.currentTarget.style.background = 'transparent'
            }}
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: action.iconBg }}
            >
              {action.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{action.label}</div>
              <div className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>{action.desc}</div>
            </div>
            {action.badge && (
              <span
                className="text-xs font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                style={{ background: action.badgeColor, color: 'var(--text-inverse)' }}
              >
                {action.badge}
              </span>
            )}
            {!action.badge && !action.disabled && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
