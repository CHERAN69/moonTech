import React from 'react'

/**
 * ApprovalStatus — workflow state chip.
 *
 * Maps WorkflowState to a visual chip with icon, color, and label.
 * ai_draft    → purple / sparkle  / "AI Draft"
 * needs_review → yellow / eye     / "Needs Review"
 * approved    → green  / check   / "Approved by {actor}"
 * locked      → gray   / lock    / "Locked {timestamp}"
 */

import type { WorkflowState } from '@/types'

interface ApprovalStatusProps {
  state: WorkflowState
  actor?: string      // display name of approver
  timestamp?: string  // ISO string
  size?: 'sm' | 'md'
  className?: string
}

const CONFIG: Record<WorkflowState, { bg: string; text: string; border: string; label: string }> = {
  ai_draft:     { bg: '#F5F3FF', text: '#6D28D9', border: '#DDD6FE', label: 'AI Draft'     },
  needs_review: { bg: '#FFFBEB', text: '#92400E', border: '#FDE68A', label: 'Needs Review' },
  approved:     { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0', label: 'Approved'     },
  locked:       { bg: '#F9FAFB', text: '#6B7280', border: '#E5E7EB', label: 'Locked'       },
}

function SparkleIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z"/>
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  )
}

const STATE_ICONS: Record<WorkflowState, () => React.ReactElement> = {
  ai_draft:     SparkleIcon,
  needs_review: EyeIcon,
  approved:     CheckIcon,
  locked:       LockIcon,
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return iso
  }
}

export function ApprovalStatus({
  state,
  actor,
  timestamp,
  size = 'md',
  className = '',
}: ApprovalStatusProps) {
  const { bg, text, border, label } = CONFIG[state]
  const Icon = STATE_ICONS[state]

  const textSz  = size === 'sm' ? 'text-[10px]' : 'text-xs'
  const padding = size === 'sm' ? 'px-1.5 py-0.5' : 'px-2 py-1'

  let displayLabel = label
  if (state === 'approved' && actor) displayLabel = `Approved by ${actor}`
  if (state === 'locked'   && timestamp) displayLabel = `Locked ${formatDate(timestamp)}`

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold border ${textSz} ${padding} ${className}`}
      style={{ background: bg, color: text, borderColor: border }}
    >
      <Icon />
      {displayLabel}
    </span>
  )
}
