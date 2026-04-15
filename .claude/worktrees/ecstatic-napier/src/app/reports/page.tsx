'use client'

import { useState, useEffect, useCallback } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { formatCurrency, cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type ReportCard = {
  id: string
  title: string
  desc: string
  icon: string
  badge?: string
  exportType?: string
}

type PLItem = { name: string; current: number; prior: number }
type PLSection = { category: string; items: PLItem[] }

// ─── Static P&L data (replace with Supabase query in production) ─────────────

const PL_DATA: PLSection[] = [
  {
    category: 'Revenue',
    items: [
      { name: 'SaaS Subscriptions',    current: 142000, prior: 120000 },
      { name: 'Professional Services', current:  28000, prior:  24000 },
    ],
  },
  {
    category: 'Cost of Revenue',
    items: [
      { name: 'Cloud Infrastructure', current: 18200, prior: 14800 },
      { name: 'Customer Success',     current: 12400, prior: 11000 },
    ],
  },
  {
    category: 'Operating Expenses',
    items: [
      { name: 'Sales & Marketing',          current: 34000, prior: 28000 },
      { name: 'Research & Development',     current: 52000, prior: 48000 },
      { name: 'General & Administrative',   current: 18000, prior: 16000 },
    ],
  },
]

const REPORT_CARDS: ReportCard[] = [
  { id: 'pl',          title: 'P&L Statement',      desc: 'Profit & loss vs prior period with variance analysis', icon: '📊', exportType: 'close_summary' },
  { id: 'close',       title: 'Close Summary',       desc: 'Reconciliation sessions and close confidence scores',  icon: '✅', exportType: 'close_summary' },
  { id: 'ar_aging',    title: 'AR Aging Report',     desc: 'Outstanding receivables by age bucket',               icon: '📥' },
  { id: 'audit_trail', title: 'Audit Trail Export',  desc: 'Full transaction history with AI decisions',          icon: '🔍', exportType: 'audit_trail' },
  { id: 'reconcile',   title: 'Reconciliation Data', desc: 'All matched, unmatched, and flagged transactions',     icon: '🔄', exportType: 'reconciliation' },
  { id: 'board_pack',  title: 'Board Pack',          desc: 'P&L + Cash Flow + KPIs formatted for board review',   icon: '🎯', badge: 'Growth+' },
]

// ─── Reconciliation Session row (loaded from API) ─────────────────────────────

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

const DEMO_SESSIONS: SessionRow[] = [
  { id: '1', name: 'March 2026 Bank Reconciliation',     period_start: '2026-03-01', period_end: '2026-03-31', status: 'complete',     close_confidence_score: 91, matched_count: 234, unmatched_count: 8,  flagged_count: 4,  total_matched_amount: 284750, created_at: '2026-04-02' },
  { id: '2', name: 'February 2026 Bank Reconciliation',  period_start: '2026-02-01', period_end: '2026-02-28', status: 'complete',     close_confidence_score: 88, matched_count: 198, unmatched_count: 12, flagged_count: 2,  total_matched_amount: 241000, created_at: '2026-03-03' },
  { id: '3', name: 'April 2026 — Stripe Payouts',        period_start: '2026-04-01', period_end: '2026-04-10', status: 'in_progress',  close_confidence_score: 73, matched_count:  87, unmatched_count:  4, flagged_count: 12, total_matched_amount:  98600, created_at: '2026-04-11' },
  { id: '4', name: 'Q1 2026 Invoice Reconciliation',     period_start: '2026-01-01', period_end: '2026-03-31', status: 'complete',     close_confidence_score: 94, matched_count: 512, unmatched_count: 22, flagged_count: 8,  total_matched_amount: 762400, created_at: '2026-04-01' },
]

// ─── Toast ────────────────────────────────────────────────────────────────────

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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [activeReport, setActiveReport]   = useState<string | null>(null)
  const [sessions, setSessions]           = useState<SessionRow[]>([])
  const [sessionsLoading, setLoading]     = useState(false)
  const [isDemo, setIsDemo]               = useState(false)
  const [toast, setToast]                 = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [exporting, setExporting]         = useState<string | null>(null)

  // Filter state for P&L
  const [plPeriod, setPlPeriod] = useState('Apr 2026')

  // Filter state for sessions report
  const [statusFilter, setStatusFilter] = useState('all')
  const [sessionSearch, setSearch]      = useState('')

  const fetchSessions = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/reconcile')
      if (res.status === 401) { setSessions(DEMO_SESSIONS); setIsDemo(true); return }
      if (!res.ok) throw new Error()
      const json = await res.json()
      setSessions(json.sessions ?? DEMO_SESSIONS)
    } catch {
      setSessions(DEMO_SESSIONS)
      setIsDemo(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSessions() }, [fetchSessions])

  const handleExport = async (type: string, format = 'csv') => {
    if (isDemo && type !== 'audit_trail' && type !== 'close_summary') {
      setToast({ message: 'Export available after connecting Supabase.', type: 'error' })
      return
    }
    setExporting(type)
    try {
      const url = `/api/reports/export?type=${type}&format=${format}`
      window.open(url, '_blank')
      setToast({ message: 'Export started — check your downloads.', type: 'success' })
    } catch {
      setToast({ message: 'Export failed. Please try again.', type: 'error' })
    } finally {
      setExporting(null)
    }
  }

  const handleCardAction = (card: ReportCard) => {
    if (card.badge === 'Growth+') {
      setToast({ message: 'Board Pack available on Growth plan and above.', type: 'error' })
      return
    }
    setActiveReport(card.id)
    if (card.id === 'close') fetchSessions()
  }

  const handlePrintPDF = () => {
    window.print()
    setToast({ message: 'Print dialog opened — select "Save as PDF" as the printer.', type: 'success' })
  }

  // Filtered sessions
  const filteredSessions = sessions.filter(s => {
    const matchStatus = statusFilter === 'all' || s.status === statusFilter
    const matchSearch = !sessionSearch || s.name.toLowerCase().includes(sessionSearch.toLowerCase())
    return matchStatus && matchSearch
  })

  // P&L net income calc
  const plRevenue  = PL_DATA[0].items.reduce((s, i) => s + i.current, 0)
  const plCOGS     = PL_DATA[1].items.reduce((s, i) => s + i.current, 0)
  const plOpEx     = PL_DATA[2].items.reduce((s, i) => s + i.current, 0)
  const plNetInc   = plRevenue - plCOGS - plOpEx
  const priorRev   = PL_DATA[0].items.reduce((s, i) => s + i.prior, 0)
  const priorCOGS  = PL_DATA[1].items.reduce((s, i) => s + i.prior, 0)
  const priorOpEx  = PL_DATA[2].items.reduce((s, i) => s + i.prior, 0)
  const priorNetInc = priorRev - priorCOGS - priorOpEx

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Reports"
        subtitle="Financial reporting, exports, and reconciliation summaries"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintPDF}
              className="px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              🖨 Print / PDF
            </button>
            <button
              onClick={() => handleExport('reconciliation')}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
              style={{ background: '#2E75B6' }}
            >
              ↓ Export Data
            </button>
          </div>
        }
      />

      <div className="flex-1 p-6 space-y-5">
        {isDemo && (
          <div className="rounded-xl px-4 py-3 text-sm flex items-center gap-2" style={{ background: '#EFF6FF', color: '#1D4ED8' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            <strong>Demo mode</strong> — Connect Supabase to load live sessions and enable full exports.
          </div>
        )}

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
                    onClick={e => { e.stopPropagation(); handleExport(card.exportType!) }}
                    disabled={exporting === card.exportType}
                    className="px-3 py-2 rounded-lg text-xs font-medium text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    {exporting === card.exportType ? '…' : '↓ CSV'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* ── P&L View ──────────────────────────────────────────────────── */}
        {(activeReport === 'pl' || !activeReport) && (
          <div className="bg-white rounded-2xl border border-gray-100" id="report-pl">
            <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-gray-900">Profit & Loss</h2>
                <p className="text-xs text-gray-400 mt-0.5">vs. prior period</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={plPeriod}
                  onChange={e => setPlPeriod(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs outline-none focus:border-blue-400 bg-white"
                >
                  {['Apr 2026','Mar 2026','Feb 2026','Jan 2026','Q1 2026'].map(p => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
                <button
                  onClick={() => handleExport('close_summary')}
                  className="px-3 py-1.5 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >↓ CSV</button>
                <button
                  onClick={handlePrintPDF}
                  className="px-3 py-1.5 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >↓ PDF</button>
              </div>
            </div>

            <div>
              {PL_DATA.map(section => {
                const sTotal  = section.items.reduce((s, i) => s + i.current, 0)
                const pTotal  = section.items.reduce((s, i) => s + i.prior, 0)
                const variance = sTotal - pTotal
                return (
                  <div key={section.category}>
                    <div className="px-6 py-2 bg-gray-50 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-gray-400">
                      <span>{section.category}</span>
                      <div className="flex gap-8 pr-1">
                        <span className="w-24 text-right">Current</span>
                        <span className="w-24 text-right">Prior</span>
                        <span className="w-28 text-right">Variance</span>
                      </div>
                    </div>
                    {section.items.map(item => {
                      const v    = item.current - item.prior
                      const vPct = Math.round((v / item.prior) * 100)
                      return (
                        <div key={item.name} className="px-6 py-3 flex items-center justify-between border-b border-gray-50 hover:bg-gray-50 transition-colors">
                          <span className="text-sm text-gray-700 pl-4">{item.name}</span>
                          <div className="flex gap-8 text-sm">
                            <span className="w-24 text-right font-medium">{formatCurrency(item.current)}</span>
                            <span className="w-24 text-right text-gray-400">{formatCurrency(item.prior)}</span>
                            <span className={cn('w-28 text-right font-medium', v > 0 ? 'text-green-600' : 'text-red-500')}>
                              {v > 0 ? '+' : ''}{formatCurrency(v)} ({v > 0 ? '+' : ''}{vPct}%)
                            </span>
                          </div>
                        </div>
                      )
                    })}
                    <div className="px-6 py-3 flex items-center justify-between bg-gray-50">
                      <span className="text-sm font-semibold text-gray-700 pl-4">Total {section.category}</span>
                      <div className="flex gap-8 text-sm">
                        <span className="w-24 text-right font-bold">{formatCurrency(sTotal)}</span>
                        <span className="w-24 text-right text-gray-400">{formatCurrency(pTotal)}</span>
                        <span className={cn('w-28 text-right font-bold', variance > 0 ? 'text-green-600' : 'text-red-500')}>
                          {variance > 0 ? '+' : ''}{formatCurrency(variance)}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}

              <div className="px-6 py-5 border-t-2 border-gray-200 flex items-center justify-between">
                <span className="font-bold text-gray-900 pl-4">Net Income</span>
                <div className="flex gap-8 text-sm">
                  <span className={cn('w-24 text-right font-bold text-lg', plNetInc >= 0 ? 'text-green-600' : 'text-red-500')}>
                    {formatCurrency(plNetInc)}
                  </span>
                  <span className="w-24 text-right text-gray-400">{formatCurrency(priorNetInc)}</span>
                  <span className={cn('w-28 text-right font-bold', (plNetInc - priorNetInc) >= 0 ? 'text-green-600' : 'text-red-500')}>
                    {(plNetInc - priorNetInc) >= 0 ? '+' : ''}{formatCurrency(plNetInc - priorNetInc)}
                    {' '}({Math.round(((plNetInc - priorNetInc) / Math.abs(priorNetInc)) * 100)}%)
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Close Summary View ─────────────────────────────────────────── */}
        {activeReport === 'close' && (
          <div className="bg-white rounded-2xl border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-gray-900">Close Summary</h2>
                <p className="text-xs text-gray-400 mt-0.5">All reconciliation sessions</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs outline-none focus:border-blue-400 bg-white"
                >
                  <option value="all">All statuses</option>
                  <option value="complete">Complete</option>
                  <option value="in_progress">In Progress</option>
                  <option value="error">Error</option>
                </select>
                <input
                  type="text"
                  value={sessionSearch}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search sessions…"
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs outline-none focus:border-blue-400 w-40"
                />
                <button
                  onClick={() => handleExport('close_summary')}
                  className="px-3 py-1.5 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  ↓ CSV
                </button>
              </div>
            </div>

            {sessionsLoading ? (
              <div className="p-12 text-center text-gray-400 text-sm">
                <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
                Loading sessions…
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-4xl mb-3">📊</div>
                <div className="text-sm font-medium text-gray-700">No sessions found</div>
                <div className="text-xs text-gray-400 mt-1">Run a reconciliation to see results here.</div>
              </div>
            ) : (
              <>
                {/* Table header */}
                <div className="grid grid-cols-12 gap-2 px-6 py-2 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  <div className="col-span-4">Name</div>
                  <div className="col-span-2 text-center">Period</div>
                  <div className="col-span-1 text-center">Score</div>
                  <div className="col-span-2 text-center">Matched</div>
                  <div className="col-span-2 text-center">Issues</div>
                  <div className="col-span-1 text-right">Status</div>
                </div>
                {filteredSessions.map(s => {
                  const scoreColor = s.close_confidence_score >= 80 ? '#16A34A' : s.close_confidence_score >= 50 ? '#D97706' : '#DC2626'
                  return (
                    <div key={s.id} className="grid grid-cols-12 gap-2 px-6 py-4 border-b border-gray-50 hover:bg-gray-50 transition-colors items-center">
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
                        {s.flagged_count > 0   && <div className="text-amber-500">{s.flagged_count} flagged</div>}
                        {s.unmatched_count === 0 && s.flagged_count === 0 && <div className="text-green-500">Clean</div>}
                      </div>
                      <div className="col-span-1 text-right">
                        <span className={cn(
                          'text-xs px-2 py-0.5 rounded-full font-medium',
                          s.status === 'complete' ? 'bg-green-50 text-green-700' :
                          s.status === 'error'    ? 'bg-red-50 text-red-600'     :
                                                    'bg-blue-50 text-blue-600'
                        )}>
                          {s.status === 'in_progress' ? 'Active' : s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </>
            )}
          </div>
        )}

        {/* ── Reconciliation Data View ───────────────────────────────────── */}
        {activeReport === 'reconcile' && (
          <div className="bg-white rounded-2xl border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">Reconciliation Data Export</h2>
                <p className="text-xs text-gray-400 mt-0.5">All match pairs across all sessions</p>
              </div>
              <button
                onClick={() => handleExport('reconciliation')}
                disabled={!!exporting}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: '#1E3A5F' }}
              >
                {exporting === 'reconciliation' ? 'Exporting…' : '↓ Download CSV'}
              </button>
            </div>
            <div className="p-8 text-center text-gray-400 text-sm space-y-3">
              <div className="text-4xl">📂</div>
              <p>This export includes all matched, unmatched, flagged, and duplicate transaction pairs.</p>
              <p className="text-xs">Fields: ID, status, resolution, confidence, match method, GL category, bank & invoice details, flags, notes, reviewed at.</p>
              <button
                onClick={() => handleExport('reconciliation')}
                className="px-6 py-2.5 rounded-xl font-medium text-white text-sm transition-opacity hover:opacity-90"
                style={{ background: '#2E75B6' }}
              >
                Export All Reconciliation Data
              </button>
            </div>
          </div>
        )}

        {/* ── Audit Trail View ───────────────────────────────────────────── */}
        {activeReport === 'audit_trail' && (
          <div className="bg-white rounded-2xl border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">Audit Trail Export</h2>
                <p className="text-xs text-gray-400 mt-0.5">Complete history of all actions and AI decisions</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => window.location.href = '/audit'}
                  className="px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  View in Audit Trail →
                </button>
                <button
                  onClick={() => handleExport('audit_trail')}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
                  style={{ background: '#1E3A5F' }}
                >
                  ↓ Download CSV
                </button>
              </div>
            </div>
            <div className="p-8 text-center text-gray-400 text-sm space-y-3">
              <div className="text-4xl">🔍</div>
              <p>This export includes every approval, rejection, edit, note, and AI interaction logged in ClosePilot.</p>
              <p className="text-xs">Fields: ID, entity type, entity ID, action, AI involved, changes, IP address, timestamp.</p>
            </div>
          </div>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
