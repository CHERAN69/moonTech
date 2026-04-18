'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { SkeletonList } from '@/components/ui/Skeleton'
import type { CloseTask, TaskStatus } from '@/types'

const STATUS_COLORS: Record<TaskStatus, { bg: string; text: string; label: string }> = {
  complete:    { bg: '#F0FDF4', text: '#16A34A', label: 'Complete' },
  in_progress: { bg: '#EFF6FF', text: '#2563EB', label: 'In Progress' },
  not_started: { bg: '#F3F4F6', text: '#6B7280', label: 'Not Started' },
  blocked:     { bg: '#FEF2F2', text: '#DC2626', label: 'Blocked' },
}

const CATEGORY_ICONS: Record<string, string> = {
  reconciliation: '🔄',
  journal_entries: '📓',
  review: '🔍',
  reporting: '📊',
  approval: '✅',
}

interface JournalEntry {
  id: string
  description: string
  date: string
  lines: Array<{ account: string; description: string; debit?: number; credit?: number }>
  total_amount: number
  status: string
  ai_generated: boolean
  ai_reasoning?: string
}

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [onClose])
  const bg = type === 'success' ? '#16A34A' : '#DC2626'
  return (
    <div
      role="alert"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white"
      style={{ background: bg }}
    >
      {type === 'success' ? '✓' : '✗'} {message}
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100" aria-label="Dismiss notification">✕</button>
    </div>
  )
}

function CloseOSPageInner() {
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab') === 'journal' ? 'journal' : 'checklist'

  const [activeTab, setActiveTab]         = useState<'checklist' | 'journal'>(initialTab)
  const [tasks, setTasks]                 = useState<CloseTask[]>([])
  const [checklistId, setChecklistId]     = useState<string | null>(null)
  const [signedOff, setSignedOff]         = useState(false)
  const [periodStart, setPeriodStart]     = useState('')
  const [, setPeriodEnd]                  = useState('')
  const [loading, setLoading]             = useState(true)
  const [saving, setSaving]               = useState<string | null>(null)
  const [journals, setJournals]           = useState<JournalEntry[]>([])
  const [journalLoading, setJournalLoad]  = useState(false)
  const [toast, setToast]                 = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [signingOff, setSigningOff]       = useState(false)
  const [closeRisk, setCloseRisk]         = useState<{ risk_level: 'low' | 'medium' | 'high'; predicted_close_date: string; risk_factors: string[]; recommendations: string[] } | null>(null)
  const [riskLoading, setRiskLoading]     = useState(false)

  const fetchChecklist = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/close-checklist')
      if (!res.ok) throw new Error('Failed to load checklist')
      const json = await res.json()
      setTasks(json.tasks ?? [])
      setChecklistId(json.checklist?.id ?? null)
      setSignedOff(json.signed_off ?? false)
      setPeriodStart(json.period_start ?? '')
      setPeriodEnd(json.period_end ?? '')
    } catch (err) {
      console.error('Checklist load error:', err)
      setToast({ message: 'Failed to load checklist', type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchJournals = useCallback(async () => {
    setJournalLoad(true)
    try {
      const res = await fetch('/api/journal-entries?status=draft&status=pending_approval&limit=50')
      if (!res.ok) throw new Error()
      const json = await res.json()
      setJournals(json.entries ?? [])
    } catch {
      setToast({ message: 'Failed to load journal entries', type: 'error' })
    } finally {
      setJournalLoad(false)
    }
  }, [])

  const fetchCloseRisk = useCallback(async () => {
    setRiskLoading(true)
    try {
      const res = await fetch('/api/close-risk')
      if (!res.ok) throw new Error('Failed to load close risk')
      const json = await res.json()
      setCloseRisk(json)
    } catch (err) {
      console.error('Close risk load error:', err)
    } finally {
      setRiskLoading(false)
    }
  }, [])

  useEffect(() => { fetchChecklist() }, [fetchChecklist])
  useEffect(() => { if (activeTab === 'journal') fetchJournals() }, [activeTab, fetchJournals])
  useEffect(() => { fetchCloseRisk() }, [fetchCloseRisk])

  const complete  = tasks.filter(t => t.status === 'complete').length
  const total     = tasks.length
  const score     = total > 0 ? Math.round((complete / total) * 100) : 0
  const allDone   = complete === total && total > 0

  const ensureChecklistExists = async (): Promise<string | null> => {
    if (checklistId) return checklistId
    // Create checklist for current period
    const now   = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
    const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
    const res   = await fetch('/api/close-checklist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ period_start: start, period_end: end }),
    })
    if (!res.ok) return null
    const json = await res.json()
    setChecklistId(json.checklist?.id)
    return json.checklist?.id ?? null
  }

  const toggleTask = async (id: string) => {
    if (signedOff) return
    const task     = tasks.find(t => t.id === id)
    if (!task) return
    const newStatus: TaskStatus = task.status === 'complete' ? 'not_started' : 'complete'

    // Optimistic update
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t))
    setSaving(id)

    try {
      await ensureChecklistExists()
      const res = await fetch('/api/close-checklist?action=update_task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: id, status: newStatus }),
      })
      if (!res.ok) throw new Error()
    } catch {
      // Revert on failure
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status: task.status } : t))
      setToast({ message: 'Failed to update task', type: 'error' })
    } finally {
      setSaving(null)
    }
  }

  const handleSignOff = async () => {
    if (!allDone) return
    setSigningOff(true)
    try {
      await ensureChecklistExists()
      const now    = new Date()
      const period = now.toLocaleString('default', { month: 'long', year: 'numeric' })
      const res    = await fetch('/api/close-checklist?action=sign_off', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Sign-off failed')
      }
      setSignedOff(true)
      setToast({ message: `${period} close signed off successfully!`, type: 'success' })
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Sign-off failed', type: 'error' })
    } finally {
      setSigningOff(false)
    }
  }

  const handleJournalAction = async (id: string, action: string) => {
    setSaving(id)
    try {
      const res = await fetch(`/api/journal-entries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Action failed')
      }
      setToast({ message: `Journal entry ${action}d successfully`, type: 'success' })
      fetchJournals()
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Action failed', type: 'error' })
    } finally {
      setSaving(null)
    }
  }

  const periodLabel = periodStart
    ? new Date(periodStart + 'T00:00:00').toLocaleString('default', { month: 'long', year: 'numeric' })
    : new Date().toLocaleString('default', { month: 'long', year: 'numeric' })

  const pendingJournals = journals.filter(j => j.status === 'draft' || j.status === 'pending_approval').length

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Close" subtitle={`${periodLabel} close period`} closeScore={score} />

      <div className="flex-1 p-6">
        {/* Progress bar */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-semibold text-gray-900">{periodLabel} Close Progress</h2>
              <p className="text-sm text-gray-400 mt-0.5">{complete} of {total} tasks complete</p>
            </div>
            <div className="text-right">
              <div
                className="text-3xl font-bold"
                style={{ color: score >= 80 ? '#16A34A' : score >= 50 ? '#D97706' : '#DC2626' }}
                aria-label={`Close score: ${score} out of 100`}
              >
                {score}
              </div>
              <div className="text-xs text-gray-400">Close Score</div>
            </div>
          </div>
          <div
            className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={score}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Close completion: ${score}%`}
          >
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${score}%`,
                background: score >= 80 ? '#16A34A' : score >= 50 ? '#D97706' : '#2E75B6'
              }}
            />
          </div>
          {signedOff ? (
            <div className="mt-4 w-full py-3 rounded-xl font-semibold text-white text-center" style={{ background: '#16A34A' }}>
              ✓ {periodLabel} Close — Signed Off
            </div>
          ) : allDone ? (
            <button
              onClick={handleSignOff}
              disabled={signingOff}
              className="mt-4 w-full py-3 rounded-xl font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ background: '#16A34A' }}
            >
              {signingOff ? 'Signing off…' : `✓ Sign Off ${periodLabel} Close`}
            </button>
          ) : null}
        </div>

        {/* AI Close Risk Assessment Card */}
        {riskLoading ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin flex-shrink-0" />
              <span className="text-sm text-gray-400">Loading AI close risk assessment…</span>
            </div>
          </div>
        ) : closeRisk ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 text-sm">AI Close Risk Assessment</h3>
              <span
                className="text-xs px-2.5 py-1 rounded-full font-semibold"
                style={
                  closeRisk.risk_level === 'low'
                    ? { background: '#F0FDF4', color: '#16A34A' }
                    : closeRisk.risk_level === 'medium'
                    ? { background: '#FFFBEB', color: '#D97706' }
                    : { background: '#FEF2F2', color: '#DC2626' }
                }
              >
                {closeRisk.risk_level.charAt(0).toUpperCase() + closeRisk.risk_level.slice(1)} Risk
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Predicted close date: <span className="font-medium text-gray-700">{closeRisk.predicted_close_date}</span>
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {closeRisk.risk_factors.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Risk Factors</div>
                  <ul className="space-y-1">
                    {closeRisk.risk_factors.map((f, i) => (
                      <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                        <span className="text-red-400 mt-0.5 flex-shrink-0">•</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {closeRisk.recommendations.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Recommendations</div>
                  <ul className="space-y-1">
                    {closeRisk.recommendations.map((r, i) => (
                      <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                        <span className="text-green-500 mt-0.5 flex-shrink-0">•</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* Tabs */}
        <div className="flex gap-2 mb-4" role="tablist">
          {(['checklist', 'journal'] as const).map(tab => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab ? 'text-white' : 'text-gray-500 bg-white border border-gray-200 hover:bg-gray-50'}`}
              style={activeTab === tab ? { background: '#1E3A5F' } : {}}
            >
              {tab === 'checklist'
                ? '📋 Close Checklist'
                : `📓 Journal Entries${pendingJournals > 0 ? ` (${pendingJournals})` : ''}`}
            </button>
          ))}
        </div>

        {activeTab === 'checklist' && (
          loading ? (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <SkeletonList rows={10} />
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100">
              {['reconciliation', 'journal_entries', 'review', 'approval'].map(category => {
                const categoryTasks = tasks.filter(t => t.category === category)
                if (categoryTasks.length === 0) return null
                return (
                  <div key={category} className="border-b border-gray-50 last:border-0">
                    <div className="px-5 py-3 bg-gray-50">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                        <span aria-hidden="true">{CATEGORY_ICONS[category]}</span>
                        {category.replace('_', ' ')}
                        <span className="ml-auto">
                          {categoryTasks.filter(t => t.status === 'complete').length}/{categoryTasks.length}
                        </span>
                      </div>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {categoryTasks.map(task => {
                        const cfg = STATUS_COLORS[task.status]
                        return (
                          <div key={task.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                            <button
                              onClick={() => toggleTask(task.id)}
                              disabled={signedOff || saving === task.id}
                              aria-label={`Mark "${task.title}" as ${task.status === 'complete' ? 'incomplete' : 'complete'}`}
                              aria-pressed={task.status === 'complete'}
                              className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-colors disabled:opacity-50 ${task.status === 'complete' ? 'border-green-500 bg-green-500' : 'border-gray-300 hover:border-gray-400'}`}
                            >
                              {task.status === 'complete' && <span className="text-white text-xs font-bold" aria-hidden="true">✓</span>}
                            </button>
                            <span className={`flex-1 text-sm ${task.status === 'complete' ? 'line-through text-gray-300' : 'text-gray-700'}`}>
                              {task.title}
                            </span>
                            <span
                              className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                              style={{ background: cfg.bg, color: cfg.text }}
                              aria-label={`Status: ${cfg.label}`}
                            >
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
          )
        )}

        {activeTab === 'journal' && (
          journalLoading ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
              <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-400">Loading journal entries…</p>
            </div>
          ) : journals.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
              <div className="text-4xl mb-3">📓</div>
              <div className="text-sm font-medium text-gray-700">No pending journal entries</div>
              <div className="text-xs text-gray-400 mt-1">
                Journal entries drafted by the AI reconciliation engine will appear here for review.
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="space-y-4">
                {journals.map(je => (
                  <div key={je.id} className="border border-gray-100 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-medium text-gray-800 text-sm">{je.description}</div>
                        <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                          {je.ai_generated && (
                            <span className="px-1.5 py-0.5 rounded text-blue-600 bg-blue-50 font-medium">AI Drafted</span>
                          )}
                          <span>·</span>
                          <span>{new Date(je.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-gray-900">${je.total_amount.toLocaleString()}</div>
                        <div className={`text-xs mt-0.5 ${je.status === 'pending_approval' ? 'text-amber-500' : 'text-gray-400'}`}>
                          {je.status === 'pending_approval' ? 'Awaiting Approval' : 'Draft'}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 text-xs text-gray-500 mb-2 flex-wrap">
                      {(je.lines ?? []).slice(0, 2).map((line, i) => (
                        <span
                          key={i}
                          className={`px-2 py-1 rounded ${line.debit ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}
                        >
                          {line.debit ? 'DR' : 'CR'}: {line.account}
                        </span>
                      ))}
                    </div>
                    {(() => {
                      const lines = je.lines ?? []
                      const totalDebits  = lines.reduce((sum, l) => sum + (l.debit  || 0), 0)
                      const totalCredits = lines.reduce((sum, l) => sum + (l.credit || 0), 0)
                      const diff = Math.abs(totalDebits - totalCredits)
                      const balanced = diff < 0.01
                      return (
                        <div className="text-xs mb-3">
                          <span className="text-gray-400">
                            Debits: ${totalDebits.toFixed(2)} | Credits: ${totalCredits.toFixed(2)}
                          </span>
                          {' '}
                          {balanced ? (
                            <span className="text-green-600 font-medium">✓ Balanced</span>
                          ) : (
                            <span className="text-red-500 font-medium">⚠ Unbalanced by ${diff.toFixed(2)}</span>
                          )}
                        </div>
                      )
                    })()}
                    {je.ai_reasoning && (
                      <p className="text-xs text-gray-400 mb-3 italic">{je.ai_reasoning}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleJournalAction(je.id, 'approve')}
                        disabled={saving === je.id}
                        aria-label={`Approve journal entry: ${je.description}`}
                        className="px-3 py-1.5 text-xs font-medium text-white rounded-lg disabled:opacity-50 transition-opacity hover:opacity-90"
                        style={{ background: '#16A34A' }}
                      >
                        {saving === je.id ? '…' : 'Approve & Post'}
                      </button>
                      <button
                        onClick={() => handleJournalAction(je.id, 'edit')}
                        disabled={saving === je.id}
                        aria-label={`Edit journal entry: ${je.description}`}
                        className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleJournalAction(je.id, 'reject')}
                        disabled={saving === je.id}
                        aria-label={`Reject journal entry: ${je.description}`}
                        className="px-3 py-1.5 text-xs font-medium text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}

export default function CloseOSPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>}>
      <CloseOSPageInner />
    </Suspense>
  )
}
