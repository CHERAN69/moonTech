import { ExceptionItem } from '@/types'

interface Stat {
  label:  string
  val:    number
  bg:     string
  color:  string
}

export interface ExceptionStatsProps {
  items: ExceptionItem[]
}

export function ExceptionStats({ items }: ExceptionStatsProps) {
  const pending  = items.filter(i => !i.resolution).length
  const resolved = items.filter(i =>  i.resolution).length
  const total    = items.length
  const highSev  = items.filter(i => i.flags?.some(f => f.severity === 'high')).length

  const stats: Stat[] = [
    { label: 'Pending Review', val: pending,  bg: '#FFFBEB', color: '#D97706' },
    { label: 'Resolved',       val: resolved, bg: '#F0FDF4', color: '#16A34A' },
    { label: 'Total Items',    val: total,    bg: '#EFF6FF', color: '#2E75B6' },
    { label: 'High Severity',  val: highSev,  bg: '#FEF2F2', color: '#DC2626' },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map(s => (
        <div key={s.label} className="bg-white rounded-xl border border-gray-100 px-4 py-3">
          <div className="text-2xl font-bold" style={{ color: s.color }}>
            {s.val}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
        </div>
      ))}
    </div>
  )
}
