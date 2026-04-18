'use client'

interface Props {
  score: number
}

export function CloseConfidenceGauge({ score }: Props) {
  const color = score >= 80 ? '#16A34A' : score >= 50 ? '#D97706' : '#DC2626'
  const label = score >= 80 ? 'Close Ready' : score >= 50 ? 'In Progress' : 'Needs Attention'
  const bgColor = score >= 80 ? '#F0FDF4' : score >= 50 ? '#FFFBEB' : '#FEF2F2'

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold text-gray-900 text-sm">Close Confidence Score</h2>
        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: bgColor, color }}>
          {label}
        </span>
      </div>
      <p className="text-xs text-gray-400 mb-6">April 2026 · Updated 2 min ago</p>

      {/* Gauge SVG */}
      <div className="flex flex-col items-center flex-1 justify-center">
        <div className="relative">
          <svg width="180" height="100" viewBox="0 0 180 100">
            {/* Background arc */}
            <path
              d="M 10 90 A 80 80 0 0 1 170 90"
              fill="none"
              stroke="#F3F4F6"
              strokeWidth="14"
              strokeLinecap="round"
            />
            {/* Score arc */}
            <path
              d="M 10 90 A 80 80 0 0 1 170 90"
              fill="none"
              stroke={color}
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={`${(score / 100) * 251.3} 251.3`}
              style={{ transition: 'stroke-dasharray 0.8s ease' }}
            />
          </svg>
          {/* Score number */}
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
            <span className="text-5xl font-bold" style={{ color }}>{score}</span>
            <span className="text-xs text-gray-400 mt-0.5">out of 100</span>
          </div>
        </div>

        {/* Breakdown */}
        <div className="mt-4 w-full space-y-2">
          {[
            { label: 'Matched transactions', val: '87%', color: '#16A34A' },
            { label: 'Open anomalies', val: '12 flagged', color: '#D97706' },
            { label: 'Journal entries pending', val: '5 drafts', color: '#2E75B6' },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-gray-500">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: item.color }}></span>
                {item.label}
              </div>
              <span className="font-medium text-gray-700">{item.val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
