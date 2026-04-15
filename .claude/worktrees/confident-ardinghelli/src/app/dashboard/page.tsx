'use client'

import { useState, useEffect } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { CloseConfidenceGauge } from '@/components/dashboard/CloseConfidenceGauge'
import { RecentReconciliations } from '@/components/dashboard/RecentReconciliations'
import { QuickActions } from '@/components/dashboard/QuickActions'
import Link from 'next/link'

type Session = {
  id: string
  close_confidence_score: number
  matched_count: number
  unmatched_count: number
  flagged_count: number
  total_matched_amount: number
  status: string
}

export default function DashboardPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    fetch('/api/reconcile')
      .then(r => r.ok ? r.json() : { sessions: [] })
      .then(json => setSessions(json.sessions ?? []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false))
  }, [])

  const score = sessions.length
    ? Math.round(sessions.reduce((s, r) => s + r.close_confidence_score, 0) / sessions.length)
    : 0

  const totalMatched   = sessions.reduce((s, r) => s + r.matched_count, 0)
  const totalTx        = sessions.reduce((s, r) => s + r.matched_count + r.unmatched_count, 0)
  const openIssues     = sessions.reduce((s, r) => s + r.unmatched_count + r.flagged_count, 0)
  const matchRate      = totalTx > 0 ? Math.round((totalMatched / totalTx) * 100) : 0

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Dashboard"
        subtitle="Financial close overview"
        closeScore={score}
        actions={
          <Link href="/reconcile/new" className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90" style={{ background: '#2E75B6' }}>
            + New Reconciliation
          </Link>
        }
      />

      <div className="flex-1 p-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Top Row: Gauge + Summary */}
            <div className="grid grid-cols-12 gap-5">
              <div className="col-span-4">
                <CloseConfidenceGauge score={score} />
              </div>
              <div className="col-span-8">
                <div className="bg-white rounded-2xl border border-gray-100 p-6 h-full flex flex-col justify-between">
                  <div>
                    <h2 className="font-semibold text-gray-900 text-sm mb-1">Close Summary</h2>
                    <p className="text-xs text-gray-400">Derived from your reconciliation sessions</p>
                  </div>
                  {sessions.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
                      <div className="text-4xl mb-3">📂</div>
                      <div className="text-sm font-medium text-gray-700 mb-1">No reconciliation data yet</div>
                      <p className="text-xs text-gray-400 mb-4">Run your first reconciliation to see metrics here.</p>
                      <Link href="/reconcile/new" className="inline-block px-4 py-2 rounded-lg text-xs font-medium text-white" style={{ background: '#2E75B6' }}>
                        + New Reconciliation
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      {[
                        { label: 'Sessions',       val: sessions.length.toString(),    icon: '📁', color: '#2E75B6' },
                        { label: 'Match rate',     val: `${matchRate}%`,               icon: '✅', color: '#16A34A' },
                        { label: 'Total matched',  val: totalMatched.toLocaleString(), icon: '🔄', color: '#2E75B6' },
                        { label: 'Open issues',    val: openIssues.toLocaleString(),   icon: '⚠️', color: openIssues > 0 ? '#D97706' : '#6B7280' },
                      ].map(s => (
                        <div key={s.label} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                          <span className="text-xl">{s.icon}</span>
                          <div>
                            <div className="font-bold text-gray-900" style={{ color: s.color }}>{s.val}</div>
                            <div className="text-xs text-gray-400">{s.label}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Row: Recent Activity + Quick Actions */}
            <div className="grid grid-cols-12 gap-5">
              <div className="col-span-8">
                <RecentReconciliations />
              </div>
              <div className="col-span-4">
                <QuickActions />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
