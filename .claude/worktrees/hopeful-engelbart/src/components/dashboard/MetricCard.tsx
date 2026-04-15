interface Props {
  title: string
  value: string
  change: string
  changeType: 'positive' | 'negative' | 'warning' | 'neutral'
  icon: string
  sub?: string
}

const changeColors: Record<string, { bg: string; text: string }> = {
  positive: { bg: 'var(--success-bg)', text: 'var(--success)' },
  negative: { bg: 'var(--error-bg)', text: 'var(--error)' },
  warning:  { bg: 'var(--warning-bg)', text: 'var(--warning)' },
  neutral:  { bg: 'var(--bg-tertiary)', text: 'var(--text-tertiary)' },
}

export function MetricCard({ title, value, change, changeType, icon, sub }: Props) {
  const colors = changeColors[changeType]
  return (
    <div className="rounded-2xl p-5 transition-colors" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: colors.bg, color: colors.text }}>
          {change}
        </span>
      </div>
      <div className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{value}</div>
      <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{title}</div>
      {sub && <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{sub}</div>}
    </div>
  )
}
