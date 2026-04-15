'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { formatCurrency, formatDate } from '@/lib/utils'
import { MatchedPair, MatchStatus } from '@/types'
import Link from 'next/link'

const STATUS_TABS_KEYS = ['all', 'matched', 'unmatched', 'flagged', 'suggested', 'duplicate'] as const

const STATUS_CONFIG: Record<MatchStatus, { bg: string; text: string; label: string; dot: string }> = {
  matched:   { bg: '#F0FDF4', text: '#16A34A', label: 'Matched',      dot: '#16A34A' },
  unmatched: { bg: '#FEF2F2', text: '#DC2626', label: 'Unmatched',    dot: '#DC2626' },
  flagged:   { bg: '#FFFBEB', text: '#D97706', label: 'Flagged',      dot: '#D97706' },
  suggested: { bg: '#EFF6FF', text: '#2563EB', label: 'Needs Review', dot: '#2563EB' },
  duplicate: { bg: '#FAF5FF', text: '#7C3AED', label: 'Duplicate',    dot: '#7C3AED' },
  excluded:  { bg: '#F3F4F6', text: '#6B7280', label: 'Excluded',     dot: '#6B7280' },
}

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
      {type === 'success' ? '✓' : '✗'} {message}
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">✕</button>
    </div>
  )
}

type Session = {
  id: string
  name: string
  period_start: string
  period_end: string
  matched_count: number
  unmatched_count: number
  flagged_count: number
  close_confidence_score: number
  status: string
}

export default function ReconciliationResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [activeTab,   setActiveTab]  = useState<string>('all')
  const [expandedId,  setExpandedId] = useState<string | null>(null)
  const [search,      setSearch]     = useState('')
  const [pairs,       setPairs]      = useState<MatchedPair[]>([])
  const [session,     setSession]    = useState<Session | null>(null)
  const [loading,     setLoading]    = useState(true)
  const [error,       setError]      = useState<string | null>(null)
  const [toast,       setToast]      = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [saving,      setSaving]     = useState<string | null>(null)

  useEffect(() => {
    params.then(({ id }) => {
      fetch(`/api/reconcile/${id}`)
        .then(r => {
          if (r.status === 401) throw new Error('auth')
          if (r.status === 404) throw new Error('not_found')
          if (!r.ok) throw new Error('server')
          return r.json()
        })
        .then(json => {
          setSession(json.session)
          setPairs(json.pairs ?? [])
        })
        .catch(err => {
          if (err.message === 'auth') setError('Sign in to view this reconciliation.')
          else if (err.message === 'not_found') setError('Reconciliation not found.')
          else setError('Failed to load reconciliation data.')
        })
        .finally(() => setLoading(false))
    })
  }, [params])

  const handleApprovalAction = useCallback(async (pairId: string, action: 'approve' | 'reject' | 'edit_match') => {
    setSaving(pairId)
    try {
      const res = await fetch(`/api/exceptions/${pairId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (res.ok) {
        const { exception } = await res.json()
        setPairs(prev => prev.map(p => p.id === pairId ? { ...p, status: exception.status } : p))
        setToast({ message: `Transaction ${action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'updated'} successfully.`, type: 'success' })
      } else {
        setToast({ message: 'Action failed. Please try again.', type: 'error' })
      }
    } catch {
      setToast({ message: 'Action failed. Please try again.', type: 'error' })
    } finally {
      setSaving(null)
    }
  }, [])

  const closeScore    = session?.close_confidence_score ?? 0
  const matchedCount  = pairs.filter(p => p.status === 'matched').length
  const totalCount    = pairs.length

  const STATUS_TABS = STATUS_TABS_KEYS.map(key => ({
    key,
    label: key === 'all' ? 'All' : key === 'suggested' ? 'Needs Review' : key.charAt(0).toUpperCase() + key.slice(1),
    count: key === 'all' ? pairs.length : pairs.filter(p => p.status === key).length,
  }))

  const filtered = pairs.filter(p => {
    const matchesTab    = activeTab === 'all' || p.status === activeTab
    const matchesSearch = !search || [
      p.bank_transaction.description,
      p.bank_transaction.vendor,
      p.invoice_transaction?.description,
      p.invoice_transaction?.reference,
    ].some(v => v?.toLowerCase().includes(search.toLowerCase()))
    return matchesTab && matchesSearch
  })

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <TopBar title="Reconciliation" subtitle="Loading…" />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col h-full">
        <TopBar title="Reconciliation" subtitle="Error" />
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="text-4xl mb-3">🔐</div>
          <div className="text-sm font-medium text-gray-700 mb-2">{error}</div>
          <Link href="/reconcile" className="text-xs text-blue-600 underline">← Back to reconciliations</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title={session?.name ?? 'Reconciliation'}
        subtitle={`${totalCount} transactions · ${matchedCount} matched${session?.period_start ? ` · ${session.period_start.slice(0, 10)} – ${session.period_end?.slice(0, 10)}` : ''}`}
        closeScore={closeScore}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.open('/api/reports/export?type=reconciliation', '_blank')}
              className="px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              ↓ Export CSV
            </button>
            <button
              onClick={() => router.push('/exceptions')}
              className="px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Exception Queue →
            </button>
            <button
              onClick={() => setToast({ message: closeScore >= 80 ? 'Close signed off successfully!' : 'Close confidence score is below 80. Resolve open exceptions first.', type: closeScore >= 80 ? 'success' : 'error' })}
              className="px-3 py-2 text-sm font-medium text-white rounded-lg transition-opacity hover:opacity-90"
              style={{ background: closeScore >= 80 ? '#16A34A' : '#D97706' }}
            >
              {closeScore >= 80 ? '✓ Sign Off Close' : `⚠ Score: ${closeScore}/100`}
            </button>
          </div>
        }
      />

      <div className="flex-1 p-5">
        {/* Summary cards */}
        {pairs.length > 0 && (
          <div className="grid grid-cols-5 gap-3 mb-5">
            {[
              { label: 'Matched',      status: 'matched',   color: '#16A34A', bg: '#F0FDF4' },
              { label: 'Unmatched',    status: 'unmatched', color: '#DC2626', bg: '#FEF2F2' },
              { label: 'Flagged',      status: 'flagged',   color: '#D97706', bg: '#FFFBEB' },
              { label: 'Needs Review', status: 'suggested', color: '#2563EB', bg: '#EFF6FF' },
              { label: 'Duplicates',   status: 'duplicate', color: '#7C3AED', bg: '#FAF5FF' },
            ].map(card => {
              const cardPairs = pairs.filter(p => p.status === card.status)
              return (
                <button key={card.label} onClick={() => setActiveTab(card.status)}
                  className="rounded-xl border p-3 text-left hover:border-gray-200 transition-colors"
                  style={{ background: card.bg, borderColor: card.bg }}>
                  <div className="text-2xl font-bold" style={{ color: card.color }}>{cardPairs.length}</div>
                  <div className="text-xs font-medium mt-0.5" style={{ color: card.color }}>{card.label}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{formatCurrency(cardPairs.reduce((s, p) => s + p.bank_transaction.amount, 0))}</div>
                </button>
              )
            })}
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100">
          {/* Tabs + Search */}
          <div className="flex items-center justify-between px-4 border-b border-gray-100">
            <div className="flex overflow-x-auto">
              {STATUS_TABS.map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-3.5 text-xs font-medium border-b-2 transition-colors flex-shrink-0 ${
                    activeTab === tab.key ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}>
                  {tab.label}
                  {tab.count > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs">{tab.count}</span>
                  )}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Search transactions..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="px-3 py-1.5 my-2 rounded-lg border border-gray-200 text-xs outline-none focus:border-blue-400 transition-colors w-48 flex-shrink-0"
            />
          </div>

          {/* Rows */}
          {filtered.length === 0 ? (
            <div className="p-16 text-center">
              <div className="text-4xl mb-3">📂</div>
              <div className="text-sm font-medium text-gray-700">
                {pairs.length === 0 ? 'No transactions in this session yet.' : 'No transactions match the current filter.'}
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filtered.map(pair => {
                const cfg      = STATUS_CONFIG[pair.status]
                const expanded = expandedId === pair.id

                return (
                  <div key={pair.id}>
                    <button
                      onClick={() => setExpandedId(expanded ? null : pair.id)}
                      className="w-full flex items-start px-4 py-3.5 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="flex-shrink-0 mt-1 mr-3">
                        <div className="w-2 h-2 rounded-full" style={{ background: cfg.dot }}></div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-gray-800 truncate">
                              {pair.bank_transaction.vendor || pair.bank_transaction.description}
                            </div>
                            <div className="text-xs text-gray-400 mt-0.5">
                              {formatDate(pair.bank_transaction.date)} · {pair.bank_transaction.description}
                            </div>
                          </div>
                          <div className="font-semibold text-gray-900 flex-shrink-0">
                            {formatCurrency(pair.bank_transaction.amount)}
                          </div>
                        </div>
                      </div>

                      <div className="flex-shrink-0 mx-4 mt-1 text-gray-200">→</div>

                      <div className="flex-1 min-w-0">
                        {pair.invoice_transaction ? (
                          <div>
                            <div className="text-sm text-gray-600 truncate">{pair.invoice_transaction.reference || pair.invoice_transaction.description}</div>
                            <div className="text-xs text-gray-400 mt-0.5">{formatDate(pair.invoice_transaction.date)}</div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-300 italic">No matching invoice found</div>
                        )}
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                        {pair.gl_category && (
                          <span className="hidden lg:block text-xs text-gray-400 max-w-28 truncate">{pair.gl_category}</span>
                        )}
                        {pair.confidence > 0 && (
                          <span className="text-xs font-medium text-gray-400">{pair.confidence}%</span>
                        )}
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: cfg.bg, color: cfg.text }}>
                          {cfg.label}
                        </span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                          className={`transition-transform ${expanded ? 'rotate-90' : ''}`}>
                          <polyline points="9 18 15 12 9 6"/>
                        </svg>
                      </div>
                    </button>

                    {expanded && (
                      <div className="px-4 pb-4 ml-5 mr-5">
                        <div className="rounded-xl p-4 border" style={{ background: '#F8FAFC', borderColor: '#E2E8F0' }}>
                          <div className="flex items-center gap-2 mb-3">
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: '#EFF6FF', color: '#2E75B6' }}>
                              <span className="w-1 h-1 rounded-full bg-blue-400"></span>
                              AI Analysis
                            </div>
                            {pair.confidence > 0 && (
                              <span className="text-xs text-gray-400">Confidence: {pair.confidence}%</span>
                            )}
                          </div>

                          {pair.explanation && (
                            <p className="text-sm text-gray-700 leading-relaxed mb-3">{pair.explanation}</p>
                          )}

                          {pair.flags.map((flag, i) => (
                            <div key={i} className="flex items-start gap-2 mb-2 p-2.5 rounded-lg" style={{ background: flag.severity === 'high' ? '#FEF2F2' : flag.severity === 'medium' ? '#FFFBEB' : '#F0FDF4' }}>
                              <span className="text-sm">{flag.severity === 'high' ? '🔴' : flag.severity === 'medium' ? '🟡' : '🟢'}</span>
                              <p className="text-xs leading-relaxed" style={{ color: flag.severity === 'high' ? '#B91C1C' : flag.severity === 'medium' ? '#92400E' : '#166534' }}>
                                {flag.message}
                              </p>
                            </div>
                          ))}

                          {pair.suggested_action && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Recommended Action</div>
                              <p className="text-sm text-gray-700">{pair.suggested_action}</p>
                            </div>
                          )}

                          <div className="flex items-center gap-2 mt-4 flex-wrap">
                            {(pair.status === 'suggested' || pair.status === 'flagged') && (
                              <>
                                <button
                                  onClick={() => handleApprovalAction(pair.id, 'approve')}
                                  disabled={saving === pair.id}
                                  className="px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50"
                                  style={{ background: '#16A34A' }}
                                >
                                  {saving === pair.id ? '…' : '✓ Approve Match'}
                                </button>
                                <button
                                  onClick={() => handleApprovalAction(pair.id, 'reject')}
                                  disabled={saving === pair.id}
                                  className="px-3 py-1.5 text-xs font-medium text-white rounded-lg bg-red-600 transition-opacity hover:opacity-90 disabled:opacity-50"
                                >
                                  Reject
                                </button>
                                <button
                                  onClick={() => handleApprovalAction(pair.id, 'edit_match')}
                                  className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                  Override GL
                                </button>
                              </>
                            )}
                            {pair.status === 'unmatched' && (
                              <>
                                <button
                                  onClick={() => handleApprovalAction(pair.id, 'approve')}
                                  disabled={saving === pair.id}
                                  className="px-3 py-1.5 text-xs font-medium text-white rounded-lg disabled:opacity-50"
                                  style={{ background: '#2E75B6' }}
                                >
                                  {saving === pair.id ? '…' : 'Mark Resolved'}
                                </button>
                                <button
                                  onClick={() => handleApprovalAction(pair.id, 'reject')}
                                  disabled={saving === pair.id}
                                  className="px-3 py-1.5 text-xs font-medium text-white rounded-lg bg-red-600 transition-opacity hover:opacity-90 disabled:opacity-50"
                                >
                                  Exclude
                                </button>
                              </>
                            )}
                            {pair.status === 'duplicate' && (
                              <button
                                onClick={() => handleApprovalAction(pair.id, 'reject')}
                                disabled={saving === pair.id}
                                className="px-3 py-1.5 text-xs font-medium text-white rounded-lg disabled:opacity-50"
                                style={{ background: '#DC2626' }}
                              >
                                {saving === pair.id ? '…' : 'Confirm Duplicate & Exclude'}
                              </button>
                            )}
                            <button
                              onClick={() => router.push('/exceptions')}
                              className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              View in Exception Queue →
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
