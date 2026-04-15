'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { formatCurrency, formatDate } from '@/lib/utils'
import { MatchedPair, MatchStatus } from '@/types'

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
    explanation: "This $7,000 AWS charge is 150% above your typical monthly average of $2,800.",
    suggested_action: "Verify with your engineering lead that the April 8 launch caused elevated usage.",
    bank_transaction: { id: 'b2', date: '2026-04-10', amount: 7000, description: 'AMAZON WEB SERVICES', vendor: 'Amazon Web Services', source: 'bank' },
    invoice_transaction: { id: 'i2', date: '2026-04-08', amount: 7000, description: 'AWS Cloud Services - Usage Spike', vendor: 'AWS', reference: 'INV-2026-049', source: 'invoice' },
  },
  {
    id: '3', status: 'unmatched', confidence: 0, match_method: 'rule', flags: [{ type: 'missing_invoice', severity: 'medium', message: 'No matching invoice found.' }], created_at: new Date().toISOString(),
    gl_category: 'Marketing & Advertising',
    explanation: "A $1,200 payment to Mailchimp was found with no matching invoice.",
    suggested_action: "Log in to Mailchimp and verify if this is an annual subscription.",
    bank_transaction: { id: 'b3', date: '2026-04-05', amount: 1200, description: 'Mailchimp', vendor: 'Mailchimp', source: 'bank' },
  },
  {
    id: '4', status: 'duplicate', confidence: 0, match_method: 'rule', flags: [{ type: 'duplicate', severity: 'high', message: 'Identical transaction detected 3 days prior.' }], created_at: new Date().toISOString(),
    gl_category: 'Sales & Marketing Software',
    explanation: "A $450 payment to HubSpot on April 9 appears to duplicate a payment on April 6.",
    suggested_action: "Contact HubSpot billing to request a refund for the duplicate charge.",
    bank_transaction: { id: 'b4', date: '2026-04-09', amount: 450, description: 'HubSpot Inc', vendor: 'HubSpot', source: 'bank' },
  },
  {
    id: '5', status: 'matched', confidence: 94, match_method: 'fuzzy_ai', flags: [], created_at: new Date().toISOString(),
    gl_category: 'Payroll & Benefits',
    explanation: 'Gusto payroll batch matched to payroll record with 94% confidence.',
    bank_transaction: { id: 'b5', date: '2026-04-15', amount: 48200, description: 'Gusto Payroll', vendor: 'Gusto', source: 'bank' },
    invoice_transaction: { id: 'i5', date: '2026-04-14', amount: 48200, description: 'April 15 Payroll Run', vendor: 'Gusto', reference: 'PAY-2026-08', source: 'invoice' },
  },
  {
    id: '6', status: 'suggested', confidence: 68, match_method: 'fuzzy_ai', flags: [], created_at: new Date().toISOString(),
    gl_category: 'Professional Services',
    explanation: 'Possible match found with 68% confidence. Vendor name 85% similarity.',
    suggested_action: 'Confirm this is the same vendor and accept the match.',
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
  matched:   { bg: 'var(--success-bg)', text: 'var(--success)', label: 'Matched',    dot: 'var(--success)' },
  unmatched: { bg: 'var(--error-bg)',   text: 'var(--error)',   label: 'Unmatched',  dot: 'var(--error)' },
  flagged:   { bg: 'var(--warning-bg)', text: 'var(--warning)', label: 'Flagged',    dot: 'var(--warning)' },
  suggested: { bg: 'var(--info-bg)',    text: 'var(--brand)',   label: 'Needs Review', dot: 'var(--brand)' },
  duplicate: { bg: 'var(--purple-bg)',  text: 'var(--purple)',  label: 'Duplicate',  dot: 'var(--purple)' },
  excluded:  { bg: 'var(--bg-tertiary)', text: 'var(--text-tertiary)', label: 'Excluded', dot: 'var(--text-tertiary)' },
}

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white"
      style={{ background: type === 'success' ? 'var(--success)' : 'var(--error)', boxShadow: 'var(--shadow-lg)' }}>
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
  const [pairs, setPairs] = useState<MatchedPair[]>(DEMO_PAIRS)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [saving, setSaving] = useState<string | null>(null)

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
        setToast({ message: `Transaction ${action}d successfully.`, type: 'success' })
      } else {
        const nextStatus: Record<string, MatchStatus> = { approve: 'matched', reject: 'excluded' }
        if (nextStatus[action]) {
          setPairs(prev => prev.map(p => p.id === pairId ? { ...p, status: nextStatus[action] } : p))
        }
        setToast({ message: `${action === 'approve' ? 'Approved' : 'Rejected'} (demo mode).`, type: 'success' })
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
    const matchesSearch = !search || [p.bank_transaction.description, p.bank_transaction.vendor, p.invoice_transaction?.description, p.invoice_transaction?.reference].some(v => v?.toLowerCase().includes(search.toLowerCase()))
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
            <button onClick={() => router.push('/exceptions')} className="px-3 py-2 text-sm rounded-lg transition-colors" style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
              Exception Queue
            </button>
          </div>
        }
      />

      <div className="flex-1 p-5">
        {/* Summary cards */}
        <div className="grid grid-cols-5 gap-3 mb-5">
          {[
            { label: 'Matched', count: DEMO_PAIRS.filter(p => p.status === 'matched').length, color: 'var(--success)', amount: DEMO_PAIRS.filter(p => p.status === 'matched').reduce((s, p) => s + p.bank_transaction.amount, 0) },
            { label: 'Unmatched', count: DEMO_PAIRS.filter(p => p.status === 'unmatched').length, color: 'var(--error)', amount: DEMO_PAIRS.filter(p => p.status === 'unmatched').reduce((s, p) => s + p.bank_transaction.amount, 0) },
            { label: 'Flagged', count: DEMO_PAIRS.filter(p => p.status === 'flagged').length, color: 'var(--warning)', amount: DEMO_PAIRS.filter(p => p.status === 'flagged').reduce((s, p) => s + p.bank_transaction.amount, 0) },
            { label: 'Needs Review', count: DEMO_PAIRS.filter(p => p.status === 'suggested').length, color: 'var(--brand)', amount: DEMO_PAIRS.filter(p => p.status === 'suggested').reduce((s, p) => s + p.bank_transaction.amount, 0) },
            { label: 'Duplicates', count: DEMO_PAIRS.filter(p => p.status === 'duplicate').length, color: 'var(--purple)', amount: DEMO_PAIRS.filter(p => p.status === 'duplicate').reduce((s, p) => s + p.bank_transaction.amount, 0) },
          ].map(card => (
            <button key={card.label} onClick={() => setActiveTab(card.label === 'Needs Review' ? 'suggested' : card.label.toLowerCase())}
              className="rounded-xl p-3 text-left transition-colors"
              style={{ background: `${card.color}10`, border: `1px solid ${card.color}30` }}>
              <div className="text-2xl font-bold" style={{ color: card.color }}>{card.count}</div>
              <div className="text-xs font-medium mt-0.5" style={{ color: card.color }}>{card.label}</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{formatCurrency(card.amount)}</div>
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="rounded-2xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between px-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex">
              {STATUS_TABS.map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className="px-4 py-3.5 text-xs font-medium transition-colors"
                  style={{
                    borderBottom: activeTab === tab.key ? '2px solid var(--brand)' : '2px solid transparent',
                    color: activeTab === tab.key ? 'var(--brand)' : 'var(--text-tertiary)',
                  }}>
                  {tab.label}
                  {tab.count > 0 && <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>{tab.count}</span>}
                </button>
              ))}
            </div>
            <input type="text" placeholder="Search transactions..." value={search} onChange={e => setSearch(e.target.value)}
              className="px-3 py-1.5 my-2 rounded-lg text-xs outline-none transition-colors w-48"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
          </div>

          <div>
            {filtered.map(pair => {
              const cfg = STATUS_CONFIG[pair.status]
              const expanded = expandedId === pair.id
              return (
                <div key={pair.id}>
                  <button onClick={() => setExpandedId(expanded ? null : pair.id)}
                    className="w-full flex items-start px-4 py-3.5 transition-colors text-left"
                    style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <div className="flex-shrink-0 mt-1 mr-3">
                      <div className="w-2 h-2 rounded-full" style={{ background: cfg.dot }}></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{pair.bank_transaction.vendor || pair.bank_transaction.description}</div>
                          <div className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{formatDate(pair.bank_transaction.date)} · {pair.bank_transaction.description}</div>
                        </div>
                        <div className="font-semibold flex-shrink-0" style={{ color: 'var(--text-primary)' }}>{formatCurrency(pair.bank_transaction.amount)}</div>
                      </div>
                    </div>
                    <div className="flex-shrink-0 mx-4 mt-1" style={{ color: 'var(--text-muted)' }}>→</div>
                    <div className="flex-1 min-w-0">
                      {pair.invoice_transaction ? (
                        <div>
                          <div className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>{pair.invoice_transaction.reference || pair.invoice_transaction.description}</div>
                          <div className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{formatDate(pair.invoice_transaction.date)}</div>
                        </div>
                      ) : (
                        <div className="text-sm italic" style={{ color: 'var(--text-muted)' }}>No matching invoice found</div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                      {pair.confidence > 0 && <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>{pair.confidence}%</span>}
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: cfg.bg, color: cfg.text }}>{cfg.label}</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        className={`transition-transform ${expanded ? 'rotate-90' : ''}`}>
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </div>
                  </button>

                  {expanded && (
                    <div className="px-4 pb-4 ml-5 mr-5">
                      <div className="rounded-xl p-4" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'var(--info-bg)', color: 'var(--brand)' }}>
                            <span className="w-1 h-1 rounded-full" style={{ background: 'var(--brand)' }}></span>
                            AI Analysis
                          </div>
                        </div>
                        {pair.explanation && <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>{pair.explanation}</p>}
                        {pair.flags.map((flag, i) => (
                          <div key={i} className="flex items-start gap-2 mb-2 p-2.5 rounded-lg"
                            style={{ background: flag.severity === 'high' ? 'var(--error-bg)' : flag.severity === 'medium' ? 'var(--warning-bg)' : 'var(--success-bg)' }}>
                            <p className="text-xs leading-relaxed" style={{ color: flag.severity === 'high' ? 'var(--error)' : flag.severity === 'medium' ? 'var(--warning)' : 'var(--success)' }}>{flag.message}</p>
                          </div>
                        ))}
                        {pair.suggested_action && (
                          <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                            <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Recommended Action</div>
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{pair.suggested_action}</p>
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-4 flex-wrap">
                          {(pair.status === 'suggested' || pair.status === 'flagged') && (
                            <>
                              <button onClick={() => handleApprovalAction(pair.id, 'approve')} disabled={saving === pair.id}
                                className="px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50"
                                style={{ background: 'var(--success)' }}>{saving === pair.id ? '…' : '✓ Approve'}</button>
                              <button onClick={() => handleApprovalAction(pair.id, 'reject')} disabled={saving === pair.id}
                                className="px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50"
                                style={{ background: 'var(--error)' }}>Reject</button>
                            </>
                          )}
                          {pair.status === 'unmatched' && (
                            <button onClick={() => handleApprovalAction(pair.id, 'approve')} disabled={saving === pair.id}
                              className="px-3 py-1.5 text-xs font-medium text-white rounded-lg disabled:opacity-50"
                              style={{ background: 'var(--brand)' }}>{saving === pair.id ? '…' : 'Mark Resolved'}</button>
                          )}
                          {pair.status === 'duplicate' && (
                            <button onClick={() => handleApprovalAction(pair.id, 'reject')} disabled={saving === pair.id}
                              className="px-3 py-1.5 text-xs font-medium text-white rounded-lg disabled:opacity-50"
                              style={{ background: 'var(--error)' }}>{saving === pair.id ? '…' : 'Confirm Duplicate & Exclude'}</button>
                          )}
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
