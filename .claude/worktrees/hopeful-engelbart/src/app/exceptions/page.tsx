'use client'

import { useState, useEffect, useCallback } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { ExceptionItem, ExceptionResolution, MatchStatus } from '@/types'

type FilterStatus = 'all' | 'unmatched' | 'flagged' | 'duplicate' | 'suggested'
type FilterResolution = 'pending' | 'approved' | 'rejected' | 'all'

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string; dot: string }> = {
  unmatched: { bg: 'var(--error-bg)', text: 'var(--error)', label: 'Unmatched', dot: 'var(--error)' },
  flagged:   { bg: 'var(--warning-bg)', text: 'var(--warning)', label: 'Flagged', dot: 'var(--warning)' },
  duplicate: { bg: 'var(--purple-bg)', text: 'var(--purple)', label: 'Duplicate', dot: 'var(--purple)' },
  suggested: { bg: 'var(--info-bg)', text: 'var(--brand)', label: 'Needs Review', dot: 'var(--brand)' },
  matched:   { bg: 'var(--success-bg)', text: 'var(--success)', label: 'Matched', dot: 'var(--success)' },
  excluded:  { bg: 'var(--bg-tertiary)', text: 'var(--text-tertiary)', label: 'Excluded', dot: 'var(--text-tertiary)' },
}

const RESOLUTION_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  approved: { bg: 'var(--success-bg)', text: 'var(--success)', label: 'Approved' },
  rejected: { bg: 'var(--error-bg)', text: 'var(--error)', label: 'Rejected' },
  edited:   { bg: 'var(--info-bg)', text: 'var(--brand)', label: 'Edited' },
  resolved: { bg: 'var(--bg-tertiary)', text: 'var(--text-tertiary)', label: 'Resolved' },
}

const DEMO_EXCEPTIONS: ExceptionItem[] = [
  {
    id: 'exc-1', session_id: 'sess-1', user_id: 'demo', status: 'unmatched', confidence: 0,
    match_method: 'rule', created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    gl_category: 'Marketing & Advertising',
    flags: [{ type: 'missing_invoice', severity: 'medium', message: 'No matching invoice found. Mailchimp typically bills $240/month.' }],
    explanation: 'A $1,200 payment to Mailchimp was found with no matching invoice.',
    suggested_action: 'Log in to Mailchimp and verify if this is an annual subscription switch.',
    bank_transaction: { id: 'b3', date: '2026-04-05', amount: 1200, description: 'Mailchimp', vendor: 'Mailchimp', source: 'bank' },
    reconciliation_sessions: { name: 'April 2026 — Stripe Payouts', period_start: '2026-04-01', period_end: '2026-04-10' },
  },
  {
    id: 'exc-2', session_id: 'sess-1', user_id: 'demo', status: 'duplicate', confidence: 0,
    match_method: 'rule', created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    gl_category: 'Sales & Marketing Software',
    flags: [{ type: 'duplicate', severity: 'high', message: 'Identical transaction detected 3 days prior.' }],
    explanation: 'A $450 payment to HubSpot on Apr 9 appears to duplicate a payment on Apr 6.',
    suggested_action: 'Contact HubSpot billing to request a refund.',
    bank_transaction: { id: 'b4', date: '2026-04-09', amount: 450, description: 'HubSpot Inc', vendor: 'HubSpot', source: 'bank' },
    reconciliation_sessions: { name: 'April 2026 — Stripe Payouts', period_start: '2026-04-01', period_end: '2026-04-10' },
  },
  {
    id: 'exc-3', session_id: 'sess-1', user_id: 'demo', status: 'flagged', confidence: 78,
    match_method: 'fuzzy_ai', created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    gl_category: 'Cloud Infrastructure',
    flags: [{ type: 'amount_deviation', severity: 'high', message: 'This AWS charge is 150% above the average of $2,800.' }],
    explanation: 'This $7,000 AWS charge is 150% above your typical monthly average.',
    suggested_action: 'Verify with engineering that the April 8 launch caused elevated usage.',
    bank_transaction: { id: 'b2', date: '2026-04-10', amount: 7000, description: 'AMAZON WEB SERVICES', vendor: 'Amazon Web Services', source: 'bank' },
    invoice_transaction: { id: 'i2', date: '2026-04-08', amount: 7000, description: 'AWS Cloud Services - Usage Spike', vendor: 'AWS', reference: 'INV-2026-049', source: 'invoice' },
    reconciliation_sessions: { name: 'April 2026 — Stripe Payouts', period_start: '2026-04-01', period_end: '2026-04-10' },
  },
  {
    id: 'exc-4', session_id: 'sess-1', user_id: 'demo', status: 'suggested', confidence: 68,
    match_method: 'fuzzy_ai', created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    gl_category: 'Professional Services',
    flags: [],
    explanation: 'Possible match found with 68% confidence. Vendor names 85% similar.',
    suggested_action: 'Confirm same vendor and accept match.',
    bank_transaction: { id: 'b6', date: '2026-04-07', amount: 3500, description: 'Smith Consulting LLC', vendor: 'Smith Consulting', source: 'bank' },
    invoice_transaction: { id: 'i6', date: '2026-04-07', amount: 3500, description: 'Consulting Services - March Retainer', vendor: 'John Smith Consulting', reference: 'INV-JSC-0041', source: 'invoice' },
    reconciliation_sessions: { name: 'April 2026 — Stripe Payouts', period_start: '2026-04-01', period_end: '2026-04-10' },
  },
]

function ActionModal({ item, action, onClose, onConfirm }: {
  item: ExceptionItem; action: string; onClose: () => void; onConfirm: (payload: Record<string, string>) => void
}) {
  const [note, setNote] = useState(item.note ?? '')
  const [glOverride, setGl] = useState(item.gl_override ?? item.gl_category ?? '')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setLoading(true)
    await onConfirm({ note, gl_override: glOverride, override_reason: reason })
    setLoading(false)
  }

  const titles: Record<string, string> = {
    approve: 'Approve Match', reject: 'Reject & Exclude', edit_match: 'Edit Match / Override GL',
    add_note: 'Add Note', mark_resolved: 'Mark as Resolved',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div className="rounded-2xl w-full max-w-lg mx-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }} onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{titles[action] ?? action}</h3>
          <button onClick={onClose} style={{ color: 'var(--text-tertiary)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="p-3 rounded-xl" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
            <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{item.bank_transaction.vendor || item.bank_transaction.description}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{formatDate(item.bank_transaction.date)} · {formatCurrency(item.bank_transaction.amount)}</div>
          </div>
          {action === 'edit_match' && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>GL Category Override</label>
              <input type="text" value={glOverride} onChange={e => setGl(e.target.value)} placeholder="e.g. Cloud Infrastructure"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
            </div>
          )}
          {action === 'reject' && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Reason for Rejection</label>
              <input type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Duplicate payment confirmed"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Note {action === 'add_note' ? '' : '(optional)'}</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note for the audit trail..." rows={3}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all resize-none"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
          </div>
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors"
            style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>Cancel</button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: action === 'reject' ? 'var(--error)' : 'var(--brand)' }}>
            {loading ? 'Saving…' : titles[action] ?? 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ExceptionRow({ item, onAction }: { item: ExceptionItem; onAction: (item: ExceptionItem, action: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const [explaining, setExplaining] = useState(false)
  const [aiExplanation, setAiExpl] = useState(item.ai_explanation || '')

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
    <div style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      <div className="flex items-center px-5 py-4 transition-colors group gap-4">
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cfg.dot }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{item.bank_transaction.vendor || item.bank_transaction.description}</span>
            <span className="text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0" style={{ background: cfg.bg, color: cfg.text }}>{cfg.label}</span>
            {resCfg && <span className="text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0" style={{ background: resCfg.bg, color: resCfg.text }}>{resCfg.label}</span>}
          </div>
          <div className="text-xs mt-0.5 flex items-center gap-2" style={{ color: 'var(--text-tertiary)' }}>
            <span>{formatDate(item.bank_transaction.date)}</span>
            {item.reconciliation_sessions && <><span>·</span><span className="truncate max-w-40">{item.reconciliation_sessions.name}</span></>}
          </div>
        </div>
        <div className="text-sm font-semibold flex-shrink-0 w-24 text-right" style={{ color: 'var(--text-primary)' }}>{formatCurrency(item.bank_transaction.amount)}</div>
        <div className="text-xs flex-shrink-0 w-36 text-right hidden xl:block truncate" style={{ color: 'var(--text-tertiary)' }}>{item.gl_override || item.gl_category || '—'}</div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isPending && (
            <>
              <button onClick={() => onAction(item, 'approve')} title="Approve" className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors" style={{ color: 'var(--success)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              </button>
              <button onClick={() => onAction(item, 'reject')} title="Reject" className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors" style={{ color: 'var(--error)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
              <button onClick={() => onAction(item, 'edit_match')} title="Edit" className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors" style={{ color: 'var(--text-tertiary)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
            </>
          )}
          <button onClick={handleExplain} title="AI Explanation" className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors" style={{ color: 'var(--brand)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          </button>
          <button onClick={() => setExpanded(e => !e)} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors" style={{ color: 'var(--text-muted)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cn('transition-transform', expanded ? 'rotate-90' : '')}>
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-5 ml-6">
          <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
            {item.flags?.length > 0 && (
              <div className="space-y-1.5">
                {item.flags.map((flag, i) => (
                  <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg"
                    style={{ background: flag.severity === 'high' ? 'var(--error-bg)' : flag.severity === 'medium' ? 'var(--warning-bg)' : 'var(--success-bg)' }}>
                    <span className="text-xs leading-relaxed"
                      style={{ color: flag.severity === 'high' ? 'var(--error)' : flag.severity === 'medium' ? 'var(--warning)' : 'var(--success)' }}>{flag.message}</span>
                  </div>
                ))}
              </div>
            )}
            {(explaining || aiExplanation || item.explanation) && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--brand)' }}>AI Analysis</span>
                  {explaining && <span className="text-xs animate-pulse" style={{ color: 'var(--text-tertiary)' }}>Generating…</span>}
                </div>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{explaining ? '…' : (aiExplanation || item.explanation)}</p>
              </div>
            )}
            {item.invoice_transaction && (
              <div className="pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                <div className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Suggested Match</div>
                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {item.invoice_transaction.vendor || item.invoice_transaction.description} · {formatCurrency(item.invoice_transaction.amount)} · {formatDate(item.invoice_transaction.date)}
                </div>
              </div>
            )}
            {isPending && (
              <div className="pt-2 flex flex-wrap gap-2" style={{ borderTop: '1px solid var(--border)' }}>
                <button onClick={() => onAction(item, 'approve')} className="px-3 py-1.5 text-xs font-medium text-white rounded-lg" style={{ background: 'var(--success)' }}>Approve</button>
                <button onClick={() => onAction(item, 'reject')} className="px-3 py-1.5 text-xs font-medium text-white rounded-lg" style={{ background: 'var(--error)' }}>Reject</button>
                <button onClick={() => onAction(item, 'edit_match')} className="px-3 py-1.5 text-xs font-medium rounded-lg" style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>Edit Match</button>
                <button onClick={() => onAction(item, 'mark_resolved')} className="px-3 py-1.5 text-xs font-medium rounded-lg" style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>Mark Resolved</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function ExceptionQueuePage() {
  const [items, setItems] = useState<ExceptionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatus] = useState<FilterStatus>('all')
  const [resFilter, setRes] = useState<FilterResolution>('pending')
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<{ item: ExceptionItem; action: string } | null>(null)
  const [isDemo, setIsDemo] = useState(false)

  const fetchExceptions = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      params.set('resolution', resFilter)
      if (search) params.set('search', search)
      const res = await fetch(`/api/exceptions?${params}`)
      if (res.status === 401) { setItems(DEMO_EXCEPTIONS); setIsDemo(true); return }
      if (!res.ok) throw new Error('Failed to load exceptions')
      const json = await res.json()
      setItems(json.exceptions ?? [])
      setIsDemo(false)
    } catch {
      setItems(DEMO_EXCEPTIONS)
      setIsDemo(true)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, resFilter, search])

  useEffect(() => { fetchExceptions() }, [fetchExceptions])

  const handleAction = (item: ExceptionItem, action: string) => { setModal({ item, action }) }

  const handleConfirm = async (payload: Record<string, string>) => {
    if (!modal) return
    if (isDemo) {
      setItems(prev => prev.map(i =>
        i.id === modal.item.id
          ? { ...i, resolution: (modal.action === 'approve' ? 'approved' : modal.action === 'reject' ? 'rejected' : modal.action === 'mark_resolved' ? 'resolved' : 'edited') as ExceptionResolution, note: payload.note || i.note }
          : i
      ))
      setModal(null)
      return
    }
    try {
      const res = await fetch(`/api/exceptions/${modal.item.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: modal.action, ...payload }),
      })
      if (!res.ok) throw new Error('Action failed')
      await fetchExceptions()
    } catch { setError('Failed to save action. Please try again.') } finally { setModal(null) }
  }

  const pending = items.filter(i => !i.resolution).length
  const resolved = items.filter(i => i.resolution).length

  const TABS: { key: FilterStatus; label: string; count: number; color: string }[] = [
    { key: 'all', label: 'All', count: items.length, color: 'var(--text-tertiary)' },
    { key: 'flagged', label: 'Flagged', count: items.filter(i => i.status === 'flagged').length, color: 'var(--warning)' },
    { key: 'unmatched', label: 'Unmatched', count: items.filter(i => i.status === 'unmatched').length, color: 'var(--error)' },
    { key: 'duplicate', label: 'Duplicates', count: items.filter(i => i.status === 'duplicate').length, color: 'var(--purple)' },
    { key: 'suggested', label: 'Needs Review', count: items.filter(i => i.status === 'suggested').length, color: 'var(--brand)' },
  ]

  const RES_TABS: { key: FilterResolution; label: string }[] = [
    { key: 'pending', label: 'Pending Review' }, { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' }, { key: 'all', label: 'All' },
  ]

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Exception Queue" subtitle="Review unmatched, flagged, and duplicate transactions"
        actions={
          <div className="flex items-center gap-2">
            {pending > 0 && <span className="text-xs font-semibold px-2.5 py-1 rounded-full text-white" style={{ background: 'var(--warning)' }}>{pending} pending</span>}
            <button onClick={fetchExceptions} className="px-3 py-2 text-xs font-medium rounded-lg transition-colors" style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>Refresh</button>
          </div>
        }
      />

      <div className="flex-1 p-6 space-y-5">
        {isDemo && (
          <div className="rounded-xl px-4 py-3 text-sm flex items-center gap-2" style={{ background: 'var(--info-bg)', color: 'var(--brand)' }}>
            <strong>Demo mode</strong> — Connect Supabase to load live exceptions.
          </div>
        )}
        {error && (
          <div className="rounded-xl px-4 py-3 text-sm flex items-center gap-2" style={{ background: 'var(--error-bg)', color: 'var(--error)' }}>
            {error}
            <button onClick={() => setError(null)} className="ml-auto" style={{ color: 'var(--error)' }}>✕</button>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Pending Review', val: pending, col: 'var(--warning)' },
            { label: 'Resolved', val: resolved, col: 'var(--success)' },
            { label: 'Total Items', val: items.length, col: 'var(--brand)' },
            { label: 'High Severity', val: items.filter(i => i.flags?.some(f => f.severity === 'high')).length, col: 'var(--error)' },
          ].map(s => (
            <div key={s.label} className="rounded-xl px-4 py-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
              <div className="text-2xl font-bold" style={{ color: s.col }}>{s.val}</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          <div className="px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex gap-1 flex-wrap">
              {TABS.map(tab => (
                <button key={tab.key} onClick={() => setStatus(tab.key)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                  style={statusFilter === tab.key ? { background: tab.color, color: '#fff' } : { background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                  {tab.label} {tab.count > 0 && `(${tab.count})`}
                </button>
              ))}
            </div>
            <div className="flex gap-2 sm:ml-auto items-center">
              <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                {RES_TABS.map(t => (
                  <button key={t.key} onClick={() => setRes(t.key)} className="px-2.5 py-1.5 text-xs font-medium transition-colors"
                    style={resFilter === t.key ? { background: 'var(--brand)', color: '#fff' } : { color: 'var(--text-secondary)' }}>
                    {t.label}
                  </button>
                ))}
              </div>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vendor, description…"
                className="px-3 py-1.5 rounded-lg text-xs outline-none transition-colors w-44"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
            </div>
          </div>

          {loading ? (
            <div className="p-16 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
              <div className="w-8 h-8 rounded-full animate-spin mx-auto mb-3" style={{ border: '2px solid var(--border)', borderTopColor: 'var(--brand)' }} />
              Loading exceptions…
            </div>
          ) : items.length === 0 ? (
            <div className="p-16 text-center">
              <div className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>No exceptions found</div>
              <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {resFilter === 'pending' ? 'All items have been reviewed.' : 'No items match the current filters.'}
              </div>
            </div>
          ) : (
            <div>{items.map(item => <ExceptionRow key={item.id} item={item} onAction={handleAction} />)}</div>
          )}
        </div>
      </div>

      {modal && <ActionModal item={modal.item} action={modal.action} onClose={() => setModal(null)} onConfirm={handleConfirm} />}
    </div>
  )
}
