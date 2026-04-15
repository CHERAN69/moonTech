'use client'

import React from 'react'

interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
  onError?: (error: Error, info: React.ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.props.onError?.(error, info)
    // Report to Sentry if available
    if (typeof window !== 'undefined' && (window as unknown as { Sentry?: { captureException: (e: Error) => void } }).Sentry) {
      (window as unknown as { Sentry: { captureException: (e: Error) => void } }).Sentry.captureException(error)
    }
  }

  reset = () => this.setState({ hasError: false, error: null })

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Something went wrong</h2>
          <p className="text-xs text-gray-500 mb-4 max-w-xs">
            {this.state.error?.message ?? 'An unexpected error occurred.'}
          </p>
          <button
            onClick={this.reset}
            className="px-4 py-2 text-xs font-medium text-white rounded-lg"
            style={{ background: '#1E3A5F' }}
          >
            Try again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

/** Wraps a page section with an error boundary and a scoped fallback. */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  displayName?: string
): React.FC<P> {
  const Wrapped: React.FC<P> = (props) => (
    <ErrorBoundary>
      <Component {...props} />
    </ErrorBoundary>
  )
  Wrapped.displayName = `WithErrorBoundary(${displayName ?? Component.displayName ?? Component.name})`
  return Wrapped
}
