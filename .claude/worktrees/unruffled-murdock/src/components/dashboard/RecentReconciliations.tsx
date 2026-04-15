import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'

interface Session {
  id: string
  name: string
  period_start?: string
  period_end?: string
  created_at: string
  matched_count: number
  unmatched_count: number
  flagged_count: number
  close_confidence_score: number
  status: string
  total_matched_amount?: number
}

interface Props {
  sessions?: Session[]
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function RecentReconciliations({ sessions }: Props) {
  const items = sessions ?? []

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900 text-sm">Recent Reconciliations</h2>
        <Link href="/reconcile" className="text-xs font-medium" style={{ color: '#2E75B6' }}>View all →</Link>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-3xl mb-2">🔄</div>
          <p className="text-sm text-gray-500">No reconciliations yet</p>
          <p className="text-xs text-gray-400 mt-1">
            <Link href="/reconcile/new" className="underline" style={{ color: '#2E75B6' }}>Upload your first file</Link> to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(run => {
            const scoreColor = run.close_confidence_score >= 80 ? '#16A34A' : run.close_confidence_score >= 50 ? '#D97706' : '#DC2626'
            return (
              <Link key={run.id} href={`/reconcile/${run.id}`} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#EFF6FF' }} aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2E75B6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-800 group-hover:text-blue-700 transition-colors">{run.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {formatDate(run.created_at)} · {run.matched_count + run.unmatched_count + run.flagged_count} transactions
                      {run.total_matched_amount ? ` · ${formatCurrency(run.total_matched_amount)} matched` : ''}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                  <div className="hidden sm:flex items-center gap-3 text-xs">
                    <span className="text-green-600 font-medium" title="Matched transactions">{run.matched_count} matched</span>
                    {run.unmatched_count > 0 && (
                      <>
                        <span className="text-gray-300" aria-hidden="true">·</span>
                        <span className="text-red-500" title="Unmatched transactions">{run.unmatched_count} open</span>
                      </>
                    )}
                    {run.flagged_count > 0 && (
                      <>
                        <span className="text-gray-300" aria-hidden="true">·</span>
                        <span className="text-amber-500" title="Flagged transactions">{run.flagged_count} flagged</span>
                      </>
                    )}
                  </div>
                  <div
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded-full"
                    style={{ background: `${scoreColor}15` }}
                    title={`Close confidence: ${run.close_confidence_score}/100`}
                  >
                    <span className="text-xs font-bold" style={{ color: scoreColor }}>{run.close_confidence_score}</span>
                    <span className="sr-only">close confidence score</span>
                  </div>
                  {run.status === 'processing' && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-600">Processing</span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
