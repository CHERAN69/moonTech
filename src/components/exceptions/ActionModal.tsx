'use client'

import { useState } from 'react'
import { ExceptionItem } from '@/types'
import { formatCurrency, formatDate, cn } from '@/lib/utils'

export interface ActionModalProps {
  item: ExceptionItem
  action: string
  onClose: () => void
  /** Returns a promise so the parent can show its own loading/toast state. */
  onConfirm: (payload: Record<string, string>) => Promise<void>
}

const ACTION_TITLES: Record<string, string> = {
  approve:       'Approve Match',
  reject:        'Reject & Exclude',
  edit_match:    'Edit Match / Override GL',
  add_note:      'Add Note',
  mark_resolved: 'Mark as Resolved',
}

const ACTION_BTN_LABEL: Record<string, string> = {
  approve:       '✓ Approve',
  reject:        '✗ Reject',
  edit_match:    'Save Changes',
  add_note:      'Save Note',
  mark_resolved: 'Mark Resolved',
}

export function ActionModal({ item, action, onClose, onConfirm }: ActionModalProps) {
  const [note, setNote]       = useState(item.note ?? '')
  const [glOverride, setGl]   = useState(item.gl_override ?? item.gl_category ?? '')
  const [reason, setReason]   = useState(item.override_reason ?? '')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setLoading(true)
    try {
      await onConfirm({
        note,
        gl_override:      glOverride,
        override_reason:  reason,
      })
    } finally {
      setLoading(false)
    }
  }

  const title   = ACTION_TITLES[action]   ?? action
  const btnText = ACTION_BTN_LABEL[action] ?? 'Confirm'
  const isReject = action === 'reject'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-gray-100 shadow-2xl w-full max-w-lg mx-4"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Transaction summary pill */}
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
            <div className="text-sm font-medium text-gray-800">
              {item.bank_transaction.vendor || item.bank_transaction.description}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              {formatDate(item.bank_transaction.date)} · {formatCurrency(item.bank_transaction.amount)}
            </div>
          </div>

          {/* GL override — shown for edit_match only */}
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

          {/* Rejection reason — shown for reject only */}
          {action === 'reject' && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Reason for Rejection <span className="text-gray-300">(optional)</span>
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

          {/* Note — always shown */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Note{' '}
              {action !== 'add_note' && (
                <span className="text-gray-300 normal-case font-normal">(optional)</span>
              )}
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Add a note for the audit trail…"
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all resize-none"
            />
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className={cn(
              'flex-1 py-2.5 rounded-xl text-sm font-medium text-white',
              'transition-opacity hover:opacity-90 disabled:opacity-50',
              isReject ? 'bg-red-600' : ''
            )}
            style={!isReject ? { background: '#1E3A5F' } : {}}
          >
            {loading ? 'Saving…' : btnText}
          </button>
        </div>
      </div>
    </div>
  )
}
