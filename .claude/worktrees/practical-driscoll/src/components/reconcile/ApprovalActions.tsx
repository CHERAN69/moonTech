'use client'

import { useState } from 'react'
import { MatchedPair } from '@/types'
import { GLOverrideModal }  from '@/components/reconcile/GLOverrideModal'
import { ManualLinkModal }  from '@/components/reconcile/ManualLinkModal'
import { ManualLinkPayload } from '@/components/reconcile/ManualLinkModal'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ApprovalActionType =
  | 'approve'
  | 'reject'
  | 'edit_match'   // GL override
  | 'link_invoice' // manual invoice link (calls edit_match under the hood)
  | 'mark_resolved'

export interface ApprovalActionPayload {
  action:               ApprovalActionType
  gl_override?:         string
  note?:                string
  invoice_pair_id?:     string
  invoice_transaction?: object
  manual_link_id?:      string
  override_reason?:     string
}

export interface ApprovalActionsProps {
  pair:      MatchedPair & { session_id?: string; resolution?: string }
  sessionId: string
  /** Parent controls per-pair submit lock via this set */
  submitting: boolean
  onAction: (pairId: string, payload: ApprovalActionPayload) => Promise<void>
}

// ─── Pill button ──────────────────────────────────────────────────────────────

function PillBtn({
  label,
  busy,
  disabled,
  onClick,
  variant = 'default',
}: {
  label:    string
  busy:     boolean
  disabled: boolean
  onClick:  () => void
  variant?: 'approve' | 'reject' | 'default' | 'link'
}) {
  const base = 'px-3 py-1.5 text-xs font-medium rounded-lg transition-opacity disabled:opacity-40 flex items-center gap-1.5'
  const styles: Record<string, string> = {
    approve: 'text-white bg-green-600 hover:opacity-90',
    reject:  'text-white bg-red-600 hover:opacity-90',
    default: 'text-gray-600 border border-gray-200 hover:bg-gray-50',
    link:    'text-white hover:opacity-90',
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled || busy}
      className={cn(base, styles[variant])}
      style={variant === 'link' ? { background: '#2E75B6' } : {}}
    >
      {busy ? (
        <span className="w-3 h-3 border border-white/50 border-t-white rounded-full animate-spin flex-shrink-0" />
      ) : null}
      {label}
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ApprovalActions({ pair, sessionId, submitting, onAction }: ApprovalActionsProps) {
  const [activeModal, setActiveModal] = useState<'gl' | 'link' | null>(null)
  const [busyAction,  setBusyAction]  = useState<ApprovalActionType | null>(null)

  const isResolved = !!pair.resolution
  const status     = pair.status

  // ── Wrap onAction to track per-button busy state ──────────────────────────
  const fire = async (payload: ApprovalActionPayload) => {
    setBusyAction(payload.action)
    try {
      await onAction(pair.id, payload)
    } finally {
      setBusyAction(null)
      setActiveModal(null)
    }
  }

  // ── GL save handler (from modal) ──────────────────────────────────────────
  const handleGLSave = async (gl: string, note: string) => {
    await fire({ action: 'edit_match', gl_override: gl, note })
  }

  // ── Manual link save handler (from modal) ─────────────────────────────────
  const handleLinkSave = async (payload: ManualLinkPayload) => {
    await fire({
      action:               'link_invoice',
      invoice_pair_id:      payload.invoice_pair_id,
      invoice_transaction:  payload.invoice_transaction as object | undefined,
      manual_link_id:       payload.manual_link_id,
      note:                 payload.note,
    })
  }

  const busy     = submitting || busyAction !== null
  const vendorName = pair.bank_transaction.vendor ?? pair.bank_transaction.description

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap mt-4">

        {/* ── Suggested / Flagged: approve or reject AI match ────────────── */}
        {(status === 'suggested' || status === 'flagged') && !isResolved && (
          <>
            <PillBtn
              label="✓ Approve Match"
              variant="approve"
              busy={busyAction === 'approve'}
              disabled={busy}
              onClick={() => fire({ action: 'approve' })}
            />
            <PillBtn
              label="✗ Reject"
              variant="reject"
              busy={busyAction === 'reject'}
              disabled={busy}
              onClick={() => fire({ action: 'reject', override_reason: 'Rejected by reviewer' })}
            />
            <PillBtn
              label="Override GL"
              variant="default"
              busy={busyAction === 'edit_match'}
              disabled={busy}
              onClick={() => setActiveModal('gl')}
            />
          </>
        )}

        {/* ── Unmatched: link invoice or mark resolved ────────────────────── */}
        {status === 'unmatched' && !isResolved && (
          <>
            <PillBtn
              label="🔗 Link Invoice"
              variant="link"
              busy={busyAction === 'link_invoice'}
              disabled={busy}
              onClick={() => setActiveModal('link')}
            />
            <PillBtn
              label="Override GL"
              variant="default"
              busy={busyAction === 'edit_match'}
              disabled={busy}
              onClick={() => setActiveModal('gl')}
            />
            <PillBtn
              label="Mark Resolved"
              variant="default"
              busy={busyAction === 'mark_resolved'}
              disabled={busy}
              onClick={() => fire({ action: 'mark_resolved' })}
            />
          </>
        )}

        {/* ── Duplicate: confirm & exclude ────────────────────────────────── */}
        {status === 'duplicate' && !isResolved && (
          <PillBtn
            label="Confirm Duplicate & Exclude"
            variant="reject"
            busy={busyAction === 'reject'}
            disabled={busy}
            onClick={() => fire({ action: 'reject', override_reason: 'Confirmed duplicate' })}
          />
        )}

        {/* ── Matched: GL override only (already matched) ─────────────────── */}
        {status === 'matched' && !isResolved && (
          <PillBtn
            label="Override GL"
            variant="default"
            busy={busyAction === 'edit_match'}
            disabled={busy}
            onClick={() => setActiveModal('gl')}
          />
        )}

        {/* ── Already resolved badge ───────────────────────────────────────── */}
        {isResolved && (
          <span className="text-xs text-gray-400 italic">
            ✓ {pair.resolution} — no further actions required
          </span>
        )}

        {/* ── Always: link to exception queue ─────────────────────────────── */}
        {!isResolved && status !== 'matched' && (
          <a
            href="/exceptions"
            className="text-xs text-gray-400 hover:text-blue-500 transition-colors ml-1"
          >
            View in Exception Queue →
          </a>
        )}
      </div>

      {/* ── GL Override Modal ─────────────────────────────────────────────── */}
      {activeModal === 'gl' && (
        <GLOverrideModal
          pairId={pair.id}
          currentGL={(pair as { gl_override?: string; gl_category?: string }).gl_override
            ?? pair.gl_category}
          vendorName={vendorName}
          onSave={handleGLSave}
          onClose={() => setActiveModal(null)}
        />
      )}

      {/* ── Manual Link Modal ─────────────────────────────────────────────── */}
      {activeModal === 'link' && (
        <ManualLinkModal
          pairId={pair.id}
          sessionId={sessionId}
          bankTx={pair.bank_transaction}
          onSave={handleLinkSave}
          onClose={() => setActiveModal(null)}
        />
      )}
    </>
  )
}
