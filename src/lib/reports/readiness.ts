export type ReportType = 'pl' | 'close_summary' | 'ar_aging' | 'reconciliation' | 'audit_trail' | 'board_pack'

export interface ReadinessMetrics {
  unmatchedCount: number
  pendingJournalEntries: number
  checklistComplete: boolean
  hasData: boolean
}

export interface ReadinessResult {
  percentage: number
  blockers: string[]
}

export function computeReportReadiness(type: ReportType, metrics: ReadinessMetrics): ReadinessResult {
  const blockers: string[] = []

  if (!metrics.hasData) {
    return { percentage: 0, blockers: ['No data uploaded yet'] }
  }

  if (metrics.unmatchedCount > 0) {
    blockers.push(`${metrics.unmatchedCount} unmatched transaction${metrics.unmatchedCount === 1 ? '' : 's'} need${metrics.unmatchedCount === 1 ? 's' : ''} review`)
  }

  if (metrics.pendingJournalEntries > 0) {
    blockers.push(`${metrics.pendingJournalEntries} journal entr${metrics.pendingJournalEntries === 1 ? 'y' : 'ies'} pending approval`)
  }

  if ((type === 'close_summary' || type === 'board_pack') && !metrics.checklistComplete) {
    blockers.push('Close checklist not complete')
  }

  const totalBlockers = blockers.length
  if (totalBlockers === 0) return { percentage: 100, blockers: [] }

  // Rough percentage: each blocker type reduces readiness
  const maxPenalty = type === 'board_pack' ? 3 : 2
  const penalty = Math.min(totalBlockers, maxPenalty)
  const percentage = Math.max(0, Math.round(100 - (penalty / maxPenalty) * 100))

  return { percentage, blockers }
}
