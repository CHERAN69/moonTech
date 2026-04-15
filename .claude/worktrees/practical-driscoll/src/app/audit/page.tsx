'use client'

import { useState, useEffect, useCallback } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { AuditLogEntry } from '@/types'
import { cn } from '@/lib/utils'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function actionConfig(action: string): { bg: string; text: string } {
  if (action === 'approve')              return { bg: '#F0FDF4', text: '#16A34A' }
  if (action === 'reject')               return { bg: '#FEF2F2', text: '#DC2626' }
  if (action.includes('ai_'))            return { bg: '#EFF6FF', text: '#2563EB' }
  if (action === 'created')              return { bg: '#F9FAFB', text: '#6B7280' }
  if (action === 'edit_match')           return { bg: '#FFF7ED', text: '#EA580C' }
  if (action === 'add_note')             return { bg: '#FAFAF9', text: '#78716C' }
  if (action === 'mark_resolved')        return { bg: '#F0FDF4', text: '#15803D' }
  if (action === 'sign_off')             return { bg: '#F0FDF4', text: '#16A34A' }
  return { bg: '#F3F4F6', text: '#374151' }
}

function entityLabel(type: string): string {
  const map: Record<string, string> = {
    match_pair:             'Transaction',
    reconciliation_session: 'Session',
    journal_entry:          'Journal Entry',
    close_checklist:        'Checklist',
    profile:                'Profile',
  }
  return map[type] ?? type
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function AuditRow({ entry }: { entry: AuditLogEntry }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = actionConfig(entry.action)

  return (
    <div className="border-b border-gray-50 last:border-0">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/60 transition-colors text-left"
      >
        <div className="flex-shrink-0 w-20">
          {entry.ai_involved
            ? <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: '#EFF6FF', color: '#2563EB' }}>✨ AI</span>
            : <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500">Human</span>}
        </div>
        <div className="flex-shrink-0 w-28 text-xs text-gray-500">
          {entityLabel(entry.entity_type)}
          <div className="text-gray-300 font-mono truncate">{entry.entity_id.slice(0, 8)}…</div>
        </div>
        <div className="flex-1">
          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: cfg.bg, color: cfg.text }}>
            {entry.action.replace(/_/g, ' ')}
          </span>
        </div>
        <div className="flex-shrink-0 text-xs text-gray-400 w-20 text-right">
          {formatRelativeTime(entry.created_at)}
        </div>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2"
          className={cn('flex-shrink-0 transition-transform', expanded ? 'rotate-90' : '')}>
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>

      {expanded && (
        <div className="px-5 pb-4 ml-24">
          <div className="rounded-xl border border-gray-100 overflow-hidden text-xs">
            {entry.changes && Object.keys(entry.changes).length > 0 && (
              <div className="p-3 space-y-1.5">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Changes</div>
                {Object.entries(entry.changes).map(([key, val]) => (
                  <div key={key} className="flex gap-3">
                    <span className="text-gray-400 w-32 flex-shrink-0 font-mono">{key}</span>
                    <span className="text-gray-700 break-all">{typeof val === 'object' ? JSON.stringify(val) : String(val ?? '')}</span>
                  </div>
                ))}
              </div>
            )}
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

// ─── Main ─────────────────────────────────────────────────────────────────────

const ENTITY_TYPES = ['all', 'match_pair', 'reconciliation_session', 'journal_entry', 'close_checklist']
const ACTIONS      = ['all', 'approve', 'reject', 'edit_match', 'add_note', 'mark_resolved', 'created', 'sign_off', 'ai_explanation_generated']

export default function AuditTrailPage() {
  const [entries, setEntries]     = useState<AuditLogEntry[]>([])
  const [loading, setLoading]     = useState(true)
  const [entityFilter, setEntity] = useState('all')
  const [actionFilter, setAction] = useState('all')
  const [dateFrom, setDateFrom]   = useState('')
  const [dateTo, setDateTo]       = useState('')
  const [total, setTotal]         = useState(0)

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams()
      if (entityFilter !== 'all') p.set('entity_type', entityFilter)
      if (actionFilter !== 'all') p.set('action', actionFilter)
      if (dateFrom) p.set('date_from', dateFrom)
      if (dateTo)   p.set('date_to', dateTo)

      const res = await fetch(`/api/audit?${p}`)
      if (!res.ok) throw new Error()
      const json = await res.json()
      setEntries(json.entries ?? [])
      setTotal(json.total ?? 0)
    } catch {
      setEntries([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [entityFilter, actionFilter, dateFrom, dateTo])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Audit Trail"
        subtitle="Complete log of every action taken in FinOpsAi"
        actions={
          <button
            onClick={() => window.open(`/api/reports/export?type=audit_trail`, '_blank')}
            className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            ↓ Export CSV
          </button>
        }
      />

      <div className="flex-1 p-6 space-y-5">
        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Entity type</label>
            <select value={entityFilter} onChange={e => setEntity(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 bg-white">
              {ENTITY_TYPES.map(t => <option key={t} value={t}>{t === 'all' ? 'All types' : entityLabel(t)}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Action</label>
            <select value={actionFilter} onChange={e => setAction(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 bg-white">
              {ACTIONS.map(a => <option key={a} value={a}>{a === 'all' ? 'All actions' : a.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">From</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">To</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400" />
          </div>
          <button onClick={fetchEntries}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ background: '#1E3A5F' }}>
            Apply
          </button>
          {(entityFilter !== 'all' || actionFilter !== 'all' || dateFrom || dateTo) && (
            <button onClick={() => { setEntity('all'); setAction('all'); setDateFrom(''); setDateTo('') }}
              className="px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-600">
              Clear
            </button>
          )}
        </div>

        {/* Log */}
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="font-semibold text-gray-900 text-sm">Activity Log</h2>
              <span className="text-xs text-gray-400">{total.toLocaleString()} total entries</span>
            </div>
            <div className="text-xs text-gray-400">Click a row to expand before/after details</div>
          </div>

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
              <div className="text-xs text-gray-400">Every action you take in FinOpsAi will be logged here.</div>
            </div>
          ) : (
            <div>{entries.map(e => <AuditRow key={e.id} entry={e} />)}</div>
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
