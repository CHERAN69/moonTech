'use client'

import { useState } from 'react'
import { ExceptionItem } from '@/types'
import { formatCurrency, formatDate, cn } from '@/lib/utils'

// ─── Shared style maps (exported so ExceptionStats can reuse colours) ─────────

export const STATUS_CONFIG: Record<string, {
  bg: string; text: string; label: string; dot: string
}> = {
  unmatched: { bg: '#FEF2F2', text: '#DC2626', label: 'Unmatched',    dot: '#DC2626' },
  flagged:   { bg: '#FFFBEB', text: '#D97706', label: 'Flagged',      dot: '#D97706' },
  duplicate: { bg: '#FAF5FF', text: '#7C3AED', label: 'Duplicate',    dot: '#7C3AED' },
  suggested: { bg: '#EFF6FF', text: '#2563EB', label: 'Needs Review', dot: '#2563EB' },
  matched:   { bg: '#F0FDF4', text: '#16A34A', label: 'Matched',      dot: '#16A34A' },
  excluded:  { bg: '#F3F4F6', text: '#6B7280', label: 'Excluded',     dot: '#6B7280' },
}

export const RESOLUTION_CONFIG: Record<string, {
  bg: string; text: string; label: string
}> = {
  approved: { bg: '#F0FDF4', text: '#16A34A', label: 'Approved' },
  rejected: { bg: '#FEF2F2', text: '#DC2626', label: 'Rejected' },
  edited:   { bg: '#EFF6FF', text: '#2563EB', label: 'Edited'   },
  resolved: { bg: '#F9FAFB', text: '#6B7280', label: 'Resolved' },
}

// ─── Severity helpers ─────────────────────────────────────────────────────────

const FLAG_COLORS = {
  high:   { bg: '#FEF2F2', text: '#B91C1C', dot: '●' },
  medium: { bg: '#FFFBEB', text: '#92400E', dot: '◐' },
  low:    { bg: '#F0FDF4', text: '#166534', dot: '○' },
} as const

// ─── Component ────────────────────────────────────────────────────────────────

export interface ExceptionRowProps {
  item: ExceptionItem
  onAction: (item: ExceptionItem, action: string) => void
}

export function ExceptionRow({ item, onAction }: ExceptionRowProps) {
  const [expanded, setExpanded]     = useState(false)
  const [explaining, setExplaining] = useState(false)
  const [aiExpl, setAiExpl]         = useState(item.ai_explanation ?? '')

  const cfg    = STATUS_CONFIG[item.status] ?? STATUS_CONFIG['unmatched']
  const resCfg = item.resolution ? RESOLUTION_CONFIG[item.resolution] : null
  const isPending = !item.resolution

  // ── AI explain handler ──────────────────────────────────────────────────────
  const handleExplain = async () => {
    setExpanded(true)
    if (aiExpl) return
    setExplaining(true)
    try {
      const res  = await fetch(`/api/exceptions/${item.id}/explain`, { method: 'POST' })
      const json = await res.json()
      if (json.explanation) setAiExpl(json.explanation)
      else setAiExpl('AI explanation unavailable.')
    } catch {
      setAiExpl('AI explanation unavailable. Please try again.')
    } finally {
      setExplaining(false)
    }
  }

  // ── Small icon buttons ──────────────────────────────────────────────────────
  const iconBtn = (
    title: string,
    onClick: () => void,
    colorClass: string,
    svgPath: React.ReactNode
  ) => (
    <button
      title={title}
      onClick={onClick}
      className={cn('w-7 h-7 rounded-lg flex items-center justify-center transition-colors', colorClass)}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        {svgPath}
      </svg>
    </button>
  )

  return (
    <div className="border-b border-gray-50 last:border-0">
      {/* ── Summary row ──────────────────────────────────────────────────── */}
      <div className="flex items-center px-5 py-4 hover:bg-gray-50/60 transition-colors gap-4">
        {/* Status dot */}
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cfg.dot }} />

        {/* Vendor + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-800 truncate max-w-xs">
              {item.bank_transaction.vendor || item.bank_transaction.description}
            </span>
            <span
              className="text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0"
              style={{ background: cfg.bg, color: cfg.text }}
            >
              {cfg.label}
            </span>
            {resCfg && (
              <span
                className="text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0"
                style={{ background: resCfg.bg, color: resCfg.text }}
              >
                {resCfg.label}
              </span>
            )}
          </div>
          <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
            <span>{formatDate(item.bank_transaction.date)}</span>
            {item.reconciliation_sessions && (
              <>
                <span>·</span>
                <span className="truncate max-w-[10rem]">{item.reconciliation_sessions.name}</span>
              </>
            )}
            {item.note && (
              <>
                <span>·</span>
                <span className="text-blue-400 italic truncate max-w-[10rem]">📝 {item.note}</span>
              </>
            )}
          </div>
        </div>

        {/* Amount */}
        <div className="text-sm font-semibold text-gray-900 flex-shrink-0 w-24 text-right">
          {formatCurrency(item.bank_transaction.amount)}
        </div>

        {/* GL label (xl screens only) */}
        <div className="text-xs text-gray-400 flex-shrink-0 w-36 text-right hidden xl:block truncate">
          {item.gl_override || item.gl_category || '—'}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {isPending && (
            <>
              {iconBtn(
                'Approve',
                () => onAction(item, 'approve'),
                'text-green-600 hover:bg-green-50',
                <polyline points="20 6 9 17 4 12" strokeWidth="2.5"/>
              )}
              {iconBtn(
                'Reject',
                () => onAction(item, 'reject'),
                'text-red-500 hover:bg-red-50',
                <><line x1="18" y1="6" x2="6" y2="18" strokeWidth="2.5"/><line x1="6" y1="6" x2="18" y2="18" strokeWidth="2.5"/></>
              )}
              {iconBtn(
                'Edit match / override GL',
                () => onAction(item, 'edit_match'),
                'text-gray-400 hover:bg-gray-100',
                <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>
              )}
            </>
          )}

          {/* Add note — always visible */}
          {iconBtn(
            'Add note',
            () => onAction(item, 'add_note'),
            'text-gray-400 hover:bg-gray-100',
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          )}

          {/* AI explain */}
          {iconBtn(
            'Get AI explanation',
            handleExplain,
            'text-blue-400 hover:bg-blue-50',
            <><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></>
          )}

          {/* Expand / collapse */}
          <button
            onClick={() => setExpanded(e => !e)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:bg-gray-100 transition-colors"
          >
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              className={cn('transition-transform duration-150', expanded ? 'rotate-90' : '')}
            >
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── Expanded detail panel ─────────────────────────────────────────── */}
      {expanded && (
        <div className="px-5 pb-5 ml-6">
          <div
            className="rounded-xl border p-4 space-y-3"
            style={{ background: '#F8FAFC', borderColor: '#E2E8F0' }}
          >
            {/* Flags */}
            {item.flags?.length > 0 && (
              <div className="space-y-1.5">
                {item.flags.map((flag, i) => {
                  const sev = FLAG_COLORS[flag.severity as keyof typeof FLAG_COLORS] ?? FLAG_COLORS.low
                  return (
                    <div
                      key={i}
                      className="flex items-start gap-2 px-3 py-2 rounded-lg"
                      style={{ background: sev.bg }}
                    >
                      <span className="text-xs font-bold mt-0.5 flex-shrink-0" style={{ color: sev.text }}>
                        {sev.dot}
                      </span>
                      <span className="text-xs leading-relaxed" style={{ color: sev.text }}>
                        {flag.message}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* AI analysis */}
            {(explaining || aiExpl || item.explanation) && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#2E75B6' }}>
                    AI Analysis
                  </span>
                  {explaining && (
                    <span className="text-xs text-gray-400 animate-pulse">Generating…</span>
                  )}
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {explaining ? '…' : (aiExpl || item.explanation)}
                </p>
              </div>
            )}

            {/* Recommended action (suggested_action) */}
            {item.suggested_action && (
              <div className="space-y-1 pt-2 border-t border-gray-200">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Recommended Action
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{item.suggested_action}</p>
              </div>
            )}

            {/* Suggested invoice match */}
            {item.invoice_transaction && (
              <div className="pt-2 border-t border-gray-200">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Suggested Match
                </div>
                <div className="text-sm text-gray-700">
                  {item.invoice_transaction.vendor || item.invoice_transaction.description}
                  {' · '}
                  {formatCurrency(item.invoice_transaction.amount)}
                  {' · '}
                  {formatDate(item.invoice_transaction.date)}
                  {item.invoice_transaction.reference && (
                    <span className="text-gray-400"> · Ref: {item.invoice_transaction.reference}</span>
                  )}
                </div>
                {item.confidence > 0 && (
                  <div className="text-xs text-gray-400 mt-0.5">
                    Match confidence: {item.confidence}%
                  </div>
                )}
              </div>
            )}

            {/* Inline action strip */}
            {isPending && (
              <div className="pt-2 border-t border-gray-200 flex flex-wrap gap-2">
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
      )}
    </div>
  )
}
