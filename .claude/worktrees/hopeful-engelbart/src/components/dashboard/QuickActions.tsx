import Link from 'next/link'

interface QuickActionsProps {
  anomalyCount?: number
  pendingJournals?: number
  closeScore?: number
}

export function QuickActions({ anomalyCount = 0, pendingJournals = 0, closeScore = 0 }: QuickActionsProps) {
  const actions = [
    {
      label: 'New Reconciliation',
      desc: 'Upload bank or invoice CSV',
      href: '/reconcile/new',
      color: 'var(--info-bg)',
    },
    {
      label: 'Review Anomalies',
      desc: anomalyCount > 0 ? `${anomalyCount} items need attention` : 'No anomalies',
      href: '/exceptions',
      badge: anomalyCount > 0 ? String(anomalyCount) : undefined,
      badgeColor: 'var(--warning)',
    },
    {
      label: 'Approve Journal Entries',
      desc: pendingJournals > 0 ? `${pendingJournals} drafts pending approval` : 'No pending entries',
      href: '/close?tab=journal',
      badge: pendingJournals > 0 ? String(pendingJournals) : undefined,
      badgeColor: 'var(--success)',
    },
    {
      label: 'Generate Board Pack',
      desc: 'One-click financial report',
      href: '/reports',
    },
    {
      label: 'Sign Off Close',
      desc: closeScore >= 80 ? 'Ready for sign-off' : `Score: ${closeScore}/100 — not ready`,
      href: '/close',
      disabled: closeScore < 80,
    },
  ]

  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
      <h2 className="font-semibold text-sm mb-4" style={{ color: 'var(--text-primary)' }}>Quick Actions</h2>
      <div className="space-y-2">
        {actions.map(action => (
          <Link
            key={action.label}
            href={action.disabled ? '#' : action.href}
            className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${action.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
            style={{ background: 'transparent' }}
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{action.label}</div>
              <div className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>{action.desc}</div>
            </div>
            {action.badge && (
              <span className="text-xs font-bold px-1.5 py-0.5 rounded-full text-white flex-shrink-0" style={{ background: action.badgeColor }}>
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
