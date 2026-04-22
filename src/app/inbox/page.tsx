'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { UploadZone, type FileUploadEntry } from '@/components/inbox/UploadZone'
import { ClassificationQueue } from '@/components/inbox/ClassificationQueue'
import type { FileRowData } from '@/components/inbox/FileRow'

// ─── Types ───────────────────────────────────────────────────────────────────

interface RecentSession {
  id: string
  name: string
  status: string
  close_confidence_score: number
  matched_count: number
  unmatched_count: number
  flagged_count: number
  period_start: string
  period_end: string
  created_at: string
}

interface UploadPair {
  bank: FileRowData
  partner: FileRowData | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function periodsOverlap(a: FileRowData, b: FileRowData): boolean {
  if (a.suggested_period_start && b.suggested_period_start) {
    const aStart = new Date(a.suggested_period_start).getTime()
    const aEnd   = new Date(a.suggested_period_end ?? a.suggested_period_start).getTime()
    const bStart = new Date(b.suggested_period_start).getTime()
    const bEnd   = new Date(b.suggested_period_end ?? b.suggested_period_start).getTime()
    return aStart <= bEnd && bStart <= aEnd
  }
  return true // no period info — assume compatible
}

function detectPairs(uploads: FileRowData[]): { pairs: UploadPair[]; orphans: FileRowData[] } {
  const unlinked = uploads.filter(u => !u.session_id && u.status !== 'error')
  const banks    = unlinked.filter(u => u.classification === 'bank_statement' && u.status === 'confirmed')
  const partners = unlinked.filter(u =>
    ['invoice', 'payroll', 'expense_report', 'receipt'].includes(u.classification ?? '') &&
    u.status === 'confirmed'
  )

  const usedIds = new Set<string>()
  const pairs: UploadPair[] = []

  for (const bank of banks) {
    const partner =
      partners.find(p => !usedIds.has(p.id) && periodsOverlap(bank, p)) ??
      partners.find(p => !usedIds.has(p.id)) ??
      null

    pairs.push({ bank, partner })
    usedIds.add(bank.id)
    if (partner) usedIds.add(partner.id)
  }

  const pairedIds = new Set([
    ...pairs.map(p => p.bank.id),
    ...pairs.flatMap(p => (p.partner ? [p.partner.id] : [])),
  ])
  const orphans = unlinked.filter(u => !pairedIds.has(u.id))

  return { pairs, orphans }
}

function fmtPeriod(start?: string | null, end?: string | null): string {
  if (!start) return ''
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  const s = fmt(start)
  const e = end ? fmt(end) : s
  return s === e ? s : `${s} – ${e}`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const CLASSIFICATION_LABELS: Record<string, string> = {
  bank_statement:  'Bank Statement',
  invoice:         'Invoice / AR',
  payroll:         'Payroll',
  journal_entry:   'Journal Entry',
  expense_report:  'Expense Report',
  receipt:         'Receipt',
  other:           'Other',
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionHeader({ tier, label, count, color }: { tier: string; label: string; count: number; color: string }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <span
        className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
        style={{ background: color }}
      >
        TIER {tier}
      </span>
      <span className="text-sm font-semibold text-gray-800">{label}</span>
      {count > 0 && (
        <span className="text-xs text-gray-400">({count})</span>
      )}
    </div>
  )
}

function SessionCard({ session }: { session: RecentSession }) {
  const router = useRouter()
  const conf   = session.close_confidence_score ?? 0
  const confColor = conf >= 85 ? '#16A34A' : conf >= 60 ? '#D97706' : '#DC2626'
  const period = fmtPeriod(session.period_start, session.period_end)

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between gap-4 hover:border-gray-200 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        {/* Confidence ring */}
        <div
          className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center border-2 text-xs font-bold"
          style={{ borderColor: confColor, color: confColor }}
        >
          {conf}%
        </div>

        <div className="min-w-0">
          <div className="font-medium text-sm text-gray-900 truncate">{session.name}</div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400 flex-wrap">
            {period && <span>{period}</span>}
            <span className="text-emerald-600 font-medium">{session.matched_count ?? 0} matched</span>
            {(session.unmatched_count ?? 0) > 0 && (
              <span className="text-amber-600 font-medium">{session.unmatched_count} unmatched</span>
            )}
            {(session.flagged_count ?? 0) > 0 && (
              <span className="text-red-600 font-medium">{session.flagged_count} flagged</span>
            )}
            <span className="text-gray-300">·</span>
            <span>{fmtDate(session.created_at)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {(session.unmatched_count ?? 0) + (session.flagged_count ?? 0) > 0 ? (
          <button
            onClick={() => router.push(`/review?session_id=${session.id}`)}
            className="px-3 py-1.5 text-xs font-semibold text-white rounded-lg transition-opacity hover:opacity-90"
            style={{ background: '#1E3A5F' }}
          >
            Review {(session.unmatched_count ?? 0) + (session.flagged_count ?? 0)} exceptions →
          </button>
        ) : (
          <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            All clear
          </span>
        )}
      </div>
    </div>
  )
}

function PairCard({
  pair,
  onRun,
  running,
}: {
  pair: UploadPair
  onRun: (pair: UploadPair) => void
  running: boolean
}) {
  const bankPeriod = fmtPeriod(pair.bank.suggested_period_start, pair.bank.suggested_period_end)

  return (
    <div className="bg-white rounded-xl border border-blue-100 p-4">
      <div className="flex items-start justify-between gap-4">
        {/* Files */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Bank file */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 flex-shrink-0">BANK</span>
            <span className="text-sm font-medium text-gray-800 truncate">{pair.bank.filename}</span>
            <span className="text-xs text-gray-400 flex-shrink-0">{pair.bank.transactions_count ?? 0} rows</span>
            {bankPeriod && <span className="text-xs text-gray-400 flex-shrink-0">{bankPeriod}</span>}
          </div>

          {/* Partner file or missing notice */}
          {pair.partner ? (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 flex-shrink-0">
                {CLASSIFICATION_LABELS[pair.partner.classification ?? ''] ?? 'DOCUMENT'}
              </span>
              <span className="text-sm font-medium text-gray-800 truncate">{pair.partner.filename}</span>
              <span className="text-xs text-gray-400 flex-shrink-0">{pair.partner.transactions_count ?? 0} rows</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 flex-shrink-0">OPTIONAL</span>
              <span className="text-xs text-gray-400 italic">No invoice/AR file — bank-only reconciliation</span>
            </div>
          )}
        </div>

        {/* Action */}
        <button
          onClick={() => onRun(pair)}
          disabled={running}
          className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: '#1E3A5F' }}
        >
          {running ? (
            <>
              <span className="w-3.5 h-3.5 border border-white/30 border-t-white rounded-full animate-spin" />
              Running…
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              Run Reconciliation
            </>
          )}
        </button>
      </div>
    </div>
  )
}

function MissingDocBanner({ orphans }: { orphans: FileRowData[] }) {
  const bankOrphans    = orphans.filter(u => u.classification === 'bank_statement')
  const nonBankOrphans = orphans.filter(u => u.classification !== 'bank_statement')

  if (bankOrphans.length > 0 && nonBankOrphans.length === 0) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-100 text-xs text-amber-700 mb-3">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <span>
          <strong>{bankOrphans.length} bank statement{bankOrphans.length > 1 ? 's' : ''}</strong> waiting for a matching invoice or AR file to run reconciliation.
          Upload the counterpart or click <strong>Run Reconciliation</strong> above for bank-only mode.
        </span>
      </div>
    )
  }

  if (nonBankOrphans.length > 0 && bankOrphans.length === 0) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-100 text-xs text-amber-700 mb-3">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <span>
          <strong>{nonBankOrphans.length} document{nonBankOrphans.length > 1 ? 's' : ''}</strong> classified but no bank statement uploaded yet.
          Upload a bank statement to run reconciliation.
        </span>
      </div>
    )
  }

  return null
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InboxPage() {
  const router = useRouter()

  const [uploads, setUploads]   = useState<FileRowData[]>([])
  const [sessions, setSessions] = useState<RecentSession[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [runningPairId, setRunningPairId] = useState<string | null>(null)
  const [runError, setRunError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [uploadsRes, sessionsRes] = await Promise.all([
        fetch('/api/inbox/upload?limit=100'),
        fetch('/api/reconcile?limit=10'),
      ])

      if (!uploadsRes.ok) throw new Error(`Uploads: HTTP ${uploadsRes.status}`)
      const uploadsData = await uploadsRes.json()
      setUploads(uploadsData.uploads ?? [])

      if (sessionsRes.ok) {
        const sessionsData = await sessionsRes.json()
        setSessions(sessionsData.sessions ?? [])
      }
    } catch {
      setError('Failed to load inbox. Please refresh.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleUploadComplete = useCallback((entry: FileUploadEntry) => {
    if (entry.status === 'done' && entry.result) {
      if (entry.result.auto_session_id) {
        // Tier 1 auto-reconcile fired — refresh to show the new session
        fetchData()
        return
      }
      const newRow: FileRowData = {
        id:                        entry.result.upload_id,
        filename:                  entry.file.name,
        file_size_bytes:           entry.file.size,
        classification:            entry.result.classification,
        classification_confidence: entry.result.confidence,
        transactions_count:        entry.result.transactions_count,
        status:                    entry.result.auto_confirmed ? 'confirmed' : 'classified',
        created_at:                new Date().toISOString(),
      }
      setUploads(prev => [newRow, ...prev])
    } else if (entry.status === 'error') {
      fetchData()
    }
  }, [fetchData])

  const handleRunPair = useCallback(async (pair: UploadPair) => {
    const pairId = pair.bank.id
    setRunningPairId(pairId)
    setRunError(null)
    try {
      const res = await fetch('/api/inbox/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bank_upload_id:    pair.bank.id,
          invoice_upload_id: pair.partner?.id,
          name: pair.partner
            ? `${pair.bank.filename.replace(/\.[^.]+$/, '')} + ${pair.partner.filename.replace(/\.[^.]+$/, '')}`
            : pair.bank.filename.replace(/\.[^.]+$/, ''),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Reconciliation failed')
      fetchData()
      router.push(`/review?session_id=${data.session_id}`)
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Reconciliation failed')
    } finally {
      setRunningPairId(null)
    }
  }, [fetchData, router])

  // ── Derive tiers from uploads ────────────────────────────────────────────
  const { pairs, orphans } = detectPairs(uploads)

  // Tier 1: sessions with linked uploads (auto-processed) — use fetched sessions
  // Only show sessions that have a linked upload OR are recent (last 7 days)
  const linkedSessionIds = new Set(uploads.map(u => u.session_id).filter(Boolean))
  const sevenDaysAgo = Date.now() - 7 * 86_400_000
  const tier1Sessions = sessions.filter(s =>
    linkedSessionIds.has(s.id) || new Date(s.created_at).getTime() > sevenDaysAgo
  ).slice(0, 5)

  const hasTier1 = tier1Sessions.length > 0
  const hasTier2 = pairs.length > 0
  const hasTier3 = orphans.length > 0
  const hasAnything = hasTier1 || hasTier2 || hasTier3

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Inbox"
        subtitle="Drop your files — AI classifies, pairs, and reconciles"
      />

      <div className="flex-1 p-6 space-y-6 max-w-5xl overflow-y-auto">

        {/* Error banner */}
        {error && (
          <div className="rounded-xl px-4 py-3 text-sm flex items-center gap-2 bg-red-50 text-red-700 border border-red-100">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
          </div>
        )}

        {runError && (
          <div className="rounded-xl px-4 py-3 text-sm flex items-center gap-2 bg-red-50 text-red-700 border border-red-100">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {runError}
            <button onClick={() => setRunError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
          </div>
        )}

        {/* Upload zone */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Upload Files</h2>
          <UploadZone onUploadComplete={handleUploadComplete} />
        </section>

        {/* Loading state */}
        {loading && (
          <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center">
            <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-400">Loading inbox…</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !hasAnything && (
          <div className="rounded-2xl border border-gray-100 bg-white p-16 text-center">
            <div className="text-5xl mb-4">📂</div>
            <p className="text-sm font-semibold text-gray-700 mb-1">Upload your first file to get started</p>
            <p className="text-xs text-gray-400">
              Drop a bank statement + invoice above. AI will classify them, pair them, and run reconciliation automatically.
            </p>
          </div>
        )}

        {!loading && hasAnything && (
          <>
            {/* ── TIER 1: Auto-Processed ───────────────────────────────── */}
            {hasTier1 && (
              <section>
                <SectionHeader
                  tier="1"
                  label="Auto-Processed"
                  count={tier1Sessions.length}
                  color="#16A34A"
                />
                <div className="space-y-2">
                  {tier1Sessions.map(s => (
                    <SessionCard key={s.id} session={s} />
                  ))}
                </div>
              </section>
            )}

            {/* ── TIER 2: Ready to Run ─────────────────────────────────── */}
            {hasTier2 && (
              <section>
                <SectionHeader
                  tier="2"
                  label="Ready to Run — confirm pairing"
                  count={pairs.length}
                  color="#2563EB"
                />
                <p className="text-xs text-gray-400 mb-3">
                  AI detected these document pairs. Review the grouping and run when ready.
                </p>
                <div className="space-y-2">
                  {pairs.map(pair => (
                    <PairCard
                      key={pair.bank.id}
                      pair={pair}
                      onRun={handleRunPair}
                      running={runningPairId === pair.bank.id}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* ── TIER 3: Needs Attention ──────────────────────────────── */}
            {hasTier3 && (
              <section>
                <SectionHeader
                  tier="3"
                  label="Needs Attention"
                  count={orphans.length}
                  color="#D97706"
                />
                <MissingDocBanner orphans={orphans} />
                <ClassificationQueue
                  uploads={orphans}
                  loading={false}
                  onRefresh={fetchData}
                />
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}
