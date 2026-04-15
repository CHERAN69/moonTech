/**
 * ConfidenceBadge — displays AI confidence score as a colored pill.
 *
 * Color coding:
 *   ≥85  → green  (high confidence, likely auto-approvable)
 *   ≥60  → yellow (medium — needs review)
 *   <60  → red    (low — requires human attention)
 */

interface ConfidenceBadgeProps {
  score: number          // 0–100
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean    // show "% confidence" suffix
  className?: string
}

const SIZE = {
  sm: { text: 'text-[10px]', px: 'px-1.5 py-0.5', dot: 'w-1.5 h-1.5' },
  md: { text: 'text-xs',     px: 'px-2   py-0.5', dot: 'w-2   h-2'   },
  lg: { text: 'text-sm',     px: 'px-2.5 py-1',   dot: 'w-2.5 h-2.5' },
} as const

function getColor(score: number): { bg: string; text: string; dot: string; label: string } {
  if (score >= 85) return { bg: '#F0FDF4', text: '#15803D', dot: '#16A34A', label: 'High'   }
  if (score >= 60) return { bg: '#FFFBEB', text: '#92400E', dot: '#D97706', label: 'Medium' }
  return              { bg: '#FEF2F2', text: '#B91C1C', dot: '#DC2626', label: 'Low'    }
}

export function ConfidenceBadge({
  score,
  size = 'md',
  showLabel = false,
  className = '',
}: ConfidenceBadgeProps) {
  const { bg, text, dot } = getColor(score)
  const s = SIZE[size]

  return (
    <span
      title={`AI confidence: ${score}% — based on matching algorithm and document analysis`}
      className={`inline-flex items-center gap-1 rounded-full font-semibold ${s.px} ${s.text} ${className}`}
      style={{ background: bg, color: text }}
    >
      <span className={`rounded-full flex-shrink-0 ${s.dot}`} style={{ background: dot }} />
      {score}%{showLabel && ' confidence'}
    </span>
  )
}
