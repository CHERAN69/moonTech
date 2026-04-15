'use client'

import { useEffect } from 'react'
import { cn } from '@/lib/utils'

export interface ToastProps {
  message: string
  type: 'success' | 'error' | 'info'
  onClose: () => void
  /** Auto-dismiss after this many ms. Defaults to 4000. Pass 0 to disable. */
  duration?: number
}

export function Toast({ message, type, onClose, duration = 4000 }: ToastProps) {
  useEffect(() => {
    if (duration <= 0) return
    const timer = setTimeout(onClose, duration)
    return () => clearTimeout(timer)
  }, [onClose, duration])

  const config = {
    success: { bgClass: 'bg-green-600',   icon: '✓' },
    error:   { bgClass: 'bg-red-600',     icon: '✗' },
    info:    { bgClass: 'bg-blue-600',    icon: 'ℹ' },
  }

  const { bgClass, icon } = config[type]

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        'fixed bottom-6 right-6 z-50 flex items-center gap-3',
        'px-4 py-3 rounded-xl shadow-xl text-sm font-medium text-white',
        'max-w-sm',
        bgClass
      )}
    >
      <span className="flex-shrink-0 text-base leading-none">{icon}</span>
      <span className="flex-1">{message}</span>
      <button
        onClick={onClose}
        className="ml-1 flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
        aria-label="Dismiss notification"
      >
        ✕
      </button>
    </div>
  )
}
