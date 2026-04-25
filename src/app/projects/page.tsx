'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

type ProjectStatus = 'new' | 'in_process' | 'completed'

interface Project {
  id: string
  name: string
  period_start: string
  period_end: string
  status: string
  project_status: ProjectStatus
  matched_count: number | null
  unmatched_count: number | null
  flagged_count: number | null
  total_bank_transactions: number | null
  close_confidence_score: number | null
  created_at: string
  updated_at: string
}

interface ProjectsData {
  new:        Project[]
  in_process: Project[]
  completed:  Project[]
}

type Tab = 'new' | 'in_process' | 'completed'

const TABS: { key: Tab; label: string; color: string; dot: string }[] = [
  { key: 'new',        label: 'New Engagements',      color: 'text-blue-600',  dot: 'bg-blue-400'  },
  { key: 'in_process', label: 'Open Reconciliations', color: 'text-amber-600', dot: 'bg-amber-400' },
  { key: 'completed',  label: 'Closed Periods',       color: 'text-green-600', dot: 'bg-green-400' },
]

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function matchRate(p: Project): number {
  const total = (p.matched_count ?? 0) + (p.unmatched_count ?? 0) + (p.flagged_count ?? 0)
  if (total === 0) return 0
  return Math.round(((p.matched_count ?? 0) / total) * 100)
}

function StatusDot({ status }: { status: ProjectStatus }) {
  const colors: Record<ProjectStatus, string> = {
    new:        'bg-blue-400',
    in_process: 'bg-amber-400',
    completed:  'bg-green-400',
  }
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[status]}`} />
}

function EmptyTab({ tab }: { tab: Tab }) {
  const msgs: Record<Tab, { icon: string; title: string; sub: string }> = {
    new:        { icon: '📂', title: 'No new engagements',          sub: 'Upload source files to begin a new reconciliation engagement.' },
    in_process: { icon: '⚙️', title: 'No open reconciliations',     sub: 'Start a reconciliation from a new engagement to see active work here.' },
    completed:  { icon: '✅', title: 'No closed periods yet',        sub: 'Engagements appear here once all exceptions are reviewed and resolved.' },
  }
  const m = msgs[tab]
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-4xl mb-3">{m.icon}</div>
      <p className="text-sm font-medium text-gray-700">{m.title}</p>
      <p className="text-xs text-gray-400 mt-1 max-w-xs">{m.sub}</p>
    </div>
  )
}

function ProjectCard({ project, onReport }: { project: Project; onReport?: (id: string) => void }) {
  const rate = matchRate(project)
  const pending = (project.unmatched_count ?? 0) + (project.flagged_count ?? 0)

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-md transition-all group">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <StatusDot status={project.project_status} />
            <span className="text-xs text-gray-400">
              {fmtDate(project.period_start)} – {fmtDate(project.period_end)}
            </span>
          </div>
          <h3 className="text-sm font-semibold text-gray-900 truncate">{project.name}</h3>
          <p className="text-[10px] text-gray-400 mt-0.5">Created {fmtDate(project.created_at)}</p>
        </div>

        {/* Match rate ring (simple) */}
        {(project.matched_count ?? 0) + (project.unmatched_count ?? 0) + (project.flagged_count ?? 0) > 0 && (
          <div className="flex-shrink-0 text-right">
            <div className={`text-xl font-bold ${rate >= 90 ? 'text-green-600' : rate >= 70 ? 'text-amber-500' : 'text-red-500'}`}>
              {rate}%
            </div>
            <div className="text-[9px] text-gray-400 uppercase tracking-wide">match rate</div>
          </div>
        )}
      </div>

      {/* Stats row */}
      {(project.matched_count ?? 0) + (project.unmatched_count ?? 0) + (project.flagged_count ?? 0) > 0 && (
        <div className="mt-3 flex gap-4 text-[11px]">
          <span className="text-green-600 font-medium">{project.matched_count ?? 0} matched</span>
          {pending > 0 && <span className="text-amber-600 font-medium">{pending} pending</span>}
          {pending === 0 && <span className="text-green-600 font-medium">All resolved</span>}
        </div>
      )}

      {/* Progress bar */}
      {(project.matched_count ?? 0) + (project.unmatched_count ?? 0) + (project.flagged_count ?? 0) > 0 && (
        <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${rate >= 90 ? 'bg-green-400' : rate >= 70 ? 'bg-amber-400' : 'bg-red-400'}`}
            style={{ width: `${rate}%` }}
          />
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex gap-2">
        {project.project_status !== 'completed' && (
          <Link
            href={`/review?session_id=${project.id}`}
            className="flex-1 text-center text-xs font-medium py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {project.project_status === 'new' ? 'Go to Inbox →' : 'Review Exceptions →'}
          </Link>
        )}
        {project.project_status === 'completed' && onReport && (
          <button
            onClick={() => onReport(project.id)}
            className="flex-1 text-center text-xs font-semibold py-1.5 rounded-lg text-white transition-opacity hover:opacity-90"
            style={{ background: '#1E3A5F' }}
          >
            Generate Financial Report
          </button>
        )}
        {project.project_status === 'completed' && (
          <Link
            href={`/review?session_id=${project.id}`}
            className="px-3 text-xs font-medium py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
          >
            View
          </Link>
        )}
      </div>
    </div>
  )
}

function TabSync({ onTab }: { onTab: (t: Tab) => void }) {
  const searchParams = useSearchParams()
  const tab = searchParams.get('tab') as Tab | null
  useEffect(() => {
    if (tab && ['new', 'in_process', 'completed'].includes(tab)) onTab(tab)
  }, [tab, onTab])
  return null
}

export default function ProjectsPage() {
  const [data, setData]           = useState<ProjectsData | null>(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('in_process')

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects', { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to load projects')
      setData(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchProjects() }, [fetchProjects])

  function openReport(id: string) {
    window.open(`/api/projects/${id}/report`, '_blank')
  }

  const counts = {
    new:        data?.new.length        ?? 0,
    in_process: data?.in_process.length ?? 0,
    completed:  data?.completed.length  ?? 0,
  }

  const projects = data?.[activeTab] ?? []

  return (
    <div className="min-h-screen bg-gray-50">
      <Suspense fallback={null}>
        <TabSync onTab={setActiveTab} />
      </Suspense>

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-8 py-6">
        <h1 className="text-xl font-bold text-gray-900">Reconciliation Engagements</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage period-end reconciliations from intake through financial close and reporting</p>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 px-8">
        <div className="flex gap-0">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? `${tab.color} border-current`
                  : 'text-gray-400 border-transparent hover:text-gray-600'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${tab.dot} ${activeTab === tab.key ? 'opacity-100' : 'opacity-50'}`} />
              {tab.label}
              {counts[tab.key] > 0 && (
                <span className={`ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.key ? 'bg-current/10' : 'bg-gray-100 text-gray-500'
                }`}>
                  {counts[tab.key]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-8 py-6 max-w-5xl">
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white border border-gray-100 rounded-2xl p-5 animate-pulse">
                <div className="h-3 bg-gray-100 rounded w-1/2 mb-3" />
                <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/3" />
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {!loading && !error && projects.length === 0 && (
          <EmptyTab tab={activeTab} />
        )}

        {!loading && !error && projects.length > 0 && (
          <>
            {/* Completed tab: show report generation CTA */}
            {activeTab === 'completed' && (
              <div className="mb-6 bg-green-50 border border-green-100 rounded-xl px-5 py-4 flex items-center gap-4">
                <span className="text-2xl">📋</span>
                <div>
                  <p className="text-sm font-semibold text-green-900">
                    {counts.completed} closed period{counts.completed !== 1 ? 's' : ''} ready for reporting
                  </p>
                  <p className="text-xs text-green-700 mt-0.5">
                    Generate a formal financial reconciliation report — includes exception resolution log, journal entries, audit trail, and controller sign-off page.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map(project => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onReport={activeTab === 'completed' ? openReport : undefined}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
