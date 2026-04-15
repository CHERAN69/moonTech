'use client'

import { useState, useEffect, useCallback } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { AuditLogEntry } from '@/types'
import { cn } from '@/lib/utils'

// ─── Demo data ────────────────────────────────────────────────────────────────

const DEMO_ENTRIES: AuditLogEntry[] = [
  {
    id: 'a1', user_id: 'u1', entity_type: 'match_pair', entity_id: 'exc-2',
    action: 'approve', ai_involved: false,
    changes: { resolution: 'approved', status: 'matched' },
    previous_value: { resolution: null, status: 'duplicate' },
    new_value: { resolution: 'approved', status: 'matched' },
    created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
  {
    id: 'a2', user_id: 'u1', entity_type: 'match_pair', entity_id: 'exc-3',
    action: 'ai_explanation_generated', ai_involved: true,
    changes: { ai_explanation: 'This $7,000 AWS charge is 150% above your typical monthly average of $2,800.' },
    created_at: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
  },
  {
    id: 'a3', user_id: 'u1', entity_type: 'match_pair', entity_id: 'exc-1',
    action: 'add_note', ai_involved: false,
    changes: { note: 'Verified with Mailchimp — this is annual billing switch.' },
    previous_value: { note: null },
    new_value: { note: 'Verified with Mailchimp — this is annual billing switch.' },
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: 'a4', user_id: 'u1', entity_type: 'match_pair', entity_id: 'exc-4',
    action: 'edit_match', ai_involved: false,
    changes: { gl_override: 'Professional Services', match_method: 'manual' },
    created_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
  },
  {
    id: 'a5', user_id: 'u1', entity_type: 'reconciliation_session', entity_id: 'sess-1',
    action: 'created', ai_involved: false,
    changes: { name: 'April 2026 — Stripe Payouts', status: 'processing' },
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
]

// ─── Action badge colours ─────────────────────────────────────────────────────

function actionConfig(action: string): { bg: string; text: string } {
  if (action === 'approve')                    return { bg: '#F0FDF4', text: '#16A34A' }
  if (action === 'reject')                     return { bg: '#FEF2F2', text: '#DC2626' }
  if (action.includes('ai_'))                  return { bg: '#EFF6FF', text: '#2563EB' }
  if (action === 'created')                    return { bg: '#F9FAFB', text: '#6B7280' }
  if (action === 'edit_match')                 return { bg: '#FFF7ED', text: '#EA580C' }
  if (action === 'add_note')                   return { bg: '#FAFAF9', text: '#78716C' }
  if (action === 'mark_resolved')              return { bg: '#F0FDF4', text: '#15803D' }
  return { bg: '#F3F4F6', text: '#374151' }
}

function entityLabel(type: string): string {
  const map: Record<string, string> = {
    match_pair:               'Transaction',
    reconciliation_session:   'Session',
    journal_entry:            'Journal Entry',
    close_checklist:          'Checklist',
    profile:                  'Profile',
  }
  return map[type] ?? type
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

// ─── Row with collapsible diff ────────────────────────────────────────────────

function AuditRow({ entry }: { entry: AuditLogEntry }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = actionConfig(entry.action)

  return (
    <div className="border-b border-gray-50 last:border-0">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/60 transition-colors text-left"
      >
        {/* AI chip or entity chip */}
        <div className="flex-shrink-0 w-20">
          {entry.ai_involved ? (
            <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: '#EFF6FF', color: '#2563EB' }}>✨ AI</span>
          ) : (
            <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500">Human</span>
          )}
        </div>

        {/* Entity */}
        <div className="flex-shrink-0 w-28 text-xs text-gray-500">
          {entityLabel(entry.entity_type)}
          <div className="text-gray-300 font-mono text-xs truncate">{entry.entity_id.slice(0, 8)}…</div>
        </div>

        {/* Action */}
        <div className="flex-1">
          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: cfg.bg, color: cfg.text }}>
            {entry.action.replace(/_/g, ' ')}
          </span>
        </div>

        {/* Timestamp */}
        <div className="flex-shrink-0 text-xs text-gray-400 w-20 text-right">
          {formatRelativeTime(entry.created_at)}
        </div>

        {/* Expand chevron */}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2"
          className={cn('flex-shrink-0 transition-transform', expanded ? 'rotate-90' : '')}>
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>

      {expanded && (
        <div className="px-5 pb-4 ml-24">
          <div className="rounded-xl border border-gray-100 overflow-hidden text-xs">
            {/* Changes */}
            {entry.changes && Object.keys(entry.changes).length > 0 && (
              <div className="p-3 space-y-1.5">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Changes</div>
                {Object.entries(entry.changes).map(([key, val]) => (
                  <div key={key} className="flex gap-3">
                    <span className="text-gray-400 w-32 flex-shrink-0 font-mono">{key}</span>
                    <span className="text-gray-700 break-all">
                      {typeof val === 'object' ? JSON.stringify(val) : String(val ?? '')}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Before / After */}
            {(entry.previous_value || entry.new_value) && (
              <div className="grid grid-cols-2 divide-x divide-gray-100 border-t border-gray-100">
                <div className="p-3">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Before</div>
                  <pre className="text-gray-500 whitespace-pre-wrap break-all font-mono text-xs leading-relaxed">
                    {JSON.stringify(entry.previous_value, null, 2)}
                  </pre>
                </div>
                <div className="p-3">
                  <div className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1.5">After</div>
                  <pre className="text-gray-700 whitespace-pre-wrap break-all font-mono text-xs leading-relaxed">
                    {JSON.stringify(entry.new_value, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 text-gray-400">
              {new Date(entry.created_at).toLocaleString()} · ID: {entry.id}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const ENTITY_TYPES = ['all', 'match_pair', 'reconciliation_session', 'journal_entry', 'close_checklist']
const ACTIONS      = ['all', 'approve', 'reject', 'edit_match', 'add_note', 'mark_resolved', 'created', 'ai_explanation_generated']

export default function AuditTrailPage() {
  const [entries, setEntries]       = useState<AuditLogEntry[]>([])
  const [loading, setLoading]       = useState(true)
  const [isDemo, setIsDemo]         = useState(false)
  const [entityFilter, setEntity]   = useState('all')
  const [actionFilter, setAction]   = useState('all')
  const [dateFrom, setDateFrom]     = useState('')
  const [dateTo, setDateTo]         = useState('')
  const [total, setTotal]           = useState(0)

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams()
      if (entityFilter !== 'all') p.set('entity_type', entityFilter)
      if (actionFilter !== 'all') p.set('action', actionFilter)
      if (dateFrom) p.set('date_from', dateFrom)
      if (dateTo)   p.set('date_to', dateTo)

      const res = await fetch(`/api/audit?${p}`)
      if (res.status === 401) { setEntries(DEMO_ENTRIES); setTotal(DEMO_ENTRIES.length); setIsDemo(true); return }
      if (!res.ok) throw new Error()
      const json = await res.json()
      setEntries(json.entries ?? [])
      setTotal(json.total ?? 0)
      setIsDemo(false)
    } catch {
      setEntries(DEMO_ENTRIES)
      setTotal(DEMO_ENTRIES.length)
      setIsDemo(true)
    } finally {
      setLoading(false)
    }
  }, [entityFilter, actionFilter, dateFrom, dateTo])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  const handleExportCSV = () => {
    const p = new URLSearchParams()
    if (dateFrom) p.set('date_from', dateFrom)
    if (dateTo)   p.set('date_to', dateTo)
    window.open(`/api/reports/export?type=audit_trail&${p}`, '_blank')
  }

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Audit Trail"
        subtitle="Complete log of every action taken in ClosePilot"
        actions={
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            ↓ Export CSV
          </button>
        }
      />

      <div className="flex-1 p-6 space-y-5">
        {isDemo && (
          <div className="rounded-xl px-4 py-3 text-sm flex items-center gap-2" style={{ background: '#EFF6FF', color: '#1D4ED8' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            <strong>Demo mode</strong> — Connect Supabase to see your real audit trail.
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Entity type</label>
            <select
              value={entityFilter}
              onChange={e => setEntity(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 transition-colors bg-white"
            >
              {ENTITY_TYPES.map(t => (
                <option key={t} value={t}>{t === 'all' ? 'All types' : entityLabel(t)}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Action</label>
            <select
              value={actionFilter}
              onChange={e => setAction(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 transition-colors bg-white"
            >
              {ACTIONS.map(a => (
                <option key={a} value={a}>{a === 'all' ? 'All actions' : a.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">From</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 transition-colors" />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">To</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 transition-colors" />
          </div>

          <button
            onClick={fetchEntries}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ background: '#1E3A5F' }}
          >
            Apply
          </button>
          {(entityFilter !== 'all' || actionFilter !== 'all' || dateFrom || dateTo) && (
            <button
              onClick={() => { setEntity('all'); setAction('all'); setDateFrom(''); setDateTo('') }}
              className="px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* Log table */}
        <div className="bg-white rounded-2xl border border-gray-100">
          {/* Header */}
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="font-semibold text-gray-900 text-sm">Activity Log</h2>
              <span className="text-xs text-gray-400">{total.toLocaleString()} total entries</span>
            </div>
            <div className="text-xs text-gray-400">Click a row to expand before/after details</div>
          </div>

          {/* Column headers */}
          <div className="flex items-center gap-4 px-5 py-2 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wide">
            <div className="w-20">Source</div>
            <div className="w-28">Entity</div>
            <div className="flex-1">Action</div>
            <div className="w-20 text-right">When</div>
            <div className="w-4" />
          </div>

          {loading ? (
            <div className="p-16 text-center text-gray-400 text-sm">
              <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
              Loading audit trail…
            </div>
          ) : entries.length === 0 ? (
            <div className="p-16 text-center">
              <div className="text-4xl mb-3">📋</div>
              <div className="text-sm font-medium text-gray-700 mb-1">No audit entries found</div>
              <div className="text-xs text-gray-400">Actions you take in ClosePilot will appear here.</div>
            </div>
          ) : (
            <div>
              {entries.map(e => <AuditRow key={e.id} entry={e} />)}
            </div>
          )}

          {total > 100 && !loading && (
            <div className="px-5 py-4 border-t border-gray-100 text-center text-xs text-gray-400">
              Showing first 100 of {total.toLocaleString()} entries. Export CSV to see all.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
