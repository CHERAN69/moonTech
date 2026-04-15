'use client'

import { useState, useEffect, useCallback } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { AuditLogEntry } from '@/types'
import { cn } from '@/lib/utils'

const DEMO_ENTRIES: AuditLogEntry[] = [
  { id: 'a1', user_id: 'u1', entity_type: 'match_pair', entity_id: 'exc-2', action: 'approve', ai_involved: false, changes: { resolution: 'approved', status: 'matched' }, previous_value: { resolution: null, status: 'duplicate' }, new_value: { resolution: 'approved', status: 'matched' }, created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
  { id: 'a2', user_id: 'u1', entity_type: 'match_pair', entity_id: 'exc-3', action: 'ai_explanation_generated', ai_involved: true, changes: { ai_explanation: 'This $7,000 AWS charge is 150% above average.' }, created_at: new Date(Date.now() - 1000 * 60 * 18).toISOString() },
  { id: 'a3', user_id: 'u1', entity_type: 'match_pair', entity_id: 'exc-1', action: 'add_note', ai_involved: false, changes: { note: 'Verified with Mailchimp — annual billing switch.' }, previous_value: { note: null }, new_value: { note: 'Verified with Mailchimp — annual billing switch.' }, created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString() },
  { id: 'a4', user_id: 'u1', entity_type: 'match_pair', entity_id: 'exc-4', action: 'edit_match', ai_involved: false, changes: { gl_override: 'Professional Services', match_method: 'manual' }, created_at: new Date(Date.now() - 1000 * 60 * 90).toISOString() },
  { id: 'a5', user_id: 'u1', entity_type: 'reconciliation_session', entity_id: 'sess-1', action: 'created', ai_involved: false, changes: { name: 'April 2026 — Stripe Payouts', status: 'processing' }, created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() },
]

function actionConfig(action: string): { bg: string; text: string } {
  if (action === 'approve') return { bg: 'var(--success-bg)', text: 'var(--success)' }
  if (action === 'reject') return { bg: 'var(--error-bg)', text: 'var(--error)' }
  if (action.includes('ai_')) return { bg: 'var(--info-bg)', text: 'var(--brand)' }
  if (action === 'edit_match') return { bg: 'var(--warning-bg)', text: 'var(--warning)' }
  return { bg: 'var(--bg-tertiary)', text: 'var(--text-secondary)' }
}

function entityLabel(type: string): string {
  const map: Record<string, string> = { match_pair: 'Transaction', reconciliation_session: 'Session', journal_entry: 'Journal Entry', close_checklist: 'Checklist', profile: 'Profile' }
  return map[type] ?? type
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function AuditRow({ entry }: { entry: AuditLogEntry }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = actionConfig(entry.action)

  return (
    <div style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      <button onClick={() => setExpanded(e => !e)} className="w-full flex items-center gap-4 px-5 py-3.5 transition-colors text-left">
        <div className="flex-shrink-0 w-20">
          {entry.ai_involved ? (
            <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: 'var(--info-bg)', color: 'var(--brand)' }}>AI</span>
          ) : (
            <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>Human</span>
          )}
        </div>
        <div className="flex-shrink-0 w-28 text-xs" style={{ color: 'var(--text-secondary)' }}>
          {entityLabel(entry.entity_type)}
          <div className="font-mono text-xs truncate" style={{ color: 'var(--text-muted)' }}>{entry.entity_id.slice(0, 8)}…</div>
        </div>
        <div className="flex-1">
          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: cfg.bg, color: cfg.text }}>{entry.action.replace(/_/g, ' ')}</span>
        </div>
        <div className="flex-shrink-0 text-xs w-20 text-right" style={{ color: 'var(--text-tertiary)' }}>{formatRelativeTime(entry.created_at)}</div>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"
          className={cn('flex-shrink-0 transition-transform', expanded ? 'rotate-90' : '')}>
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>

      {expanded && (
        <div className="px-5 pb-4 ml-24">
          <div className="rounded-xl overflow-hidden text-xs" style={{ border: '1px solid var(--border)' }}>
            {entry.changes && Object.keys(entry.changes).length > 0 && (
              <div className="p-3 space-y-1.5">
                <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>Changes</div>
                {Object.entries(entry.changes).map(([key, val]) => (
                  <div key={key} className="flex gap-3">
                    <span className="w-32 flex-shrink-0 font-mono" style={{ color: 'var(--text-tertiary)' }}>{key}</span>
                    <span style={{ color: 'var(--text-secondary)' }} className="break-all">{typeof val === 'object' ? JSON.stringify(val) : String(val ?? '')}</span>
                  </div>
                ))}
              </div>
            )}
            {(entry.previous_value || entry.new_value) && (
              <div className="grid grid-cols-2" style={{ borderTop: '1px solid var(--border)' }}>
                <div className="p-3" style={{ borderRight: '1px solid var(--border)' }}>
                  <div className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Before</div>
                  <pre className="whitespace-pre-wrap break-all font-mono text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>{JSON.stringify(entry.previous_value, null, 2)}</pre>
                </div>
                <div className="p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--success)' }}>After</div>
                  <pre className="whitespace-pre-wrap break-all font-mono text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{JSON.stringify(entry.new_value, null, 2)}</pre>
                </div>
              </div>
            )}
            <div className="px-3 py-2" style={{ background: 'var(--bg-tertiary)', borderTop: '1px solid var(--border)', color: 'var(--text-muted)' }}>
              {new Date(entry.created_at).toLocaleString()} · ID: {entry.id}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const ENTITY_TYPES = ['all', 'match_pair', 'reconciliation_session', 'journal_entry', 'close_checklist']
const ACTIONS = ['all', 'approve', 'reject', 'edit_match', 'add_note', 'mark_resolved', 'created', 'ai_explanation_generated']

export default function AuditTrailPage() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [isDemo, setIsDemo] = useState(false)
  const [entityFilter, setEntity] = useState('all')
  const [actionFilter, setAction] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [total, setTotal] = useState(0)

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams()
      if (entityFilter !== 'all') p.set('entity_type', entityFilter)
      if (actionFilter !== 'all') p.set('action', actionFilter)
      if (dateFrom) p.set('date_from', dateFrom)
      if (dateTo) p.set('date_to', dateTo)
      const res = await fetch(`/api/audit?${p}`)
      if (res.status === 401) { setEntries(DEMO_ENTRIES); setTotal(DEMO_ENTRIES.length); setIsDemo(true); return }
      if (!res.ok) throw new Error()
      const json = await res.json()
      setEntries(json.entries ?? []); setTotal(json.total ?? 0); setIsDemo(false)
    } catch { setEntries(DEMO_ENTRIES); setTotal(DEMO_ENTRIES.length); setIsDemo(true) } finally { setLoading(false) }
  }, [entityFilter, actionFilter, dateFrom, dateTo])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Audit Trail" subtitle="Complete log of every action taken in ClosePilot"
        actions={
          <button onClick={() => window.open(`/api/reports/export?type=audit_trail`, '_blank')}
            className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
            style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>Export CSV</button>
        }
      />

      <div className="flex-1 p-6 space-y-5">
        {isDemo && (
          <div className="rounded-xl px-4 py-3 text-sm flex items-center gap-2" style={{ background: 'var(--info-bg)', color: 'var(--brand)' }}>
            <strong>Demo mode</strong> — Connect Supabase to see your real audit trail.
          </div>
        )}

        <div className="rounded-2xl p-4 flex flex-wrap gap-3 items-end" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Entity type</label>
            <select value={entityFilter} onChange={e => setEntity(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
              {ENTITY_TYPES.map(t => <option key={t} value={t}>{t === 'all' ? 'All types' : entityLabel(t)}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Action</label>
            <select value={actionFilter} onChange={e => setAction(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
              {ACTIONS.map(a => <option key={a} value={a}>{a === 'all' ? 'All actions' : a.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>From</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>To</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
          </div>
          <button onClick={fetchEntries} className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90" style={{ background: 'var(--brand)' }}>Apply</button>
          {(entityFilter !== 'all' || actionFilter !== 'all' || dateFrom || dateTo) && (
            <button onClick={() => { setEntity('all'); setAction('all'); setDateFrom(''); setDateTo('') }}
              className="px-3 py-2 rounded-lg text-sm transition-colors" style={{ color: 'var(--text-tertiary)' }}>Clear</button>
          )}
        </div>

        <div className="rounded-2xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex items-center gap-3">
              <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Activity Log</h2>
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{total.toLocaleString()} entries</span>
            </div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Click a row to expand</div>
          </div>
          <div className="flex items-center gap-4 px-5 py-2 text-xs font-semibold uppercase tracking-wide"
            style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
            <div className="w-20">Source</div><div className="w-28">Entity</div><div className="flex-1">Action</div><div className="w-20 text-right">When</div><div className="w-4" />
          </div>

          {loading ? (
            <div className="p-16 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
              <div className="w-8 h-8 rounded-full animate-spin mx-auto mb-3" style={{ border: '2px solid var(--border)', borderTopColor: 'var(--brand)' }} />Loading audit trail…
            </div>
          ) : entries.length === 0 ? (
            <div className="p-16 text-center">
              <div className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>No audit entries found</div>
              <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Actions you take will appear here.</div>
            </div>
          ) : (
            <div>{entries.map(e => <AuditRow key={e.id} entry={e} />)}</div>
          )}
        </div>
      </div>
    </div>
  )
}
