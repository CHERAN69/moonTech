'use client'

import { useState } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { CloseTask, TaskStatus } from '@/types'

const DEMO_TASKS: CloseTask[] = [
  { id: '1', title: 'Reconcile main checking account', category: 'reconciliation', status: 'complete', is_recurring: true },
  { id: '2', title: 'Reconcile Stripe payouts', category: 'reconciliation', status: 'in_progress', is_recurring: true },
  { id: '3', title: 'Reconcile credit card statements', category: 'reconciliation', status: 'not_started', is_recurring: true },
  { id: '4', title: 'Review and approve AI journal entries (5 pending)', category: 'journal_entries', status: 'not_started', is_recurring: false },
  { id: '5', title: 'Post depreciation journal entries', category: 'journal_entries', status: 'complete', is_recurring: true },
  { id: '6', title: 'Accrue unpaid vendor invoices', category: 'journal_entries', status: 'not_started', is_recurring: true },
  { id: '7', title: 'Review AP aging — 2 invoices overdue 60+ days', category: 'review', status: 'not_started', is_recurring: false },
  { id: '8', title: 'Review AR aging — collect $88,400 outstanding', category: 'review', status: 'not_started', is_recurring: false },
  { id: '9', title: 'Variance analysis vs. prior month', category: 'review', status: 'not_started', is_recurring: true },
  { id: '10', title: 'CFO review and sign-off', category: 'approval', status: 'not_started', is_recurring: true, depends_on: ['1', '2', '3', '4', '5', '6'] },
]

const STATUS_COLORS: Record<TaskStatus, { bg: string; text: string; label: string }> = {
  complete: { bg: 'var(--success-bg)', text: 'var(--success)', label: 'Complete' },
  in_progress: { bg: 'var(--info-bg)', text: 'var(--brand)', label: 'In Progress' },
  not_started: { bg: 'var(--bg-tertiary)', text: 'var(--text-tertiary)', label: 'Not Started' },
  blocked: { bg: 'var(--error-bg)', text: 'var(--error)', label: 'Blocked' },
}

const CATEGORY_LABELS: Record<string, string> = {
  reconciliation: 'Reconciliation',
  journal_entries: 'Journal Entries',
  review: 'Review',
  reporting: 'Reporting',
  approval: 'Approval',
}

export default function CloseOSPage() {
  const [tasks, setTasks] = useState(DEMO_TASKS)
  const [activeTab, setActiveTab] = useState<'checklist' | 'journal'>('checklist')

  const complete = tasks.filter(t => t.status === 'complete').length
  const total = tasks.length
  const score = Math.round((complete / total) * 100)

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t =>
      t.id === id ? { ...t, status: t.status === 'complete' ? 'not_started' : 'complete' } : t
    ))
  }

  const scoreColor = score >= 80 ? 'var(--success)' : score >= 50 ? 'var(--warning)' : 'var(--error)'

  return (
    <div className="flex flex-col h-full">
      <TopBar title="CloseOS" subtitle="April 2026 close period" closeScore={score} />

      <div className="flex-1 p-6">
        {/* Progress bar */}
        <div className="rounded-2xl p-6 mb-5" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>April 2026 Close Progress</h2>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{complete} of {total} tasks complete</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold" style={{ color: scoreColor }}>{score}</div>
              <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Close Score</div>
            </div>
          </div>
          <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score}%`, background: scoreColor }}></div>
          </div>
          {score >= 100 && (
            <button className="mt-4 w-full py-3 rounded-xl font-semibold text-white transition-opacity hover:opacity-90" style={{ background: 'var(--success)' }}>
              Sign Off April 2026 Close
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {(['checklist', 'journal'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={activeTab === tab
                ? { background: 'var(--brand)', color: '#fff' }
                : { background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }
              }>
              {tab === 'checklist' ? 'Close Checklist' : 'Journal Entries (5)'}
            </button>
          ))}
        </div>

        {activeTab === 'checklist' && (
          <div className="rounded-2xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            {['reconciliation', 'journal_entries', 'review', 'approval'].map(category => {
              const categoryTasks = tasks.filter(t => t.category === category)
              if (categoryTasks.length === 0) return null
              return (
                <div key={category} style={{ borderBottom: '1px solid var(--border)' }} className="last:border-0">
                  <div className="px-5 py-3 rounded-t-2xl" style={{ background: 'var(--bg-tertiary)' }}>
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                      {CATEGORY_LABELS[category] || category}
                      <span className="ml-auto">{categoryTasks.filter(t => t.status === 'complete').length}/{categoryTasks.length}</span>
                    </div>
                  </div>
                  <div>
                    {categoryTasks.map(task => {
                      const cfg = STATUS_COLORS[task.status]
                      return (
                        <div key={task.id} className="flex items-center gap-4 px-5 py-3.5 transition-colors" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <button onClick={() => toggleTask(task.id)}
                            className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors"
                            style={task.status === 'complete'
                              ? { background: 'var(--success)', border: '2px solid var(--success)' }
                              : { border: '2px solid var(--text-muted)' }
                            }>
                            {task.status === 'complete' && <span className="text-white text-xs font-bold">✓</span>}
                          </button>
                          <span className={`flex-1 text-sm ${task.status === 'complete' ? 'line-through' : ''}`}
                            style={{ color: task.status === 'complete' ? 'var(--text-muted)' : 'var(--text-primary)' }}>
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
          <div className="rounded-2xl p-6" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            <div className="space-y-4">
              {[
                { desc: 'April depreciation — equipment', amount: 2400, debit: 'Depreciation Expense', credit: 'Acc. Depreciation', status: 'pending_approval', ai: true },
                { desc: 'Prepaid insurance amortization — April', amount: 850, debit: 'Insurance Expense', credit: 'Prepaid Insurance', status: 'pending_approval', ai: true },
                { desc: 'Accrued payroll — April 16–30', amount: 24100, debit: 'Salaries Expense', credit: 'Accrued Payroll', status: 'draft', ai: true },
                { desc: 'AWS usage spike — product launch', amount: 4200, debit: 'Cloud Infrastructure (COGS)', credit: 'Cash', status: 'draft', ai: true },
                { desc: 'Mailchimp annual subscription accrual', amount: 960, debit: 'Marketing Expense', credit: 'Accrued Liabilities', status: 'draft', ai: true },
              ].map((je, i) => (
                <div key={i} className="rounded-xl p-4" style={{ border: '1px solid var(--border)', background: 'var(--bg-tertiary)' }}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{je.desc}</div>
                      <div className="text-xs mt-0.5 flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
                        <span className="px-1.5 py-0.5 rounded font-medium" style={{ background: 'var(--info-bg)', color: 'var(--brand)' }}>AI Drafted</span>
                        · April 30, 2026
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold" style={{ color: 'var(--text-primary)' }}>${je.amount.toLocaleString()}</div>
                      <div className="text-xs mt-0.5" style={{ color: je.status === 'pending_approval' ? 'var(--warning)' : 'var(--text-tertiary)' }}>
                        {je.status === 'pending_approval' ? 'Awaiting Approval' : 'Draft'}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 text-xs mb-3">
                    <span className="px-2 py-1 rounded" style={{ background: 'var(--error-bg)', color: 'var(--error)' }}>DR: {je.debit}</span>
                    <span className="px-2 py-1 rounded" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>CR: {je.credit}</span>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-3 py-1.5 text-xs font-medium text-white rounded-lg" style={{ background: 'var(--success)' }}>Approve & Post</button>
                    <button className="px-3 py-1.5 text-xs font-medium rounded-lg" style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>Edit</button>
                    <button className="px-3 py-1.5 text-xs font-medium transition-colors" style={{ color: 'var(--error)' }}>Reject</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
