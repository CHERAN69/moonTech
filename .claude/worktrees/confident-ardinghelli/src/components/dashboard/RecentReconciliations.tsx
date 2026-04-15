'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type Session = {
  id: string
  name: string
  created_at: string
  matched_count: number
  unmatched_count: number
  flagged_count: number
  close_confidence_score: number
  status: string
}

export function RecentReconciliations() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    fetch('/api/reconcile')
      .then(r => r.ok ? r.json() : { sessions: [] })
      .then(json => setSessions((json.sessions ?? []).slice(0, 5)))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Recent Reconciliations</h2>
        <Link href="/reconcile" className="text-xs font-medium transition-opacity hover:opacity-80" style={{ color: 'var(--brand)' }}>
          View all
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div
            className="w-6 h-6 rounded-full animate-spin"
            style={{ border: '2px solid var(--border)', borderTopColor: 'var(--brand)' }}
          />
        </div>
      ) : sessions.length === 0 ? (
        <div className="py-10 text-center">
          <div className="text-3xl mb-2">📂</div>
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>No reconciliations yet.</div>
          <Link href="/reconcile/new" className="mt-3 inline-block text-xs font-medium transition-opacity hover:opacity-80" style={{ color: 'var(--brand)' }}>
            Start your first
          </Link>
        </div>
      ) : (
        <div className="space-y-1.5">
          {sessions.map(run => {
            const scoreColor = run.close_confidence_score >= 80 ? 'var(--success)' : run.close_confidence_score >= 50 ? 'var(--warning)' : 'var(--error)'
            const totalTx = run.matched_count + run.unmatched_count + run.flagged_count
            return (
              <Link
                key={run.id}
                href={`/reconcile/${run.id}`}
                className="flex items-center justify-between p-3 rounded-xl transition-all group"
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--info-bg)' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{run.name}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                      {new Date(run.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {totalTx > 0 && ` · ${totalTx} transactions`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                  <div className="hidden sm:flex items-center gap-3 text-xs">
                    <span style={{ color: 'var(--success)' }} className="font-medium">{run.matched_count} matched</span>
                    {run.unmatched_count > 0 && (
                      <>
                        <span style={{ color: 'var(--text-muted)' }}>·</span>
                        <span style={{ color: 'var(--error)' }}>{run.unmatched_count} open</span>
                      </>
                    )}
                    {run.flagged_count > 0 && (
                      <>
                        <span style={{ color: 'var(--text-muted)' }}>·</span>
                        <span style={{ color: 'var(--warning)' }}>{run.flagged_count} flagged</span>
                      </>
                    )}
                  </div>
                  <div
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded-full"
                    style={{ background: `color-mix(in srgb, ${scoreColor} 15%, transparent)` }}
                  >
                    <span className="text-xs font-bold" style={{ color: scoreColor }}>{run.close_confidence_score}</span>
                  </div>
                  {run.status === 'processing' && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: 'var(--info-bg)', color: 'var(--brand)' }}
                    >
                      Processing
                    </span>
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
