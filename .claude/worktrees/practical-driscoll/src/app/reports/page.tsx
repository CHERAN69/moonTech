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
      if (!res.ok) throw new Error()
      const json = await res.json()
      setSessions(json.sessions ?? [])
    } catch {
      setSessions([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSessions() }, [fetchSessions])

  const handleExport = async (type: string, format = 'csv') => {
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

            <div className="p-12 text-center">
              <div className="text-4xl mb-3">📊</div>
              <p className="text-sm font-medium text-gray-700 mb-1">No P&amp;L data yet</p>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                Post journal entries in CloseOS to generate your Profit &amp; Loss statement. Once entries are posted, they will appear here automatically.
              </p>
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
              <p>This export includes every approval, rejection, edit, note, and AI interaction logged in FinOpsAi.</p>
              <p className="text-xs">Fields: ID, entity type, entity ID, action, AI involved, changes, IP address, timestamp.</p>
            </div>
          </div>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
