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
    <div className="rounded-2xl p-6 h-full flex flex-col" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>AI CFO Briefing</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Saturday, April 11, 2026 · Updated daily at 8:00 AM</p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: 'var(--info-bg)', color: 'var(--brand)' }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--brand)' }}></span>
          AI Generated
        </div>
      </div>

      <div className="px-4 py-3 rounded-xl mb-4" style={{ background: 'var(--bg-tertiary)', borderLeft: '4px solid var(--brand)' }}>
        <p className="text-sm font-medium leading-relaxed" style={{ color: 'var(--text-primary)' }}>{DEMO_BRIEFING.headline}</p>
      </div>

      <div className="flex-1 space-y-2 mb-4">
        {DEMO_BRIEFING.bullets.map((b, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: 'var(--brand)' }}></span>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{b}</p>
          </div>
        ))}
      </div>

      {DEMO_BRIEFING.risk_alerts.length > 0 && (
        <div className="px-3 py-2.5 rounded-xl mb-4 flex items-start gap-2" style={{ background: 'var(--error-bg)', border: '1px solid var(--error-border)' }}>
          <span className="text-sm mt-0.5" style={{ color: 'var(--error)' }}>!</span>
          <p className="text-xs font-medium" style={{ color: 'var(--error)' }}>{DEMO_BRIEFING.risk_alerts[0]}</p>
        </div>
      )}

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>Recommended Actions Today</p>
        <div className="space-y-1.5">
          {DEMO_BRIEFING.recommended_actions.map((a, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-xs font-bold mt-0.5 flex-shrink-0" style={{ color: 'var(--brand)' }}>{i + 1}.</span>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
