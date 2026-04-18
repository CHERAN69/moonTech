'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { formatCurrency, formatDate } from '@/lib/utils'
import { MatchedPair, MatchStatus } from '@/types'

type Session = {
  id: string
  name: string
  period_start: string | null
  period_end: string | null
  close_confidence_score: number
  matched_count: number
  unmatched_count: number
  flagged_count: number
  duplicate_count: number
  status: string
  signed_off_at: string | null
  total_matched_amount: number
}

const STATUS_CONFIG: Record<MatchStatus, { bg: string; text: string; label: string; dot: string }> = {
  matched:   { bg: '#F0FDF4', text: '#16A34A', label: 'Matched',      dot: '#16A34A' },
  unmatched: { bg: '#FEF2F2', text: '#DC2626', label: 'Unmatched',    dot: '#DC2626' },
  flagged:   { bg: '#FFFBEB', text: '#D97706', label: 'Flagged',      dot: '#D97706' },
  suggested: { bg: '#EFF6FF', text: '#2563EB', label: 'Needs Review', dot: '#2563EB' },
  duplicate: { bg: '#FAF5FF', text: '#7C3AED', label: 'Duplicate',    dot: '#7C3AED' },
  excluded:  { bg: '#F3F4F6', text: '#6B7280', label: 'Excluded',     dot: '#6B7280' },
}

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t) }, [onClose])
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
      {type === 'success' ? '✓' : '✗'} {message}
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">✕</button>
    </div>
  )
}

export default function ReconciliationResultsPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.id as string

  const [session, setSession] = useState<Session | null>(null)
  const [pairs, setPairs] = useState<MatchedPair[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<string>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [signingOff, setSigningOff] = useState(false)

  const fetchData = useCallback(async () => {
    if (!sessionId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/reconcile/${sessionId}?limit=500`)
      if (res.status === 404) { router.push('/reconcile'); return }
      if (res.ok) {
        const data = await res.json()
        setSession(data.session)
        setPairs(data.pairs ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [sessionId, router])

  useEffect(() => { fetchData() }, [fetchData])

  const handleApprovalAction = useCallback(async (pairId: string, action: 'approve' | 'reject' | 'edit_match') => {
    setSaving(pairId)
    try {
      const res = await fetch(`/api/exceptions/${pairId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (res.ok) {
        const data = await res.json()
        const newStatus = data.exception?.status ?? (action === 'approve' ? 'matched' : 'excluded')
        setPairs(prev => prev.map(p => p.id === pairId ? { ...p, status: newStatus } : p))
        setToast({ message: `Transaction ${action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'updated'}.`, type: 'success' })
      } else {
        const err = await res.json()
        setToast({ message: err.error || 'Action failed.', type: 'error' })
      }
    } catch {
      setToast({ message: 'Network error. Please try again.', type: 'error' })
    } finally {
      setSaving(null)
    }
  }, [])

  const handleSignOff = async () => {
    if (!session) return
    if (session.close_confidence_score < 80) {
      setToast({ message: `Score is ${session.close_confidence_score}/100. Resolve open exceptions to reach 80+ before signing off.`, type: 'error' })
      return
    }
    setSigningOff(true)
    try {
      const res = await fetch(`/api/reconcile/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sign_off' }),
      })
      if (res.ok) {
        const data = await res.json()
        setSession(data.session)
        setToast({ message: 'Close signed off successfully!', type: 'success' })
      } else {
        const err = await res.json()
        setToast({ message: err.error || 'Sign off failed.', type: 'error' })
      }
    } finally {
      setSigningOff(false)
    }
  }

  const tabs = [
    { key: 'all',       label: 'All',         count: pairs.length },
    { key: 'matched',   label: 'Matched',      count: pairs.filter(p => p.status === 'matched').length },
    { key: 'unmatched', label: 'Unmatched',    count: pairs.filter(p => p.status === 'unmatched').length },
    { key: 'flagged',   label: 'Flagged',      count: pairs.filter(p => p.status === 'flagged').length },
    { key: 'suggested', label: 'Needs Review', count: pairs.filter(p => p.status === 'suggested').length },
    { key: 'duplicate', label: 'Duplicates',   count: pairs.filter(p => p.status === 'duplicate').length },
  ]

  const filtered = pairs.filter(p => {
    const matchesTab = activeTab === 'all' || p.status === activeTab
    const q = search.toLowerCase()
    const matchesSearch = !search || [
      p.bank_transaction?.description,
      p.bank_transaction?.vendor,
      p.invoice_transaction?.description,
      p.invoice_transaction?.reference,
    ].some(v => v?.toLowerCase().includes(q))
    return matchesTab && matchesSearch
  })

  const period = session?.period_start && session?.period_end
    ? `${new Date(session.period_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(session.period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : ''


  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <TopBar title="Loading…" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <div className="w-10 h-10 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm">Loading reconciliation…</p>
          </div>
        </div>
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title={session.name}
        subtitle={`${pairs.length} transactions${period ? ` · ${period}` : ''}`}
        closeScore={session.close_confidence_score}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.open(`/api/reports/export?type=reconciliation&session_id=${sessionId}`, '_blank')}
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
            {session.signed_off_at ? (
              <span className="px-3 py-2 text-sm font-medium text-green-700 bg-green-50 rounded-lg">✓ Signed Off</span>
            ) : (
              <button
                onClick={handleSignOff}
                disabled={signingOff}
                className="px-3 py-2 text-sm font-medium text-white rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: session.close_confidence_score >= 80 ? '#16A34A' : '#D97706' }}
              >
                {signingOff ? 'Signing off…' : session.close_confidence_score >= 80 ? '✓ Sign Off Close' : `⚠ Score: ${session.close_confidence_score}/100`}
              </button>
            )}
          </div>
        }
      />

      <div className="flex-1 p-5">
        {/* Summary cards */}
        <div className="grid grid-cols-5 gap-3 mb-5">
          {(
            [
              { key: 'matched',   label: 'Matched',      color: '#16A34A', bg: '#F0FDF4' },
              { key: 'unmatched', label: 'Unmatched',    color: '#DC2626', bg: '#FEF2F2' },
              { key: 'flagged',   label: 'Flagged',      color: '#D97706', bg: '#FFFBEB' },
              { key: 'suggested', label: 'Needs Review', color: '#2563EB', bg: '#EFF6FF' },
              { key: 'duplicate', label: 'Duplicates',   color: '#7C3AED', bg: '#FAF5FF' },
            ] as { key: MatchStatus; label: string; color: string; bg: string }[]
          ).map(card => {
            const cardPairs = pairs.filter(p => p.status === card.key)
            return (
              <button
                key={card.key}
                onClick={() => setActiveTab(card.key)}
                className="rounded-xl border p-3 text-left hover:opacity-90 transition-opacity"
                style={{ background: card.bg, borderColor: card.bg }}
              >
                <div className="text-2xl font-bold" style={{ color: card.color }}>{cardPairs.length}</div>
                <div className="text-xs font-medium mt-0.5" style={{ color: card.color }}>{card.label}</div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {formatCurrency(cardPairs.reduce((s, p) => s + (p.bank_transaction?.amount ?? 0), 0))}
                </div>
              </button>
            )
          })}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="flex items-center justify-between px-4 border-b border-gray-100">
            <div className="flex overflow-x-auto">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-3.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.key ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs">{tab.count}</span>
                  )}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Search transactions…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="px-3 py-1.5 my-2 rounded-lg border border-gray-200 text-xs outline-none focus:border-blue-400 w-48 flex-shrink-0"
            />
          </div>

          {filtered.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">No transactions match this filter.</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filtered.map(pair => {
                const cfg = STATUS_CONFIG[pair.status]
                const expanded = expandedId === pair.id
                return (
                  <div key={pair.id}>
                    <button
                      onClick={() => setExpandedId(expanded ? null : pair.id)}
                      className="w-full flex items-start px-4 py-3.5 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="flex-shrink-0 mt-1.5 mr-3">
                        <div className="w-2 h-2 rounded-full" style={{ background: cfg.dot }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-gray-800 truncate">
                              {pair.bank_transaction?.vendor || pair.bank_transaction?.description}
                            </div>
                            <div className="text-xs text-gray-400 mt-0.5">
                              {formatDate(pair.bank_transaction?.date)} · {pair.bank_transaction?.description}
                            </div>
                          </div>
                          <div className="font-semibold text-gray-900 flex-shrink-0">
                            {formatCurrency(pair.bank_transaction?.amount ?? 0)}
                          </div>
                        </div>
                      </div>
                      <div className="flex-shrink-0 mx-4 mt-1 text-gray-200 text-sm">→</div>
                      <div className="flex-1 min-w-0">
                        {pair.invoice_transaction ? (
                          <div>
                            <div className="text-sm text-gray-600 truncate">
                              {pair.invoice_transaction.reference || pair.invoice_transaction.description}
                            </div>
                            <div className="text-xs text-gray-400 mt-0.5">{formatDate(pair.invoice_transaction.date)}</div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-300 italic">No matching invoice found</div>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                        {pair.gl_category && (
                          <span className="hidden lg:block text-xs text-gray-400 max-w-[7rem] truncate">{pair.gl_category}</span>
                        )}
                        {pair.confidence > 0 && (
                          <span className="text-xs font-medium text-gray-400">{pair.confidence}%</span>
                        )}
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: cfg.bg, color: cfg.text }}>
                          {cfg.label}
                        </span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                          className={`transition-transform ${expanded ? 'rotate-90' : ''}`} aria-hidden="true">
                          <polyline points="9 18 15 12 9 6"/>
                        </svg>
                      </div>
                    </button>

                    {expanded && (
                      <div className="px-5 pb-4">
                        <div className="rounded-xl p-4 border" style={{ background: '#F8FAFC', borderColor: '#E2E8F0' }}>
                          <div className="flex items-center gap-2 mb-3">
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: '#EFF6FF', color: '#2E75B6' }}>
                              <span className="w-1 h-1 rounded-full bg-blue-400" />
                              AI Analysis
                            </div>
                            {pair.confidence > 0 && (
                              <span className="text-xs text-gray-400">Confidence: {pair.confidence}%</span>
                            )}
                          </div>
                          {pair.explanation && (
                            <p className="text-sm text-gray-700 leading-relaxed mb-3">{pair.explanation}</p>
                          )}
                          {pair.flags?.map((flag, i) => (
                            <div key={i} className="flex items-start gap-2 mb-2 p-2.5 rounded-lg"
                              style={{ background: flag.severity === 'high' ? '#FEF2F2' : flag.severity === 'medium' ? '#FFFBEB' : '#F0FDF4' }}>
                              <span className="text-sm">{flag.severity === 'high' ? '🔴' : flag.severity === 'medium' ? '🟡' : '🟢'}</span>
                              <p className="text-xs leading-relaxed"
                                style={{ color: flag.severity === 'high' ? '#B91C1C' : flag.severity === 'medium' ? '#92400E' : '#166534' }}>
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
                                <button onClick={() => handleApprovalAction(pair.id, 'approve')} disabled={saving === pair.id}
                                  className="px-3 py-1.5 text-xs font-medium text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                                  style={{ background: '#16A34A' }}>
                                  {saving === pair.id ? '…' : '✓ Approve Match'}
                                </button>
                                <button onClick={() => handleApprovalAction(pair.id, 'reject')} disabled={saving === pair.id}
                                  className="px-3 py-1.5 text-xs font-medium text-white rounded-lg bg-red-600 hover:opacity-90 disabled:opacity-50">
                                  Reject
                                </button>
                              </>
                            )}
                            {pair.status === 'unmatched' && (
                              <>
                                <button onClick={() => handleApprovalAction(pair.id, 'approve')} disabled={saving === pair.id}
                                  className="px-3 py-1.5 text-xs font-medium text-white rounded-lg disabled:opacity-50"
                                  style={{ background: '#2E75B6' }}>
                                  {saving === pair.id ? '…' : 'Mark Resolved'}
                                </button>
                                <button onClick={() => handleApprovalAction(pair.id, 'reject')} disabled={saving === pair.id}
                                  className="px-3 py-1.5 text-xs font-medium text-white rounded-lg bg-red-600 hover:opacity-90 disabled:opacity-50">
                                  Exclude
                                </button>
                              </>
                            )}
                            {pair.status === 'duplicate' && (
                              <button onClick={() => handleApprovalAction(pair.id, 'reject')} disabled={saving === pair.id}
                                className="px-3 py-1.5 text-xs font-medium text-white rounded-lg disabled:opacity-50"
                                style={{ background: '#DC2626' }}>
                                {saving === pair.id ? '…' : 'Confirm Duplicate & Exclude'}
                              </button>
                            )}
                            <button onClick={() => router.push('/exceptions')}
                              className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors">
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
