interface Props {
  title: string
  value: string
  change: string
  changeType: 'positive' | 'negative' | 'warning' | 'neutral'
  icon: string
  sub?: string
}

const changeColors = {
  positive: { bg: '#F0FDF4', text: '#16A34A' },
  negative: { bg: '#FEF2F2', text: '#DC2626' },
  warning: { bg: '#FFFBEB', text: '#D97706' },
  neutral: { bg: '#F3F4F6', text: '#6B7280' },
}

export function MetricCard({ title, value, change, changeType, icon, sub }: Props) {
  const colors = changeColors[changeType]
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-gray-200 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: colors.bg, color: colors.text }}>
          {change}
        </span>
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
      <div className="text-xs text-gray-400">{title}</div>
      {sub && <div className="text-xs text-gray-300 mt-0.5">{sub}</div>}
    </div>
  )
}
