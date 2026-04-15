'use client'

import { useState, useEffect } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import Link from 'next/link'
import { cn } from '@/lib/utils'

type Session = {
  id: string
  name: string
  period_start: string
  period_end: string
  matched_count: number
  unmatched_count: number
  flagged_count: number
  duplicate_count: number
  close_confidence_score: number
  status: string
  created_at: string
  total_matched_amount: number
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', d: 'numeric', year: 'numeric' })
}

export default function ReconcilePage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)
  const [search,   setSearch]   = useState('')

  useEffect(() => {
    fetch('/api/reconcile')
      .then(r => {
        if (r.status === 401) throw new Error('auth')
        if (!r.ok) throw new Error(`Server error ${r.status}`)
        return r.json()
      })
      .then(json => setSessions(json.sessions ?? []))
      .catch(err => setError(err.message === 'auth' ? 'Sign in to view your reconciliations.' : 'Failed to load sessions.'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = sessions.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase())
  )

  // Derive aggregate stats from real sessions
  const totalTx   = sessions.reduce((s, r) => s + r.matched_count + r.unmatched_count, 0)
  const matchRate = sessions.length
    ? Math.round(sessions.reduce((s, r) => s + r.matched_count, 0) / Math.max(1, sessions.reduce((s, r) => s + r.matched_count + r.unmatched_count, 0)) * 100)
    : 0
  const openIssues = sessions.reduce((s, r) => s + r.unmatched_count + r.flagged_count, 0)

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
        {!loading && !error && sessions.length > 0 && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total transactions', val: totalTx.toLocaleString(), icon: '🔄' },
              { label: 'Match rate',         val: `${matchRate}%`,          icon: '✅' },
              { label: 'Open issues',        val: openIssues.toLocaleString(), icon: '⚠️' },
              { label: 'Sessions',           val: sessions.length.toString(),  icon: '📁' },
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
        )}

        {/* Sessions table */}
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 text-sm">All Reconciliation Runs</h2>
            {sessions.length > 0 && (
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search…"
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs outline-none focus:border-blue-400 transition-colors w-40"
              />
            )}
          </div>

          {loading ? (
            <div className="p-16 flex flex-col items-center gap-3 text-gray-400 text-sm">
              <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
              Loading sessions…
            </div>
          ) : error ? (
            <div className="p-16 text-center">
              <div className="text-4xl mb-3">🔐</div>
              <div className="text-sm font-medium text-gray-700 mb-1">{error}</div>
              <Link href="/login" className="mt-3 inline-block text-xs text-blue-600 underline">Go to login →</Link>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-16 text-center">
              <div className="text-4xl mb-3">📂</div>
              <div className="text-sm font-medium text-gray-700 mb-1">
                {search ? 'No sessions match your search.' : 'No reconciliations yet.'}
              </div>
              {!search && (
                <p className="text-xs text-gray-400 mb-4">Upload your bank and invoice files to run your first AI reconciliation.</p>
              )}
              {!search && (
                <Link href="/reconcile/new" className="inline-block px-5 py-2 rounded-lg text-sm font-medium text-white" style={{ background: '#2E75B6' }}>
                  + New Reconciliation
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filtered.map(session => {
                const scoreColor = session.close_confidence_score >= 80 ? '#16A34A' : session.close_confidence_score >= 50 ? '#D97706' : '#DC2626'
                return (
                  <Link key={session.id} href={`/reconcile/${session.id}`}
                    className="flex items-center px-5 py-4 hover:bg-gray-50 transition-colors group">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mr-4" style={{ background: '#EFF6FF' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2E75B6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                        <line x1="4" y1="22" x2="4" y2="15"/>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0 mr-6">
                      <div className="text-sm font-medium text-gray-800 group-hover:text-blue-700 transition-colors truncate">{session.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {session.period_start?.slice(0, 10)} – {session.period_end?.slice(0, 10)}
                      </div>
                    </div>
                    <div className="flex items-center gap-5 text-xs flex-shrink-0 mr-6">
                      <div className="text-center">
                        <div className="font-semibold text-green-600">{session.matched_count}</div>
                        <div className="text-gray-400">matched</div>
                      </div>
                      <div className="text-center">
                        <div className={cn('font-semibold', session.unmatched_count > 0 ? 'text-red-500' : 'text-gray-400')}>{session.unmatched_count}</div>
                        <div className="text-gray-400">unmatched</div>
                      </div>
                      <div className="text-center">
                        <div className={cn('font-semibold', session.flagged_count > 0 ? 'text-amber-500' : 'text-gray-400')}>{session.flagged_count}</div>
                        <div className="text-gray-400">flagged</div>
                      </div>
                      {session.duplicate_count > 0 && (
                        <div className="text-center">
                          <div className="font-semibold text-purple-500">{session.duplicate_count}</div>
                          <div className="text-gray-400">dupes</div>
                        </div>
                      )}
                    </div>
                    <div className="w-16 text-center flex-shrink-0 mr-4">
                      <div className="text-2xl font-bold" style={{ color: scoreColor }}>{session.close_confidence_score}</div>
                      <div className="text-xs text-gray-400">score</div>
                    </div>
                    <div className="w-24 flex-shrink-0">
                      <span className={cn('text-xs px-2 py-1 rounded-full font-medium',
                        session.status === 'complete'   ? 'bg-green-50 text-green-700' :
                        session.status === 'error'      ? 'bg-red-50 text-red-600'     :
                                                          'bg-blue-50 text-blue-600'
                      )}>
                        {session.status === 'processing' ? 'In Progress' : session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 flex-shrink-0 w-24 text-right">
                      {formatDate(session.created_at)}
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
