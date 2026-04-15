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
  complete: { bg: '#F0FDF4', text: '#16A34A', label: 'Complete' },
  in_progress: { bg: '#EFF6FF', text: '#2563EB', label: 'In Progress' },
  not_started: { bg: '#F3F4F6', text: '#6B7280', label: 'Not Started' },
  blocked: { bg: '#FEF2F2', text: '#DC2626', label: 'Blocked' },
}

const CATEGORY_ICONS: Record<string, string> = {
  reconciliation: '🔄',
  journal_entries: '📓',
  review: '🔍',
  reporting: '📊',
  approval: '✅',
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

  return (
    <div className="flex flex-col h-full">
      <TopBar title="CloseOS" subtitle="April 2026 close period" closeScore={score} />

      <div className="flex-1 p-6">
        {/* Progress bar */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-semibold text-gray-900">April 2026 Close Progress</h2>
              <p className="text-sm text-gray-400 mt-0.5">{complete} of {total} tasks complete</p>
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
              ✓ Sign Off April 2026 Close
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {(['checklist', 'journal'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab ? 'text-white' : 'text-gray-500 bg-white border border-gray-200 hover:bg-gray-50'}`}
              style={activeTab === tab ? { background: '#1E3A5F' } : {}}>
              {tab === 'checklist' ? '📋 Close Checklist' : '📓 Journal Entries (5)'}
            </button>
          ))}
        </div>

        {activeTab === 'checklist' && (
          <div className="bg-white rounded-2xl border border-gray-100">
            {['reconciliation', 'journal_entries', 'review', 'approval'].map(category => {
              const categoryTasks = tasks.filter(t => t.category === category)
              if (categoryTasks.length === 0) return null
              return (
                <div key={category} className="border-b border-gray-50 last:border-0">
                  <div className="px-5 py-3 bg-gray-50 rounded-t-2xl">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      <span>{CATEGORY_ICONS[category]}</span>
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
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="space-y-4">
              {[
                { desc: 'April depreciation — equipment', amount: 2400, debit: 'Depreciation Expense', credit: 'Acc. Depreciation', status: 'pending_approval', ai: true },
                { desc: 'Prepaid insurance amortization — April', amount: 850, debit: 'Insurance Expense', credit: 'Prepaid Insurance', status: 'pending_approval', ai: true },
                { desc: 'Accrued payroll — April 16–30', amount: 24100, debit: 'Salaries Expense', credit: 'Accrued Payroll', status: 'draft', ai: true },
                { desc: 'AWS usage spike — product launch', amount: 4200, debit: 'Cloud Infrastructure (COGS)', credit: 'Cash', status: 'draft', ai: true },
                { desc: 'Mailchimp annual subscription accrual', amount: 960, debit: 'Marketing Expense', credit: 'Accrued Liabilities', status: 'draft', ai: true },
              ].map((je, i) => (
                <div key={i} className="border border-gray-100 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-medium text-gray-800 text-sm">{je.desc}</div>
                      <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                        <span className="px-1.5 py-0.5 rounded text-blue-600 bg-blue-50 font-medium">AI Drafted</span>
                        · April 30, 2026
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-900">${je.amount.toLocaleString()}</div>
                      <div className={`text-xs mt-0.5 ${je.status === 'pending_approval' ? 'text-amber-500' : 'text-gray-400'}`}>
                        {je.status === 'pending_approval' ? 'Awaiting Approval' : 'Draft'}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 text-xs text-gray-500 mb-3">
                    <span className="px-2 py-1 bg-red-50 text-red-600 rounded">DR: {je.debit}</span>
                    <span className="px-2 py-1 bg-green-50 text-green-600 rounded">CR: {je.credit}</span>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-3 py-1.5 text-xs font-medium text-white rounded-lg" style={{ background: '#16A34A' }}>Approve & Post</button>
                    <button className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Edit</button>
                    <button className="px-3 py-1.5 text-xs font-medium text-red-500 hover:text-red-700 transition-colors">Reject</button>
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
