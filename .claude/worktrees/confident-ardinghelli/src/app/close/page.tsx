'use client'

import { useState, useEffect } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { CloseTask, TaskStatus } from '@/types'
import Link from 'next/link'

const STATUS_COLORS: Record<TaskStatus, { bg: string; text: string; label: string }> = {
  complete:    { bg: '#F0FDF4', text: '#16A34A', label: 'Complete'    },
  in_progress: { bg: '#EFF6FF', text: '#2563EB', label: 'In Progress' },
  not_started: { bg: '#F3F4F6', text: '#6B7280', label: 'Not Started' },
  blocked:     { bg: '#FEF2F2', text: '#DC2626', label: 'Blocked'     },
}

const CATEGORY_ICONS: Record<string, string> = {
  reconciliation: '🔄',
  journal_entries: '📓',
  review: '🔍',
  reporting: '📊',
  approval: '✅',
}

export default function CloseOSPage() {
  const [tasks,       setTasks]     = useState<CloseTask[]>([])
  const [checklistId, setId]        = useState<string | null>(null)
  const [loading,     setLoading]   = useState(true)
  const [error,       setError]     = useState<string | null>(null)
  const [activeTab,   setActiveTab] = useState<'checklist' | 'journal'>('checklist')
  const [saving,      setSaving]    = useState(false)

  useEffect(() => {
    fetch('/api/close')
      .then(r => {
        if (r.status === 401) throw new Error('auth')
        if (!r.ok) throw new Error('server')
        return r.json()
      })
      .then(json => {
        if (json.checklist) {
          setTasks(json.checklist.tasks ?? [])
          setId(json.checklist.id)
        } else {
          setTasks([])
        }
      })
      .catch(err => setError(err.message === 'auth' ? 'Sign in to view your close checklist.' : 'Failed to load checklist.'))
      .finally(() => setLoading(false))
  }, [])

  const complete = tasks.filter(t => t.status === 'complete').length
  const total    = tasks.length
  const score    = total > 0 ? Math.round((complete / total) * 100) : 0

  const toggleTask = async (id: string) => {
    const updated = tasks.map(t =>
      t.id === id ? { ...t, status: (t.status === 'complete' ? 'not_started' : 'complete') as TaskStatus } : t
    )
    setTasks(updated)
    if (!checklistId) return
    setSaving(true)
    try {
      await fetch('/api/close', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: checklistId, tasks: updated }),
      })
    } finally {
      setSaving(false)
    }
  }

  const categories = ['reconciliation', 'journal_entries', 'review', 'approval']

  return (
    <div className="flex flex-col h-full">
      <TopBar title="CloseOS" subtitle="Month-end close checklist" closeScore={score} />

      <div className="flex-1 p-6">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <div className="text-4xl mb-3">🔐</div>
            <div className="text-sm font-medium text-gray-700 mb-1">{error}</div>
            {error.includes('Sign in') && (
              <Link href="/login" className="mt-2 text-xs text-blue-600 underline">Go to login →</Link>
            )}
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <div className="text-4xl mb-3">📋</div>
            <div className="text-sm font-medium text-gray-700 mb-1">No close checklist yet.</div>
            <p className="text-xs text-gray-400">Your controller or admin can create a checklist for this close period.</p>
          </div>
        ) : (
          <>
            {/* Progress bar */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="font-semibold text-gray-900">Close Progress</h2>
                  <p className="text-sm text-gray-400 mt-0.5">{complete} of {total} tasks complete{saving ? ' · Saving…' : ''}</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold" style={{ color: score >= 80 ? '#16A34A' : score >= 50 ? '#D97706' : '#DC2626' }}>{score}</div>
                  <div className="text-xs text-gray-400">Close Score</div>
                </div>
              </div>
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score}%`, background: score >= 80 ? '#16A34A' : score >= 50 ? '#D97706' : '#2E75B6' }}></div>
              </div>
              {score >= 100 && (
                <button className="mt-4 w-full py-3 rounded-xl font-semibold text-white transition-opacity hover:opacity-90" style={{ background: '#16A34A' }}>
                  ✓ Sign Off Close
                </button>
              )}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-4">
              {(['checklist', 'journal'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab ? 'text-white' : 'text-gray-500 bg-white border border-gray-200 hover:bg-gray-50'}`}
                  style={activeTab === tab ? { background: '#1E3A5F' } : {}}>
                  {tab === 'checklist' ? '📋 Close Checklist' : '📓 Journal Entries'}
                </button>
              ))}
            </div>

            {activeTab === 'checklist' && (
              <div className="bg-white rounded-2xl border border-gray-100">
                {categories.map(category => {
                  const categoryTasks = tasks.filter(t => t.category === category)
                  if (categoryTasks.length === 0) return null
                  return (
                    <div key={category} className="border-b border-gray-50 last:border-0">
                      <div className="px-5 py-3 bg-gray-50 rounded-t-2xl">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                          <span>{CATEGORY_ICONS[category] ?? '📌'}</span>
                          {category.replace('_', ' ')}
                          <span className="ml-auto">{categoryTasks.filter(t => t.status === 'complete').length}/{categoryTasks.length}</span>
                        </div>
                      </div>
                      <div className="divide-y divide-gray-50">
                        {categoryTasks.map(task => {
                          const cfg = STATUS_COLORS[task.status]
                          return (
                            <div key={task.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                              <button onClick={() => toggleTask(task.id)}
                                className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-colors ${task.status === 'complete' ? 'border-green-500 bg-green-500' : 'border-gray-300 hover:border-gray-400'}`}>
                                {task.status === 'complete' && <span className="text-white text-xs font-bold">✓</span>}
                              </button>
                              <span className={`flex-1 text-sm ${task.status === 'complete' ? 'line-through text-gray-300' : 'text-gray-700'}`}>
                                {task.title}
                              </span>
                              <span className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0" style={{ background: cfg.bg, color: cfg.text }}>
                                {cfg.label}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {activeTab === 'journal' && (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                <div className="text-4xl mb-3">📓</div>
                <div className="text-sm font-medium text-gray-700 mb-1">Journal entries coming soon</div>
                <p className="text-xs text-gray-400">AI-drafted journal entries will appear here once your accounting integration is connected.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
