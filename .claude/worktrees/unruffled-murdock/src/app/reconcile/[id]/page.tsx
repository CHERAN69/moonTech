'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { formatCurrency, formatDate } from '@/lib/utils'
import { MatchedPair, MatchStatus } from '@/types'

// Demo data — in production this comes from Supabase
const DEMO_PAIRS: MatchedPair[] = [
  {
    id: '1', status: 'matched', confidence: 97, match_method: 'exact', flags: [], created_at: new Date().toISOString(),
    gl_category: 'Cloud Infrastructure',
    explanation: 'Exact match on amount and date. AWS charge of $2,800 aligns perfectly with the recurring monthly invoice.',
    bank_transaction: { id: 'b1', date: '2026-04-01', amount: 2800, description: 'AMAZON WEB SERVICES', vendor: 'Amazon Web Services', source: 'bank' },
    invoice_transaction: { id: 'i1', date: '2026-04-01', amount: 2800, description: 'AWS Cloud Services - April', vendor: 'AWS', reference: 'INV-2026-041', source: 'invoice' },
  },
  {
    id: '2', status: 'flagged', confidence: 78, match_method: 'fuzzy_ai', flags: [{ type: 'amount_deviation', severity: 'high', message: 'This AWS charge is 150% above the average of $2,800. Possible usage spike from product launch on April 8.' }], created_at: new Date().toISOString(),
    gl_category: 'Cloud Infrastructure',
    explanation: "This $7,000 AWS charge is 150% above your typical monthly average of $2,800. The spike likely correlates with your product launch on April 8th — AWS billing can lag 2-3 days. Recommend confirming with your engineering team before approving.",
    suggested_action: "Verify with your engineering lead that the April 8 launch caused elevated EC2/RDS usage. If confirmed, approve and tag as 'product launch - Q2 2026' for budget tracking.",
    bank_transaction: { id: 'b2', date: '2026-04-10', amount: 7000, description: 'AMAZON WEB SERVICES', vendor: 'Amazon Web Services', source: 'bank' },
    invoice_transaction: { id: 'i2', date: '2026-04-08', amount: 7000, description: 'AWS Cloud Services - Usage Spike', vendor: 'AWS', reference: 'INV-2026-049', source: 'invoice' },
  },
  {
    id: '3', status: 'unmatched', confidence: 0, match_method: 'rule', flags: [{ type: 'missing_invoice', severity: 'medium', message: 'No matching invoice found. Mailchimp typically bills $240/month.' }], created_at: new Date().toISOString(),
    gl_category: 'Marketing & Advertising',
    explanation: "A $1,200 payment to Mailchimp was found in your bank statement with no matching invoice. Based on your billing history, Mailchimp typically charges $240/month — this $1,200 charge is 5× the expected amount, which could indicate an annual billing switch or a plan upgrade.",
    suggested_action: "Log in to your Mailchimp account and verify if this is an annual subscription charge or an accidental plan upgrade. Download the invoice from their billing portal and upload it here.",
    bank_transaction: { id: 'b3', date: '2026-04-05', amount: 1200, description: 'Mailchimp', vendor: 'Mailchimp', source: 'bank' },
  },
  {
    id: '4', status: 'duplicate', confidence: 0, match_method: 'rule', flags: [{ type: 'duplicate', severity: 'high', message: 'Identical transaction detected 3 days prior. Possible double-payment to HubSpot.' }], created_at: new Date().toISOString(),
    gl_category: 'Sales & Marketing Software',
    explanation: "A $450 payment to HubSpot on April 9 appears to duplicate a payment on April 6 for the same amount. This is consistent with a double-payment scenario — the first payment may have appeared to fail and been resubmitted. HubSpot's monthly subscription is $450/month.",
    suggested_action: "Contact HubSpot billing immediately to request a refund for the duplicate charge. Reference payment dates April 6 and April 9, amount $450 each.",
    bank_transaction: { id: 'b4', date: '2026-04-09', amount: 450, description: 'HubSpot Inc', vendor: 'HubSpot', source: 'bank' },
  },
  {
    id: '5', status: 'matched', confidence: 94, match_method: 'fuzzy_ai', flags: [], created_at: new Date().toISOString(),
    gl_category: 'Payroll & Benefits',
    explanation: 'Gusto payroll batch matched to payroll record with 94% confidence. Minor date difference of 1 day likely due to ACH processing delay.',
    bank_transaction: { id: 'b5', date: '2026-04-15', amount: 48200, description: 'Gusto Payroll', vendor: 'Gusto', source: 'bank' },
    invoice_transaction: { id: 'i5', date: '2026-04-14', amount: 48200, description: 'April 15 Payroll Run', vendor: 'Gusto', reference: 'PAY-2026-08', source: 'invoice' },
  },
  {
    id: '6', status: 'suggested', confidence: 68, match_method: 'fuzzy_ai', flags: [], created_at: new Date().toISOString(),
    gl_category: 'Professional Services',
    explanation: 'Possible match found with 68% confidence. The payment description "Smith Consulting LLC" and the invoice vendor "John Smith Consulting" appear to be the same entity — vendor name normalization detected an 85% similarity. Amount and date both match exactly.',
    suggested_action: 'Confirm this is the same vendor and accept the match, or create a vendor alias mapping for future auto-matching.',
    bank_transaction: { id: 'b6', date: '2026-04-07', amount: 3500, description: 'Smith Consulting LLC', vendor: 'Smith Consulting', source: 'bank' },
    invoice_transaction: { id: 'i6', date: '2026-04-07', amount: 3500, description: 'Consulting Services - March Retainer', vendor: 'John Smith Consulting', reference: 'INV-JSC-0041', source: 'invoice' },
  },
]

const STATUS_TABS = [
  { key: 'all', label: 'All', count: DEMO_PAIRS.length },
  { key: 'matched', label: 'Matched', count: DEMO_PAIRS.filter(p => p.status === 'matched').length },
  { key: 'unmatched', label: 'Unmatched', count: DEMO_PAIRS.filter(p => p.status === 'unmatched').length },
  { key: 'flagged', label: 'Flagged', count: DEMO_PAIRS.filter(p => p.status === 'flagged').length },
  { key: 'suggested', label: 'Needs Review', count: DEMO_PAIRS.filter(p => p.status === 'suggested').length },
  { key: 'duplicate', label: 'Duplicates', count: DEMO_PAIRS.filter(p => p.status === 'duplicate').length },
]

const STATUS_CONFIG: Record<MatchStatus, { bg: string; text: string; label: string; dot: string }> = {
  matched:   { bg: '#F0FDF4', text: '#16A34A', label: 'Matched',    dot: '#16A34A' },
  unmatched: { bg: '#FEF2F2', text: '#DC2626', label: 'Unmatched',  dot: '#DC2626' },
  flagged:   { bg: '#FFFBEB', text: '#D97706', label: 'Flagged',    dot: '#D97706' },
  suggested: { bg: '#EFF6FF', text: '#2563EB', label: 'Needs Review', dot: '#2563EB' },
  duplicate: { bg: '#FAF5FF', text: '#7C3AED', label: 'Duplicate',  dot: '#7C3AED' },
  excluded:  { bg: '#F3F4F6', text: '#6B7280', label: 'Excluded',   dot: '#6B7280' },
}

// ─── Toast notification ───────────────────────────────────────────────────────

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
      {type === 'success' ? '✓' : '✗'} {message}
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">✕</button>
    </div>
  )
}

export default function ReconciliationResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<string>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [pairs, setPairs]   = useState<MatchedPair[]>(DEMO_PAIRS)
  const [toast, setToast]   = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [saving, setSaving] = useState<string | null>(null)  // pair id being saved

  // Approval action handler — calls /api/exceptions/[id] PATCH
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
        // Demo mode: optimistic update
        const nextStatus: Record<string, MatchStatus> = { approve: 'matched', reject: 'excluded' }
        if (nextStatus[action]) {
          setPairs(prev => prev.map(p => p.id === pairId ? { ...p, status: nextStatus[action] } : p))
        }
        setToast({ message: `${action === 'approve' ? 'Approved' : 'Rejected'} (demo mode — connect Supabase to persist).`, type: 'success' })
      }
    } catch {
      setToast({ message: 'Action failed. Please try again.', type: 'error' })
    } finally {
      setSaving(null)
    }
  }, [])

  const closeScore = 73
  const matchedCount = pairs.filter(p => p.status === 'matched').length
  const totalCount = pairs.length

  const filtered = pairs.filter(p => {
    const matchesTab = activeTab === 'all' || p.status === activeTab
    const matchesSearch = !search || [
      p.bank_transaction.description,
      p.bank_transaction.vendor,
      p.invoice_transaction?.description,
      p.invoice_transaction?.reference,
    ].some(v => v?.toLowerCase().includes(search.toLowerCase()))
    return matchesTab && matchesSearch
  })

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="April 2026 — Stripe Payouts"
        subtitle={`${totalCount} transactions · ${matchedCount} matched · April 1–10, 2026`}
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
              onClick={() => window.location.href = '/exceptions'}
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
        <div className="grid grid-cols-5 gap-3 mb-5">
          {[
            { label: 'Matched', count: DEMO_PAIRS.filter(p => p.status === 'matched').length, color: '#16A34A', bg: '#F0FDF4', amount: DEMO_PAIRS.filter(p => p.status === 'matched').reduce((s, p) => s + p.bank_transaction.amount, 0) },
            { label: 'Unmatched', count: DEMO_PAIRS.filter(p => p.status === 'unmatched').length, color: '#DC2626', bg: '#FEF2F2', amount: DEMO_PAIRS.filter(p => p.status === 'unmatched').reduce((s, p) => s + p.bank_transaction.amount, 0) },
            { label: 'Flagged', count: DEMO_PAIRS.filter(p => p.status === 'flagged').length, color: '#D97706', bg: '#FFFBEB', amount: DEMO_PAIRS.filter(p => p.status === 'flagged').reduce((s, p) => s + p.bank_transaction.amount, 0) },
            { label: 'Needs Review', count: DEMO_PAIRS.filter(p => p.status === 'suggested').length, color: '#2563EB', bg: '#EFF6FF', amount: DEMO_PAIRS.filter(p => p.status === 'suggested').reduce((s, p) => s + p.bank_transaction.amount, 0) },
            { label: 'Duplicates', count: DEMO_PAIRS.filter(p => p.status === 'duplicate').length, color: '#7C3AED', bg: '#FAF5FF', amount: DEMO_PAIRS.filter(p => p.status === 'duplicate').reduce((s, p) => s + p.bank_transaction.amount, 0) },
          ].map(card => (
            <button key={card.label} onClick={() => setActiveTab(card.label === 'Needs Review' ? 'suggested' : card.label.toLowerCase())}
              className="rounded-xl border p-3 text-left hover:border-gray-200 transition-colors"
              style={{ background: card.bg, borderColor: card.bg }}>
              <div className="text-2xl font-bold" style={{ color: card.color }}>{card.count}</div>
              <div className="text-xs font-medium mt-0.5" style={{ color: card.color }}>{card.label}</div>
              <div className="text-xs text-gray-400 mt-0.5">{formatCurrency(card.amount)}</div>
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100">
          {/* Tabs + Search */}
          <div className="flex items-center justify-between px-4 border-b border-gray-100">
            <div className="flex">
              {STATUS_TABS.map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-3.5 text-xs font-medium border-b-2 transition-colors ${
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
              className="px-3 py-1.5 my-2 rounded-lg border border-gray-200 text-xs outline-none focus:border-blue-400 transition-colors w-48"
            />
          </div>

          {/* Rows */}
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
                    {/* Status dot */}
                    <div className="flex-shrink-0 mt-1 mr-3">
                      <div className="w-2 h-2 rounded-full" style={{ background: cfg.dot }}></div>
                    </div>

                    {/* Bank transaction */}
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

                    {/* Arrow */}
                    <div className="flex-shrink-0 mx-4 mt-1 text-gray-200">→</div>

                    {/* Invoice transaction */}
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

                    {/* Status + confidence */}
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

                  {/* Expanded AI explanation panel */}
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

                        {/* Action buttons */}
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
                            onClick={() => window.location.href = '/exceptions'}
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
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
