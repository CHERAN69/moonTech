'use client'

import { useState, useEffect, useCallback } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { formatCurrency, cn } from '@/lib/utils'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

type PLItem    = { name: string; current: number; prior: number }
type PLSection = { category: string; items: PLItem[] }

type SessionRow = {
  id: string
  name: string
  period_start: string
  period_end: string
  status: string
  close_confidence_score: number
  matched_count: number
  unmatched_count: number
  flagged_count: number
  total_matched_amount: number
  created_at: string
}

// ─── P&L data per period ─────────────────────────────────────────────────────

const PL_BY_PERIOD: Record<string, PLSection[]> = {
  'Apr 2026': [
    { category: 'Revenue', items: [
      { name: 'SaaS Subscriptions',    current: 142_000, prior: 120_000 },
      { name: 'Professional Services', current:  28_000, prior:  24_000 },
    ]},
    { category: 'Cost of Revenue', items: [
      { name: 'Cloud Infrastructure', current: 18_200, prior: 14_800 },
      { name: 'Customer Success',     current: 12_400, prior: 11_000 },
    ]},
    { category: 'Operating Expenses', items: [
      { name: 'Sales & Marketing',        current: 34_000, prior: 28_000 },
      { name: 'Research & Development',   current: 52_000, prior: 48_000 },
      { name: 'General & Administrative', current: 18_000, prior: 16_000 },
    ]},
  ],
  'Mar 2026': [
    { category: 'Revenue', items: [
      { name: 'SaaS Subscriptions',    current: 127_000, prior: 110_000 },
      { name: 'Professional Services', current:  21_000, prior:  18_000 },
    ]},
    { category: 'Cost of Revenue', items: [
      { name: 'Cloud Infrastructure', current: 16_400, prior: 14_100 },
      { name: 'Customer Success',     current: 11_200, prior: 10_400 },
    ]},
    { category: 'Operating Expenses', items: [
      { name: 'Sales & Marketing',        current: 31_000, prior: 26_000 },
      { name: 'Research & Development',   current: 49_000, prior: 45_000 },
      { name: 'General & Administrative', current: 16_800, prior: 15_200 },
    ]},
  ],
  'Feb 2026': [
    { category: 'Revenue', items: [
      { name: 'SaaS Subscriptions',    current: 114_000, prior:  98_000 },
      { name: 'Professional Services', current:  17_500, prior:  14_000 },
    ]},
    { category: 'Cost of Revenue', items: [
      { name: 'Cloud Infrastructure', current: 14_800, prior: 12_600 },
      { name: 'Customer Success',     current: 10_400, prior:  9_600 },
    ]},
    { category: 'Operating Expenses', items: [
      { name: 'Sales & Marketing',        current: 28_500, prior: 24_000 },
      { name: 'Research & Development',   current: 46_500, prior: 43_000 },
      { name: 'General & Administrative', current: 15_500, prior: 14_800 },
    ]},
  ],
  'Jan 2026': [
    { category: 'Revenue', items: [
      { name: 'SaaS Subscriptions',    current: 108_000, prior:  92_000 },
      { name: 'Professional Services', current:  15_000, prior:  12_500 },
    ]},
    { category: 'Cost of Revenue', items: [
      { name: 'Cloud Infrastructure', current: 14_100, prior: 11_800 },
      { name: 'Customer Success',     current:  9_800, prior:  9_200 },
    ]},
    { category: 'Operating Expenses', items: [
      { name: 'Sales & Marketing',        current: 26_000, prior: 22_500 },
      { name: 'Research & Development',   current: 44_000, prior: 41_000 },
      { name: 'General & Administrative', current: 15_000, prior: 14_200 },
    ]},
  ],
  'Q1 2026': [
    { category: 'Revenue', items: [
      { name: 'SaaS Subscriptions',    current: 349_000, prior: 300_000 },
      { name: 'Professional Services', current:  53_500, prior:  44_500 },
    ]},
    { category: 'Cost of Revenue', items: [
      { name: 'Cloud Infrastructure', current: 45_300, prior: 38_500 },
      { name: 'Customer Success',     current: 31_400, prior: 29_200 },
    ]},
    { category: 'Operating Expenses', items: [
      { name: 'Sales & Marketing',        current:  85_500, prior:  72_500 },
      { name: 'Research & Development',   current: 139_500, prior: 129_000 },
      { name: 'General & Administrative', current:  47_300, prior:  44_000 },
    ]},
  ],
}

const PL_PERIODS = Object.keys(PL_BY_PERIOD)

// ─── AR Aging demo data ───────────────────────────────────────────────────────

type AgingRow = {
  customer: string
  current: number
  d1_30: number
  d31_60: number
  d61_90: number
  d90plus: number
}

const AR_AGING_DATA: AgingRow[] = [
  { customer: 'Bright Systems Inc.',    current: 28_000, d1_30: 8_500,  d31_60: 0,      d61_90: 0,      d90plus: 0      },
  { customer: 'Nexon Capital Group',    current: 12_000, d1_30: 12_000, d31_60: 6_200,  d61_90: 0,      d90plus: 0      },
  { customer: 'Vertex Analytics',       current: 45_000, d1_30: 0,      d31_60: 0,      d61_90: 18_000, d90plus: 4_800  },
  { customer: 'CloudPath Technologies', current: 19_500, d1_30: 19_500, d31_60: 0,      d61_90: 0,      d90plus: 0      },
  { customer: 'Delta Services LLC',     current:  8_000, d1_30: 0,      d31_60: 8_000,  d61_90: 5_500,  d90plus: 12_300 },
  { customer: 'Iris Consulting',        current: 32_000, d1_30: 14_000, d31_60: 0,      d61_90: 0,      d90plus: 0      },
]

// ─── Demo sessions ────────────────────────────────────────────────────────────


// ─── Report cards ─────────────────────────────────────────────────────────────

type ReportCard = { id: string; title: string; desc: string; icon: string; badge?: string; exportType?: string }

const REPORT_CARDS: ReportCard[] = [
  { id: 'pl',          title: 'P&L Statement',      desc: 'Profit & loss vs prior period with variance analysis', icon: '📊', exportType: 'close_summary' },
  { id: 'close',       title: 'Close Summary',       desc: 'Reconciliation sessions and close confidence scores',  icon: '✅', exportType: 'close_summary' },
  { id: 'ar_aging',    title: 'AR Aging Report',     desc: 'Outstanding receivables by age bucket',               icon: '📥' },
  { id: 'audit_trail', title: 'Audit Trail Export',  desc: 'Full transaction history with AI decisions',          icon: '🔍', exportType: 'audit_trail' },
  { id: 'reconcile',   title: 'Reconciliation Data', desc: 'All matched, unmatched, and flagged transactions',     icon: '🔄', exportType: 'reconciliation' },
  { id: 'board_pack',  title: 'Board Pack',          desc: 'P&L + Cash Flow + KPIs formatted for board review',   icon: '🎯', badge: 'Growth+' },
]

// ─── Small components ─────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="p-16 flex flex-col items-center gap-3 text-gray-400 text-sm">
      <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
      Loading…
    </div>
  )
}

function EmptyState({ icon, title, sub }: { icon: string; title: string; sub?: string }) {
  return (
    <div className="p-16 text-center">
      <div className="text-4xl mb-3">{icon}</div>
      <div className="text-sm font-medium text-gray-700">{title}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  )
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="mx-6 mt-4 mb-2 rounded-xl px-4 py-3 text-sm flex items-center gap-3 bg-red-50 text-red-700 border border-red-100">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
      <span className="flex-1">{message}</span>
      {onRetry && (
        <button onClick={onRetry} className="text-xs font-medium underline opacity-80 hover:opacity-100">Retry</button>
      )}
    </div>
  )
}

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [onClose])
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

// ─── P&L Panel ───────────────────────────────────────────────────────────────

function PLPanel({ onExport }: { onExport: (type: string, format?: string) => void }) {
  const [period, setPeriod] = useState('Apr 2026')
  const sections = PL_BY_PERIOD[period]

  const revenue  = sections[0].items.reduce((s, i) => s + i.current, 0)
  const cogs     = sections[1].items.reduce((s, i) => s + i.current, 0)
  const opex     = sections[2].items.reduce((s, i) => s + i.current, 0)
  const netInc   = revenue - cogs - opex
  const pRevenue = sections[0].items.reduce((s, i) => s + i.prior, 0)
  const pCogs    = sections[1].items.reduce((s, i) => s + i.prior, 0)
  const pOpex    = sections[2].items.reduce((s, i) => s + i.prior, 0)
  const pNetInc  = pRevenue - pCogs - pOpex

  return (
    <div className="bg-white rounded-2xl border border-gray-100" id="report-pl">
      <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-gray-900">Profit & Loss</h2>
          <p className="text-xs text-gray-400 mt-0.5">vs. prior period · Illustrative demo data</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={e => setPeriod(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs outline-none focus:border-blue-400 bg-white"
          >
            {PL_PERIODS.map(p => <option key={p}>{p}</option>)}
          </select>
          <button
            onClick={() => onExport('close_summary', 'csv')}
            className="px-3 py-1.5 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >↓ CSV</button>
          <button
            onClick={() => onExport('close_summary', 'excel')}
            className="px-3 py-1.5 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >↓ Excel</button>
          <button
            onClick={() => onExport('close_summary', 'pdf')}
            className="px-3 py-1.5 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >↓ PDF</button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[560px]">
          {sections.map(section => {
            const sTotal   = section.items.reduce((s, i) => s + i.current, 0)
            const pTotal   = section.items.reduce((s, i) => s + i.prior, 0)
            const variance = sTotal - pTotal
            return (
              <div key={section.category}>
                <div className="px-6 py-2 bg-gray-50 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-gray-400">
                  <span>{section.category}</span>
                  <div className="flex gap-6 pr-1">
                    <span className="w-24 text-right">Current</span>
                    <span className="w-24 text-right">Prior</span>
                    <span className="w-28 text-right">Variance</span>
                  </div>
                </div>
                {section.items.map(item => {
                  const v    = item.current - item.prior
                  const vPct = item.prior !== 0 ? Math.round((v / item.prior) * 100) : 0
                  return (
                    <div key={item.name} className="px-6 py-3 flex items-center justify-between border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                      <span className="text-sm text-gray-700 pl-4">{item.name}</span>
                      <div className="flex gap-6 text-sm">
                        <span className="w-24 text-right font-medium">{formatCurrency(item.current)}</span>
                        <span className="w-24 text-right text-gray-400">{formatCurrency(item.prior)}</span>
                        <span className={cn('w-28 text-right font-medium', v >= 0 ? 'text-green-600' : 'text-red-500')}>
                          {v >= 0 ? '+' : ''}{formatCurrency(v)} ({v >= 0 ? '+' : ''}{vPct}%)
                        </span>
                      </div>
                    </div>
                  )
                })}
                <div className="px-6 py-3 flex items-center justify-between bg-gray-50/80">
                  <span className="text-sm font-semibold text-gray-700 pl-4">Total {section.category}</span>
                  <div className="flex gap-6 text-sm">
                    <span className="w-24 text-right font-bold">{formatCurrency(sTotal)}</span>
                    <span className="w-24 text-right text-gray-400">{formatCurrency(pTotal)}</span>
                    <span className={cn('w-28 text-right font-bold', variance >= 0 ? 'text-green-600' : 'text-red-500')}>
                      {variance >= 0 ? '+' : ''}{formatCurrency(variance)}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}

          <div className="px-6 py-5 border-t-2 border-gray-200 flex items-center justify-between">
            <span className="font-bold text-gray-900 pl-4">Net Income</span>
            <div className="flex gap-6 text-sm">
              <span className={cn('w-24 text-right font-bold text-lg', netInc >= 0 ? 'text-green-600' : 'text-red-500')}>
                {formatCurrency(netInc)}
              </span>
              <span className="w-24 text-right text-gray-400">{formatCurrency(pNetInc)}</span>
              <span className={cn('w-28 text-right font-bold', (netInc - pNetInc) >= 0 ? 'text-green-600' : 'text-red-500')}>
                {(netInc - pNetInc) >= 0 ? '+' : ''}{formatCurrency(netInc - pNetInc)}
                {pNetInc !== 0 && ` (${(netInc - pNetInc) >= 0 ? '+' : ''}${Math.round(((netInc - pNetInc) / Math.abs(pNetInc)) * 100)}%)`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Close Summary Panel ──────────────────────────────────────────────────────

function ClosePanel({
  sessions, loading, error, onRetry, onExport,
}: {
  sessions: SessionRow[]
  loading: boolean
  error: string | null
  onRetry: () => void
  onExport: (type: string, format?: string) => void
}) {
  const [statusFilter, setStatus] = useState('all')
  const [search,       setSearch] = useState('')
  const [dateFrom,     setFrom]   = useState('')
  const [dateTo,       setTo]     = useState('')

  const filtered = sessions.filter(s => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false
    if (dateFrom && s.period_end < dateFrom) return false
    if (dateTo   && s.period_start > dateTo) return false
    return true
  })

  return (
    <div className="bg-white rounded-2xl border border-gray-100">
      <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-gray-900">Close Summary</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {`${sessions.length} session${sessions.length !== 1 ? 's' : ''} loaded`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={e => setStatus(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs outline-none focus:border-blue-400 bg-white"
          >
            <option value="all">All statuses</option>
            <option value="complete">Complete</option>
            <option value="processing">Processing</option>
            <option value="error">Error</option>
          </select>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search sessions…"
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs outline-none focus:border-blue-400 w-36"
          />
          <input type="date" value={dateFrom} onChange={e => setFrom(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs outline-none focus:border-blue-400" />
          <span className="text-gray-300 text-xs">–</span>
          <input type="date" value={dateTo} onChange={e => setTo(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs outline-none focus:border-blue-400" />
          <button
            onClick={() => onExport('close_summary', 'csv')}
            className="px-3 py-1.5 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >↓ CSV</button>
          <button
            onClick={() => onExport('close_summary', 'excel')}
            className="px-3 py-1.5 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >↓ Excel</button>
          <button
            onClick={() => onExport('close_summary', 'pdf')}
            className="px-3 py-1.5 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >↓ PDF</button>
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={onRetry} />}

      {loading ? <Spinner /> : filtered.length === 0 ? (
        <EmptyState icon="📊" title="No sessions found" sub="Run a reconciliation to see results here." />
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-12 gap-2 px-6 py-2 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wide">
              <div className="col-span-4">Name</div>
              <div className="col-span-2 text-center">Period</div>
              <div className="col-span-1 text-center">Score</div>
              <div className="col-span-2 text-center">Matched</div>
              <div className="col-span-2 text-center">Issues</div>
              <div className="col-span-1 text-right">Status</div>
            </div>
            {filtered.map(s => {
              const scoreColor = s.close_confidence_score >= 80 ? '#16A34A' : s.close_confidence_score >= 50 ? '#D97706' : '#DC2626'
              return (
                <div key={s.id} className="grid grid-cols-12 gap-2 px-6 py-4 border-b border-gray-50 hover:bg-gray-50/60 transition-colors items-center">
                  <div className="col-span-4">
                    <div className="text-sm font-medium text-gray-800 truncate">{s.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{formatCurrency(s.total_matched_amount)} matched</div>
                  </div>
                  <div className="col-span-2 text-xs text-gray-500 text-center">
                    {s.period_start?.slice(5)} – {s.period_end?.slice(5)}
                  </div>
                  <div className="col-span-1 text-center">
                    <span className="text-lg font-bold" style={{ color: scoreColor }}>{s.close_confidence_score}</span>
                  </div>
                  <div className="col-span-2 text-center">
                    <div className="text-sm font-medium text-green-600">{s.matched_count.toLocaleString()}</div>
                    <div className="text-xs text-gray-400">transactions</div>
                  </div>
                  <div className="col-span-2 text-center text-xs">
                    {s.unmatched_count > 0 && <div className="text-red-500 font-medium">{s.unmatched_count} unmatched</div>}
                    {s.flagged_count   > 0 && <div className="text-amber-500">{s.flagged_count} flagged</div>}
                    {s.unmatched_count === 0 && s.flagged_count === 0 && <div className="text-green-500">Clean</div>}
                  </div>
                  <div className="col-span-1 text-right">
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full font-medium',
                      s.status === 'complete'   ? 'bg-green-50 text-green-700' :
                      s.status === 'error'      ? 'bg-red-50 text-red-600'     :
                                                  'bg-blue-50 text-blue-600'
                    )}>
                      {s.status === 'processing' ? 'Active' : s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── AR Aging Panel ───────────────────────────────────────────────────────────

function ARAgingPanel() {
  const [bucket, setBucket] = useState('all')

  const totals = AR_AGING_DATA.reduce(
    (acc, r) => ({
      current: acc.current + r.current,
      d1_30:   acc.d1_30   + r.d1_30,
      d31_60:  acc.d31_60  + r.d31_60,
      d61_90:  acc.d61_90  + r.d61_90,
      d90plus: acc.d90plus + r.d90plus,
    }),
    { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90plus: 0 },
  )
  const grandTotal = Object.values(totals).reduce((s, v) => s + v, 0)

  const visible = bucket === 'all' ? AR_AGING_DATA : AR_AGING_DATA.filter(r => {
    if (bucket === 'current') return r.current > 0
    if (bucket === 'd1_30')   return r.d1_30 > 0
    if (bucket === 'd31_60')  return r.d31_60 > 0
    if (bucket === 'd61_90')  return r.d61_90 > 0
    if (bucket === 'd90plus') return r.d90plus > 0
    return true
  })

  return (
    <div className="bg-white rounded-2xl border border-gray-100">
      <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-gray-900">AR Aging Report</h2>
          <p className="text-xs text-gray-400 mt-0.5">Outstanding receivables · Demo data</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={bucket}
            onChange={e => setBucket(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs outline-none focus:border-blue-400 bg-white"
          >
            <option value="all">All buckets</option>
            <option value="current">Current (not due)</option>
            <option value="d1_30">1–30 days</option>
            <option value="d31_60">31–60 days</option>
            <option value="d61_90">61–90 days</option>
            <option value="d90plus">90+ days</option>
          </select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-gray-100 border-b border-gray-100">
        {[
          { label: 'Current',    value: totals.current, color: '#16A34A' },
          { label: '1–30 days',  value: totals.d1_30,   color: '#D97706' },
          { label: '31–60 days', value: totals.d31_60,  color: '#EA580C' },
          { label: '61–90 days', value: totals.d61_90,  color: '#DC2626' },
          { label: '90+ days',   value: totals.d90plus, color: '#7C2D12' },
        ].map(b => (
          <div key={b.label} className="bg-white px-4 py-3 text-center">
            <div className="text-xs text-gray-400 mb-1">{b.label}</div>
            <div className="text-sm font-bold" style={{ color: b.value > 0 ? b.color : '#9CA3AF' }}>
              {formatCurrency(b.value)}
            </div>
          </div>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState icon="✅" title="No customers in this bucket" sub="Select a different age range." />
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-12 gap-2 px-6 py-2 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wide">
              <div className="col-span-3">Customer</div>
              <div className="col-span-1 text-right">Total</div>
              <div className="col-span-2 text-right">Current</div>
              <div className="col-span-2 text-right">1–30d</div>
              <div className="col-span-1 text-right">31–60d</div>
              <div className="col-span-1 text-right">61–90d</div>
              <div className="col-span-2 text-right">90+d</div>
            </div>
            {visible.map(r => {
              const rowTotal = r.current + r.d1_30 + r.d31_60 + r.d61_90 + r.d90plus
              return (
                <div key={r.customer} className="grid grid-cols-12 gap-2 px-6 py-3 border-b border-gray-50 hover:bg-gray-50/60 transition-colors items-center text-sm">
                  <div className="col-span-3 font-medium text-gray-800 truncate">{r.customer}</div>
                  <div className="col-span-1 text-right font-bold text-gray-900">{formatCurrency(rowTotal)}</div>
                  <div className="col-span-2 text-right text-green-700">{r.current > 0 ? formatCurrency(r.current) : '—'}</div>
                  <div className="col-span-2 text-right text-amber-600">{r.d1_30 > 0 ? formatCurrency(r.d1_30) : '—'}</div>
                  <div className="col-span-1 text-right text-orange-600">{r.d31_60 > 0 ? formatCurrency(r.d31_60) : '—'}</div>
                  <div className="col-span-1 text-right text-red-600">{r.d61_90 > 0 ? formatCurrency(r.d61_90) : '—'}</div>
                  <div className="col-span-2 text-right font-medium text-red-800">{r.d90plus > 0 ? formatCurrency(r.d90plus) : '—'}</div>
                </div>
              )
            })}
            <div className="grid grid-cols-12 gap-2 px-6 py-3 bg-gray-50 border-t-2 border-gray-200 items-center text-sm font-bold">
              <div className="col-span-3 text-gray-700">Total</div>
              <div className="col-span-1 text-right text-gray-900">{formatCurrency(grandTotal)}</div>
              <div className="col-span-2 text-right text-green-700">{formatCurrency(totals.current)}</div>
              <div className="col-span-2 text-right text-amber-600">{formatCurrency(totals.d1_30)}</div>
              <div className="col-span-1 text-right text-orange-600">{formatCurrency(totals.d31_60)}</div>
              <div className="col-span-1 text-right text-red-600">{formatCurrency(totals.d61_90)}</div>
              <div className="col-span-2 text-right text-red-800">{formatCurrency(totals.d90plus)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Reconciliation Data Panel ────────────────────────────────────────────────

function ReconcilePanel({ onExport, exporting }: { onExport: (type: string, format?: string) => void; exporting: string | null }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">Reconciliation Data Export</h2>
          <p className="text-xs text-gray-400 mt-0.5">All match pairs across all sessions</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onExport('reconciliation', 'csv')}
            disabled={!!exporting}
            className="px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >↓ CSV</button>
          <button
            onClick={() => onExport('reconciliation', 'excel')}
            disabled={!!exporting}
            className="px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >↓ Excel</button>
          <button
            onClick={() => onExport('reconciliation', 'pdf')}
            disabled={!!exporting}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: '#1E3A5F' }}
          >↓ PDF</button>
        </div>
      </div>
      <div className="p-10 text-center text-gray-400 text-sm space-y-3">
        <div className="text-4xl">📂</div>
        <p>This export includes all matched, unmatched, flagged, and duplicate transaction pairs.</p>
        <p className="text-xs">Fields: ID · status · resolution · confidence · match method · GL category · bank & invoice details · flags · notes · reviewed at.</p>
        <div className="flex justify-center gap-3 pt-1">
          <button onClick={() => onExport('reconciliation', 'csv')}
            className="px-5 py-2 rounded-xl font-medium text-gray-600 text-sm border border-gray-200 hover:bg-gray-50 transition-colors">CSV</button>
          <button onClick={() => onExport('reconciliation', 'excel')}
            className="px-5 py-2 rounded-xl font-medium text-gray-600 text-sm border border-gray-200 hover:bg-gray-50 transition-colors">Excel</button>
          <button onClick={() => onExport('reconciliation', 'pdf')}
            className="px-5 py-2 rounded-xl font-medium text-white text-sm transition-opacity hover:opacity-90"
            style={{ background: '#2E75B6' }}>PDF</button>
        </div>
      </div>
    </div>
  )
}

// ─── Audit Trail Panel ────────────────────────────────────────────────────────

function AuditPanel({ onExport }: { onExport: (type: string, format?: string) => void }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">Audit Trail Export</h2>
          <p className="text-xs text-gray-400 mt-0.5">Complete history of all actions and AI decisions</p>
        </div>
        <div className="flex gap-2">
          <Link href="/audit" className="px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            View in Audit Trail →
          </Link>
          <button onClick={() => onExport('audit_trail', 'csv')}
            className="px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">↓ CSV</button>
          <button onClick={() => onExport('audit_trail', 'excel')}
            className="px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">↓ Excel</button>
          <button onClick={() => onExport('audit_trail', 'pdf')}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ background: '#1E3A5F' }}>↓ PDF</button>
        </div>
      </div>
      <div className="p-10 text-center text-gray-400 text-sm space-y-3">
        <div className="text-4xl">🔍</div>
        <p>This export includes every approval, rejection, edit, note, and AI interaction logged in ClosePilot.</p>
        <p className="text-xs">Fields: ID · entity type · entity ID · action · actor email · AI involved · changes · timestamp.</p>
      </div>
    </div>
  )
}

// ─── Board Pack Panel ─────────────────────────────────────────────────────────

function BoardPackPanel() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900">Board Pack</h2>
        <p className="text-xs text-gray-400 mt-0.5">P&L + Cash Flow + KPIs formatted for board review</p>
      </div>
      <div className="p-12 text-center space-y-4">
        <div className="text-4xl">🔒</div>
        <div className="text-sm font-medium text-gray-700">Available on Growth plan and above</div>
        <p className="text-xs text-gray-400 max-w-xs mx-auto">Board Pack generates a presentation-ready PDF with executive summary, P&L, cash flow, and KPI dashboard.</p>
        <Link
          href="/settings"
          className="inline-block px-6 py-2.5 rounded-xl font-medium text-white text-sm transition-opacity hover:opacity-90"
          style={{ background: '#2E75B6' }}
        >
          Upgrade to Growth →
        </Link>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [activeReport, setActive] = useState('pl')
  const [sessions,    setSessions] = useState<SessionRow[]>([])
  const [loading,     setLoading]  = useState(false)
  const [fetchError,  setFetchErr] = useState<string | null>(null)
  const [isDemo,      setIsDemo]   = useState(false)  // true when not authenticated
  const [toast,       setToast]    = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [exporting,   setExporting] = useState<string | null>(null)

  const fetchSessions = useCallback(async () => {
    setLoading(true)
    setFetchErr(null)
    try {
      const res = await fetch('/api/reconcile')
      if (res.status === 401) { setIsDemo(true); return }
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      const json = await res.json()
      setSessions(json.sessions ?? [])
      setIsDemo(false)
    } catch (e) {
      setFetchErr(e instanceof Error ? e.message : 'Failed to load sessions')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Eager-load sessions so Close Summary is ready when selected
    fetchSessions()
  }, [fetchSessions])

  const handleExport = async (type: string, format = 'csv') => {
    const key = `${type}-${format}`
    setExporting(key)
    try {
      window.open(`/api/reports/export?type=${type}&format=${format}`, '_blank')
      setToast({ message: `${format.toUpperCase()} export started — check your downloads.`, type: 'success' })
    } catch {
      setToast({ message: 'Export failed. Please try again.', type: 'error' })
    } finally {
      setExporting(null)
    }
  }

  const handleCardAction = (card: ReportCard) => {
    if (card.badge === 'Growth+') {
      setActive('board_pack')
      return
    }
    setActive(card.id)
  }

  // Derive summary stats from real (or demo) sessions
  const totalSessions   = sessions.length
  const avgConfidence   = totalSessions > 0 ? Math.round(sessions.reduce((s, r) => s + r.close_confidence_score, 0) / totalSessions) : 0
  const totalMatched    = sessions.reduce((s, r) => s + r.total_matched_amount, 0)
  const openIssues      = sessions.reduce((s, r) => s + r.unmatched_count + r.flagged_count, 0)

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Reports"
        subtitle="Financial reporting, exports, and reconciliation summaries"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport('cfo_summary', 'excel')}
              disabled={exporting === 'cfo_summary-excel'}
              className="px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {exporting === 'cfo_summary-excel' ? '…' : '↓ CFO Excel'}
            </button>
            <button
              onClick={() => handleExport('cfo_summary', 'pdf')}
              disabled={exporting === 'cfo_summary-pdf'}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: '#1E3A5F' }}
            >
              {exporting === 'cfo_summary-pdf' ? '…' : '↓ CFO PDF'}
            </button>
          </div>
        }
      />

      <div className="flex-1 p-6 space-y-5">
        {/* Auth banner */}
        {isDemo && !fetchError && (
          <div className="rounded-xl px-4 py-3 text-sm flex items-center gap-2 bg-amber-50 text-amber-700">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            Sign in to load your reconciliation data and enable exports.
          </div>
        )}

        {/* Error banner */}
        {fetchError && (
          <div className="rounded-xl px-4 py-3 text-sm flex items-center gap-3 bg-red-50 text-red-700 border border-red-100">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            <span className="flex-1">{fetchError}</span>
            <button onClick={fetchSessions} className="text-xs font-medium underline opacity-80 hover:opacity-100">Retry</button>
          </div>
        )}

        {/* Summary stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Sessions',        value: totalSessions.toString() },
            { label: 'Avg Close Score', value: `${avgConfidence}%` },
            { label: 'Total Matched',   value: formatCurrency(totalMatched) },
            { label: 'Open Issues',     value: openIssues.toString() },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-100 px-4 py-3">
              <div className="text-xs text-gray-400 mb-1">{stat.label}</div>
              <div className="text-lg font-bold text-gray-900">{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Report cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {REPORT_CARDS.map(card => (
            <div
              key={card.id}
              className={cn(
                'bg-white rounded-2xl border p-5 hover:border-gray-200 transition-all cursor-pointer',
                activeReport === card.id ? 'border-blue-300 ring-2 ring-blue-50' : 'border-gray-100'
              )}
              onClick={() => handleCardAction(card)}
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-2xl">{card.icon}</span>
                {card.badge && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: '#EFF6FF', color: '#2E75B6' }}>{card.badge}</span>
                )}
              </div>
              <h3 className="font-semibold text-gray-900 mb-1 text-sm">{card.title}</h3>
              <p className="text-xs text-gray-400 mb-4 leading-relaxed">{card.desc}</p>
              <div className="flex gap-2">
                <button
                  onClick={e => { e.stopPropagation(); handleCardAction(card) }}
                  className="flex-1 py-2 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-90"
                  style={{ background: '#1E3A5F' }}
                >
                  {card.badge ? '🔒 Upgrade' : 'View'}
                </button>
                {card.exportType && !card.badge && (
                  <button
                    onClick={e => { e.stopPropagation(); handleExport(card.exportType!, 'csv') }}
                    disabled={exporting === `${card.exportType}-csv`}
                    className="px-3 py-2 rounded-lg text-xs font-medium text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    {exporting === `${card.exportType}-csv` ? '…' : '↓ CSV'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Active panel */}
        {activeReport === 'pl'          && <PLPanel onExport={handleExport} />}
        {activeReport === 'close'       && (
          <ClosePanel
            sessions={sessions}
            loading={loading}
            error={fetchError}
            onRetry={fetchSessions}
            onExport={handleExport}
          />
        )}
        {activeReport === 'ar_aging'   && <ARAgingPanel />}
        {activeReport === 'reconcile'  && <ReconcilePanel onExport={handleExport} exporting={exporting} />}
        {activeReport === 'audit_trail' && <AuditPanel onExport={handleExport} />}
        {activeReport === 'board_pack' && <BoardPackPanel />}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
