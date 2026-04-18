'use client'

/**
 * Review Detail — /review/[id]
 *
 * Full transaction detail with:
 * - Bank + invoice transaction side-by-side
 * - AI reasoning card (ConfidenceBadge + AIReasoningCard)
 * - Evidence trail (EvidenceTrail)
 * - Action panel (ApprovalActions — approve, reject, edit match, link manually)
 * - GL override modal (GLOverrideModal)
 * - Manual link modal (ManualLinkModal)
 *
 * Phase 3 — full implementation.
 */

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { ConfidenceBadge } from '@/components/trust/ConfidenceBadge'
import { AIReasoningCard } from '@/components/trust/AIReasoningCard'
import { EvidenceTrail } from '@/components/trust/EvidenceTrail'
import { ApprovalStatus } from '@/components/trust/ApprovalStatus'
import { GLOverrideModal } from '@/components/reconcile/GLOverrideModal'
import { ManualLinkModal } from '@/components/reconcile/ManualLinkModal'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { ExceptionItem, WorkflowState } from '@/types'

// Map exception state to WorkflowState for ApprovalStatus/ApprovalActions
function toWorkflowState(item: ExceptionItem): WorkflowState {
  if (item.resolution === 'approved')  return 'approved'
  if (item.resolution === 'resolved')  return 'locked'
  if (item.resolution === 'rejected')  return 'locked'
  if (item.status === 'matched')       return 'approved'
  return 'needs_review'
}

const STATUS_LABELS: Record<string, { bg: string; text: string; label: string }> = {
  unmatched: { bg: '#FEF2F2', text: '#DC2626', label: 'Unmatched'    },
  flagged:   { bg: '#FFFBEB', text: '#D97706', label: 'Flagged'      },
  duplicate: { bg: '#FAF5FF', text: '#7C3AED', label: 'Duplicate'    },
  suggested: { bg: '#EFF6FF', text: '#2563EB', label: 'Needs Review' },
  matched:   { bg: '#F0FDF4', text: '#16A34A', label: 'Matched'      },
  excluded:  { bg: '#F3F4F6', text: '#6B7280', label: 'Excluded'     },
}

export default function ReviewDetailPage() {
  const { id }  = useParams<{ id: string }>()
  const router  = useRouter()

  const [item, setItem]         = useState<ExceptionItem | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [saving, setSaving]     = useState(false)
  const [toast, setToast]       = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [showGL, setShowGL]     = useState(false)
  const [showLink, setShowLink] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectBox, setShowRejectBox] = useState(false)

  const fetchItem = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/exceptions/${id}`)
      if (res.status === 404) { setError('Item not found'); return }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setItem(data.exception ?? data)
    } catch {
      setError('Failed to load item. Please refresh.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchItem() }, [fetchItem])

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  const performAction = useCallback(async (
    action: string,
    extra: Record<string, string> = {}
  ) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/exceptions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Action failed')
      }
      const data = await res.json()
      setItem(data.exception)
      setToast({ msg: `Successfully ${action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'updated'}.`, type: 'success' })
    } catch (err) {
      setToast({ msg: err instanceof Error ? err.message : 'Action failed.', type: 'error' })
    } finally {
      setSaving(false)
    }
  }, [id])

  const handleApprove = useCallback(() => performAction('approve'), [performAction])

  const handleReject = useCallback(async () => {
    if (!rejectReason.trim()) { setShowRejectBox(true); return }
    await performAction('reject', { override_reason: rejectReason })
    setShowRejectBox(false)
    setRejectReason('')
  }, [performAction, rejectReason])

  const handleGLSave = useCallback(async (gl: string, note: string) => {
    await performAction('edit_match', { gl_override: gl, note })
    setShowGL(false)
  }, [performAction])

  const handleLinkSave = useCallback(async (payload: Record<string, unknown>) => {
    await performAction('edit_match', {
      manual_link_id: payload.manual_link_id as string || '',
      note: payload.note as string || '',
    })
    setShowLink(false)
  }, [performAction])

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <TopBar title="Review" subtitle="Loading…" />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (error || !item) {
    return (
      <div className="flex flex-col h-full">
        <TopBar title="Review" subtitle="Item not found" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-sm">
            <div className="text-4xl mb-3">⚠️</div>
            <p className="text-sm text-gray-600 mb-4">{error ?? 'Item not found.'}</p>
            <button onClick={() => router.push('/review')} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: '#1E3A5F' }}>
              ← Back to Review
            </button>
          </div>
        </div>
      </div>
    )
  }

  const statusCfg     = STATUS_LABELS[item.status] ?? STATUS_LABELS['unmatched']
  const workflowState = toWorkflowState(item)
  const isPending     = !item.resolution
  const hasInvTx      = !!item.invoice_transaction
  const vendor        = item.bank_transaction.vendor || item.bank_transaction.description

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Review"
        subtitle={vendor}
        actions={
          <button onClick={() => router.push('/review')} className="px-3 py-2 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            ← Back to Review
          </button>
        }
      />

      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-3xl mx-auto space-y-5">

          {/* Status + metadata row */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: statusCfg.bg, color: statusCfg.text }}>
              {statusCfg.label}
            </span>
            {item.confidence > 0 && <ConfidenceBadge score={item.confidence} />}
            <ApprovalStatus state={workflowState} actor={item.reviewed_by} timestamp={item.reviewed_at} />
            {item.reconciliation_sessions && (
              <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-gray-100 text-gray-600">
                {item.reconciliation_sessions.name}
              </span>
            )}
          </div>

          {/* Transaction cards */}
          <div className={`grid gap-4 ${hasInvTx ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {/* Bank transaction */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">Bank Transaction</div>
              <div className="text-xl font-bold text-gray-900 mb-1">
                {formatCurrency(item.bank_transaction.amount)}
              </div>
              <div className="text-sm font-medium text-gray-700 mb-1">{vendor}</div>
              <div className="text-xs text-gray-400 space-y-0.5">
                <div>{formatDate(item.bank_transaction.date)}</div>
                {item.bank_transaction.description && item.bank_transaction.description !== vendor && (
                  <div className="truncate">{item.bank_transaction.description}</div>
                )}
                {item.bank_transaction.reference && <div>Ref: {item.bank_transaction.reference}</div>}
                {item.bank_transaction.category && <div>Category: {item.bank_transaction.category}</div>}
              </div>
            </div>

            {/* Invoice transaction */}
            {hasInvTx && item.invoice_transaction && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">Invoice / Match</div>
                <div className="text-xl font-bold text-gray-900 mb-1">
                  {formatCurrency(item.invoice_transaction.amount)}
                </div>
                <div className="text-sm font-medium text-gray-700 mb-1">
                  {item.invoice_transaction.vendor || item.invoice_transaction.description}
                </div>
                <div className="text-xs text-gray-400 space-y-0.5">
                  <div>{formatDate(item.invoice_transaction.date)}</div>
                  {item.invoice_transaction.reference && <div>Ref: {item.invoice_transaction.reference}</div>}
                </div>
                {/* Amount discrepancy */}
                {item.invoice_transaction.amount !== item.bank_transaction.amount && (
                  <div className="mt-2 text-xs text-amber-600 font-medium">
                    ⚠ Amount differs by {formatCurrency(Math.abs(item.bank_transaction.amount - item.invoice_transaction.amount))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* GL category */}
          <div className="bg-white rounded-2xl border border-gray-100 px-5 py-4 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">GL Category</div>
              <div className="text-sm font-medium text-gray-700">
                {item.gl_override || item.gl_category || '—'}
              </div>
              {item.gl_override && item.gl_category && item.gl_override !== item.gl_category && (
                <div className="text-[10px] text-gray-400">Overridden from: {item.gl_category}</div>
              )}
            </div>
            {isPending && (
              <button onClick={() => setShowGL(true)} className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
                Override GL
              </button>
            )}
          </div>

          {/* Flags */}
          {item.flags?.length > 0 && (
            <div className="space-y-2">
              {item.flags.map((flag, i) => {
                const bg  = flag.severity === 'high' ? '#FEF2F2' : flag.severity === 'medium' ? '#FFFBEB' : '#F0FDF4'
                const col = flag.severity === 'high' ? '#B91C1C' : flag.severity === 'medium' ? '#92400E' : '#166534'
                return (
                  <div key={i} className="flex items-start gap-2 px-4 py-3 rounded-xl" style={{ background: bg }}>
                    <span className="text-xs font-bold mt-0.5" style={{ color: col }}>
                      {flag.severity === 'high' ? '🔴' : flag.severity === 'medium' ? '🟡' : '🟢'}
                    </span>
                    <span className="text-xs leading-relaxed" style={{ color: col }}>{flag.message}</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* AI reasoning */}
          {(item.explanation || item.ai_explanation) && (
            <AIReasoningCard
              reasoning={item.ai_explanation || item.explanation || ''}
              generated_at={item.created_at}
              defaultExpanded
            />
          )}

          {/* Suggested action */}
          {item.suggested_action && (
            <div className="bg-white rounded-2xl border border-gray-100 px-5 py-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Recommended Action</div>
              <p className="text-sm text-gray-700 leading-relaxed">{item.suggested_action}</p>
            </div>
          )}

          {/* Evidence trail */}
          <div className="bg-white rounded-2xl border border-gray-100 px-5 py-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">Evidence Trail</div>
            <EvidenceTrail
              source_file={item.reconciliation_sessions?.name || 'Unknown session'}
              upload_date={item.created_at}
              session_name={item.reconciliation_sessions?.name}
              classification={item.match_method}
              match_method={item.match_method}
              reviewed_by={item.reviewed_by}
              reviewed_at={item.reviewed_at}
              original_row={item.bank_transaction.raw_row}
            />
          </div>

          {/* Note */}
          {item.note && (
            <div className="bg-white rounded-2xl border border-gray-100 px-5 py-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Note</div>
              <p className="text-sm text-gray-700 leading-relaxed">{item.note}</p>
            </div>
          )}

          {/* Action panel */}
          {isPending && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-4">Actions</div>

              {/* Reject reason box */}
              {showRejectBox && (
                <div className="mb-4 space-y-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Reason for rejection <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    placeholder="Explain why this is being rejected…"
                    rows={2}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 resize-none"
                  />
                  <div className="flex gap-2">
                    <button onClick={handleReject} disabled={saving || !rejectReason.trim()}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-red-600 hover:opacity-90 disabled:opacity-50">
                      {saving ? 'Rejecting…' : 'Confirm Rejection'}
                    </button>
                    <button onClick={() => { setShowRejectBox(false); setRejectReason('') }}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 border border-gray-200 hover:bg-gray-50">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {!showRejectBox && (
                <div className="flex flex-wrap gap-2">
                  <button onClick={handleApprove} disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 hover:opacity-90"
                    style={{ background: '#16A34A' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    {saving ? 'Approving…' : 'Approve'}
                  </button>
                  <button onClick={() => setShowRejectBox(true)} disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 disabled:opacity-50 hover:opacity-90">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    Reject
                  </button>
                  <button onClick={() => setShowGL(true)} disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 disabled:opacity-50">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>
                    Edit Match / GL
                  </button>
                  <button onClick={() => setShowLink(true)} disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 disabled:opacity-50">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                    Link Invoice
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Resolution summary */}
          {!isPending && (
            <div className="bg-white rounded-2xl border border-gray-100 px-5 py-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Resolution</div>
              <div className="flex items-center gap-3">
                <ApprovalStatus state={workflowState} actor={item.reviewed_by} timestamp={item.reviewed_at} size="md" />
                {item.override_reason && (
                  <span className="text-xs text-gray-500 italic">&quot;{item.override_reason}&quot;</span>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* GL Override Modal */}
      {showGL && (
        <GLOverrideModal
          pairId={id}
          currentGL={item.gl_override || item.gl_category || null}
          vendorName={vendor}
          onSave={handleGLSave}
          onClose={() => setShowGL(false)}
        />
      )}

      {/* Manual Link Modal */}
      {showLink && (
        <ManualLinkModal
          pairId={id}
          sessionId={item.session_id}
          bankTx={item.bank_transaction}
          onSave={handleLinkSave as Parameters<typeof ManualLinkModal>[0]['onSave']}
          onClose={() => setShowLink(false)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.type === 'success' ? '✓' : '✗'} {toast.msg}
          <button onClick={() => setToast(null)} className="ml-2 opacity-70 hover:opacity-100">✕</button>
        </div>
      )}
    </div>
  )
}
