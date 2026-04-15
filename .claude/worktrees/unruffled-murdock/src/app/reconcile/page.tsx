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
          <Link href="/reconcile/new" className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90" style={{ background: '#2E75B6' }}>
            + New Reconciliation
          </Link>
        }
      />

      <div className="flex-1 p-6">
        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total reconciled', val: '1,031 transactions', icon: '🔄' },
            { label: 'This month matched', val: '91% rate', icon: '✅' },
            { label: 'Open anomalies', val: '12 items', icon: '⚠️' },
            { label: 'Time saved est.', val: '~47 hours', icon: '⏱️' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3">
              <span className="text-2xl">{s.icon}</span>
              <div>
                <div className="font-semibold text-gray-900 text-sm">{s.val}</div>
                <div className="text-xs text-gray-400">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Sessions table */}
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 text-sm">All Reconciliation Runs</h2>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search..."
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs outline-none focus:border-blue-400 transition-colors w-40"
              />
            </div>
          </div>

          <div className="divide-y divide-gray-50">
            {DEMO_SESSIONS.map(session => {
              const scoreColor = session.score >= 80 ? '#16A34A' : session.score >= 50 ? '#D97706' : '#DC2626'
              return (
                <Link key={session.id} href={`/reconcile/${session.id}`} className="flex items-center px-5 py-4 hover:bg-gray-50 transition-colors group">
                  {/* Icon */}
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mr-4" style={{ background: '#EFF6FF' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2E75B6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                      <line x1="4" y1="22" x2="4" y2="15"/>
                    </svg>
                  </div>

                  {/* Name + period */}
                  <div className="flex-1 min-w-0 mr-6">
                    <div className="text-sm font-medium text-gray-800 group-hover:text-blue-700 transition-colors truncate">{session.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{session.period}</div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-5 text-xs flex-shrink-0 mr-6">
                    <div className="text-center">
                      <div className="font-semibold text-green-600">{session.matched}</div>
                      <div className="text-gray-400">matched</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-red-500">{session.unmatched}</div>
                      <div className="text-gray-400">unmatched</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-amber-500">{session.flagged}</div>
                      <div className="text-gray-400">flagged</div>
                    </div>
                    {session.duplicates > 0 && (
                      <div className="text-center">
                        <div className="font-semibold text-purple-500">{session.duplicates}</div>
                        <div className="text-gray-400">dupes</div>
                      </div>
                    )}
                  </div>

                  {/* Score */}
                  <div className="w-16 text-center flex-shrink-0 mr-4">
                    <div className="text-2xl font-bold" style={{ color: scoreColor }}>{session.score}</div>
                    <div className="text-xs text-gray-400">score</div>
                  </div>

                  {/* Status */}
                  <div className="w-24 flex-shrink-0">
                    {session.status === 'complete' ? (
                      <span className="text-xs px-2 py-1 rounded-full font-medium bg-green-50 text-green-700">Complete</span>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded-full font-medium bg-blue-50 text-blue-600">In Progress</span>
                    )}
                  </div>

                  <div className="text-xs text-gray-400 flex-shrink-0 w-20 text-right">{session.date}</div>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
