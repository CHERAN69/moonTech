'use client'

/**
 * AIReasoningCard — collapsible card showing AI-generated reasoning.
 *
 * Used wherever AI made a classification or matching decision.
 * Provides transparency into the AI's logic for auditors and reviewers.
 */

import { useState } from 'react'

interface AIReasoningCardProps {
  reasoning: string
  model?: string
  generated_at?: string       // ISO date string
  defaultExpanded?: boolean
  className?: string
}

function SparkleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z"/>
    </svg>
  )
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
    >
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  )
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  return new Date(iso).toLocaleDateString()
}

export function AIReasoningCard({
  reasoning,
  model = 'gpt-4o-mini',
  generated_at,
  defaultExpanded = false,
  className = '',
}: AIReasoningCardProps) {
  const [open, setOpen] = useState(defaultExpanded)

  return (
    <div className={`rounded-xl border overflow-hidden ${className}`} style={{ borderColor: '#BFDBFE', background: '#EFF6FF' }}>
      {/* Header — always visible */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:opacity-90 transition-opacity"
      >
        <div className="flex items-center gap-2">
          <span style={{ color: '#2E75B6' }}>
            <SparkleIcon />
          </span>
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#1E3A5F' }}>
            AI Analysis
          </span>
          <span className="text-[10px] text-gray-400 font-normal normal-case">{model}</span>
          {generated_at && (
            <span className="text-[10px] text-gray-400 font-normal normal-case">
              · {formatRelative(generated_at)}
            </span>
          )}
        </div>
        <span className="text-gray-400 flex-shrink-0">
          <ChevronIcon open={open} />
        </span>
      </button>

      {/* Body — collapsible */}
      {open && (
        <div className="px-4 pb-4 pt-0">
          <div className="w-full h-px bg-blue-200 mb-3" />
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{reasoning}</p>
        </div>
      )}
    </div>
  )
}
