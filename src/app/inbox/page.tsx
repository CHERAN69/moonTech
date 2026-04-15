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
    // When an upload completes, add it to the top of the list optimistically
    if (entry.status === 'done' && entry.result) {
      const newRow: FileRowData = {
        id:                         entry.result.upload_id,
        filename:                   entry.file.name,
        file_size_bytes:            entry.file.size,
        classification:             entry.result.classification,
        classification_confidence:  entry.result.confidence,
        transactions_count:         entry.result.transactions_count,
        status:                     'classified',
        created_at:                 new Date().toISOString(),
      }
      setUploads(prev => [newRow, ...prev])
      setTotal(prev => prev + 1)
    } else if (entry.status === 'error') {
      // Still trigger a refresh to show accurate state
      fetchUploads()
    }
  }, [fetchUploads])

  // Pending count for TopBar badge
  const pendingCount = uploads.filter(u => u.status === 'classified').length

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Inbox"
        subtitle="Upload documents — AI classifies and queues them for action"
        actions={
          pendingCount > 0 ? (
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full text-white"
              style={{ background: '#D97706' }}
            >
              {pendingCount} need confirmation
            </span>
          ) : undefined
        }
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
