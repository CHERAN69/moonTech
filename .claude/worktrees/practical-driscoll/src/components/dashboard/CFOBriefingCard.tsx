'use client'

import type { CFOBriefing } from '@/lib/openai/analyze'

interface Props {
  metrics: {
    cashPosition: number
    monthlyBurn: number
    cashRunwayMonths: number
    openAnomalies: number
    closeConfidenceScore: number
    arAgingTotal: number
    apAgingTotal: number
    pendingJournalEntries?: number
    daysToClose?: number
    matchedRate?: number
    totalReconciledAmount?: number
  }
  briefingOverride?: (CFOBriefing & { briefing_date?: string }) | null
}

export function CFOBriefingCard({ briefingOverride }: Props) {
  const briefing = briefingOverride

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-gray-900 text-sm">AI CFO Briefing</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {briefing?.briefing_date
              ? `${today} · Refreshes daily`
              : today}
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: '#EFF6FF', color: '#2E75B6' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" aria-hidden="true"></span>
          AI Generated
        </div>
      </div>

      {!briefing ? (
        <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
          No briefing yet — one will be generated momentarily.
        </div>
      ) : (
        <>
          {/* Headline */}
          <div className="px-4 py-3 rounded-xl mb-4 border-l-4" style={{ background: '#F8FAFC', borderLeftColor: '#1E3A5F' }}>
            <p className="text-sm font-medium text-gray-800 leading-relaxed">{briefing.headline}</p>
          </div>

          {/* Bullets */}
          <div className="flex-1 space-y-2 mb-4">
            {(briefing.bullets ?? []).map((b, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: '#2E75B6' }} aria-hidden="true"></span>
                <p className="text-xs text-gray-600 leading-relaxed">{b}</p>
              </div>
            ))}
          </div>

          {/* Risk alerts */}
          {(briefing.risk_alerts ?? []).length > 0 && (
            <div className="px-3 py-2.5 rounded-xl mb-4 flex items-start gap-2" style={{ background: '#FEF2F2' }} role="alert">
              <span className="text-sm mt-0.5" aria-hidden="true">⚠️</span>
              <p className="text-xs font-medium" style={{ color: '#B91C1C' }}>{briefing.risk_alerts[0]}</p>
            </div>
          )}

          {/* Actions */}
          {(briefing.recommended_actions ?? []).length > 0 && (
            <div className="border-t border-gray-100 pt-3">
              <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Recommended Actions Today</p>
              <div className="space-y-1.5">
                {briefing.recommended_actions!.map((a, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-xs font-bold mt-0.5 flex-shrink-0" style={{ color: '#2E75B6' }} aria-hidden="true">{i + 1}.</span>
                    <p className="text-xs text-gray-600 leading-relaxed">{a}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
