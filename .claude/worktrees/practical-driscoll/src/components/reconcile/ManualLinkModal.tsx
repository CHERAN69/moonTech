'use client'

import { useState, useEffect } from 'react'
import { RawTransaction } from '@/types'
import { formatCurrency, formatDate, cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type LinkMode = 'pick' | 'manual'

interface UnmatchedInvoicePair {
  id: string
  invoice_transaction: RawTransaction
  bank_transaction: RawTransaction  // phantom
}

export interface ManualLinkPayload {
  /** ID of an existing unmatched invoice pair chosen from the session list */
  invoice_pair_id?: string
  /** Manually entered invoice transaction data */
  invoice_transaction?: Partial<RawTransaction>
  manual_link_id?: string
  note?: string
}

export interface ManualLinkModalProps {
  pairId:     string
  sessionId:  string
  bankTx:     RawTransaction
  /** Called with the link payload. Returns a Promise. */
  onSave:  (payload: ManualLinkPayload) => Promise<void>
  onClose: () => void
}

export function ManualLinkModal({
  pairId,
  sessionId,
  bankTx,
  onSave,
  onClose,
}: ManualLinkModalProps) {
  const [mode, setMode]           = useState<LinkMode>('pick')
  const [loading, setLoading]     = useState(false)
  const [fetching, setFetching]   = useState(false)
  const [invoices, setInvoices]   = useState<UnmatchedInvoicePair[]>([])
  const [selected, setSelected]   = useState<string | null>(null)

  // Manual entry fields
  const [manRef,    setManRef]    = useState('')
  const [manVendor, setManVendor] = useState(bankTx.vendor ?? bankTx.description)
  const [manAmount, setManAmount] = useState(String(bankTx.amount))
  const [manDate,   setManDate]   = useState(bankTx.date)
  const [note,      setNote]      = useState('')

  // ── Fetch unmatched invoice pairs from same session ──────────────────────
  useEffect(() => {
    if (mode !== 'pick') return
    setFetching(true)

    fetch(`/api/exceptions?session_id=${sessionId}&status=unmatched&resolution=pending&limit=100`)
      .then(r => r.ok ? r.json() : { exceptions: [] })
      .then(data => {
        // Filter pairs that have a real invoice_transaction
        // (unmatched invoice pairs created by Pass 4 of the matching engine)
        const inv: UnmatchedInvoicePair[] = (data.exceptions ?? [])
          .filter((p: { id: string; bank_transaction?: RawTransaction; invoice_transaction?: RawTransaction }) =>
            p.invoice_transaction &&
            String(p.bank_transaction?.id ?? '').startsWith('phantom-') &&
            p.id !== pairId
          )
          .map((p: { id: string; bank_transaction: RawTransaction; invoice_transaction: RawTransaction }) => ({
            id: p.id,
            invoice_transaction: p.invoice_transaction,
            bank_transaction: p.bank_transaction,
          }))
        setInvoices(inv)
      })
      .catch(() => setInvoices([]))
      .finally(() => setFetching(false))
  }, [mode, sessionId, pairId])

  // ── Save handler ──────────────────────────────────────────────────────────
  const handleSave = async () => {
    setLoading(true)
    try {
      if (mode === 'pick' && selected) {
        await onSave({ invoice_pair_id: selected, note })
      } else if (mode === 'manual') {
        await onSave({
          invoice_transaction: {
            id:          `manual-${Date.now()}`,
            date:        manDate,
            amount:      parseFloat(manAmount) || 0,
            description: manRef || manVendor,
            vendor:      manVendor,
            reference:   manRef,
            source:      'invoice',
          },
          manual_link_id: manRef || undefined,
          note,
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const canSave = mode === 'pick'
    ? !!selected
    : !!manVendor.trim() && !!manDate && parseFloat(manAmount) > 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-gray-100 shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="font-semibold text-gray-900">Link Invoice to Bank Transaction</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {bankTx.vendor || bankTx.description} · {formatCurrency(bankTx.amount)} · {formatDate(bankTx.date)}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Mode tabs */}
        <div className="flex border-b border-gray-100 flex-shrink-0">
          {(['pick', 'manual'] as LinkMode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                'flex-1 py-3 text-xs font-semibold transition-colors border-b-2',
                mode === m
                  ? 'text-blue-600 border-blue-500'
                  : 'text-gray-400 border-transparent hover:text-gray-600'
              )}
            >
              {m === 'pick' ? '📋 Pick from Session' : '✏️ Enter Manually'}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {/* ── PICK MODE ─────────────────────────────────────────────────── */}
          {mode === 'pick' && (
            <>
              {fetching ? (
                <div className="py-8 text-center text-gray-400 text-sm">
                  <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-2" />
                  Fetching unmatched invoices…
                </div>
              ) : invoices.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="text-2xl mb-2">📄</div>
                  <div className="text-sm text-gray-600 mb-1">No unmatched invoices found</div>
                  <div className="text-xs text-gray-400">
                    Switch to "Enter Manually" to link by reference number.
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-xs text-gray-400 mb-3">
                    {invoices.length} unmatched invoice{invoices.length !== 1 ? 's' : ''} in this session
                  </div>
                  {invoices.map(inv => {
                    const tx = inv.invoice_transaction
                    const isSelected = selected === inv.id
                    return (
                      <button
                        key={inv.id}
                        onClick={() => setSelected(isSelected ? null : inv.id)}
                        className={cn(
                          'w-full text-left p-3 rounded-xl border-2 transition-all',
                          isSelected
                            ? 'border-blue-400 bg-blue-50'
                            : 'border-gray-100 hover:border-gray-200 bg-white'
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-gray-800 truncate">
                              {tx.vendor || tx.description}
                            </div>
                            <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                              <span>{formatDate(tx.date)}</span>
                              {tx.reference && <><span>·</span><span>Ref: {tx.reference}</span></>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-sm font-semibold text-gray-900">
                              {formatCurrency(tx.amount)}
                            </span>
                            {isSelected && (
                              <span className="text-blue-500">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <polyline points="20 6 9 17 4 12"/>
                                </svg>
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {/* ── MANUAL ENTRY MODE ─────────────────────────────────────────── */}
          {mode === 'manual' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Vendor / Payee <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={manVendor}
                    onChange={e => setManVendor(e.target.value)}
                    placeholder="e.g. Acme Corp"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Invoice Reference
                  </label>
                  <input
                    type="text"
                    value={manRef}
                    onChange={e => setManRef(e.target.value)}
                    placeholder="e.g. INV-2026-042"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Amount <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    value={manAmount}
                    onChange={e => setManAmount(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Invoice Date <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={manDate}
                    onChange={e => setManDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Note (both modes) */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Note <span className="text-gray-300 normal-case font-normal">(optional)</span>
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Add a note for the audit trail…"
              rows={2}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-3 border-t border-gray-100 flex gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading || !canSave}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ background: '#1E3A5F' }}
          >
            {loading ? 'Linking…' : 'Link Invoice'}
          </button>
        </div>
      </div>
    </div>
  )
}
