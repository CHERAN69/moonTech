'use client'

/**
 * ClassificationQueue — displays all uploaded files with their
 * AI classification status. Includes batch actions for reconciliation.
 */

import { useState, useCallback } from 'react'
import { FileRow, type FileRowData } from './FileRow'
import { useRouter } from 'next/navigation'

interface ClassificationQueueProps {
  uploads: FileRowData[]
  loading: boolean
  onRefresh: () => void
}

export function ClassificationQueue({ uploads, loading, onRefresh }: ClassificationQueueProps) {
  const router  = useRouter()
  const [reconciling, setReconciling] = useState(false)
  const [reconcileErr, setReconcileErr] = useState<string | null>(null)

  const confirmedUploads   = uploads.filter(u => u.status === 'confirmed')
  const bankUploads        = confirmedUploads.filter(u => u.classification === 'bank_statement')
  const invoiceUploads     = confirmedUploads.filter(u => u.classification === 'invoice')
  const canReconcile       = bankUploads.length > 0

  const handleConfirm = useCallback(async (id: string) => {
    await fetch(`/api/inbox/upload`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'confirmed' }),
    })
    onRefresh()
  }, [onRefresh])

  const handleReclassify = useCallback(async (id: string) => {
    await fetch('/api/inbox/upload', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'classified' }),
    })
    onRefresh()
  }, [onRefresh])

  const handleManualClassify = useCallback(async (id: string, classification: string) => {
    await fetch('/api/inbox/upload', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, classification }),
    })
    onRefresh()
  }, [onRefresh])

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Delete this upload? This cannot be undone.')) return
    await fetch(`/api/inbox/upload?id=${id}`, { method: 'DELETE' })
    onRefresh()
  }, [onRefresh])

  const handleDeleteAll = useCallback(async () => {
    if (!confirm(`Delete all ${uploads.length} file${uploads.length !== 1 ? 's' : ''} from the queue? This cannot be undone.`)) return
    await Promise.all(uploads.map(u => fetch(`/api/inbox/upload?id=${u.id}`, { method: 'DELETE' })))
    onRefresh()
  }, [uploads, onRefresh])

  const handleRunReconciliation = useCallback(async () => {
    if (!canReconcile) return
    setReconciling(true)
    setReconcileErr(null)
    try {
      const bankUpload    = bankUploads[0]
      const invoiceUpload = invoiceUploads[0]

      const res = await fetch('/api/inbox/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bank_upload_id:    bankUpload.id,
          invoice_upload_id: invoiceUpload?.id,
          name:              `${bankUpload.filename.replace(/\.[^.]+$/, '')} Reconciliation`,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Reconciliation failed')
      }

      if (data.warnings?.length) {
        console.warn('[reconcile] warnings:', data.warnings)
      }

      onRefresh()
      router.push(`/review?session_id=${data.session_id}`)
    } catch (err) {
      setReconcileErr(err instanceof Error ? err.message : 'Reconciliation failed')
    } finally {
      setReconciling(false)
    }
  }, [canReconcile, bankUploads, invoiceUploads, onRefresh, router])

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
        <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-400">Loading queue…</p>
      </div>
    )
  }

  if (uploads.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
        <div className="text-5xl mb-4">📂</div>
        <p className="text-sm font-medium text-gray-700 mb-1">Your upload queue is empty</p>
        <p className="text-xs text-gray-400">Files you upload will appear here with their AI classification.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Queue header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <div>
          <span className="text-sm font-semibold text-gray-900">Classification Queue</span>
          <span className="ml-2 text-xs text-gray-400">{uploads.length} files</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Guidance when no confirmed bank statement yet */}
          {!canReconcile && uploads.length > 0 && (
            <span className="text-xs text-amber-600 font-medium">
              ⚠ Use &quot;Change type ▾&quot; to set your bank file, then Run Reconciliation appears
            </span>
          )}

          {/* Batch reconcile action */}
          {canReconcile && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleRunReconciliation}
                disabled={reconciling}
                title={!canReconcile ? 'Confirm at least one bank statement first' : ''}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: '#1E3A5F' }}
              >
                {reconciling ? (
                  <>
                    <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                    Running…
                  </>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/>
                      <polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/>
                    </svg>
                    Run Reconciliation
                  </>
                )}
              </button>
            </div>
          )}

          {uploads.length > 0 && (
            <button
              onClick={handleDeleteAll}
              className="px-3 py-1.5 text-xs font-medium text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              title="Delete all files in the queue"
            >
              🗑 Clear All
            </button>
          )}
          <button
            onClick={onRefresh}
            className="px-3 py-1.5 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Error banner */}
      {reconcileErr && (
        <div className="mx-5 mt-3 rounded-xl px-3 py-2 text-xs flex items-center gap-2 bg-red-50 text-red-700 border border-red-100">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {reconcileErr}
          <button onClick={() => setReconcileErr(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Status summary chips */}
      <div className="flex gap-2 px-5 py-2 border-b border-gray-50 flex-wrap">
        {[
          { key: 'all',        label: `All (${uploads.length})`,                                                color: '#6B7280' },
          { key: 'classified', label: `Needs Confirmation (${uploads.filter(u => u.status === 'classified').length})`, color: '#D97706' },
          { key: 'confirmed',  label: `Confirmed (${uploads.filter(u => u.status === 'confirmed').length})`,   color: '#16A34A' },
          { key: 'error',      label: `Errors (${uploads.filter(u => u.status === 'error').length})`,          color: '#DC2626' },
        ].filter(s => s.key === 'all' || uploads.some(u => (s.key === 'all' ? true : u.status === s.key))).map(s => (
          <span
            key={s.key}
            className="text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{ background: `${s.color}15`, color: s.color }}
          >
            {s.label}
          </span>
        ))}
      </div>

      {/* Column headers */}
      <div className="flex items-center gap-4 px-5 py-2 border-b border-gray-50 text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
        <span className="flex-1">File</span>
        <span className="w-36 flex-shrink-0 hidden sm:block">Classification</span>
        <span className="w-20 flex-shrink-0">Confidence</span>
        <span className="w-16 text-right flex-shrink-0">Rows</span>
        <span className="w-36 flex-shrink-0">Status</span>
        <span className="w-32 flex-shrink-0">Actions</span>
      </div>

      {/* Rows */}
      {uploads.map(row => (
        <FileRow
          key={row.id}
          row={row}
          onConfirm={handleConfirm}
          onReclassify={handleReclassify}
          onManualClassify={handleManualClassify}
          onDelete={handleDelete}
        />
      ))}
    </div>
  )
}
