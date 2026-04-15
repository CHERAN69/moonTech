'use client'

import { useState, useEffect, useCallback } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { ExceptionItem, ExceptionResolution, MatchStatus } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterStatus = 'all' | 'unmatched' | 'flagged' | 'duplicate' | 'suggested'
type FilterResolution = 'pending' | 'approved' | 'rejected' | 'all'

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string; dot: string }> = {
  unmatched: { bg: '#FEF2F2', text: '#DC2626', label: 'Unmatched',   dot: '#DC2626' },
  flagged:   { bg: '#FFFBEB', text: '#D97706', label: 'Flagged',     dot: '#D97706' },
  duplicate: { bg: '#FAF5FF', text: '#7C3AED', label: 'Duplicate',   dot: '#7C3AED' },
  suggested: { bg: '#EFF6FF', text: '#2563EB', label: 'Needs Review',dot: '#2563EB' },
  matched:   { bg: '#F0FDF4', text: '#16A34A', label: 'Matched',     dot: '#16A34A' },
  excluded:  { bg: '#F3F4F6', text: '#6B7280', label: 'Excluded',    dot: '#6B7280' },
}

const RESOLUTION_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  approved:  { bg: '#F0FDF4', text: '#16A34A', label: 'Approved' },
  rejected:  { bg: '#FEF2F2', text: '#DC2626', label: 'Rejected' },
  edited:    { bg: '#EFF6FF', text: '#2563EB', label: 'Edited'   },
  resolved:  { bg: '#F9FAFB', text: '#6B7280', label: 'Resolved' },
}

// ─── Demo data (used when Supabase not configured) ────────────────────────────

const DEMO_EXCEPTIONS: ExceptionItem[] = [
  {
    id: 'exc-1', session_id: 'sess-1', user_id: 'demo', status: 'unmatched', confidence: 0,
    match_method: 'rule', created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    gl_category: 'Marketing & Advertising',
    flags: [{ type: 'missing_invoice', severity: 'medium', message: 'No matching invoice found. Mailchimp typically bills $240/month.' }],
    explanation: 'A $1,200 payment to Mailchimp was found with no matching invoice. Based on billing history, Mailchimp charges $240/month — this charge is 5× the expected amount.',
    suggested_action: 'Log in to Mailchimp and verify if this is an annual subscription switch. Download the invoice and upload it here.',
    bank_transaction: { id: 'b3', date: '2026-04-05', amount: 1200, description: 'Mailchimp', vendor: 'Mailchimp', source: 'bank' },
    reconciliation_sessions: { name: 'April 2026 — Stripe Payouts', period_start: '2026-04-01', period_end: '2026-04-10' },
  },
  {
    id: 'exc-2', session_id: 'sess-1', user_id: 'demo', status: 'duplicate', confidence: 0,
    match_method: 'rule', created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    gl_category: 'Sales & Marketing Software',
    flags: [{ type: 'duplicate', severity: 'high', message: 'Identical transaction detected 3 days prior. Possible double-payment to HubSpot.' }],
    explanation: 'A $450 payment to HubSpot on Apr 9 appears to duplicate a payment on Apr 6 for the same amount. This is consistent with a double-payment scenario.',
    suggested_action: 'Contact HubSpot billing immediately to request a refund. Reference payment dates Apr 6 and Apr 9, amount $450 each.',
    bank_transaction: { id: 'b4', date: '2026-04-09', amount: 450, description: 'HubSpot Inc', vendor: 'HubSpot', source: 'bank' },
    reconciliation_sessions: { name: 'April 2026 — Stripe Payouts', period_start: '2026-04-01', period_end: '2026-04-10' },
  },
  {
    id: 'exc-3', session_id: 'sess-1', user_id: 'demo', status: 'flagged', confidence: 78,
    match_method: 'fuzzy_ai', created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    gl_category: 'Cloud Infrastructure',
    flags: [{ type: 'amount_deviation', severity: 'high', message: 'This AWS charge is 150% above the average of $2,800.' }],
    explanation: 'This $7,000 AWS charge is 150% above your typical monthly average of $2,800. The spike likely correlates with your product launch on April 8th.',
    suggested_action: 'Verify with your engineering lead that the April 8 launch caused elevated EC2/RDS usage. If confirmed, approve and tag as \'product launch - Q2 2026\'.',
    bank_transaction: { id: 'b2', date: '2026-04-10', amount: 7000, description: 'AMAZON WEB SERVICES', vendor: 'Amazon Web Services', source: 'bank' },
    invoice_transaction: { id: 'i2', date: '2026-04-08', amount: 7000, description: 'AWS Cloud Services - Usage Spike', vendor: 'AWS', reference: 'INV-2026-049', source: 'invoice' },
    reconciliation_sessions: { name: 'April 2026 — Stripe Payouts', period_start: '2026-04-01', period_end: '2026-04-10' },
  },
  {
    id: 'exc-4', session_id: 'sess-1', user_id: 'demo', status: 'suggested', confidence: 68,
    match_method: 'fuzzy_ai', created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    gl_category: 'Professional Services',
    flags: [],
    explanation: 'Possible match found with 68% confidence. "Smith Consulting LLC" and "John Smith Consulting" appear to be the same entity — 85% vendor name similarity. Amount and date both match exactly.',
    suggested_action: 'Confirm this is the same vendor and accept the match, or create a vendor alias mapping for future auto-matching.',
    bank_transaction: { id: 'b6', date: '2026-04-07', amount: 3500, description: 'Smith Consulting LLC', vendor: 'Smith Consulting', source: 'bank' },
    invoice_transaction: { id: 'i6', date: '2026-04-07', amount: 3500, description: 'Consulting Services - March Retainer', vendor: 'John Smith Consulting', reference: 'INV-JSC-0041', source: 'invoice' },
    reconciliation_sessions: { name: 'April 2026 — Stripe Payouts', period_start: '2026-04-01', period_end: '2026-04-10' },
  },
]

// ─── Action Modal ─────────────────────────────────────────────────────────────

function ActionModal({
  item,
  action,
  onClose,
  onConfirm,
}: {
  item: ExceptionItem
  action: string
  onClose: () => void
  onConfirm: (payload: Record<string, string>) => void
}) {
  const [note, setNote]         = useState(item.note ?? '')
  const [glOverride, setGl]     = useState(item.gl_override ?? item.gl_category ?? '')
  const [reason, setReason]     = useState('')
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async () => {
    setLoading(true)
    await onConfirm({ note, gl_override: glOverride, override_reason: reason })
    setLoading(false)
  }

  const titles: Record<string, string> = {
    approve:       'Approve Match',
    reject:        'Reject & Exclude',
    edit_match:    'Edit Match / Override GL',
    add_note:      'Add Note',
    mark_resolved: 'Mark as Resolved',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">{titles[action] ?? action}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Transaction summary */}
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
            <div className="text-sm font-medium text-gray-800">{item.bank_transaction.vendor || item.bank_transaction.description}</div>
            <div className="text-xs text-gray-400 mt-0.5">{formatDate(item.bank_transaction.date)} · {formatCurrency(item.bank_transaction.amount)}</div>
          </div>

          {/* GL override for edit_match */}
          {action === 'edit_match' && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">GL Category Override</label>
              <input
                type="text"
                value={glOverride}
                onChange={e => setGl(e.target.value)}
                placeholder="e.g. Cloud Infrastructure"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
              />
            </div>
          )}

          {/* Override reason for reject */}
          {action === 'reject' && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Reason for Rejection</label>
              <input
                type="text"
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="e.g. Duplicate payment confirmed"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
              />
            </div>
          )}

          {/* Note field (always shown) */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Note {action === 'add_note' ? '' : '(optional)'}
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Add a note for the audit trail..."
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all resize-none"
            />
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className={cn(
              'flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50',
              action === 'reject' ? 'bg-red-600' : ''
            )}
            style={action !== 'reject' ? { background: '#1E3A5F' } : {}}
          >
            {loading ? 'Saving…' : titles[action] ?? 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Exception Row ────────────────────────────────────────────────────────────

function ExceptionRow({
  item,
  onAction,
}: {
  item: ExceptionItem
  onAction: (item: ExceptionItem, action: string) => void
}) {
  const [expanded, setExpanded]       = useState(false)
  const [explaining, setExplaining]   = useState(false)
  const [aiExplanation, setAiExpl]    = useState(item.ai_explanation || '')

  const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG['unmatched']
  const resCfg = item.resolution ? RESOLUTION_CONFIG[item.resolution] : null
  const isPending = !item.resolution

  const handleExplain = async () => {
    if (aiExplanation) { setExpanded(true); return }
    setExplaining(true)
    setExpanded(true)
    try {
      const res = await fetch(`/api/exceptions/${item.id}/explain`, { method: 'POST' })
      const json = await res.json()
      if (json.explanation) setAiExpl(json.explanation)
    } catch {
      setAiExpl('AI explanation unavailable. Please try again.')
    } finally {
      setExplaining(false)
    }
  }

  return (
    <div className="border-b border-gray-50 last:border-0">
      {/* Row summary */}
      <div className="flex items-center px-5 py-4 hover:bg-gray-50/60 transition-colors group gap-4">
        {/* Status indicator */}
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cfg.dot }} />

        {/* Bank transaction */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-800 truncate">
              {item.bank_transaction.vendor || item.bank_transaction.description}
            </span>
            <span className="text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0" style={{ background: cfg.bg, color: cfg.text }}>
              {cfg.label}
            </span>
            {resCfg && (
              <span className="text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0" style={{ background: resCfg.bg, color: resCfg.text }}>
                {resCfg.label}
              </span>
            )}
          </div>
          <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
            <span>{formatDate(item.bank_transaction.date)}</span>
            {item.reconciliation_sessions && (
              <><span>·</span><span className="truncate max-w-40">{item.reconciliation_sessions.name}</span></>
            )}
            {item.note && <><span>·</span><span className="text-blue-400 italic truncate max-w-40">Note: {item.note}</span></>}
          </div>
        </div>

        {/* Amount */}
        <div className="text-sm font-semibold text-gray-900 flex-shrink-0 w-24 text-right">
          {formatCurrency(item.bank_transaction.amount)}
        </div>

        {/* GL */}
        <div className="text-xs text-gray-400 flex-shrink-0 w-36 text-right hidden xl:block truncate">
          {item.gl_override || item.gl_category || '—'}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isPending && (
            <>
              <button
                onClick={() => onAction(item, 'approve')}
                title="Approve"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-green-600 hover:bg-green-50 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              </button>
              <button
                onClick={() => onAction(item, 'reject')}
                title="Reject"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
              <button
                onClick={() => onAction(item, 'edit_match')}
                title="Edit match / override GL"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button
                onClick={() => onAction(item, 'add_note')}
                title="Add note"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </button>
            </>
          )}
          {!isPending && (
            <button
              onClick={() => onAction(item, 'add_note')}
              title="Add note"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </button>
          )}
          <button
            onClick={handleExplain}
            title="AI Explanation"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-blue-400 hover:bg-blue-50 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          </button>
          <button
            onClick={() => setExpanded(e => !e)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:bg-gray-100 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cn('transition-transform', expanded ? 'rotate-90' : '')}>
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Expanded detail panel */}
      {expanded && (
        <div className="px-5 pb-5 ml-6">
          <div className="rounded-xl border p-4 space-y-3" style={{ background: '#F8FAFC', borderColor: '#E2E8F0' }}>
            {/* Flags */}
            {item.flags?.length > 0 && (
              <div className="space-y-1.5">
                {item.flags.map((flag, i) => {
                  const flagBg = flag.severity === 'high' ? '#FEF2F2' : flag.severity === 'medium' ? '#FFFBEB' : '#F0FDF4'
                  const flagTxt = flag.severity === 'high' ? '#B91C1C' : flag.severity === 'medium' ? '#92400E' : '#166534'
                  return (
                    <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg" style={{ background: flagBg }}>
                      <span className="text-xs font-bold mt-0.5" style={{ color: flagTxt }}>
                        {flag.severity === 'high' ? '●' : flag.severity === 'medium' ? '◐' : '○'}
                      </span>
                      <span className="text-xs leading-relaxed" style={{ color: flagTxt }}>{flag.message}</span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* AI explanation */}
            {(explaining || aiExplanation || item.explanation) && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#2E75B6' }}>AI Analysis</span>
                  {explaining && <span className="text-xs text-gray-400 animate-pulse">Generating…</span>}
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {explaining ? '…' : (aiExplanation || item.explanation)}
                </p>
              </div>
            )}

            {/* Invoice details if present */}
            {item.invoice_transaction && (
              <div className="pt-2 border-t border-gray-200">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Suggested Match</div>
                <div className="text-sm text-gray-700">
                  {item.invoice_transaction.vendor || item.invoice_transaction.description} · {formatCurrency(item.invoice_transaction.amount)} · {formatDate(item.invoice_transaction.date)}
                  {item.invoice_transaction.reference && <span className="text-gray-400"> · Ref: {item.invoice_transaction.reference}</span>}
                </div>
                {item.confidence > 0 && (
                  <div className="text-xs text-gray-400 mt-0.5">Match confidence: {item.confidence}%</div>
                )}
              </div>
            )}

            {/* Bottom actions */}
            {isPending && (
              <div className="pt-2 border-t border-gray-200 flex flex-wrap gap-2">
                <button onClick={() => onAction(item, 'approve')} className="px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-opacity hover:opacity-90" style={{ background: '#16A34A' }}>
                  ✓ Approve
                </button>
                <button onClick={() => onAction(item, 'reject')} className="px-3 py-1.5 text-xs font-medium text-white rounded-lg bg-red-600 transition-opacity hover:opacity-90">
                  ✗ Reject
                </button>
                <button onClick={() => onAction(item, 'edit_match')} className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  Edit Match
                </button>
                <button onClick={() => onAction(item, 'mark_resolved')} className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  Mark Resolved
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ExceptionQueuePage() {
  const [items, setItems]             = useState<ExceptionItem[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [statusFilter, setStatus]     = useState<FilterStatus>('all')
  const [resFilter, setRes]           = useState<FilterResolution>('pending')
  const [search, setSearch]           = useState('')
  const [modal, setModal]             = useState<{ item: ExceptionItem; action: string } | null>(null)

  const fetchExceptions = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      params.set('resolution', resFilter)
      if (search) params.set('search', search)

      const res = await fetch(`/api/exceptions?${params}`)
      if (!res.ok) throw new Error('Failed to load exceptions')
      const json = await res.json()
      setItems(json.exceptions ?? [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [statusFilter, resFilter, search])

  useEffect(() => { fetchExceptions() }, [fetchExceptions])

  const handleAction = (item: ExceptionItem, action: string) => {
    setModal({ item, action })
  }

  const handleConfirm = async (payload: Record<string, string>) => {
    if (!modal) return

    try {
      const res = await fetch(`/api/exceptions/${modal.item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: modal.action, ...payload }),
      })
      if (!res.ok) throw new Error('Action failed')
      await fetchExceptions()
    } catch {
      setError('Failed to save action. Please try again.')
    } finally {
      setModal(null)
    }
  }

  // Stats
  const byStatus = (s: MatchStatus) => items.filter(i => i.status === s).length
  const pending  = items.filter(i => !i.resolution).length
  const resolved = items.filter(i =>  i.resolution).length

  const TABS: { key: FilterStatus; label: string; count: number; color: string }[] = [
    { key: 'all',       label: 'All',         count: items.length,                                           color: '#6B7280' },
    { key: 'flagged',   label: 'Flagged',      count: items.filter(i => i.status === 'flagged').length,      color: '#D97706' },
    { key: 'unmatched', label: 'Unmatched',    count: items.filter(i => i.status === 'unmatched').length,    color: '#DC2626' },
    { key: 'duplicate', label: 'Duplicates',   count: items.filter(i => i.status === 'duplicate').length,    color: '#7C3AED' },
    { key: 'suggested', label: 'Needs Review', count: items.filter(i => i.status === 'suggested').length,    color: '#2563EB' },
  ]

  const RES_TABS: { key: FilterResolution; label: string }[] = [
    { key: 'pending',  label: 'Pending Review' },
    { key: 'approved', label: 'Approved'       },
    { key: 'rejected', label: 'Rejected'       },
    { key: 'all',      label: 'All'            },
  ]

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Exception Queue"
        subtitle="Review unmatched, flagged, and duplicate transactions"
        actions={
          <div className="flex items-center gap-2">
            {pending > 0 && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full text-white" style={{ background: '#D97706' }}>
                {pending} pending
              </span>
            )}
            <button
              onClick={fetchExceptions}
              className="px-3 py-2 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              ↻ Refresh
            </button>
          </div>
        }
      />

      <div className="flex-1 p-6 space-y-5">

        {/* Error banner */}
        {error && (
          <div className="rounded-xl px-4 py-3 text-sm flex items-center gap-2 bg-red-50 text-red-700">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {error}
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Pending Review',  val: pending,  bg: '#FFFBEB', col: '#D97706' },
            { label: 'Resolved',        val: resolved, bg: '#F0FDF4', col: '#16A34A' },
            { label: 'Total Items',     val: items.length, bg: '#EFF6FF', col: '#2E75B6' },
            { label: 'High Severity',   val: items.filter(i => i.flags?.some(f => f.severity === 'high')).length, bg: '#FEF2F2', col: '#DC2626' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 px-4 py-3">
              <div className="text-2xl font-bold" style={{ color: s.col }}>{s.val}</div>
              <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Main table */}
        <div className="bg-white rounded-2xl border border-gray-100">
          {/* Filter bar */}
          <div className="px-5 py-3 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Status tabs */}
            <div className="flex gap-1 flex-wrap">
              {TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setStatus(tab.key)}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                    statusFilter === tab.key
                      ? 'text-white'
                      : 'text-gray-500 bg-gray-100 hover:bg-gray-200'
                  )}
                  style={statusFilter === tab.key ? { background: tab.color } : {}}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={cn('ml-1', statusFilter === tab.key ? 'opacity-80' : 'text-gray-400')}>
                      ({tab.count})
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex gap-2 sm:ml-auto items-center">
              {/* Resolution filter */}
              <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
                {RES_TABS.map(t => (
                  <button
                    key={t.key}
                    onClick={() => setRes(t.key)}
                    className={cn(
                      'px-2.5 py-1.5 font-medium transition-colors',
                      resFilter === t.key ? 'text-white' : 'text-gray-500 hover:bg-gray-50'
                    )}
                    style={resFilter === t.key ? { background: '#1E3A5F' } : {}}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Search */}
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search vendor, description…"
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs outline-none focus:border-blue-400 transition-colors w-44"
              />
            </div>
          </div>

          {/* Rows */}
          {loading ? (
            <div className="p-16 text-center text-gray-400 text-sm">
              <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
              Loading exceptions…
            </div>
          ) : items.length === 0 ? (
            <div className="p-16 text-center">
              <div className="text-4xl mb-3">🎉</div>
              <div className="text-sm font-medium text-gray-700 mb-1">No exceptions found</div>
              <div className="text-xs text-gray-400">
                {resFilter === 'pending' ? 'All items have been reviewed.' : 'No items match the current filters.'}
              </div>
            </div>
          ) : (
            <div>
              {items.map(item => (
                <ExceptionRow key={item.id} item={item} onAction={handleAction} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action Modal */}
      {modal && (
        <ActionModal
          item={modal.item}
          action={modal.action}
          onClose={() => setModal(null)}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  )
}
