'use client'

/**
 * ApprovalActions — context-aware action buttons for each WorkflowState.
 *
 * ai_draft     → "Start Review"               (→ needs_review)
 * needs_review → "Approve" | "Reject" | "Edit"
 * approved     → "Lock" (admin) | "Revert to Review"
 * locked       → no actions, display locked message
 */

import { useState } from 'react'
import type { WorkflowState } from '@/types'

interface ApprovalActionsProps {
  state: WorkflowState
  onApprove?: () => Promise<void> | void
  onReject?: (reason: string) => Promise<void> | void
  onEdit?: () => void
  onLock?: () => Promise<void> | void
  onRevert?: () => Promise<void> | void
  onStartReview?: () => Promise<void> | void
  requireReason?: boolean   // require reject reason (default true for needs_review)
  isAdmin?: boolean
  className?: string
}

export function ApprovalActions({
  state,
  onApprove,
  onReject,
  onEdit,
  onLock,
  onRevert,
  onStartReview,
  requireReason = true,
  isAdmin = false,
  className = '',
}: ApprovalActionsProps) {
  const [rejecting, setRejecting]   = useState(false)
  const [reason, setReason]         = useState('')
  const [loading, setLoading]       = useState(false)
  const [reasonError, setReasonErr] = useState('')

  async function run(fn?: () => Promise<void> | void) {
    if (!fn) return
    setLoading(true)
    try { await fn() } finally { setLoading(false) }
  }

  function handleRejectClick() {
    if (!requireReason) {
      run(() => onReject?.(''))
    } else {
      setRejecting(true)
    }
  }

  async function handleRejectConfirm() {
    if (requireReason && !reason.trim()) {
      setReasonErr('A reason is required for rejection.')
      return
    }
    setReasonErr('')
    setLoading(true)
    try { await onReject?.(reason) }
    finally {
      setLoading(false)
      setRejecting(false)
      setReason('')
    }
  }

  if (state === 'locked') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-xs font-medium text-gray-500">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          Locked — no further actions allowed
        </div>
      </div>
    )
  }

  if (state === 'ai_draft') {
    return (
      <div className={className}>
        <button
          onClick={() => run(onStartReview)}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: '#2E75B6' }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
          </svg>
          {loading ? 'Starting…' : 'Start Review'}
        </button>
      </div>
    )
  }

  if (state === 'needs_review') {
    return (
      <div className={`space-y-2 ${className}`}>
        {/* Reject reason input (shown inline when rejecting) */}
        {rejecting && (
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Reason for rejection <span className="text-red-400">*</span>
            </label>
            <textarea
              value={reason}
              onChange={e => { setReason(e.target.value); setReasonErr('') }}
              placeholder="Explain why this is being rejected…"
              rows={2}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all resize-none"
            />
            {reasonError && <p className="text-[10px] text-red-500">{reasonError}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleRejectConfirm}
                disabled={loading}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-red-600 hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? 'Rejecting…' : 'Confirm Rejection'}
              </button>
              <button
                onClick={() => { setRejecting(false); setReason(''); setReasonErr('') }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Main action buttons */}
        {!rejecting && (
          <div className="flex items-center gap-2 flex-wrap">
            {onApprove && (
              <button
                onClick={() => run(onApprove)}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: '#16A34A' }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                {loading ? 'Approving…' : 'Approve'}
              </button>
            )}
            {onReject && (
              <button
                onClick={handleRejectClick}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-red-600 transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                Reject
              </button>
            )}
            {onEdit && (
              <button
                onClick={onEdit}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>
                Edit
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  if (state === 'approved') {
    return (
      <div className={`flex items-center gap-2 flex-wrap ${className}`}>
        {isAdmin && onLock && (
          <button
            onClick={() => run(onLock)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            {loading ? 'Locking…' : 'Lock'}
          </button>
        )}
        {onRevert && (
          <button
            onClick={() => run(onRevert)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 text-[10px]"
          >
            ↩ Revert to Review
          </button>
        )}
      </div>
    )
  }

  return null
}
