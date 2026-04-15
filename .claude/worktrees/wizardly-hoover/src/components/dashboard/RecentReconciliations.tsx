import Link from 'next/link'

const DEMO_RUNS = [
  { id: '1', name: 'March 2026 Bank Reconciliation', date: 'Apr 2, 2026', matched: 234, unmatched: 8, flagged: 4, score: 91, status: 'complete' },
  { id: '2', name: 'February 2026 Bank Reconciliation', date: 'Mar 3, 2026', matched: 198, unmatched: 12, flagged: 2, score: 88, status: 'complete' },
  { id: '3', name: 'April 2026 — Stripe Payouts', date: 'Apr 11, 2026', matched: 87, unmatched: 4, flagged: 12, score: 73, status: 'processing' },
  { id: '4', name: 'Q1 2026 Invoice Reconciliation', date: 'Apr 1, 2026', matched: 512, unmatched: 22, flagged: 8, score: 94, status: 'complete' },
]

export function RecentReconciliations() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900 text-sm">Recent Reconciliations</h2>
        <Link href="/reconcile" className="text-xs font-medium" style={{ color: '#2E75B6' }}>View all →</Link>
      </div>
      <div className="space-y-3">
        {DEMO_RUNS.map(run => {
          const scoreColor = run.score >= 80 ? '#16A34A' : run.score >= 50 ? '#D97706' : '#DC2626'
          return (
            <Link key={run.id} href={`/reconcile/${run.id}`} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors group">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#EFF6FF' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2E75B6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-800 group-hover:text-blue-700 transition-colors">{run.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{run.date} · {run.matched + run.unmatched + run.flagged} transactions</div>
                </div>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                <div className="hidden sm:flex items-center gap-3 text-xs">
                  <span className="text-green-600 font-medium">{run.matched} matched</span>
                  <span className="text-gray-300">·</span>
                  {run.unmatched > 0 && <span className="text-red-500">{run.unmatched} open</span>}
                  {run.flagged > 0 && <span className="text-amber-500">{run.flagged} flagged</span>}
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full" style={{ background: `${scoreColor}15` }}>
                  <span className="text-xs font-bold" style={{ color: scoreColor }}>{run.score}</span>
                </div>
                {run.status === 'processing' && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-600">Processing</span>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
