import { TopBar } from '@/components/layout/TopBar'
import { CloseConfidenceGauge } from '@/components/dashboard/CloseConfidenceGauge'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { CFOBriefingCard } from '@/components/dashboard/CFOBriefingCard'
import { RecentReconciliations } from '@/components/dashboard/RecentReconciliations'
import { QuickActions } from '@/components/dashboard/QuickActions'
import Link from 'next/link'

const DEMO_METRICS = {
  closeConfidenceScore: 73,
  daysToClose: 4,
  openAnomalies: 12,
  matchedRate: 87,
  totalReconciledAmount: 284750,
  pendingJournalEntries: 5,
  cashPosition: 412000,
  cashRunwayMonths: 14.2,
  monthlyBurn: 29000,
  arAgingTotal: 88400,
  apAgingTotal: 43200,
}

export default function DashboardPage() {
  const score = DEMO_METRICS.closeConfidenceScore

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Dashboard"
        subtitle="April 2026 close period"
        closeScore={score}
        actions={
          <Link href="/reconcile" className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90" style={{ background: 'var(--brand)' }}>
            + New Reconciliation
          </Link>
        }
      />

      <div className="flex-1 p-6 space-y-6">
        <div className="grid grid-cols-12 gap-5">
          <div className="col-span-4">
            <CloseConfidenceGauge
              score={score}
              matchedRate={DEMO_METRICS.matchedRate}
              openAnomalies={DEMO_METRICS.openAnomalies}
              pendingJournals={DEMO_METRICS.pendingJournalEntries}
            />
          </div>
          <div className="col-span-8">
            <CFOBriefingCard metrics={DEMO_METRICS} />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <MetricCard title="Cash Position" value="$412,000" change="+$28,400 vs last month" changeType="positive" icon="💰" sub="14.2 months runway" />
          <MetricCard title="Monthly Burn" value="$29,000" change="+8% vs prior month" changeType="negative" icon="🔥" sub="Headcount largest driver" />
          <MetricCard title="AR Outstanding" value="$88,400" change="3 invoices overdue" changeType="warning" icon="📥" sub="Avg DSO: 42 days" />
          <MetricCard title="AP Outstanding" value="$43,200" change="2 due this week" changeType="neutral" icon="📤" sub="Avg DPO: 28 days" />
        </div>

        <div className="grid grid-cols-12 gap-5">
          <div className="col-span-8">
            <RecentReconciliations />
          </div>
          <div className="col-span-4">
            <QuickActions
              anomalyCount={DEMO_METRICS.openAnomalies}
              pendingJournals={DEMO_METRICS.pendingJournalEntries}
              closeScore={score}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
