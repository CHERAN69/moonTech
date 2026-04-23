'use client'

import { useState, useEffect, useCallback } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { SkeletonList } from '@/components/ui/Skeleton'
import { AuditLogEntry } from '@/types'
import { cn } from '@/lib/utils'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function actionConfig(action: string): { bg: string; text: string } {
  if (action === 'approve' || action === 'close_signed_off')           return { bg: '#F0FDF4', text: '#16A34A' }
  if (action === 'reject')                                              return { bg: '#FEF2F2', text: '#DC2626' }
  if (action.startsWith('ai_') || action === 'auto_reconciled')        return { bg: '#EFF6FF', text: '#2563EB' }
  if (action === 'auto_confirmed' || action === 'confirmed')            return { bg: '#F0FDF4', text: '#15803D' }
  if (action === 'classified' || action === 'created' || action === 'created_from_inbox') return { bg: '#F9FAFB', text: '#6B7280' }
  if (action === 'edit_match' || action === 'task_updated')             return { bg: '#FFF7ED', text: '#EA580C' }
  if (action === 'add_note' || action === 'mark_resolved')              return { bg: '#FAFAF9', text: '#78716C' }
  if (action === 'journal_approve' || action === 'journal_post')        return { bg: '#F0FDF4', text: '#16A34A' }
  if (action === 'journal_reject')                                      return { bg: '#FEF2F2', text: '#DC2626' }
  if (action === 'journal_edit' || action === 'journal_deleted')        return { bg: '#FFF7ED', text: '#EA580C' }
  if (action.includes('delete'))                                        return { bg: '#FEF2F2', text: '#B91C1C' }
  return { bg: '#F3F4F6', text: '#374151' }
}

function entityLabel(type: string): string {
  const map: Record<string, string> = {
    match_pair:             'Transaction',
    reconciliation_session: 'Session',
    journal_entry:          'Journal Entry',
    close_checklist:        'Checklist',
    upload:                 'Upload',
    profile:                'Profile',
    vendor_rule:            'Vendor Rule',
  }
  return map[type] ?? type.replace(/_/g, ' ')
}

function entityColor(type: string): { bg: string; text: string } {
  const map: Record<string, { bg: string; text: string }> = {
    match_pair:             { bg: '#EFF6FF', text: '#1D4ED8' },
    reconciliation_session: { bg: '#F5F3FF', text: '#7C3AED' },
    journal_entry:          { bg: '#FFF7ED', text: '#C2410C' },
    close_checklist:        { bg: '#F0FDF4', text: '#15803D' },
    upload:                 { bg: '#F0F9FF', text: '#0369A1' },
    profile:                { bg: '#FDF4FF', text: '#86198F' },
    vendor_rule:            { bg: '#FFFBEB', text: '#92400E' },
  }
  return map[type] ?? { bg: '#F3F4F6', text: '#374151' }
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

function formatAbsTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function AuditRow({ entry }: { entry: AuditLogEntry }) {
  const [expanded, setExpanded] = useState(false)
  const cfg    = actionConfig(entry.action)
  const entCfg = entityColor(entry.entity_type)

  return (
    <div className="border-b border-gray-50 last:border-0">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/60 transition-colors text-left"
      >
        {/* Source */}
        <div className="flex-shrink-0 w-16">
          {entry.ai_involved
            ? <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: '#EFF6FF', color: '#2563EB' }}>✦ AI</span>
            : <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500">Human</span>}
        </div>

        {/* Entity */}
        <div className="flex-shrink-0 w-32">
          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: entCfg.bg, color: entCfg.text }}>
            {entityLabel(entry.entity_type)}
          </span>
          <div className="text-[10px] text-gray-300 font-mono mt-0.5 truncate">
            {entry.entity_id.slice(0, 8)}…
          </div>
        </div>

        {/* Action */}
        <div className="flex-1">
          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: cfg.bg, color: cfg.text }}>
            {entry.action.replace(/_/g, ' ')}
          </span>
        </div>

        {/* When */}
        <div className="flex-shrink-0 text-xs text-gray-400 w-24 text-right hidden sm:block"
          title={formatAbsTime(entry.created_at)}>
          {formatRelativeTime(entry.created_at)}
        </div>

        {/* Expand chevron */}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2"
          className={cn('flex-shrink-0 transition-transform', expanded ? 'rotate-90' : '')}>
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>

      {expanded && (
        <div className="px-5 pb-4 ml-20">
          <div className="rounded-xl border border-gray-100 overflow-hidden text-xs">
            {/* Timestamp + ID */}
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 text-gray-400 flex gap-4">
              <span>{formatAbsTime(entry.created_at)}</span>
              <span className="font-mono text-gray-300">ID: {entry.id}</span>
              {entry.ip_address && <span>IP: {entry.ip_address}</span>}
            </div>

            {entry.changes && Object.keys(entry.changes).length > 0 && (
              <div className="p-3 space-y-1.5 border-b border-gray-100">
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Changes</div>
                {Object.entries(entry.changes).map(([key, val]) => (
                  <div key={key} className="flex gap-3">
                    <span className="text-gray-400 w-36 flex-shrink-0 font-mono">{key}</span>
                    <span className="text-gray-700 break-all">
                      {typeof val === 'object' ? JSON.stringify(val) : String(val ?? '')}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {(entry.previous_value || entry.new_value) && (
              <div className="grid grid-cols-2 divide-x divide-gray-100">
                <div className="p-3">
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Before</div>
                  <pre className="text-gray-500 whitespace-pre-wrap break-all font-mono text-[10px] leading-relaxed">
                    {JSON.stringify(entry.previous_value, null, 2)}
                  </pre>
                </div>
                <div className="p-3">
                  <div className="text-[10px] font-semibold text-green-600 uppercase tracking-wide mb-1.5">After</div>
                  <pre className="text-gray-700 whitespace-pre-wrap break-all font-mono text-[10px] leading-relaxed">
                    {JSON.stringify(entry.new_value, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Filter Bar ───────────────────────────────────────────────────────────────

const ENTITY_TYPES: { value: string; label: string }[] = [
  { value: 'all',                   label: 'All types' },
  { value: 'upload',                label: 'Upload' },
  { value: 'match_pair',            label: 'Transaction' },
  { value: 'reconciliation_session',label: 'Session' },
  { value: 'journal_entry',         label: 'Journal Entry' },
  { value: 'close_checklist',       label: 'Checklist' },
  { value: 'profile',               label: 'Profile' },
  { value: 'vendor_rule',           label: 'Vendor Rule' },
]

const ACTIONS: { value: string; label: string }[] = [
  { value: 'all',                    label: 'All actions' },
  { value: 'approve',                label: 'Approved' },
  { value: 'reject',                 label: 'Rejected' },
  { value: 'auto_confirmed',         label: 'Auto confirmed' },
  { value: 'auto_reconciled',        label: 'Auto reconciled' },
  { value: 'classified',             label: 'Classified' },
  { value: 'created',                label: 'Created' },
  { value: 'created_from_inbox',     label: 'Created from inbox' },
  { value: 'edit_match',             label: 'Match edited' },
  { value: 'add_note',               label: 'Note added' },
  { value: 'mark_resolved',          label: 'Marked resolved' },
  { value: 'task_updated',           label: 'Task updated' },
  { value: 'close_signed_off',       label: 'Close signed off' },
  { value: 'journal_approve',        label: 'Journal approved' },
  { value: 'journal_reject',         label: 'Journal rejected' },
  { value: 'journal_post',           label: 'Journal posted' },
  { value: 'journal_edit',           label: 'Journal edited' },
  { value: 'journal_deleted',        label: 'Journal deleted' },
  { value: 'ai_explanation_generated', label: 'AI explained' },
]

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AuditTrailPage() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal]     = useState(0)
  const [offset, setOffset]   = useState(0)
  const LIMIT = 50

  // pending = what's in the form; applied = what was last fetched
  const [entityFilter, setEntity]   = useState('all')
  const [actionFilter, setAction]   = useState('all')
  const [dateFrom, setDateFrom]     = useState('')
  const [dateTo, setDateTo]         = useState('')

  const fetchEntries = useCallback(async (
    entity: string, action: string, from: string, to: string, page: number
  ) => {
    setLoading(true)
    try {
      const p = new URLSearchParams({ limit: String(LIMIT), offset: String(page * LIMIT) })
      if (entity !== 'all') p.set('entity_type', entity)
      if (action !== 'all') p.set('action', action)
      if (from) p.set('date_from', from)
      if (to)   p.set('date_to', to)

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
  }, [])

  // Initial load
  useEffect(() => { fetchEntries('all', 'all', '', '', 0) }, [fetchEntries])

  const handleApply = () => {
    setOffset(0)
    fetchEntries(entityFilter, actionFilter, dateFrom, dateTo, 0)
  }

  const handleClear = () => {
    setEntity('all'); setAction('all'); setDateFrom(''); setDateTo(''); setOffset(0)
    fetchEntries('all', 'all', '', '', 0)
  }

  const handlePage = (dir: 1 | -1) => {
    const next = offset + dir
    setOffset(next)
    fetchEntries(entityFilter, actionFilter, dateFrom, dateTo, next)
  }

  const isFiltered = entityFilter !== 'all' || actionFilter !== 'all' || dateFrom || dateTo
  const currentPage = offset + 1
  const totalPages  = Math.max(1, Math.ceil(total / LIMIT))

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

      <div className="flex-1 p-6 space-y-5 overflow-y-auto">
        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Entity type</label>
              <select
                value={entityFilter}
                onChange={e => setEntity(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 bg-white text-gray-700"
              >
                {ENTITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Action</label>
              <select
                value={actionFilter}
                onChange={e => setAction(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 bg-white text-gray-700"
              >
                {ACTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 bg-white text-gray-700"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 bg-white text-gray-700"
              />
            </div>

            <button
              onClick={handleApply}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
              style={{ background: '#1E3A5F' }}
            >
              Apply
            </button>

            {isFiltered && (
              <button
                onClick={handleClear}
                className="px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          {isFiltered && (
            <div className="mt-2 flex flex-wrap gap-2">
              {entityFilter !== 'all' && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                  Type: {ENTITY_TYPES.find(t => t.value === entityFilter)?.label}
                </span>
              )}
              {actionFilter !== 'all' && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                  Action: {ACTIONS.find(a => a.value === actionFilter)?.label}
                </span>
              )}
              {dateFrom && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                  From: {dateFrom}
                </span>
              )}
              {dateTo && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                  To: {dateTo}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Log */}
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="font-semibold text-gray-900 text-sm">Activity Log</h2>
              {!loading && (
                <span className="text-xs text-gray-400">
                  {total.toLocaleString()} {isFiltered ? 'matching' : 'total'} entries
                </span>
              )}
            </div>
            <div className="text-xs text-gray-400">Click a row for full details</div>
          </div>

          {/* Column headers */}
          <div className="flex items-center gap-4 px-5 py-2 bg-gray-50 border-b border-gray-100 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
            <div className="w-16">Source</div>
            <div className="w-32">Entity</div>
            <div className="flex-1">Action</div>
            <div className="w-24 text-right hidden sm:block">When</div>
            <div className="w-3" />
          </div>

          {loading ? (
            <SkeletonList rows={8} />
          ) : entries.length === 0 ? (
            <div className="p-16 text-center">
              <div className="text-4xl mb-3">📋</div>
              <div className="text-sm font-medium text-gray-700 mb-1">
                {isFiltered ? 'No entries match your filters' : 'No audit entries yet'}
              </div>
              <div className="text-xs text-gray-400">
                {isFiltered
                  ? 'Try adjusting or clearing the filters above.'
                  : 'Every action you take in FinOpsAi will be logged here.'}
              </div>
              {isFiltered && (
                <button onClick={handleClear} className="mt-3 text-xs text-blue-600 hover:underline">
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div>{entries.map(e => <AuditRow key={e.id} entry={e} />)}</div>
          )}

          {/* Pagination */}
          {total > LIMIT && !loading && (
            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
              <span>Page {currentPage} of {totalPages} · {total.toLocaleString()} entries</span>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePage(-1)}
                  disabled={offset === 0}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ← Prev
                </button>
                <button
                  onClick={() => handlePage(1)}
                  disabled={currentPage >= totalPages}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
