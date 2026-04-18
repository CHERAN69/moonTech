'use client'

/**
 * Review — Exception-only workflow.
 * Phase 3: Full refactor with session/severity filters, sort, inline trust UX,
 *          AI Suggestion chips, and links to /review/[id] detail page.
 */

import { useState, useEffect, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { ConfidenceBadge } from '@/components/trust/ConfidenceBadge'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import type { ExceptionItem } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterStatus     = 'all' | 'unmatched' | 'flagged' | 'duplicate' | 'suggested'
type FilterResolution = 'pending' | 'approved' | 'rejected' | 'all'
type FilterSeverity   = 'all' | 'high' | 'medium' | 'low'
type SortOption       = 'date_desc' | 'confidence_asc' | 'amount_desc'

interface SessionOption {
  id: string
  name: string
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string; dot: string }> = {
  unmatched: { bg: '#FEF2F2', text: '#DC2626', label: 'Unmatched',    dot: '#DC2626' },
  flagged:   { bg: '#FFFBEB', text: '#D97706', label: 'Flagged',      dot: '#D97706' },
  duplicate: { bg: '#FAF5FF', text: '#7C3AED', label: 'Duplicate',    dot: '#7C3AED' },
  suggested: { bg: '#EFF6FF', text: '#2563EB', label: 'Needs Review', dot: '#2563EB' },
  matched:   { bg: '#F0FDF4', text: '#16A34A', label: 'Matched',      dot: '#16A34A' },
  excluded:  { bg: '#F3F4F6', text: '#6B7280', label: 'Excluded',     dot: '#6B7280' },
}

const RESOLUTION_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  approved: { bg: '#F0FDF4', text: '#16A34A', label: 'Approved' },
  rejected: { bg: '#FEF2F2', text: '#DC2626', label: 'Rejected' },
  edited:   { bg: '#EFF6FF', text: '#2563EB', label: 'Edited'   },
  resolved: { bg: '#F9FAFB', text: '#6B7280', label: 'Resolved' },
}

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
  const [note, setNote]       = useState(item.note ?? '')
  const [glOverride, setGl]   = useState(item.gl_override ?? item.gl_category ?? '')
  const [reason, setReason]   = useState('')
  const [loading, setLoading] = useState(false)

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
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
            <div className="text-sm font-medium text-gray-800">
              {item.bank_transaction.vendor || item.bank_transaction.description}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              {formatDate(item.bank_transaction.date)} · {formatCurrency(item.bank_transaction.amount)}
            </div>
          </div>

          {action === 'edit_match' && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                GL Category Override
              </label>
              <input
                type="text"
                value={glOverride}
                onChange={e => setGl(e.target.value)}
                placeholder="e.g. Cloud Infrastructure"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
              />
            </div>
          )}

          {action === 'reject' && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Reason for Rejection <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="e.g. Duplicate payment confirmed"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Note {action !== 'add_note' && '(optional)'}
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
            disabled={loading || (action === 'reject' && !reason.trim())}
            className={cn(
              'flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40',
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
  const [expanded, setExpanded]     = useState(false)
  const [explaining, setExplaining] = useState(false)
  const [aiExplanation, setAiExpl]  = useState(item.ai_explanation ?? '')

  const cfg      = STATUS_CONFIG[item.status] ?? STATUS_CONFIG['unmatched']
  const resCfg   = item.resolution ? RESOLUTION_CONFIG[item.resolution] : null
  const isPending = !item.resolution

  // Derive highest severity from flags
  const maxSeverity = item.flags?.reduce<string | null>((acc, f) => {
    if (acc === 'high') return acc
    if (f.severity === 'high') return 'high'
    if (acc === 'medium') return acc
    if (f.severity === 'medium') return 'medium'
    return f.severity ?? acc
  }, null)

  const handleExplain = async () => {
    if (aiExplanation) { setExpanded(true); return }
    setExplaining(true)
    setExpanded(true)
    try {
      const res  = await fetch(`/api/exceptions/${item.id}/explain`, { method: 'POST' })
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
      <div className="flex items-center px-5 py-4 hover:bg-gray-50/60 transition-colors gap-3">
        {/* Severity dot */}
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{
            background: maxSeverity === 'high' ? '#DC2626'
              : maxSeverity === 'medium' ? '#D97706'
              : cfg.dot
          }}
        />

        {/* Transaction info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Clickable name → detail page */}
            <Link
              href={`/review/${item.id}`}
              className="text-sm font-medium text-gray-800 truncate hover:text-blue-600 transition-colors"
            >
              {item.bank_transaction.vendor || item.bank_transaction.description}
            </Link>

            {/* Status chip */}
            <span
              className="text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0"
              style={{ background: cfg.bg, color: cfg.text }}
            >
              {cfg.label}
            </span>

            {/* AI Suggestion chip when status is 'suggested' */}
            {item.status === 'suggested' && item.suggested_action && (
              <span className="text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 flex items-center gap-1"
                style={{ background: '#EDE9FE', color: '#6D28D9' }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L9.09 9.09 2 12l7.09 2.91L12 22l2.91-7.09L22 12l-7.09-2.91z"/>
                </svg>
                AI: {item.suggested_action}
              </span>
            )}

            {/* Resolution chip */}
            {resCfg && (
              <span
                className="text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0"
                style={{ background: resCfg.bg, color: resCfg.text }}
              >
                {resCfg.label}
              </span>
            )}

            {/* Session chip */}
            {item.reconciliation_sessions && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500 flex-shrink-0 hidden sm:inline">
                {item.reconciliation_sessions.name}
              </span>
            )}
          </div>
          <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
            <span>{formatDate(item.bank_transaction.date)}</span>
            {item.note && (
              <><span>·</span><span className="text-blue-400 italic truncate max-w-40">Note: {item.note}</span></>
            )}
            {/* Inline AI explanation snippet */}
            {(item.explanation || item.ai_explanation) && (
              <><span>·</span><span className="text-gray-400 truncate max-w-xs hidden lg:inline">
                {(item.explanation || item.ai_explanation)!.slice(0, 80)}…
              </span></>
            )}
          </div>
        </div>

        {/* Amount */}
        <div className="text-sm font-semibold text-gray-900 flex-shrink-0 w-24 text-right">
          {formatCurrency(item.bank_transaction.amount)}
        </div>

        {/* GL category */}
        <div className="text-xs text-gray-400 flex-shrink-0 w-36 text-right hidden xl:block truncate">
          {item.gl_override || item.gl_category || '—'}
        </div>

        {/* Confidence badge */}
        {item.confidence > 0 && (
          <div className="flex-shrink-0">
            <ConfidenceBadge score={item.confidence} size="sm" />
          </div>
        )}

        {/* Action buttons */}
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
            </>
          )}
          <button
            onClick={() => onAction(item, 'add_note')}
            title="Add note"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </button>
          <button
            onClick={handleExplain}
            title="AI explanation"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-blue-400 hover:bg-blue-50 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          </button>
          <button
            onClick={() => setExpanded(e => !e)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:bg-gray-100 transition-colors"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={cn('transition-transform', expanded ? 'rotate-90' : '')}
            >
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
                  const flagBg  = flag.severity === 'high' ? '#FEF2F2' : flag.severity === 'medium' ? '#FFFBEB' : '#F0FDF4'
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
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#2E75B6' }}>
                    AI Analysis
                  </span>
                  {explaining && <span className="text-xs text-gray-400 animate-pulse">Generating…</span>}
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {explaining ? '…' : (aiExplanation || item.explanation)}
                </p>
              </div>
            )}

            {/* Suggested match */}
            {item.invoice_transaction && (
              <div className="pt-2 border-t border-gray-200">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Suggested Match
                </div>
                <div className="text-sm text-gray-700">
                  {item.invoice_transaction.vendor || item.invoice_transaction.description}
                  {' · '}{formatCurrency(item.invoice_transaction.amount)}
                  {' · '}{formatDate(item.invoice_transaction.date)}
                  {item.invoice_transaction.reference && (
                    <span className="text-gray-400"> · Ref: {item.invoice_transaction.reference}</span>
                  )}
                </div>
                {item.confidence > 0 && (
                  <div className="text-xs text-gray-400 mt-0.5">Match confidence: {item.confidence}%</div>
                )}
              </div>
            )}

            {/* Open full detail link */}
            <div className="pt-2 border-t border-gray-200 flex items-center justify-between flex-wrap gap-2">
              <Link
                href={`/review/${item.id}`}
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                Open full detail →
              </Link>

              {/* Inline actions */}
              {isPending && (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => onAction(item, 'approve')}
                    className="px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-opacity hover:opacity-90"
                    style={{ background: '#16A34A' }}
                  >
                    ✓ Approve
                  </button>
                  <button
                    onClick={() => onAction(item, 'reject')}
                    className="px-3 py-1.5 text-xs font-medium text-white rounded-lg bg-red-600 transition-opacity hover:opacity-90"
                  >
                    ✗ Reject
                  </button>
                  <button
                    onClick={() => onAction(item, 'edit_match')}
                    className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Edit Match
                  </button>
                  <button
                    onClick={() => onAction(item, 'mark_resolved')}
                    className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Mark Resolved
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function ReviewPageInner() {
  const searchParams  = useSearchParams()
  const initSessionId = searchParams.get('session_id') ?? ''

  const [items, setItems]             = useState<ExceptionItem[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [statusFilter, setStatus]     = useState<FilterStatus>('all')
  const [resFilter, setRes]           = useState<FilterResolution>('pending')
  const [severityFilter, setSeverity] = useState<FilterSeverity>('all')
  const [sessionFilter, setSession]   = useState<string>(initSessionId)
  const [sortBy, setSort]             = useState<SortOption>('date_desc')
  const [search, setSearch]           = useState('')
  const [modal, setModal]             = useState<{ item: ExceptionItem; action: string } | null>(null)
  const [sessions, setSessions]       = useState<SessionOption[]>([])

  // Fetch sessions for the dropdown
  useEffect(() => {
    async function loadSessions() {
      try {
        const res = await fetch('/api/reconcile?limit=50')
        if (res.ok) {
          const json = await res.json()
          const list = (json.sessions ?? []).map((s: { id: string; name: string }) => ({
            id:   s.id,
            name: s.name,
          }))
          setSessions(list)
        }
      } catch {
        // Sessions list is non-critical — fail silently
      }
    }
    loadSessions()
  }, [])

  const fetchExceptions = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (resFilter !== 'all')    params.set('resolution', resFilter)
      if (sessionFilter)          params.set('session_id', sessionFilter)
      if (search)                 params.set('search', search)
      params.set('limit', '200')

      const res = await fetch(`/api/exceptions?${params}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setItems(json.exceptions ?? [])
      const total = json.total ?? json.exceptions?.length ?? 0
      if (total > (json.exceptions?.length ?? 0)) {
        setError(`Showing ${json.exceptions?.length ?? 0} of ${total} exceptions — use filters to narrow results and ensure high-severity items are visible.`)
      }
    } catch {
      setError('Unable to load review queue. Please try again.')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [statusFilter, resFilter, sessionFilter, search])

  useEffect(() => { fetchExceptions() }, [fetchExceptions])

  // Client-side severity filter + sort (applied after server-side fetch)
  const filtered = items.filter(item => {
    if (severityFilter === 'all') return true
    return item.flags?.some(f => f.severity === severityFilter)
  })

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'date_desc') {
      return new Date(b.bank_transaction.date).getTime() - new Date(a.bank_transaction.date).getTime()
    }
    if (sortBy === 'confidence_asc') {
      return a.confidence - b.confidence
    }
    if (sortBy === 'amount_desc') {
      return Math.abs(b.bank_transaction.amount) - Math.abs(a.bank_transaction.amount)
    }
    return 0
  })

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

  const pending  = items.filter(i => !i.resolution).length
  const resolved = items.filter(i =>  i.resolution).length
  const highSev  = items.filter(i => i.flags?.some(f => f.severity === 'high')).length

  const TABS: { key: FilterStatus; label: string; count: number; color: string }[] = [
    { key: 'all',       label: 'All',       count: items.length,                                        color: '#6B7280' },
    { key: 'flagged',   label: 'Flagged',   count: items.filter(i => i.status === 'flagged').length,   color: '#D97706' },
    { key: 'unmatched', label: 'Unmatched', count: items.filter(i => i.status === 'unmatched').length, color: '#DC2626' },
    { key: 'duplicate', label: 'Duplicates',count: items.filter(i => i.status === 'duplicate').length, color: '#7C3AED' },
    { key: 'suggested', label: 'Suggested', count: items.filter(i => i.status === 'suggested').length, color: '#2563EB' },
  ]

  const RES_TABS: { key: FilterResolution; label: string }[] = [
    { key: 'pending',  label: 'Pending'  },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'all',      label: 'All'      },
  ]

  const SEV_TABS: { key: FilterSeverity; label: string; color: string }[] = [
    { key: 'all',    label: 'All Severity', color: '#6B7280' },
    { key: 'high',   label: 'High',         color: '#DC2626' },
    { key: 'medium', label: 'Medium',       color: '#D97706' },
    { key: 'low',    label: 'Low',          color: '#16A34A' },
  ]

  const SORT_OPTIONS: { value: SortOption; label: string }[] = [
    { value: 'date_desc',       label: 'Date (newest first)'       },
    { value: 'confidence_asc',  label: 'Confidence (lowest first)' },
    { value: 'amount_desc',     label: 'Amount (highest first)'    },
  ]

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Review"
        subtitle="Items requiring human attention across all reconciliation sessions"
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

      <div className="flex-1 p-6 space-y-5 overflow-auto">

        {/* Error banner */}
        {error && (
          <div className="rounded-xl px-4 py-3 text-sm flex items-center gap-2 bg-red-50 text-red-700 border border-red-100">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Pending Review', val: pending,       col: '#D97706' },
            { label: 'Resolved',       val: resolved,      col: '#16A34A' },
            { label: 'Total Items',    val: items.length,  col: '#2E75B6' },
            { label: 'High Severity',  val: highSev,       col: '#DC2626' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 px-4 py-3">
              <div className="text-2xl font-bold" style={{ color: s.col }}>{s.val}</div>
              <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Workflow banner — shown when there are pending items to resolve */}
        {!loading && pending > 0 && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="text-blue-500 mt-0.5 flex-shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </span>
              <div>
                <p className="text-sm font-semibold text-blue-800">
                  {pending} pending exception{pending === 1 ? '' : 's'} blocking report generation
                </p>
                <p className="text-xs text-blue-700 mt-0.5">
                  Approve or reject each item below to unlock reports. Once all exceptions are resolved, head to Reports.
                </p>
              </div>
            </div>
            <a
              href="/reports"
              className="flex-shrink-0 px-4 py-2 rounded-lg text-xs font-semibold border border-blue-300 text-blue-700 bg-white hover:bg-blue-50 transition-colors"
            >
              View Reports →
            </a>
          </div>
        )}

        {/* Success banner — shown when all exceptions are resolved */}
        {!loading && items.length > 0 && pending === 0 && (
          <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-green-500 flex-shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </span>
              <p className="text-sm font-semibold text-green-800">
                All exceptions resolved — reports are ready to generate
              </p>
            </div>
            <a
              href="/reports"
              className="flex-shrink-0 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: '#16A34A' }}
            >
              Go to Reports →
            </a>
          </div>
        )}

        {/* Main table card */}
        <div className="bg-white rounded-2xl border border-gray-100">
          {/* Filter bar — row 1: status tabs */}
          <div className="px-5 pt-4 pb-0 border-b border-gray-50">
            <div className="flex gap-1 flex-wrap pb-3">
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
          </div>

          {/* Filter bar — row 2: resolution + severity + session + sort + search */}
          <div className="px-5 py-3 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center gap-3">
            {/* Resolution tabs */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs flex-shrink-0">
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

            {/* Severity filter */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs flex-shrink-0">
              {SEV_TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setSeverity(t.key)}
                  className={cn(
                    'px-2.5 py-1.5 font-medium transition-colors',
                    severityFilter === t.key ? 'text-white' : 'text-gray-500 hover:bg-gray-50'
                  )}
                  style={severityFilter === t.key ? { background: t.color } : {}}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex gap-2 lg:ml-auto items-center flex-wrap">
              {/* Session dropdown */}
              {sessions.length > 0 && (
                <select
                  value={sessionFilter}
                  onChange={e => setSession(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs outline-none focus:border-blue-400 text-gray-600 bg-white"
                >
                  <option value="">All sessions</option>
                  {sessions.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              )}

              {/* Sort dropdown */}
              <select
                value={sortBy}
                onChange={e => setSort(e.target.value as SortOption)}
                className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs outline-none focus:border-blue-400 text-gray-600 bg-white"
              >
                {SORT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>

              {/* Search */}
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search vendor, description…"
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs outline-none focus:border-blue-400 transition-colors w-48"
              />
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="p-16 text-center text-gray-400 text-sm">
              <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
              Loading review queue…
            </div>
          ) : sorted.length === 0 ? (
            <div className="p-16 text-center">
              <div className="text-5xl mb-4">✅</div>
              <div className="text-base font-semibold text-gray-800 mb-1">
                All clear — no items need your attention
              </div>
              <div className="text-sm text-gray-400 max-w-xs mx-auto">
                {resFilter === 'pending'
                  ? 'All exceptions have been reviewed. Great work!'
                  : 'No items match the current filters.'}
              </div>
            </div>
          ) : (
            <div>
              {/* Column header */}
              <div className="flex items-center px-5 py-2 bg-gray-50/50 text-xs font-semibold uppercase tracking-wide text-gray-400 gap-3 border-b border-gray-100">
                <div className="w-2 flex-shrink-0" />
                <div className="flex-1">Transaction</div>
                <div className="w-24 text-right flex-shrink-0">Amount</div>
                <div className="w-36 text-right flex-shrink-0 hidden xl:block">GL</div>
                <div className="w-16 text-right flex-shrink-0">Confidence</div>
                <div className="w-28 flex-shrink-0" />
              </div>
              {sorted.map(item => (
                <ExceptionRow key={item.id} item={item} onAction={handleAction} />
              ))}
              {sorted.length > 0 && (
                <div className="px-5 py-3 border-t border-gray-50 text-xs text-gray-400">
                  Showing {sorted.length} of {items.length} items
                  {severityFilter !== 'all' && ` · filtered by ${severityFilter} severity`}
                </div>
              )}
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

export default function ReviewPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 text-gray-400 text-sm">Loading…</div>}>
      <ReviewPageInner />
    </Suspense>
  )
}
