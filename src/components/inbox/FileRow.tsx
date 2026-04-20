'use client'

/**
 * FileRow — single row in the classification queue.
 *
 * Shows: filename, upload date, AI classification, confidence,
 * status, and expand/collapse for sample data and reasoning.
 */

import { useState } from 'react'
import { ConfidenceBadge } from '@/components/trust/ConfidenceBadge'
import { AIReasoningCard } from '@/components/trust/AIReasoningCard'

export interface FileRowData {
  id: string
  filename: string
  file_size_bytes?: number
  classification?: string
  classification_confidence?: number
  classification_reasoning?: string
  detected_entity?: string
  suggested_period_start?: string
  suggested_period_end?: string
  transactions_count?: number
  status: 'processing' | 'classified' | 'confirmed' | 'error'
  error_message?: string
  category_hint?: string
  session_id?: string
  created_at: string
}

interface FileRowProps {
  row: FileRowData
  onConfirm:        (id: string) => void
  onReclassify:     (id: string) => void
  onManualClassify: (id: string, classification: string) => void
  onDelete:         (id: string) => void
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  processing: { bg: '#EFF6FF', text: '#2563EB', label: 'Processing…' },
  classified: { bg: '#FFFBEB', text: '#92400E', label: 'Needs Confirmation' },
  confirmed:  { bg: '#F0FDF4', text: '#15803D', label: 'Confirmed'   },
  error:      { bg: '#FEF2F2', text: '#B91C1C', label: 'Error'        },
}

const CLASS_LABELS: Record<string, string> = {
  bank_statement: 'Bank Statement',
  invoice:        'Invoice / AR',
  payroll:        'Payroll',
  journal_entry:  'Journal Entry',
  receipt:        'Receipt',
  expense_report: 'Expense Report',
  other:          'Other',
}

function formatBytes(bytes?: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('default', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const CLASSIFIABLE_OPTIONS = [
  { value: 'bank_statement',  label: 'Bank Statement' },
  { value: 'invoice',         label: 'Invoice / AR' },
  { value: 'payroll',         label: 'Payroll' },
  { value: 'journal_entry',   label: 'Journal Entry' },
  { value: 'receipt',         label: 'Receipt' },
  { value: 'expense_report',  label: 'Expense Report' },
  { value: 'other',           label: 'Other' },
]

export function FileRow({ row, onConfirm, onReclassify, onManualClassify, onDelete }: FileRowProps) {
  const [expanded, setExpanded]             = useState(false)
  const [showClassifyMenu, setShowClassify] = useState(false)
  const statusCfg  = STATUS_CONFIG[row.status] ?? STATUS_CONFIG['processing']
  const classLabel = row.classification ? (CLASS_LABELS[row.classification] || row.classification) : '—'

  return (
    <div className="border-b border-gray-50 last:border-0">
      {/* Main row */}
      <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/60 transition-colors">
        {/* File icon + name */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: row.status === 'error' ? '#FEF2F2' : '#F0F4FF' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke={row.status === 'error' ? '#DC2626' : '#4B72B8'} strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{row.filename}</p>
            <p className="text-[10px] text-gray-400">
              {formatDate(row.created_at)}
              {row.file_size_bytes ? ` · ${formatBytes(row.file_size_bytes)}` : ''}
              {row.detected_entity ? ` · ${row.detected_entity}` : ''}
            </p>
          </div>
        </div>

        {/* Classification */}
        <div className="w-36 flex-shrink-0 hidden sm:block">
          <span className="text-xs font-medium text-gray-700">{classLabel}</span>
          {row.suggested_period_start && (
            <p className="text-[10px] text-gray-400 mt-0.5">
              {row.suggested_period_start} → {row.suggested_period_end}
            </p>
          )}
        </div>

        {/* Confidence */}
        <div className="w-20 flex-shrink-0">
          {row.classification_confidence !== undefined && row.classification_confidence > 0 ? (
            <ConfidenceBadge score={row.classification_confidence} size="sm" />
          ) : (
            <span className="text-xs text-gray-300">—</span>
          )}
        </div>

        {/* Rows count */}
        <div className="w-16 text-right flex-shrink-0">
          <span className="text-xs text-gray-500">
            {row.transactions_count !== undefined ? `${row.transactions_count} rows` : '—'}
          </span>
        </div>

        {/* Status badge */}
        <div className="w-36 flex-shrink-0">
          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: statusCfg.bg, color: statusCfg.text }}>
            {statusCfg.label}
          </span>
          {row.status === 'processing' && (
            <span className="ml-1 inline-block w-3 h-3 border border-blue-200 border-t-blue-500 rounded-full animate-spin" />
          )}
          {row.status === 'error' && row.error_message && (
            <p className="text-[10px] text-red-500 mt-0.5 leading-snug" title={row.error_message}>
              {row.error_message.slice(0, 80)}{row.error_message.length > 80 ? '…' : ''}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="relative flex items-center gap-1.5 flex-shrink-0">
          {row.status === 'classified' && (
            <button
              onClick={() => onConfirm(row.id)}
              title="Confirm classification"
              className="px-2.5 py-1 rounded-lg text-[10px] font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: '#16A34A' }}
            >
              Confirm
            </button>
          )}
          {row.status !== 'processing' && row.status !== 'error' && (
            <div className="relative">
              <button
                onClick={() => setShowClassify(v => !v)}
                title="Change classification"
                className="px-2.5 py-1 rounded-lg text-[10px] font-medium text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                {row.classification === 'other' || !row.classification ? '⚠ Set type ▾' : 'Re-classify ▾'}
              </button>
              {showClassifyMenu && (
                <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[160px]">
                  {CLASSIFIABLE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        onManualClassify(row.id, opt.value)
                        setShowClassify(false)
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 transition-colors ${
                        row.classification === opt.value ? 'font-semibold text-blue-700' : 'text-gray-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <button
            onClick={() => setExpanded(e => !e)}
            title={expanded ? 'Collapse' : 'Expand'}
            className="w-6 h-6 rounded flex items-center justify-center text-gray-300 hover:bg-gray-100 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
          <button
            onClick={() => onDelete(row.id)}
            title="Delete"
            className="w-6 h-6 rounded flex items-center justify-center text-gray-300 hover:bg-red-50 hover:text-red-400 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Expanded panel */}
      {expanded && row.classification_reasoning && (
        <div className="px-5 pb-4 ml-11">
          <AIReasoningCard
            reasoning={row.classification_reasoning}
            generated_at={row.created_at}
            defaultExpanded
          />
        </div>
      )}
    </div>
  )
}
