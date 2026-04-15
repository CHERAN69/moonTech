import Link from 'next/link'

const DEMO_RUNS = [
  { id: '1', name: 'March 2026 Bank Reconciliation', date: 'Apr 2, 2026', matched: 234, unmatched: 8, flagged: 4, score: 91, status: 'complete' },
  { id: '2', name: 'February 2026 Bank Reconciliation', date: 'Mar 3, 2026', matched: 198, unmatched: 12, flagged: 2, score: 88, status: 'complete' },
  { id: '3', name: 'April 2026 — Stripe Payouts', date: 'Apr 11, 2026', matched: 87, unmatched: 4, flagged: 12, score: 73, status: 'processing' },
  { id: '4', name: 'Q1 2026 Invoice Reconciliation', date: 'Apr 1, 2026', matched: 512, unmatched: 22, flagged: 8, score: 94, status: 'complete' },
]

export function RecentReconciliations() {
  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Recent Reconciliations</h2>
        <Link href="/reconcile" className="text-xs font-medium" style={{ color: 'var(--brand)' }}>View all</Link>
      </div>
      <div className="space-y-3">
        {DEMO_RUNS.map(run => {
          const scoreColor = run.score >= 80 ? 'var(--success)' : run.score >= 50 ? 'var(--warning)' : 'var(--error)'
          return (
            <Link key={run.id} href={`/reconcile/${run.id}`} className="flex items-center justify-between p-3 rounded-xl transition-colors group" style={{ background: 'transparent' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--info-bg)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-medium transition-colors" style={{ color: 'var(--text-primary)' }}>{run.name}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{run.date} · {run.matched + run.unmatched + run.flagged} transactions</div>
                </div>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                <div className="hidden sm:flex items-center gap-3 text-xs">
                  <span style={{ color: 'var(--success)' }} className="font-medium">{run.matched} matched</span>
                  <span style={{ color: 'var(--text-muted)' }}>·</span>
                  {run.unmatched > 0 && <span style={{ color: 'var(--error)' }}>{run.unmatched} open</span>}
                  {run.flagged > 0 && <span style={{ color: 'var(--warning)' }}>{run.flagged} flagged</span>}
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full" style={{ background: `${scoreColor}15` }}>
                  <span className="text-xs font-bold" style={{ color: scoreColor }}>{run.score}</span>
                </div>
                {run.status === 'processing' && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--info-bg)', color: 'var(--brand)' }}>Processing</span>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
