import { TopBar } from '@/components/layout/TopBar'
import Link from 'next/link'

const DEMO_SESSIONS = [
  { id: '1', name: 'March 2026 Bank Reconciliation', period: 'Mar 1 – Mar 31, 2026', matched: 234, unmatched: 8, flagged: 4, duplicates: 1, score: 91, status: 'complete', date: 'Apr 2, 2026' },
  { id: '2', name: 'February 2026 Bank Reconciliation', period: 'Feb 1 – Feb 28, 2026', matched: 198, unmatched: 12, flagged: 2, duplicates: 0, score: 88, status: 'complete', date: 'Mar 3, 2026' },
  { id: '3', name: 'April 2026 — Stripe Payouts', period: 'Apr 1 – Apr 10, 2026', matched: 87, unmatched: 4, flagged: 12, duplicates: 2, score: 73, status: 'in_progress', date: 'Apr 11, 2026' },
  { id: '4', name: 'Q1 2026 Invoice Reconciliation', period: 'Jan 1 – Mar 31, 2026', matched: 512, unmatched: 22, flagged: 8, duplicates: 3, score: 94, status: 'complete', date: 'Apr 1, 2026' },
]

export default function ReconcilePage() {
  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="ReconcileAI"
        subtitle="AI-powered bank & invoice reconciliation"
        actions={
          <Link href="/reconcile/new" className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90" style={{ background: 'var(--brand)' }}>
            + New Reconciliation
          </Link>
        }
      />

      <div className="flex-1 p-6">
        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total reconciled', val: '1,031 transactions' },
            { label: 'This month matched', val: '91% rate' },
            { label: 'Open anomalies', val: '12 items' },
            { label: 'Time saved est.', val: '~47 hours' },
          ].map(s => (
            <div key={s.label} className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
              <div>
                <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{s.val}</div>
                <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Sessions table */}
        <div className="rounded-2xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
            <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>All Reconciliation Runs</h2>
            <input
              type="text"
              placeholder="Search..."
              className="px-3 py-1.5 rounded-lg text-xs outline-none transition-colors w-40"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          </div>

          <div>
            {DEMO_SESSIONS.map(session => {
              const scoreColor = session.score >= 80 ? 'var(--success)' : session.score >= 50 ? 'var(--warning)' : 'var(--error)'
              return (
                <Link key={session.id} href={`/reconcile/${session.id}`} className="flex items-center px-5 py-4 transition-colors group" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mr-4" style={{ background: 'var(--info-bg)' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0 mr-6">
                    <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{session.name}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{session.period}</div>
                  </div>
                  <div className="flex items-center gap-5 text-xs flex-shrink-0 mr-6">
                    <div className="text-center">
                      <div className="font-semibold" style={{ color: 'var(--success)' }}>{session.matched}</div>
                      <div style={{ color: 'var(--text-tertiary)' }}>matched</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold" style={{ color: 'var(--error)' }}>{session.unmatched}</div>
                      <div style={{ color: 'var(--text-tertiary)' }}>unmatched</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold" style={{ color: 'var(--warning)' }}>{session.flagged}</div>
                      <div style={{ color: 'var(--text-tertiary)' }}>flagged</div>
                    </div>
                  </div>
                  <div className="w-16 text-center flex-shrink-0 mr-4">
                    <div className="text-2xl font-bold" style={{ color: scoreColor }}>{session.score}</div>
                    <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>score</div>
                  </div>
                  <div className="w-24 flex-shrink-0">
                    {session.status === 'complete' ? (
                      <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>Complete</span>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ background: 'var(--info-bg)', color: 'var(--brand)' }}>In Progress</span>
                    )}
                  </div>
                  <div className="text-xs flex-shrink-0 w-20 text-right" style={{ color: 'var(--text-tertiary)' }}>{session.date}</div>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
