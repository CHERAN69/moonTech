'use client'

interface Props {
  score: number
  matchedRate?: number
  openAnomalies?: number
  pendingJournals?: number
}

export function CloseConfidenceGauge({ score, matchedRate = 0, openAnomalies = 0, pendingJournals = 0 }: Props) {
  const color = score >= 80 ? 'var(--success)' : score >= 50 ? 'var(--warning)' : 'var(--error)'
  const label = score >= 80 ? 'Close Ready' : score >= 50 ? 'In Progress' : 'Needs Attention'
  const bgColor = score >= 80 ? 'var(--success-bg)' : score >= 50 ? 'var(--warning-bg)' : 'var(--error-bg)'

  return (
    <div className="rounded-2xl p-6 h-full flex flex-col" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Close Confidence Score</h2>
        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: bgColor, color }}>
          {label}
        </span>
      </div>
      <p className="text-xs mb-6" style={{ color: 'var(--text-tertiary)' }}>April 2026 · Updated 2 min ago</p>

      <div className="flex flex-col items-center flex-1 justify-center">
        <div className="relative">
          <svg width="180" height="100" viewBox="0 0 180 100">
            <path d="M 10 90 A 80 80 0 0 1 170 90" fill="none" stroke="var(--bg-tertiary)" strokeWidth="14" strokeLinecap="round" />
            <path d="M 10 90 A 80 80 0 0 1 170 90" fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
              strokeDasharray={`${(score / 100) * 251.3} 251.3`}
              style={{ transition: 'stroke-dasharray 0.8s ease' }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
            <span className="text-5xl font-bold" style={{ color }}>{score}</span>
            <span className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>out of 100</span>
          </div>
        </div>

        <div className="mt-4 w-full space-y-2">
          {[
            { label: 'Matched transactions', val: matchedRate > 0 ? `${matchedRate}%` : '—', color: 'var(--success)' },
            { label: 'Open anomalies', val: openAnomalies > 0 ? `${openAnomalies} flagged` : '0 flagged', color: 'var(--warning)' },
            { label: 'Journal entries pending', val: pendingJournals > 0 ? `${pendingJournals} drafts` : '0 drafts', color: 'var(--brand)' },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: item.color }}></span>
                {item.label}
              </div>
              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{item.val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
