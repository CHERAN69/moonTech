'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { computeReportReadiness, ReportType } from '@/lib/reports/readiness'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReportCardDef {
  id: ReportType
  title: string
  description: string
  icon: string
  exportType?: string
  badge?: string
}

interface ReadinessMetrics {
  unmatchedCount: number
  pendingJournalEntries: number
  checklistComplete: boolean
  hasData: boolean
}

// ─── Report definitions ───────────────────────────────────────────────────────

const REPORT_CARDS: ReportCardDef[] = [
  {
    id: 'pl',
    title: 'P&L Statement',
    description: 'Profit & loss vs prior period with variance analysis.',
    icon: '📊',
    exportType: 'close_summary',
  },
  {
    id: 'close_summary',
    title: 'Close Summary',
    description: 'Reconciliation sessions and close confidence scores.',
    icon: '✅',
    exportType: 'close_summary',
  },
  {
    id: 'ar_aging',
    title: 'AR Aging',
    description: 'Outstanding receivables by age bucket.',
    icon: '📥',
  },
  {
    id: 'reconciliation',
    title: 'Reconciliation Detail',
    description: 'All matched, unmatched, and flagged transactions.',
    icon: '🔄',
    exportType: 'reconciliation',
  },
  {
    id: 'audit_trail',
    title: 'Audit Trail',
    description: 'Full transaction history with AI decisions.',
    icon: '🔍',
    exportType: 'audit_trail',
  },
  {
    id: 'board_pack',
    title: 'Board Pack',
    description: 'P&L + Cash Flow + KPIs formatted for board review.',
    icon: '🎯',
    badge: 'Growth+',
  },
]

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div className={cn(
      'fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium',
      type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
    )}>
      {type === 'success' ? '✓' : '✗'} {message}
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">✕</button>
    </div>
  )
}

// ─── Readiness Bar ────────────────────────────────────────────────────────────

function ReadinessBar({ percentage }: { percentage: number }) {
  const color = percentage >= 80 ? '#16A34A' : percentage >= 60 ? '#D97706' : '#DC2626'
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
      <div
        className="h-1.5 rounded-full transition-all duration-500"
        style={{ width: `${percentage}%`, background: color }}
      />
    </div>
  )
}

// ─── Report Card ──────────────────────────────────────────────────────────────

function ReportCard({
  card,
  metrics,
  onExportCSV,
  onExportPDF,
  exporting,
}: {
  card: ReportCardDef
  metrics: ReadinessMetrics
  onExportCSV: (type: string) => void
  onExportPDF: (type: string) => void
  exporting: string | null
}) {
  const isLocked   = card.badge === 'Growth+'
  const readiness  = computeReportReadiness(card.id, metrics)
  const pct        = readiness.percentage
  const pctColor   = pct >= 80 ? 'text-green-600' : pct >= 60 ? 'text-amber-500' : 'text-red-500'

  // Retrieve last-generated timestamp from localStorage (initialise lazily to avoid SSR mismatch)
  const [lastGenerated, setLastGenerated] = useState<string | null>(() => {
    try { return localStorage.getItem(`report_last_gen_${card.id}`) } catch { return null }
  })

  const handleCSV = () => {
    if (isLocked || !card.exportType) return
    try { localStorage.setItem(`report_last_gen_${card.id}`, new Date().toISOString()) } catch { /* ignore */ }
    setLastGenerated(new Date().toISOString())
    onExportCSV(card.exportType)
  }

  const handlePDF = () => {
    if (isLocked) return
    try { localStorage.setItem(`report_last_gen_${card.id}`, new Date().toISOString()) } catch { /* ignore */ }
    setLastGenerated(new Date().toISOString())
    onExportPDF(card.id)
  }

  const formattedLastGen = lastGenerated
    ? new Date(lastGenerated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Never'

  const isGenerateDisabled = isLocked || readiness.percentage < 100
  const firstBlocker       = readiness.blockers[0]

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col hover:border-gray-200 transition-all">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl select-none">{card.icon}</span>
        {card.badge && (
          <span
            className="text-xs px-2 py-0.5 rounded-full font-semibold"
            style={{ background: '#EFF6FF', color: '#2563EB' }}
          >
            {card.badge}
          </span>
        )}
      </div>

      {/* Title + description */}
      <h3 className="font-semibold text-gray-900 text-sm mb-1">{card.title}</h3>
      <p className="text-xs text-gray-400 leading-relaxed mb-4 flex-1">{card.description}</p>

      {/* Readiness */}
      {!isLocked && (
        <div className="mb-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Readiness</span>
            <span className={cn('font-bold', pctColor)}>{pct}%</span>
          </div>
          <ReadinessBar percentage={pct} />
          {readiness.blockers.length > 0 && (
            <ul className="space-y-0.5 mt-1">
              {readiness.blockers.map((b, i) => (
                <li key={i} className="text-[10px] text-amber-600 flex items-start gap-1">
                  <span className="mt-0.5 flex-shrink-0">⚠</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Last generated */}
      <p className="text-[10px] text-gray-300 mb-3">
        Last generated: <span className="text-gray-400 font-medium">{formattedLastGen}</span>
      </p>

      {/* Actions */}
      {isLocked ? (
        <div className="mt-auto">
          <button
            disabled
            title="Upgrade to Growth+ to unlock"
            className="w-full py-2 rounded-xl text-xs font-medium text-gray-400 bg-gray-50 border border-gray-200 cursor-not-allowed"
          >
            🔒 Upgrade to Growth+ to unlock
          </button>
        </div>
      ) : (
        <div className="mt-auto flex gap-2">
          {/* Generate Report button */}
          <button
            disabled={isGenerateDisabled}
            title={isGenerateDisabled && firstBlocker ? firstBlocker : undefined}
            onClick={handlePDF}
            className={cn(
              'flex-1 py-2 rounded-xl text-xs font-medium text-white transition-opacity',
              isGenerateDisabled
                ? 'opacity-40 cursor-not-allowed'
                : 'hover:opacity-90 cursor-pointer'
            )}
            style={{ background: '#1E3A5F' }}
          >
            Generate Report
          </button>

          {/* CSV export */}
          {card.exportType && (
            <button
              onClick={handleCSV}
              disabled={exporting === card.exportType}
              title="Export as CSV"
              className="px-3 py-2 rounded-xl text-xs font-medium text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {exporting === card.exportType ? '…' : '↓ CSV'}
            </button>
          )}

          {/* PDF export */}
          <button
            onClick={handlePDF}
            disabled={isGenerateDisabled}
            title={isGenerateDisabled && firstBlocker ? `Cannot export: ${firstBlocker}` : 'Export as PDF'}
            className={cn(
              'px-3 py-2 rounded-xl text-xs font-medium border transition-colors',
              isGenerateDisabled
                ? 'text-gray-300 border-gray-100 cursor-not-allowed'
                : 'text-gray-500 border-gray-200 hover:bg-gray-50'
            )}
          >
            ↓ PDF
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Loading skeleton grid ────────────────────────────────────────────────────

function ReportCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
          <div className="flex justify-between items-start">
            <Skeleton className="w-8 h-8 rounded-lg" />
            <Skeleton className="w-14 h-4 rounded-full" />
          </div>
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
          <div className="pt-2 space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-8" />
            </div>
            <Skeleton className="h-1.5 w-full rounded-full" />
          </div>
          <div className="flex gap-2 pt-1">
            <Skeleton className="flex-1 h-8 rounded-xl" />
            <Skeleton className="w-14 h-8 rounded-xl" />
            <Skeleton className="w-14 h-8 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const router = useRouter()

  const [metrics, setMetrics]       = useState<ReadinessMetrics | null>(null)
  const [loading, setLoading]       = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [exporting, setExporting]   = useState<string | null>(null)
  const [toast, setToast]           = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const fetchMetrics = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const [exceptionsRes, journalRes, checklistRes, reconcileRes] = await Promise.allSettled([
        fetch('/api/exceptions?resolution=pending&limit=1'),
        fetch('/api/journal-entries?status=draft&status=pending_approval&limit=1'),
        fetch('/api/close-checklist'),
        fetch('/api/reconcile'),
      ])

      // Unmatched count
      let unmatchedCount = 0
      if (exceptionsRes.status === 'fulfilled' && exceptionsRes.value.ok) {
        const json = await exceptionsRes.value.json()
        unmatchedCount = json.total ?? json.count ?? (json.items?.length ?? 0)
      }

      // Pending journal entries
      let pendingJournalEntries = 0
      if (journalRes.status === 'fulfilled' && journalRes.value.ok) {
        const json = await journalRes.value.json()
        pendingJournalEntries = json.total ?? json.count ?? (json.entries?.length ?? 0)
      }

      // Close checklist
      let checklistComplete = false
      if (checklistRes.status === 'fulfilled' && checklistRes.value.ok) {
        const json = await checklistRes.value.json()
        const latest = Array.isArray(json) ? json[0] : (json.checklist ?? json)
        checklistComplete = Boolean(latest?.signed_off_by || latest?.status === 'signed_off')
      }

      // Has data (any reconciliation sessions exist)
      let hasData = false
      if (reconcileRes.status === 'fulfilled' && reconcileRes.value.ok) {
        const json = await reconcileRes.value.json()
        hasData = (json.sessions ?? json.data ?? []).length > 0
      }

      setMetrics({ unmatchedCount, pendingJournalEntries, checklistComplete, hasData })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load report metrics'
      setFetchError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMetrics() }, [fetchMetrics])

  const handleExportCSV = (type: string) => {
    setExporting(type)
    try {
      window.open(`/api/reports/export?type=${type}`, '_blank')
      setToast({ message: 'CSV export started — check your downloads.', type: 'success' })
    } catch {
      setToast({ message: 'Export failed. Please try again.', type: 'error' })
    } finally {
      setExporting(null)
    }
  }

  const handleExportPDF = (type: string) => {
    window.open(`/api/reports/pdf?type=${type}`, '_blank')
    setToast({ message: 'PDF report opened in a new tab.', type: 'success' })
  }

  // While loading
  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <TopBar
          title="Reports"
          subtitle="Financial reporting, exports, and reconciliation summaries"
        />
        <div className="flex-1 p-6">
          <ReportCardsSkeleton />
        </div>
      </div>
    )
  }

  // On error
  if (fetchError) {
    return (
      <div className="flex flex-col h-full">
        <TopBar
          title="Reports"
          subtitle="Financial reporting, exports, and reconciliation summaries"
        />
        <div className="flex-1 p-6 flex items-center justify-center">
          <ErrorState
            title="Could not load report status"
            message={fetchError}
            onRetry={fetchMetrics}
          />
        </div>
      </div>
    )
  }

  // No data yet
  if (metrics && !metrics.hasData) {
    return (
      <div className="flex flex-col h-full">
        <TopBar
          title="Reports"
          subtitle="Financial reporting, exports, and reconciliation summaries"
        />
        <div className="flex-1 p-6 flex items-center justify-center">
          <EmptyState
            icon="📂"
            title="Upload data to generate reports"
            description="Start by uploading bank statements or invoices. Reports will become available once data has been reconciled."
            action={{
              label: 'Go to Inbox',
              onClick: () => router.push('/inbox'),
            }}
          />
        </div>
      </div>
    )
  }

  const safeMetrics: ReadinessMetrics = metrics ?? {
    unmatchedCount: 0,
    pendingJournalEntries: 0,
    checklistComplete: false,
    hasData: false,
  }

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Reports"
        subtitle="Financial reporting, exports, and reconciliation summaries"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExportCSV('reconciliation')}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
              style={{ background: '#2E75B6' }}
            >
              ↓ Export Data
            </button>
          </div>
        }
      />

      <div className="flex-1 p-6 space-y-5">
        {/* Blocker callout — shown when unmatched transactions are blocking reports */}
        {safeMetrics.unmatchedCount > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="text-amber-500 mt-0.5 flex-shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </span>
              <div>
                <p className="text-sm font-semibold text-amber-800">
                  {safeMetrics.unmatchedCount} unmatched transaction{safeMetrics.unmatchedCount === 1 ? '' : 's'} blocking reports
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Reports require all exceptions to be resolved. Go to Review, then approve or reject each pending item.
                </p>
              </div>
            </div>
            <a
              href="/review?resolution=pending"
              className="flex-shrink-0 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: '#D97706' }}
            >
              Go to Review →
            </a>
          </div>
        )}

        {/* Readiness overview banner */}
        <div className="bg-white rounded-2xl border border-gray-100 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-800">Report Readiness Overview</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Fix blockers below to unlock report generation.
              </p>
            </div>
            <div className="flex flex-wrap gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  'w-2 h-2 rounded-full',
                  safeMetrics.unmatchedCount === 0 ? 'bg-green-500' : 'bg-red-400'
                )} />
                <span className="text-gray-500">
                  {safeMetrics.unmatchedCount === 0
                    ? 'No unmatched transactions'
                    : (
                      <a href="/review?resolution=pending" className="text-red-500 font-medium hover:underline">
                        {safeMetrics.unmatchedCount} unmatched — resolve in Review
                      </a>
                    )}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  'w-2 h-2 rounded-full',
                  safeMetrics.pendingJournalEntries === 0 ? 'bg-green-500' : 'bg-amber-400'
                )} />
                <span className="text-gray-500">
                  {safeMetrics.pendingJournalEntries === 0
                    ? 'Journal entries up to date'
                    : `${safeMetrics.pendingJournalEntries} pending JEs`}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  'w-2 h-2 rounded-full',
                  safeMetrics.checklistComplete ? 'bg-green-500' : 'bg-amber-400'
                )} />
                <span className="text-gray-500">
                  {safeMetrics.checklistComplete ? 'Checklist complete' : 'Checklist incomplete'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Report cards grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {REPORT_CARDS.map(card => (
            <ReportCard
              key={card.id}
              card={card}
              metrics={safeMetrics}
              onExportCSV={handleExportCSV}
              onExportPDF={handleExportPDF}
              exporting={exporting}
            />
          ))}
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}
