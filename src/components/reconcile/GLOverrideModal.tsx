'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

// ─── Common GL categories (quick-pick) ───────────────────────────────────────

const GL_PRESETS = [
  'Software & SaaS',
  'Cloud Infrastructure',
  'Marketing & Advertising',
  'Payroll & Benefits',
  'Office & Facilities',
  'Travel & Entertainment',
  'Professional Services',
  'Equipment & Hardware',
  'Utilities',
  'Insurance',
  'Taxes & Licenses',
  'Interest Expense',
  'Cost of Goods Sold',
  'Research & Development',
  'Other Operating Expenses',
]

export interface GLOverrideModalProps {
  pairId:      string
  currentGL:   string | undefined | null
  vendorName:  string
  /** Called with the new GL string + optional note. Returns a Promise. */
  onSave: (gl: string, note: string) => Promise<void>
  onClose: () => void
}

export function GLOverrideModal({
  currentGL,
  vendorName,
  onSave,
  onClose,
}: GLOverrideModalProps) {
  const [gl, setGl]       = useState(currentGL ?? '')
  const [note, setNote]   = useState('')
  const [loading, setLoading] = useState(false)
  const [filter, setFilter]   = useState('')

  const filtered = GL_PRESETS.filter(p =>
    p.toLowerCase().includes(filter.toLowerCase())
  )

  const handleSave = async () => {
    if (!gl.trim()) return
    setLoading(true)
    try {
      await onSave(gl.trim(), note.trim())
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-gray-100 shadow-2xl w-full max-w-md mx-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Override GL Category</h3>
            <p className="text-xs text-gray-400 mt-0.5">{vendorName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Current GL (read-only) */}
          {currentGL && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 border border-gray-100">
              <span className="text-xs text-gray-400">Current:</span>
              <span className="text-sm text-gray-600">{currentGL}</span>
              <span className="ml-auto text-gray-300">→</span>
            </div>
          )}

          {/* New GL input */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              New GL Category
            </label>
            <input
              type="text"
              value={gl}
              onChange={e => { setGl(e.target.value); setFilter(e.target.value) }}
              placeholder="Type or choose below…"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
              autoFocus
            />
          </div>

          {/* Quick-pick presets */}
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Quick Pick
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
              {filtered.map(preset => (
                <button
                  key={preset}
                  onClick={() => { setGl(preset); setFilter('') }}
                  className={cn(
                    'px-2.5 py-1 text-xs rounded-lg border transition-colors',
                    gl === preset
                      ? 'text-white border-transparent'
                      : 'text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
                  )}
                  style={gl === preset ? { background: '#1E3A5F', borderColor: '#1E3A5F' } : {}}
                >
                  {preset}
                </button>
              ))}
              {filtered.length === 0 && (
                <span className="text-xs text-gray-400">No presets match &quot;{filter}&quot;</span>
              )}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Note <span className="text-gray-300 normal-case font-normal">(optional)</span>
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Reason for override…"
              rows={2}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading || !gl.trim()}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ background: '#1E3A5F' }}
          >
            {loading ? 'Saving…' : 'Save Override'}
          </button>
        </div>
      </div>
    </div>
  )
}
