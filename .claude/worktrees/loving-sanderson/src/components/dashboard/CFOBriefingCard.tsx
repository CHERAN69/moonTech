'use client'

interface Props {
  metrics: {
    cashPosition: number
    monthlyBurn: number
    cashRunwayMonths: number
    openAnomalies: number
    closeConfidenceScore: number
    arAgingTotal: number
    apAgingTotal: number
  }
}

// Static demo briefing — in production this is generated fresh by OpenAI each day
const DEMO_BRIEFING = {
  headline: 'Books are 73% close-ready with 12 anomalies requiring controller attention before sign-off.',
  bullets: [
    'Cash position of $412K gives 14.2 months of runway — burn increased 8% month-over-month, driven primarily by Q2 headcount additions.',
    '$88,400 in AR has aged past 30 days — 3 customers accounting for $54,200 should be prioritized for collections this week.',
    'Close confidence is being held at 73% by 5 pending journal entry approvals and 4 unmatched Stripe payouts totaling $12,400.',
  ],
  recommended_actions: [
    'Approve or reject the 5 drafted journal entries in CloseOS to advance the close score above 85.',
    'Investigate the 4 unmatched Stripe payouts from April 8–10 — likely the product launch promotion refunds.',
    'Send payment reminders to Acme Corp ($28,400) and BrightPath LLC ($14,800) — both 45+ days overdue.',
  ],
  risk_alerts: [
    'Burn rate trajectory projects a cash floor breach in month 11 if revenue growth stays flat — model a hiring pause scenario.',
  ],
}

export function CFOBriefingCard({ metrics }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-gray-900 text-sm">AI CFO Briefing</h2>
          <p className="text-xs text-gray-400 mt-0.5">Saturday, April 11, 2026 · Updated daily at 8:00 AM</p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: '#EFF6FF', color: '#2E75B6' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
          AI Generated
        </div>
      </div>

      {/* Headline */}
      <div className="px-4 py-3 rounded-xl mb-4 border-l-4" style={{ background: '#F8FAFC', borderLeftColor: '#1E3A5F' }}>
        <p className="text-sm font-medium text-gray-800 leading-relaxed">{DEMO_BRIEFING.headline}</p>
      </div>

      {/* Bullets */}
      <div className="flex-1 space-y-2 mb-4">
        {DEMO_BRIEFING.bullets.map((b, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: '#2E75B6' }}></span>
            <p className="text-xs text-gray-600 leading-relaxed">{b}</p>
          </div>
        ))}
      </div>

      {/* Risk alert */}
      {DEMO_BRIEFING.risk_alerts.length > 0 && (
        <div className="px-3 py-2.5 rounded-xl mb-4 flex items-start gap-2" style={{ background: '#FEF2F2' }}>
          <span className="text-sm mt-0.5">⚠️</span>
          <p className="text-xs font-medium" style={{ color: '#B91C1C' }}>{DEMO_BRIEFING.risk_alerts[0]}</p>
        </div>
      )}

      {/* Actions */}
      <div className="border-t border-gray-100 pt-3">
        <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Recommended Actions Today</p>
        <div className="space-y-1.5">
          {DEMO_BRIEFING.recommended_actions.map((a, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-xs font-bold mt-0.5 flex-shrink-0" style={{ color: '#2E75B6' }}>{i + 1}.</span>
              <p className="text-xs text-gray-600 leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
