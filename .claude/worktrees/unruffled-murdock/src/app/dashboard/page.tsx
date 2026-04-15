'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { TopBar } from '@/components/layout/TopBar'
import { CloseConfidenceGauge } from '@/components/dashboard/CloseConfidenceGauge'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { CFOBriefingCard } from '@/components/dashboard/CFOBriefingCard'
import { RecentReconciliations } from '@/components/dashboard/RecentReconciliations'
import { QuickActions } from '@/components/dashboard/QuickActions'
import { formatCurrency } from '@/lib/utils'
import type { CFOBriefing } from '@/lib/openai/analyze'

interface DashboardData {
  metrics: {
    close_confidence_score: number
    open_anomalies: number
    pending_journal_entries: number
    unmatched_total: number
    days_since_last_close: number
    checklist_score: number
    checklist_signed_off: boolean
    cash_position: number
    monthly_burn: number
    runway_months: number
    ar_aging_total: number
    ap_aging_total: number
  }
  sessions: Array<{
    id: string
    name: string
    period_start: string
    period_end: string
    status: string
    close_confidence_score: number
    matched_count: number
    unmatched_count: number
    flagged_count: number
    created_at: string
  }>
  cfo_briefing: (CFOBriefing & { briefing_date?: string; headline: string; bullets: string[]; actions?: string[]; recommended_actions?: string[]; risk_alerts: string[] }) | null
}

export default function DashboardPage() {
  const [data, setData]             = useState<DashboardData | null>(null)
  const [loading, setLoading]       = useState(true)
  const [briefingLoading, setBrief] = useState(false)

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/dashboard')
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const generateBriefing = useCallback(async () => {
    setBrief(true)
    try {
      const res = await fetch('/api/cfo-briefing', { method: 'POST' })
      if (res.ok) {
        const json = await res.json()
        setData(prev => prev ? { ...prev, cfo_briefing: json.briefing } : prev)
      }
    } catch (err) {
      console.error('CFO briefing error:', err)
    } finally {
      setBrief(false)
    }
  }, [])

  useEffect(() => { fetchDashboard() }, [fetchDashboard])

  // Auto-generate briefing if not yet generated today
  useEffect(() => {
    if (data && !data.cfo_briefing && !briefingLoading) {
      generateBriefing()
    }
  }, [data, briefingLoading, generateBriefing])

  const score = data?.metrics.close_confidence_score ?? 0

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <TopBar title="Dashboard" subtitle="Loading…" />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  const m = data?.metrics
  const cashDisplay    = m?.cash_position    ? formatCurrency(m.cash_position)    : '—'
  const burnDisplay    = m?.monthly_burn     ? formatCurrency(m.monthly_burn)     : '—'
  const arDisplay      = m?.ar_aging_total   ? formatCurrency(m.ar_aging_total)   : '—'
  const apDisplay      = m?.ap_aging_total   ? formatCurrency(m.ap_aging_total)   : '—'

  // Normalise CFO briefing shape (DB stores recommended_actions as `actions`)
  const briefing = data?.cfo_briefing
    ? {
        ...data.cfo_briefing,
        recommended_actions: data.cfo_briefing.recommended_actions ?? data.cfo_briefing.actions ?? [],
      }
    : null

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Dashboard"
        subtitle={`${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })} close period`}
        closeScore={score}
        actions={
          <Link
            href="/reconcile"
            className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ background: '#2E75B6' }}
          >
            + New Reconciliation
          </Link>
        }
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Top Row: Gauge + CFO Briefing */}
        <div className="grid grid-cols-12 gap-5">
          <div className="col-span-4">
            <CloseConfidenceGauge score={score} />
          </div>
          <div className="col-span-8">
            {briefingLoading ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 flex items-center justify-center h-full min-h-[160px]">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Generating AI briefing…</p>
                </div>
              </div>
            ) : (
              <CFOBriefingCard
                metrics={{
                  closeConfidenceScore: score,
                  daysToClose: m?.days_since_last_close ?? 0,
                  openAnomalies: m?.open_anomalies ?? 0,
                  matchedRate: 0,
                  totalReconciledAmount: 0,
                  pendingJournalEntries: m?.pending_journal_entries ?? 0,
                  cashPosition: m?.cash_position ?? 0,
                  cashRunwayMonths: m?.runway_months ?? 0,
                  monthlyBurn: m?.monthly_burn ?? 0,
                  arAgingTotal: m?.ar_aging_total ?? 0,
                  apAgingTotal: m?.ap_aging_total ?? 0,
                }}
                briefingOverride={briefing}
              />
            )}
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-4 gap-4">
          <MetricCard
            title="Cash Position"
            value={cashDisplay}
            change={m?.cash_position ? 'Live balance' : 'Connect bank feed'}
            changeType={m?.cash_position ? 'positive' : 'neutral'}
            icon="💰"
            sub={m?.runway_months ? `${m.runway_months.toFixed(1)} months runway` : 'Runway unavailable'}
          />
          <MetricCard
            title="Monthly Burn"
            value={burnDisplay}
            change={m?.monthly_burn ? 'This month' : 'Connect bank feed'}
            changeType="neutral"
            icon="🔥"
            sub={m?.open_anomalies ? `${m.open_anomalies} open anomalies` : 'No anomalies'}
          />
          <MetricCard
            title="AR Outstanding"
            value={arDisplay}
            change={m?.ar_aging_total ? 'Review aging' : 'No AR data'}
            changeType={m?.ar_aging_total ? 'warning' : 'neutral'}
            icon="📥"
            sub={m?.pending_journal_entries ? `${m.pending_journal_entries} pending JEs` : 'No pending JEs'}
          />
          <MetricCard
            title="AP Outstanding"
            value={apDisplay}
            change={m?.ap_aging_total ? 'Review payables' : 'No AP data'}
            changeType="neutral"
            icon="📤"
            sub={m?.checklist_signed_off ? 'Close signed off ✓' : `Checklist: ${m?.checklist_score ?? 0}%`}
          />
        </div>

        {/* Bottom Row: Recent Activity + Quick Actions */}
        <div className="grid grid-cols-12 gap-5">
          <div className="col-span-8">
            <RecentReconciliations sessions={data?.sessions} />
          </div>
          <div className="col-span-4">
            <QuickActions
              anomalyCount={m?.open_anomalies ?? 0}
              journalCount={m?.pending_journal_entries ?? 0}
              closeScore={score}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
