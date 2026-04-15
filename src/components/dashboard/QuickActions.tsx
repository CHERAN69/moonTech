import Link from 'next/link'

interface Props {
  anomalyCount?: number
  journalCount?: number
  closeScore?: number
}

export function QuickActions({ anomalyCount = 0, journalCount = 0, closeScore = 0 }: Props) {
  const canSignOff = closeScore >= 85

  const actions = [
    {
      label: 'New Reconciliation',
      desc:  'Upload bank or invoice CSV',
      href:  '/reconcile/new',
      icon:  '🔄',
      color: '#EFF6FF',
    },
    {
      label: 'Review Anomalies',
      desc:  anomalyCount > 0 ? `${anomalyCount} items need your attention` : 'No open anomalies',
      href:  '/exceptions',
      icon:  '⚠️',
      color: '#FFFBEB',
      badge: anomalyCount > 0 ? String(anomalyCount) : undefined,
      badgeColor: '#D97706',
    },
    {
      label: 'Approve Journal Entries',
      desc:  journalCount > 0 ? `${journalCount} drafts pending approval` : 'No pending entries',
      href:  '/close?tab=journal',
      icon:  '📓',
      color: '#F0FDF4',
      badge: journalCount > 0 ? String(journalCount) : undefined,
      badgeColor: '#16A34A',
    },
    {
      label: 'Generate Board Pack',
      desc:  'One-click financial report',
      href:  '/reports',
      icon:  '📊',
      color: '#FDF4FF',
    },
    {
      label: 'Sign Off Close',
      desc:  canSignOff ? `Score: ${closeScore}/100 — ready!` : `Score: ${closeScore}/100 — not ready`,
      href:  '/close',
      icon:  '✅',
      color: canSignOff ? '#F0FDF4' : '#F3F4F6',
      disabled: !canSignOff,
    },
  ]

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <h2 className="font-semibold text-gray-900 text-sm mb-4">Quick Actions</h2>
      <nav aria-label="Quick actions">
        <div className="space-y-2">
          {actions.map(action => (
            <Link
              key={action.label}
              href={action.disabled ? '#' : action.href}
              aria-disabled={action.disabled}
              aria-label={`${action.label}: ${action.desc}`}
              className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${action.disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'hover:bg-gray-50'}`}
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-lg" style={{ background: action.color }} aria-hidden="true">
                {action.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-800 truncate">{action.label}</div>
                <div className="text-xs text-gray-400 truncate">{action.desc}</div>
              </div>
              {action.badge && (
                <span
                  className="text-xs font-bold px-1.5 py-0.5 rounded-full text-white flex-shrink-0"
                  style={{ background: action.badgeColor }}
                  aria-label={`${action.badge} items`}
                >
                  {action.badge}
                </span>
              )}
              {!action.badge && !action.disabled && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              )}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  )
}
