'use client'

import { useEffect, useState, useCallback } from 'react'

type UserRole = 'owner' | 'admin' | 'reviewer' | 'viewer'

interface TeamMember {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  subscription_tier: string | null
  created_at: string
}

const ROLE_CONFIG: Record<UserRole, { label: string; bg: string; text: string; desc: string }> = {
  owner:    { label: 'Owner',    bg: '#EFF6FF', text: '#1E3A5F', desc: 'Full access. Cannot be modified.'       },
  admin:    { label: 'Admin',    bg: '#DBEAFE', text: '#1D4ED8', desc: 'Invite members, approve/reject, view all.' },
  reviewer: { label: 'Reviewer', bg: '#FEF3C7', text: '#92400E', desc: 'Act on exceptions and journal entries.'  },
  viewer:   { label: 'Viewer',   bg: '#F3F4F6', text: '#374151', desc: 'Read-only access to all data.'           },
}

function RoleBadge({ role }: { role: UserRole }) {
  const cfg = ROLE_CONFIG[role] ?? ROLE_CONFIG.viewer
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: cfg.bg, color: cfg.text }}>
      {cfg.label}
    </span>
  )
}

function Initials({ name, email }: { name: string | null; email: string }) {
  const str = name || email
  const parts = str.split(/[\s@]/).filter(Boolean)
  const letters = parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : str.slice(0, 2).toUpperCase()
  return (
    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
      style={{ background: '#1E3A5F' }}>
      {letters}
    </div>
  )
}

export default function AdminPage() {
  const [members, setMembers]       = useState<TeamMember[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole]   = useState<'admin' | 'reviewer' | 'viewer'>('reviewer')
  const [inviting, setInviting]       = useState(false)
  const [toast, setToast]             = useState<{ msg: string; ok: boolean } | null>(null)
  const [changingRole, setChangingRole] = useState<string | null>(null)
  const [removing, setRemoving]         = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4000)
  }

  const fetchMembers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/settings/team')
      if (res.status === 403) { setError('You need admin access to view team members.'); return }
      if (!res.ok) throw new Error('Failed to load team')
      const json = await res.json()
      setMembers(json.members ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMembers() }, [fetchMembers])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviting(true)
    try {
      const res = await fetch('/api/settings/team', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: inviteEmail, role: inviteRole }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Invite failed')
      showToast(`Invite sent to ${inviteEmail}`, true)
      setInviteEmail('')
      fetchMembers()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Invite failed', false)
    } finally {
      setInviting(false)
    }
  }

  async function handleRoleChange(memberId: string, newRole: 'admin' | 'reviewer' | 'viewer') {
    setChangingRole(memberId)
    try {
      const res = await fetch(`/api/settings/team/${memberId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ role: newRole }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to change role')
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m))
      showToast('Role updated', true)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to update role', false)
    } finally {
      setChangingRole(null)
    }
  }

  async function handleRemove(memberId: string) {
    setRemoving(memberId)
    try {
      const res = await fetch(`/api/settings/team/${memberId}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to remove member')
      setMembers(prev => prev.filter(m => m.id !== memberId))
      showToast('Team member removed', true)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to remove member', false)
    } finally {
      setRemoving(null)
      setConfirmRemove(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-8 py-6">
        <h1 className="text-xl font-bold text-gray-900">Team Access Management</h1>
        <p className="text-sm text-gray-500 mt-0.5">Invite employees, assign roles, and control who can access financial data</p>
      </div>

      <div className="px-8 py-6 max-w-4xl space-y-6">

        {/* Role reference */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(Object.entries(ROLE_CONFIG) as [UserRole, typeof ROLE_CONFIG[UserRole]][]).map(([role, cfg]) => (
            <div key={role} className="bg-white border border-gray-100 rounded-xl p-4">
              <RoleBadge role={role} />
              <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">{cfg.desc}</p>
            </div>
          ))}
        </div>

        {/* Invite form */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Invite Employee</h2>
          <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              required
              placeholder="employee@company.com"
              className="flex-1 px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
            />
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value as 'admin' | 'reviewer' | 'viewer')}
              className="px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 bg-white"
            >
              <option value="admin">Admin — full control</option>
              <option value="reviewer">Reviewer — approve exceptions</option>
              <option value="viewer">Viewer — read only</option>
            </select>
            <button
              type="submit"
              disabled={inviting || !inviteEmail}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
              style={{ background: '#1E3A5F' }}
            >
              {inviting ? 'Sending…' : 'Send Invite'}
            </button>
          </form>
          <p className="text-[11px] text-gray-400 mt-3">
            The employee will receive an email with a secure link to set up their account. Their role can be changed at any time.
          </p>
        </div>

        {/* Team member list */}
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">
              Team Members
              {members.length > 0 && (
                <span className="ml-2 text-xs font-normal text-gray-400">{members.length} member{members.length !== 1 ? 's' : ''}</span>
              )}
            </h2>
          </div>

          {loading && (
            <div className="divide-y divide-gray-50">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
                  <div className="w-9 h-9 rounded-full bg-gray-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-100 rounded w-40" />
                    <div className="h-2.5 bg-gray-100 rounded w-56" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="px-6 py-8 text-center text-sm text-red-500">{error}</div>
          )}

          {!loading && !error && members.length === 0 && (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-gray-500">No team members yet. Send your first invite above.</p>
            </div>
          )}

          {!loading && !error && members.length > 0 && (
            <div className="divide-y divide-gray-50">
              {members.map(member => (
                <div key={member.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/60 transition-colors">
                  <Initials name={member.full_name} email={member.email} />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {member.full_name || member.email}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{member.email}</p>
                  </div>

                  <RoleBadge role={member.role} />

                  {/* Role change (not for owners) */}
                  {member.role !== 'owner' && (
                    <select
                      value={member.role}
                      disabled={changingRole === member.id}
                      onChange={e => handleRoleChange(member.id, e.target.value as 'admin' | 'reviewer' | 'viewer')}
                      className="text-xs px-2 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 focus:outline-none focus:border-blue-400 disabled:opacity-50"
                    >
                      <option value="admin">Admin</option>
                      <option value="reviewer">Reviewer</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  )}

                  {/* Remove */}
                  {member.role !== 'owner' && (
                    confirmRemove === member.id ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-red-600 font-medium">Remove?</span>
                        <button
                          onClick={() => handleRemove(member.id)}
                          disabled={removing === member.id}
                          className="text-xs px-2 py-1 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 disabled:opacity-50"
                        >
                          {removing === member.id ? '…' : 'Yes'}
                        </button>
                        <button
                          onClick={() => setConfirmRemove(null)}
                          className="text-xs px-2 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmRemove(member.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:bg-red-50 hover:text-red-400 transition-colors"
                        title="Remove member"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                        </svg>
                      </button>
                    )
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl text-sm font-medium shadow-lg text-white transition-all ${toast.ok ? 'bg-green-600' : 'bg-red-500'}`}>
          {toast.ok ? '✓' : '✗'} {toast.msg}
        </div>
      )}
    </div>
  )
}
