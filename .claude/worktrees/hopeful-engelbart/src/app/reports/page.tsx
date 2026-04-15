'use client'

import { useState, useEffect, useCallback } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { formatCurrency, cn } from '@/lib/utils'

type ReportCard = { id: string; title: string; desc: string; icon: string; badge?: string; exportType?: string }
type PLItem = { name: string; current: number; prior: number }
type PLSection = { category: string; items: PLItem[] }

const PL_DATA: PLSection[] = [
  { category: 'Revenue', items: [
    { name: 'SaaS Subscriptions', current: 142000, prior: 120000 },
    { name: 'Professional Services', current: 28000, prior: 24000 },
  ]},
  { category: 'Cost of Revenue', items: [
    { name: 'Cloud Infrastructure', current: 18200, prior: 14800 },
    { name: 'Customer Success', current: 12400, prior: 11000 },
  ]},
  { category: 'Operating Expenses', items: [
    { name: 'Sales & Marketing', current: 34000, prior: 28000 },
    { name: 'Research & Development', current: 52000, prior: 48000 },
    { name: 'General & Administrative', current: 18000, prior: 16000 },
  ]},
]

const REPORT_CARDS: ReportCard[] = [
  { id: 'pl', title: 'P&L Statement', desc: 'Profit & loss vs prior period with variance analysis', icon: '📊', exportType: 'close_summary' },
  { id: 'close', title: 'Close Summary', desc: 'Reconciliation sessions and close confidence scores', icon: '✅', exportType: 'close_summary' },
  { id: 'ar_aging', title: 'AR Aging Report', desc: 'Outstanding receivables by age bucket', icon: '📥' },
  { id: 'audit_trail', title: 'Audit Trail Export', desc: 'Full transaction history with AI decisions', icon: '🔍', exportType: 'audit_trail' },
  { id: 'reconcile', title: 'Reconciliation Data', desc: 'All matched, unmatched, and flagged transactions', icon: '🔄', exportType: 'reconciliation' },
  { id: 'board_pack', title: 'Board Pack', desc: 'P&L + Cash Flow + KPIs formatted for board review', icon: '🎯', badge: 'Growth+' },
]

type SessionRow = { id: string; name: string; period_start: string; period_end: string; status: string; close_confidence_score: number; matched_count: number; unmatched_count: number; flagged_count: number; total_matched_amount: number; created_at: string }

const DEMO_SESSIONS: SessionRow[] = [
  { id: '1', name: 'March 2026 Bank Reconciliation', period_start: '2026-03-01', period_end: '2026-03-31', status: 'complete', close_confidence_score: 91, matched_count: 234, unmatched_count: 8, flagged_count: 4, total_matched_amount: 284750, created_at: '2026-04-02' },
  { id: '2', name: 'February 2026 Bank Reconciliation', period_start: '2026-02-01', period_end: '2026-02-28', status: 'complete', close_confidence_score: 88, matched_count: 198, unmatched_count: 12, flagged_count: 2, total_matched_amount: 241000, created_at: '2026-03-03' },
  { id: '3', name: 'April 2026 — Stripe Payouts', period_start: '2026-04-01', period_end: '2026-04-10', status: 'in_progress', close_confidence_score: 73, matched_count: 87, unmatched_count: 4, flagged_count: 12, total_matched_amount: 98600, created_at: '2026-04-11' },
  { id: '4', name: 'Q1 2026 Invoice Reconciliation', period_start: '2026-01-01', period_end: '2026-03-31', status: 'complete', close_confidence_score: 94, matched_count: 512, unmatched_count: 22, flagged_count: 8, total_matched_amount: 762400, created_at: '2026-04-01' },
]

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [onClose])
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white"
      style={{ background: type === 'success' ? 'var(--success)' : 'var(--error)', boxShadow: 'var(--shadow-lg)' }}>
      {type === 'success' ? '✓' : '✗'} {message}
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">✕</button>
    </div>
  )
}

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState<string | null>(null)
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [sessionsLoading, setLoading] = useState(false)
  const [isDemo, setIsDemo] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [exporting, setExporting] = useState<string | null>(null)
  const [plPeriod, setPlPeriod] = useState('Apr 2026')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sessionSearch, setSearch] = useState('')

  const fetchSessions = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/reconcile')
      if (res.status === 401) { setSessions(DEMO_SESSIONS); setIsDemo(true); return }
      if (!res.ok) throw new Error()
      const json = await res.json()
      setSessions(json.sessions ?? DEMO_SESSIONS)
    } catch { setSessions(DEMO_SESSIONS); setIsDemo(true) } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchSessions() }, [fetchSessions])

  const handleExport = async (type: string) => {
    setExporting(type)
    try {
      window.open(`/api/reports/export?type=${type}&format=csv`, '_blank')
      setToast({ message: 'Export started — check your downloads.', type: 'success' })
    } catch { setToast({ message: 'Export failed.', type: 'error' }) } finally { setExporting(null) }
  }

  const handleCardAction = (card: ReportCard) => {
    if (card.badge === 'Growth+') { setToast({ message: 'Board Pack available on Growth plan.', type: 'error' }); return }
    setActiveReport(card.id)
    if (card.id === 'close') fetchSessions()
  }

  const filteredSessions = sessions.filter(s => {
    const matchStatus = statusFilter === 'all' || s.status === statusFilter
    const matchSearch = !sessionSearch || s.name.toLowerCase().includes(sessionSearch.toLowerCase())
    return matchStatus && matchSearch
  })

  const plRevenue = PL_DATA[0].items.reduce((s, i) => s + i.current, 0)
  const plCOGS = PL_DATA[1].items.reduce((s, i) => s + i.current, 0)
  const plOpEx = PL_DATA[2].items.reduce((s, i) => s + i.current, 0)
  const plNetInc = plRevenue - plCOGS - plOpEx
  const priorRev = PL_DATA[0].items.reduce((s, i) => s + i.prior, 0)
  const priorCOGS = PL_DATA[1].items.reduce((s, i) => s + i.prior, 0)
  const priorOpEx = PL_DATA[2].items.reduce((s, i) => s + i.prior, 0)
  const priorNetInc = priorRev - priorCOGS - priorOpEx

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Reports" subtitle="Financial reporting, exports, and reconciliation summaries"
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => { window.print(); setToast({ message: 'Print dialog opened.', type: 'success' }) }}
              className="px-3 py-2 text-sm rounded-lg transition-colors" style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>Print / PDF</button>
            <button onClick={() => handleExport('reconciliation')} className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90" style={{ background: 'var(--brand)' }}>Export Data</button>
          </div>
        }
      />

      <div className="flex-1 p-6 space-y-5">
        {isDemo && (
          <div className="rounded-xl px-4 py-3 text-sm flex items-center gap-2" style={{ background: 'var(--info-bg)', color: 'var(--brand)' }}>
            <strong>Demo mode</strong> — Connect Supabase to load live data.
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {REPORT_CARDS.map(card => (
            <div key={card.id} className="rounded-2xl p-5 cursor-pointer transition-all"
              style={{ background: 'var(--bg-secondary)', border: activeReport === card.id ? '1px solid var(--brand)' : '1px solid var(--border)', boxShadow: activeReport === card.id ? 'var(--shadow-glow)' : 'none' }}
              onClick={() => handleCardAction(card)}>
              <div className="flex items-start justify-between mb-3">
                <span className="text-2xl">{card.icon}</span>
                {card.badge && <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--info-bg)', color: 'var(--brand)' }}>{card.badge}</span>}
              </div>
              <h3 className="font-semibold mb-1 text-sm" style={{ color: 'var(--text-primary)' }}>{card.title}</h3>
              <p className="text-xs mb-4 leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>{card.desc}</p>
              <div className="flex gap-2">
                <button onClick={e => { e.stopPropagation(); handleCardAction(card) }} className="flex-1 py-2 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-90" style={{ background: 'var(--brand)' }}>
                  {card.badge ? 'Upgrade' : 'View'}
                </button>
                {card.exportType && !card.badge && (
                  <button onClick={e => { e.stopPropagation(); handleExport(card.exportType!) }} disabled={exporting === card.exportType}
                    className="px-3 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                    style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>{exporting === card.exportType ? '…' : 'CSV'}</button>
                )}
              </div>
            </div>
          ))}
        </div>

        {(activeReport === 'pl' || !activeReport) && (
          <div className="rounded-2xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }} id="report-pl">
            <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <div>
                <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Profit & Loss</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>vs. prior period</p>
              </div>
              <div className="flex items-center gap-2">
                <select value={plPeriod} onChange={e => setPlPeriod(e.target.value)}
                  className="px-3 py-1.5 rounded-lg text-xs outline-none"
                  style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                  {['Apr 2026','Mar 2026','Feb 2026','Jan 2026','Q1 2026'].map(p => <option key={p}>{p}</option>)}
                </select>
                <button onClick={() => handleExport('close_summary')} className="px-3 py-1.5 text-xs font-medium rounded-lg"
                  style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>CSV</button>
              </div>
            </div>
            <div>
              {PL_DATA.map(section => {
                const sTotal = section.items.reduce((s, i) => s + i.current, 0)
                const pTotal = section.items.reduce((s, i) => s + i.prior, 0)
                const variance = sTotal - pTotal
                return (
                  <div key={section.category}>
                    <div className="px-6 py-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide"
                      style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                      <span>{section.category}</span>
                      <div className="flex gap-8 pr-1">
                        <span className="w-24 text-right">Current</span>
                        <span className="w-24 text-right">Prior</span>
                        <span className="w-28 text-right">Variance</span>
                      </div>
                    </div>
                    {section.items.map(item => {
                      const v = item.current - item.prior
                      const vPct = Math.round((v / item.prior) * 100)
                      return (
                        <div key={item.name} className="px-6 py-3 flex items-center justify-between transition-colors"
                          style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <span className="text-sm pl-4" style={{ color: 'var(--text-secondary)' }}>{item.name}</span>
                          <div className="flex gap-8 text-sm">
                            <span className="w-24 text-right font-medium" style={{ color: 'var(--text-primary)' }}>{formatCurrency(item.current)}</span>
                            <span className="w-24 text-right" style={{ color: 'var(--text-tertiary)' }}>{formatCurrency(item.prior)}</span>
                            <span className={cn('w-28 text-right font-medium')} style={{ color: v > 0 ? 'var(--success)' : 'var(--error)' }}>
                              {v > 0 ? '+' : ''}{formatCurrency(v)} ({v > 0 ? '+' : ''}{vPct}%)
                            </span>
                          </div>
                        </div>
                      )
                    })}
                    <div className="px-6 py-3 flex items-center justify-between" style={{ background: 'var(--bg-tertiary)' }}>
                      <span className="text-sm font-semibold pl-4" style={{ color: 'var(--text-primary)' }}>Total {section.category}</span>
                      <div className="flex gap-8 text-sm">
                        <span className="w-24 text-right font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(sTotal)}</span>
                        <span className="w-24 text-right" style={{ color: 'var(--text-tertiary)' }}>{formatCurrency(pTotal)}</span>
                        <span className="w-28 text-right font-bold" style={{ color: variance > 0 ? 'var(--success)' : 'var(--error)' }}>
                          {variance > 0 ? '+' : ''}{formatCurrency(variance)}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
              <div className="px-6 py-5 flex items-center justify-between" style={{ borderTop: '2px solid var(--border)' }}>
                <span className="font-bold pl-4" style={{ color: 'var(--text-primary)' }}>Net Income</span>
                <div className="flex gap-8 text-sm">
                  <span className="w-24 text-right font-bold text-lg" style={{ color: plNetInc >= 0 ? 'var(--success)' : 'var(--error)' }}>{formatCurrency(plNetInc)}</span>
                  <span className="w-24 text-right" style={{ color: 'var(--text-tertiary)' }}>{formatCurrency(priorNetInc)}</span>
                  <span className="w-28 text-right font-bold" style={{ color: (plNetInc - priorNetInc) >= 0 ? 'var(--success)' : 'var(--error)' }}>
                    {(plNetInc - priorNetInc) >= 0 ? '+' : ''}{formatCurrency(plNetInc - priorNetInc)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeReport === 'close' && (
          <div className="rounded-2xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <div>
                <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Close Summary</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>All reconciliation sessions</p>
              </div>
              <div className="flex items-center gap-2">
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-lg text-xs outline-none"
                  style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                  <option value="all">All statuses</option><option value="complete">Complete</option><option value="in_progress">In Progress</option>
                </select>
                <input type="text" value={sessionSearch} onChange={e => setSearch(e.target.value)} placeholder="Search sessions…"
                  className="px-3 py-1.5 rounded-lg text-xs outline-none w-40"
                  style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              </div>
            </div>
            {sessionsLoading ? (
              <div className="p-12 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
                <div className="w-8 h-8 rounded-full animate-spin mx-auto mb-3" style={{ border: '2px solid var(--border)', borderTopColor: 'var(--brand)' }} />Loading sessions…
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>No sessions found</div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Run a reconciliation to see results here.</div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-12 gap-2 px-6 py-2 text-xs font-semibold uppercase tracking-wide" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
                  <div className="col-span-4">Name</div><div className="col-span-2 text-center">Period</div>
                  <div className="col-span-1 text-center">Score</div><div className="col-span-2 text-center">Matched</div>
                  <div className="col-span-2 text-center">Issues</div><div className="col-span-1 text-right">Status</div>
                </div>
                {filteredSessions.map(s => {
                  const scoreColor = s.close_confidence_score >= 80 ? 'var(--success)' : s.close_confidence_score >= 50 ? 'var(--warning)' : 'var(--error)'
                  return (
                    <div key={s.id} className="grid grid-cols-12 gap-2 px-6 py-4 items-center transition-colors" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <div className="col-span-4">
                        <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{s.name}</div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{formatCurrency(s.total_matched_amount)} matched</div>
                      </div>
                      <div className="col-span-2 text-xs text-center" style={{ color: 'var(--text-secondary)' }}>{s.period_start?.slice(5)} – {s.period_end?.slice(5)}</div>
                      <div className="col-span-1 text-center"><span className="text-lg font-bold" style={{ color: scoreColor }}>{s.close_confidence_score}</span></div>
                      <div className="col-span-2 text-center">
                        <div className="text-sm font-medium" style={{ color: 'var(--success)' }}>{s.matched_count.toLocaleString()}</div>
                        <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>transactions</div>
                      </div>
                      <div className="col-span-2 text-center text-xs">
                        {s.unmatched_count > 0 && <div style={{ color: 'var(--error)' }} className="font-medium">{s.unmatched_count} unmatched</div>}
                        {s.flagged_count > 0 && <div style={{ color: 'var(--warning)' }}>{s.flagged_count} flagged</div>}
                        {s.unmatched_count === 0 && s.flagged_count === 0 && <div style={{ color: 'var(--success)' }}>Clean</div>}
                      </div>
                      <div className="col-span-1 text-right">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={s.status === 'complete' ? { background: 'var(--success-bg)', color: 'var(--success)' } : { background: 'var(--info-bg)', color: 'var(--brand)' }}>
                          {s.status === 'in_progress' ? 'Active' : 'Complete'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </>
            )}
          </div>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
