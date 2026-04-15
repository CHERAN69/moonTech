'use client'

import { cn } from '@/lib/utils'

interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
  className?: string
}

/**
 * Reusable error state component.
 * Shown when a data fetch fails or a critical error occurs.
 */
export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-6 text-center',
        className
      )}
    >
      {/* Error icon */}
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: '#FEF2F2' }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>

      <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-400 max-w-xs leading-relaxed">{message}</p>

      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 px-4 py-2 text-sm font-medium text-white rounded-xl transition-opacity hover:opacity-90"
          style={{ background: '#DC2626' }}
        >
          Try again
        </button>
      )}
    </div>
  )
}

/**
 * Inline error banner — use for non-fatal errors within a page.
 */
export function ErrorBanner({
  message,
  onClose,
  className,
}: {
  message: string
  onClose?: () => void
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-xl px-4 py-3 text-sm flex items-center gap-2 bg-red-50 text-red-700 border border-red-100',
        className
      )}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <span className="flex-1">{message}</span>
      {onClose && (
        <button onClick={onClose} className="ml-auto text-red-400 hover:text-red-600 transition-colors">
          ✕
        </button>
      )}
    </div>
  )
}
