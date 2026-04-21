'use client'

/**
 * Inbox — Universal upload + AI classification queue.
 *
 * Section A: UploadZone — drag-and-drop, category hints, per-file progress
 * Section B: ClassificationQueue — all uploads with AI classification status
 *
 * Phase 2 — full implementation.
 */

import { useState, useEffect, useCallback } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { UploadZone, type FileUploadEntry } from '@/components/inbox/UploadZone'
import { ClassificationQueue } from '@/components/inbox/ClassificationQueue'
import type { FileRowData } from '@/components/inbox/FileRow'

export default function InboxPage() {
  const [uploads, setUploads]   = useState<FileRowData[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [totalPending, setTotal] = useState(0)

  const fetchUploads = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/inbox/upload?limit=100')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setUploads(data.uploads ?? [])
      setTotal(data.uploads?.filter((u: FileRowData) => u.status !== 'confirmed' && u.status !== 'error').length ?? 0)
    } catch {
      setError('Failed to load upload queue. Please refresh.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchUploads() }, [fetchUploads])

  const handleUploadComplete = useCallback((entry: FileUploadEntry) => {
    if (entry.status === 'done' && entry.result) {
      // If auto-reconcile ran, redirect straight to Review
      if (entry.result.auto_session_id) {
        window.location.href = `/review?session_id=${entry.result.auto_session_id}`
        return
      }
      const newRow: FileRowData = {
        id:                         entry.result.upload_id,
        filename:                   entry.file.name,
        file_size_bytes:            entry.file.size,
        classification:             entry.result.classification,
        classification_confidence:  entry.result.confidence,
        transactions_count:         entry.result.transactions_count,
        status:                     entry.result.auto_confirmed ? 'confirmed' : 'classified',
        created_at:                 new Date().toISOString(),
      }
      setUploads(prev => [newRow, ...prev])
      setTotal(prev => prev + (entry.result!.auto_confirmed ? 0 : 1))
      // Refresh queue so confirmed status shows correctly
      if (entry.result.auto_confirmed) fetchUploads()
    } else if (entry.status === 'error') {
      fetchUploads()
    }
  }, [fetchUploads])

  const pendingCount = uploads.filter(u => u.status === 'classified').length

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Inbox"
        subtitle="Drop your files — AI classifies and reconciles automatically"
      />

      <div className="flex-1 p-6 space-y-6 max-w-5xl">

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

        {/* Workflow guide */}
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-5 py-3">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-blue-400 mb-2">How it works</p>
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-blue-700">
            {[
              { step: '1', label: 'Drop your files',              auto: false },
              { step: '2', label: 'AI classifies automatically',  auto: true  },
              { step: '3', label: 'Reconciliation runs itself',   auto: true  },
              { step: '4', label: 'Review flagged items',         auto: false, href: '/review' },
            ].map((s, i, arr) => (
              <span key={s.step} className="flex items-center gap-1.5">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium ${
                    s.auto ? 'text-white' : 'bg-white border border-blue-200 text-blue-600'
                  }`}
                  style={s.auto ? { background: '#1E3A5F' } : {}}
                >
                  {s.auto && <span className="text-[9px]">✦</span>}
                  {s.href ? <a href={s.href} className="hover:underline">{s.label}</a> : <span>{s.label}</span>}
                </span>
                {i < arr.length - 1 && <span className="text-blue-200">→</span>}
              </span>
            ))}
            <span className="text-[10px] text-blue-400 ml-1">✦ automated</span>
          </div>
        </div>

        {/* Section A: Upload zone */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Upload Files</h2>
          <UploadZone onUploadComplete={handleUploadComplete} />
        </section>

        {/* Section B: Classification queue */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">
              Classification Queue
              {totalPending > 0 && (
                <span
                  className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
                  style={{ background: '#D97706' }}
                >
                  {totalPending}
                </span>
              )}
            </h2>
          </div>
          <ClassificationQueue
            uploads={uploads}
            loading={loading}
            onRefresh={fetchUploads}
          />
        </section>
      </div>
    </div>
  )
}
