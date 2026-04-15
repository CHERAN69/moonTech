'use client'

import { useState, useEffect, useCallback } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'

type Session = {
  id: string
  name: string
  period_start: string | null
  period_end: string | null
  matched_count: number
  unmatched_count: number
  flagged_count: number
  duplicate_count: number
  close_confidence_score: number
  status: string
  total_matched_amount: number
  created_at: string
}

export default function ReconcilePage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [total, setTotal] = useState(0)

  const fetchSessions = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/reconcile?limit=50')
      if (res.ok) {
        const data = await res.json()
        setSessions(data.sessions ?? [])
        setTotal(data.total ?? 0)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSessions() }, [fetchSessions])

  const filtered = sessions.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase())
  )

  // Aggregate stats from real data
  const totalTx = sessions.reduce((s, r) => s + r.matched_count + r.unmatched_count + r.flagged_count, 0)
  const totalMatched = sessions.filter(s => s.status === 'complete').length
  const avgScore = sessions.length
    ? Math.round(sessions.reduce((s, r) => s + r.close_confidence_score, 0) / sessions.length)
    : 0
  const openAnomalies = sessions.reduce((s, r) => s + r.flagged_count + r.unmatched_count, 0)

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="ReconcileAI"
        subtitle="AI-powered bank & invoice reconciliation"
        actions={
          <Link
            href="/reconcile/new"
            className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ background: '#2E75B6' }}
          >
            + New Reconciliation
          </Link>
        }
      />

      <div className="flex-1 p-6">
        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total transactions', val: loading ? '—' : totalTx.toLocaleString(), icon: '🔄' },
            { label: 'Sessions completed', val: loading ? '—' : `${totalMatched} sessions`, icon: '✅' },
            { label: 'Open anomalies', val: loading ? '—' : `${openAnomalies} items`, icon: '⚠️' },
            { label: 'Avg close score', val: loading ? '—' : sessions.length ? `${avgScore}/100` : 'No data', icon: '📊' },
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
            <h2 className="font-semibold text-gray-900 text-sm">
              All Reconciliation Runs
              {total > 0 && <span className="ml-2 text-gray-400 font-normal">({total})</span>}
            </h2>
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs outline-none focus:border-blue-400 transition-colors w-40"
            />
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin mb-3" />
              <span className="text-sm">Loading sessions…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-4xl mb-3">🔄</div>
              <div className="text-sm font-medium text-gray-700">
                {sessions.length === 0 ? 'No reconciliations yet' : 'No results match your search'}
              </div>
              <div className="text-xs text-gray-400 mt-1 mb-4">
                {sessions.length === 0
                  ? 'Upload your bank statement and invoices to get started.'
                  : 'Try a different search term.'}
              </div>
              {sessions.length === 0 && (
                <Link
                  href="/reconcile/new"
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                  style={{ background: '#2E75B6' }}
                >
                  Start first reconciliation
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filtered.map(session => {
                const scoreColor = session.close_confidence_score >= 80
                  ? '#16A34A'
                  : session.close_confidence_score >= 50
                  ? '#D97706'
                  : '#DC2626'

                const period = session.period_start && session.period_end
                  ? `${new Date(session.period_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(session.period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                  : '—'

                return (
                  <Link
                    key={session.id}
                    href={`/reconcile/${session.id}`}
                    className="flex items-center px-5 py-4 hover:bg-gray-50 transition-colors group"
                  >
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
                      <div className="text-xs text-gray-400 mt-0.5">{period}</div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-5 text-xs flex-shrink-0 mr-6">
                      <div className="text-center">
                        <div className="font-semibold text-green-600">{session.matched_count}</div>
                        <div className="text-gray-400">matched</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-red-500">{session.unmatched_count}</div>
                        <div className="text-gray-400">unmatched</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-amber-500">{session.flagged_count}</div>
                        <div className="text-gray-400">flagged</div>
                      </div>
                      {session.duplicate_count > 0 && (
                        <div className="text-center">
                          <div className="font-semibold text-purple-500">{session.duplicate_count}</div>
                          <div className="text-gray-400">dupes</div>
                        </div>
                      )}
                    </div>

                    {/* Amount */}
                    <div className="w-24 text-right flex-shrink-0 mr-4 hidden lg:block">
                      <div className="text-xs font-medium text-gray-700">{formatCurrency(session.total_matched_amount)}</div>
                      <div className="text-xs text-gray-400">matched</div>
                    </div>

                    {/* Score */}
                    <div className="w-16 text-center flex-shrink-0 mr-4">
                      <div className="text-2xl font-bold" style={{ color: scoreColor }}>{session.close_confidence_score}</div>
                      <div className="text-xs text-gray-400">score</div>
                    </div>

                    {/* Status */}
                    <div className="w-24 flex-shrink-0">
                      {session.status === 'complete'
                        ? <span className="text-xs px-2 py-1 rounded-full font-medium bg-green-50 text-green-700">Complete</span>
                        : session.status === 'error'
                        ? <span className="text-xs px-2 py-1 rounded-full font-medium bg-red-50 text-red-600">Error</span>
                        : <span className="text-xs px-2 py-1 rounded-full font-medium bg-blue-50 text-blue-600">In Progress</span>
                      }
                    </div>

                    <div className="text-xs text-gray-400 flex-shrink-0 w-20 text-right">
                      {new Date(session.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
