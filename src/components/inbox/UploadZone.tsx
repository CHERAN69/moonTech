'use client'

/**
 * UploadZone — Drag-and-drop file upload area for the Inbox.
 *
 * Accepts CSV, XLSX, XLS, PDF. Shows per-file progress.
 * Client-side size check (9.x) before upload.
 */

import { useRef, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'

export type FileUploadStatus = 'pending' | 'uploading' | 'done' | 'error'

export interface FileUploadEntry {
  id: string
  file: File
  status: FileUploadStatus
  progress: number       // 0-100
  error?: string
  result?: {
    upload_id: string
    classification: string
    confidence: number
    transactions_count: number
  }
}

interface UploadZoneProps {
  onUploadComplete: (entry: FileUploadEntry) => void
  maxFileSizeMB?: number
}

const ACCEPT_TYPES = '.csv,.xlsx,.xls,.pdf'
const ACCEPTED_EXT = ['.csv', '.xlsx', '.xls', '.pdf']
const CATEGORY_HINTS = [
  { value: 'bank_statement', label: 'Bank Statement' },
  { value: 'invoice',        label: 'Invoice / AR'   },
  { value: 'payroll',        label: 'Payroll'         },
  { value: 'journal_entry',  label: 'Journal Entry'  },
  { value: 'receipt',        label: 'Receipt'         },
  { value: '',               label: 'Auto-Detect'     },
]

function CloudUploadIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 16 12 12 8 16"/>
      <line x1="12" y1="12" x2="12" y2="21"/>
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
    </svg>
  )
}

export function UploadZone({ onUploadComplete, maxFileSizeMB = 10 }: UploadZoneProps) {
  const [dragging, setDragging]           = useState(false)
  const [categoryHint, setCategoryHint]   = useState('')
  const [uploads, setUploads]             = useState<FileUploadEntry[]>([])
  const inputRef                          = useRef<HTMLInputElement>(null)

  const updateEntry = useCallback((id: string, update: Partial<FileUploadEntry>) => {
    setUploads(prev => prev.map(e => e.id === id ? { ...e, ...update } : e))
  }, [])

  const uploadFile = useCallback(async (file: File) => {
    // 9.x — client-side size check
    if (file.size > maxFileSizeMB * 1024 * 1024) {
      const id = crypto.randomUUID()
      const entry: FileUploadEntry = {
        id, file, status: 'error', progress: 0,
        error: `File too large. Maximum size is ${maxFileSizeMB} MB. This file is ${(file.size / 1024 / 1024).toFixed(1)} MB.`,
      }
      setUploads(prev => [...prev, entry])
      onUploadComplete(entry)
      return
    }

    const ext = `.${file.name.split('.').pop()?.toLowerCase()}`
    if (!ACCEPTED_EXT.includes(ext)) {
      const id = crypto.randomUUID()
      const entry: FileUploadEntry = {
        id, file, status: 'error', progress: 0,
        error: `Unsupported file type "${ext}". Please upload CSV, XLSX, XLS, or PDF.`,
      }
      setUploads(prev => [...prev, entry])
      onUploadComplete(entry)
      return
    }

    const id = crypto.randomUUID()
    const entry: FileUploadEntry = { id, file, status: 'uploading', progress: 10 }
    setUploads(prev => [...prev, entry])

    const formData = new FormData()
    formData.append('file', file)
    if (categoryHint) formData.append('category_hint', categoryHint)

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 90_000)
      updateEntry(id, { progress: 30 })
      const res = await fetch('/api/inbox/upload', { method: 'POST', body: formData, signal: controller.signal })
      clearTimeout(timeout)
      updateEntry(id, { progress: 80 })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload failed' }))
        const errorEntry: FileUploadEntry = { id, file, status: 'error', progress: 0, error: err.error || 'Upload failed' }
        updateEntry(id, errorEntry)
        onUploadComplete(errorEntry)
        return
      }

      const data = await res.json()
      const doneEntry: FileUploadEntry = {
        id, file, status: 'done', progress: 100,
        result: {
          upload_id:          data.upload_id,
          classification:     data.classification,
          confidence:         data.confidence,
          transactions_count: data.transactions_count,
        },
      }
      updateEntry(id, doneEntry)
      onUploadComplete(doneEntry)
    } catch (err) {
      const isTimeout = err instanceof Error && err.name === 'AbortError'
      const errorEntry: FileUploadEntry = { id, file, status: 'error', progress: 0, error: isTimeout ? 'Upload timed out — the file may be too large or the server is slow. Please try again.' : 'Network error — please try again.' }
      updateEntry(id, errorEntry)
      onUploadComplete(errorEntry)
    }
  }, [categoryHint, maxFileSizeMB, onUploadComplete, updateEntry])

  const handleFiles = useCallback((files: FileList | File[]) => {
    Array.from(files).forEach(uploadFile)
  }, [uploadFile])

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files)
  }

  return (
    <div className="space-y-4">
      {/* Category hint chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-400 font-medium">Category hint (optional):</span>
        {CATEGORY_HINTS.map(c => (
          <button
            key={c.value}
            onClick={() => setCategoryHint(c.value)}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium transition-all border',
              categoryHint === c.value
                ? 'text-white border-transparent'
                : 'text-gray-500 border-gray-200 bg-white hover:bg-gray-50'
            )}
            style={categoryHint === c.value ? { background: '#1E3A5F', borderColor: '#1E3A5F' } : {}}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all',
          dragging
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/30'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT_TYPES}
          className="hidden"
          onChange={e => e.target.files && handleFiles(e.target.files)}
        />

        <div className="flex flex-col items-center gap-3 pointer-events-none">
          <div className="text-gray-300">
            <CloudUploadIcon />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">
              {dragging ? 'Drop files here' : 'Drag & drop files, or click to browse'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              CSV, XLSX, XLS up to {maxFileSizeMB} MB · PDF support coming soon
            </p>
          </div>
          <div className="flex gap-2">
            {['CSV', 'XLSX', 'XLS'].map(f => (
              <span key={f} className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-500">
                {f}
              </span>
            ))}
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-400">
              PDF (soon)
            </span>
          </div>
        </div>
      </div>

      {/* Per-file upload progress */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          {uploads.map(entry => (
            <div key={entry.id} className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3">
              {/* File icon */}
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: entry.status === 'error' ? '#FEF2F2' : '#EFF6FF' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke={entry.status === 'error' ? '#DC2626' : '#2E75B6'} strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-700 truncate">{entry.file.name}</p>
                {entry.status === 'uploading' && (
                  <div className="mt-1 space-y-0.5">
                    <p className="text-[10px] text-gray-400">
                      {entry.progress >= 80 ? 'AI classifying…' : entry.progress >= 30 ? 'Uploading…' : 'Preparing…'}
                    </p>
                    <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-blue-400 transition-all" style={{ width: `${entry.progress}%` }} />
                    </div>
                  </div>
                )}
                {entry.status === 'done' && entry.result && (
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {entry.result.classification} · {entry.result.confidence}% confidence · {entry.result.transactions_count} rows
                  </p>
                )}
                {entry.status === 'error' && (
                  <p className="text-[10px] text-red-500 mt-0.5">{entry.error}</p>
                )}
              </div>

              {/* Status badge */}
              <div className="flex-shrink-0">
                {entry.status === 'uploading' && (
                  <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
                )}
                {entry.status === 'done' && (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: '#16A34A' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                )}
                {entry.status === 'error' && (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center bg-red-100">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
