'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'

interface Profile {
  id: string
  email: string
  full_name: string
  company_name: string
  role: string
  subscription_tier: string
  subscription_status: string
  industry?: string
  fiscal_year_end?: string
  base_currency?: string
}

interface VendorRule {
  id: string
  user_id: string
  vendor_pattern: string
  gl_category: string
  auto_approve: boolean
  auto_approve_threshold: number
  created_from: 'manual' | 'learned'
  times_applied: number
  last_applied: string
  created_at: string
}

function RulesTab() {
  const [rules, setRules]           = useState<VendorRule[]>([])
  const [rulesLoading, setRulesLoading] = useState(true)
  const [showAddForm, setShowAddForm]   = useState(false)
  const [addVendor, setAddVendor]       = useState('')
  const [addGL, setAddGL]               = useState('')
  const [addAutoApprove, setAddAutoApprove] = useState(false)
  const [addThreshold, setAddThreshold]     = useState(90)
  const [adding, setAdding]               = useState(false)
  const [rulesError, setRulesError]       = useState<string | null>(null)

  const fetchRules = useCallback(async () => {
    setRulesLoading(true)
    setRulesError(null)
    try {
      const res = await fetch('/api/vendor-rules')
      if (!res.ok) throw new Error('Failed to load rules')
      const json = await res.json()
      setRules(json.rules ?? [])
    } catch (err) {
      setRulesError(err instanceof Error ? err.message : 'Failed to load rules')
    } finally {
      setRulesLoading(false)
    }
  }, [])

  useEffect(() => { fetchRules() }, [fetchRules])

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdding(true)
    try {
      const res = await fetch('/api/vendor-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_pattern: addVendor,
          gl_category: addGL,
          auto_approve: addAutoApprove,
          auto_approve_threshold: addThreshold,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to add rule')
      }
      setAddVendor('')
      setAddGL('')
      setAddAutoApprove(false)
      setAddThreshold(90)
      setShowAddForm(false)
      await fetchRules()
    } catch (err) {
      setRulesError(err instanceof Error ? err.message : 'Failed to add rule')
    } finally {
      setAdding(false)
    }
  }

  const handleToggleAutoApprove = async (rule: VendorRule) => {
    try {
      const res = await fetch(`/api/vendor-rules/${rule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auto_approve: !rule.auto_approve }),
      })
      if (!res.ok) throw new Error('Failed to update rule')
      setRules(prev => prev.map(r => r.id === rule.id ? { ...r, auto_approve: !r.auto_approve } : r))
    } catch (err) {
      setRulesError(err instanceof Error ? err.message : 'Failed to update rule')
    }
  }

  const handleDeleteRule = async (ruleId: string) => {
    try {
      const res = await fetch(`/api/vendor-rules/${ruleId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete rule')
      setRules(prev => prev.filter(r => r.id !== ruleId))
    } catch (err) {
      setRulesError(err instanceof Error ? err.message : 'Failed to delete rule')
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-semibold text-gray-900">Vendor Rules</h2>
            <p className="text-xs text-gray-400 mt-0.5">Auto-assign GL categories and approve recurring vendors</p>
          </div>
          <button
            onClick={() => setShowAddForm(v => !v)}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ background: '#2E75B6' }}
          >
            {showAddForm ? 'Cancel' : 'Add Rule'}
          </button>
        </div>

        {rulesError && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 text-sm text-red-600">{rulesError}</div>
        )}

        {showAddForm && (
          <form onSubmit={handleAddRule} className="mb-6 p-4 rounded-xl border border-gray-100 bg-gray-50 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Vendor Pattern</label>
                <input
                  type="text"
                  value={addVendor}
                  onChange={e => setAddVendor(e.target.value)}
                  required
                  placeholder="e.g. aws, stripe, adobe"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">GL Category</label>
                <input
                  type="text"
                  value={addGL}
                  onChange={e => setAddGL(e.target.value)}
                  required
                  placeholder="e.g. Software, Marketing"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
                />
              </div>
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addAutoApprove}
                  onChange={e => setAddAutoApprove(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 accent-blue-600"
                />
                Auto-approve
              </label>
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-gray-600">Threshold</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={addThreshold}
                  onChange={e => setAddThreshold(Number(e.target.value))}
                  className="w-16 px-2 py-1.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400"
                />
                <span className="text-xs text-gray-400">%</span>
              </div>
            </div>
            <button
              type="submit"
              disabled={adding}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ background: '#1E3A5F' }}
            >
              {adding ? 'Adding…' : 'Save Rule'}
            </button>
          </form>
        )}

        {rulesLoading ? (
          <div className="text-sm text-gray-400 text-center py-8">Loading rules…</div>
        ) : rules.length === 0 ? (
          <div className="text-sm text-gray-400 text-center py-8">
            No rules yet. Rules are created automatically when you approve the same vendor 3+ times.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Pattern</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">GL Category</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Auto-Approve</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Threshold</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Times Applied</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Source</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rules.map(rule => (
                  <tr key={rule.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-xs text-gray-700">{rule.vendor_pattern}</td>
                    <td className="py-2.5 px-3 text-gray-700">{rule.gl_category}</td>
                    <td className="py-2.5 px-3">
                      <button
                        onClick={() => handleToggleAutoApprove(rule)}
                        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${rule.auto_approve ? 'bg-blue-600' : 'bg-gray-200'}`}
                        role="switch"
                        aria-checked={rule.auto_approve}
                        aria-label="Toggle auto-approve"
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${rule.auto_approve ? 'translate-x-4' : 'translate-x-0'}`}
                        />
                      </button>
                    </td>
                    <td className="py-2.5 px-3 text-gray-700">{rule.auto_approve_threshold}%</td>
                    <td className="py-2.5 px-3 text-gray-500">{rule.times_applied}</td>
                    <td className="py-2.5 px-3">
                      {rule.created_from === 'learned' ? (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-50 text-purple-600">Learned</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500">Manual</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="text-xs px-2.5 py-1 rounded-lg text-white bg-red-500 hover:bg-red-600 transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [onClose])
  return (
    <div
      role="alert"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white"
      style={{ background: type === 'success' ? '#16A34A' : '#DC2626' }}
    >
      {type === 'success' ? '✓' : '✗'} {message}
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100" aria-label="Dismiss">✕</button>
    </div>
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const [tab, setTab]           = useState<'profile' | 'billing' | 'integrations' | 'team' | 'rules'>('profile')
  const [profile, setProfile]   = useState<Profile | null>(null)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [toast, setToast]       = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [inviteEmail, setInvite] = useState('')
  const [inviteRole, setRole]   = useState<'admin' | 'reviewer' | 'viewer'>('reviewer')
  const [inviting, setInviting] = useState(false)
  const [deleteConfirm, setDel] = useState('')
  const [deleting, setDeleting] = useState(false)

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/profile')
      if (res.ok) {
        const json = await res.json()
        setProfile(json.profile)
      }
    } catch (err) {
      console.error('Profile fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchProfile() }, [fetchProfile])

  const handleSaveProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    try {
      const form = new FormData(e.currentTarget)
      const body = {
        full_name:       form.get('full_name')       as string,
        company_name:    form.get('company_name')    as string,
        industry:        form.get('industry')        as string,
        fiscal_year_end: form.get('fiscal_year_end') as string,
        base_currency:   form.get('base_currency')   as string,
      }
      const res = await fetch('/api/settings/profile', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Save failed')
      }
      const json = await res.json()
      setProfile(json.profile)
      setToast({ message: 'Profile saved successfully', type: 'success' })
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Save failed', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviting(true)
    try {
      const res = await fetch('/api/settings/team', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: inviteEmail, role: inviteRole }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Invite failed')
      }
      setToast({ message: `Invite sent to ${inviteEmail}`, type: 'success' })
      setInvite('')
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Invite failed', type: 'error' })
    } finally {
      setInviting(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE MY ACCOUNT') return
    setDeleting(true)
    try {
      const res = await fetch('/api/gdpr/delete', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ confirm: 'DELETE MY ACCOUNT' }),
      })
      if (!res.ok) throw new Error('Deletion failed')
      router.push('/login')
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Deletion failed', type: 'error' })
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Settings" subtitle="Manage your account and integrations" />

      <div className="flex-1 p-6 max-w-3xl mx-auto w-full">
        {/* Sub-tabs */}
        <div className="flex gap-1 bg-white rounded-xl border border-gray-100 p-1 mb-6 w-fit" role="tablist">
          {(['profile', 'billing', 'integrations', 'team', 'rules'] as const).map(t => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${tab === t ? 'text-white' : 'text-gray-500 hover:text-gray-700'}`}
              style={tab === t ? { background: '#1E3A5F' } : {}}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'profile' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-5">Company Profile</h2>
              {loading ? (
                <div className="text-sm text-gray-400">Loading profile…</div>
              ) : (
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  {[
                    { label: 'Full name',       name: 'full_name',       value: profile?.full_name ?? '',       type: 'text' },
                    { label: 'Company name',    name: 'company_name',    value: profile?.company_name ?? '',    type: 'text' },
                    { label: 'Industry',        name: 'industry',        value: profile?.industry ?? '',        type: 'text' },
                    { label: 'Fiscal year end', name: 'fiscal_year_end', value: profile?.fiscal_year_end ?? 'December 31', type: 'text' },
                    { label: 'Base currency',   name: 'base_currency',   value: profile?.base_currency ?? 'USD', type: 'text' },
                  ].map(f => (
                    <div key={f.name}>
                      <label htmlFor={f.name} className="block text-xs font-medium text-gray-600 mb-1.5">{f.label}</label>
                      <input
                        id={f.name}
                        name={f.name}
                        type={f.type}
                        defaultValue={f.value}
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
                      />
                    </div>
                  ))}
                  <div className="flex items-center gap-4 pt-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                      style={{ background: '#1E3A5F' }}
                    >
                      {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                    <a
                      href="/api/gdpr/export"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-gray-500 hover:text-gray-700 underline"
                    >
                      Export my data (GDPR)
                    </a>
                  </div>
                </form>
              )}
            </div>

            {/* Danger zone */}
            <div className="bg-white rounded-2xl border border-red-100 p-6">
              <h2 className="font-semibold text-red-600 mb-2">Danger Zone</h2>
              <p className="text-xs text-gray-500 mb-4">
                Permanently delete your account and all associated data. This cannot be undone.
              </p>
              <div className="space-y-3">
                <input
                  type="text"
                  value={deleteConfirm}
                  onChange={e => setDel(e.target.value)}
                  placeholder="Type DELETE MY ACCOUNT to confirm"
                  aria-label="Type DELETE MY ACCOUNT to confirm account deletion"
                  className="w-full px-3 py-2.5 rounded-lg border border-red-200 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-50 transition-all"
                />
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirm !== 'DELETE MY ACCOUNT' || deleting}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-40"
                >
                  {deleting ? 'Deleting…' : 'Delete Account'}
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === 'billing' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-semibold text-gray-900">Current Plan</h2>
                  <p className="text-sm text-gray-400 mt-0.5 capitalize">
                    {profile?.subscription_tier ?? 'Starter'} · {profile?.subscription_status ?? 'trialing'}
                  </p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  profile?.subscription_status === 'active'   ? 'bg-green-50 text-green-600' :
                  profile?.subscription_status === 'trialing' ? 'bg-blue-50 text-blue-600'   :
                  profile?.subscription_status === 'past_due' ? 'bg-red-50 text-red-600'     :
                                                                'bg-gray-100 text-gray-500'
                }`}>
                  {profile?.subscription_status ?? 'Trialing'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { name: 'Starter', price: '$499/mo',    tier: 'starter'  },
                  { name: 'Growth',  price: '$1,499/mo',  tier: 'growth'   },
                  { name: 'Agency',  price: '$2,999/mo',  tier: 'agency'   },
                ].map(plan => {
                  const current = profile?.subscription_tier === plan.tier
                  return (
                    <div key={plan.name} className={`p-3 rounded-xl border text-center ${current ? 'border-blue-400' : 'border-gray-100'}`}
                      style={current ? { background: '#EFF6FF' } : {}}>
                      <div className="font-semibold text-sm text-gray-900">{plan.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{plan.price}</div>
                      {!current && (
                        <button
                          onClick={() => window.location.href = '/settings?upgrade=' + plan.tier}
                          className="mt-2 text-xs font-medium py-1 px-2 rounded-lg text-white w-full transition-opacity hover:opacity-90"
                          style={{ background: '#2E75B6' }}
                        >
                          Upgrade
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {tab === 'integrations' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-semibold text-gray-900 mb-5">Connected Integrations</h2>
            <p className="text-xs text-gray-400 mb-4">
              Native integrations launch in the Growth plan. Stripe reconciliation via CSV is available on all plans.
            </p>
            <div className="space-y-3">
              {[
                { name: 'QuickBooks Online', desc: 'Bi-directional sync for journal entries and transactions', connected: false, logo: '📊' },
                { name: 'Xero',              desc: 'Bi-directional sync — pull transactions, push journal entries', connected: false, logo: '📗' },
                { name: 'Stripe',            desc: 'Real-time payout and charge reconciliation (CSV available)', connected: true,  logo: '💳' },
                { name: 'PayPal',            desc: 'Business account transaction sync', connected: false, logo: '🅿️' },
                { name: 'Plaid',             desc: 'Direct bank feed — 11,000+ US financial institutions', connected: false, logo: '🏦' },
                { name: 'Gusto',             desc: 'Payroll journal entry automation', connected: false, logo: '💼' },
                { name: 'Slack',             desc: 'Anomaly alerts and close status updates', connected: false, logo: '💬' },
              ].map(integration => (
                <div key={integration.name} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl" aria-hidden="true">{integration.logo}</span>
                    <div>
                      <div className="font-medium text-sm text-gray-800">{integration.name}</div>
                      <div className="text-xs text-gray-400">{integration.desc}</div>
                    </div>
                  </div>
                  {integration.connected ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Connected</span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 px-3 py-1.5 rounded-lg border border-gray-100">Coming soon</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'rules' && <RulesTab />}

        {tab === 'team' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-5">Invite Team Member</h2>
              <form onSubmit={handleInvite} className="flex gap-3 items-end">
                <div className="flex-1">
                  <label htmlFor="invite-email" className="block text-xs font-medium text-gray-600 mb-1.5">Email address</label>
                  <input
                    id="invite-email"
                    type="email"
                    value={inviteEmail}
                    onChange={e => setInvite(e.target.value)}
                    required
                    placeholder="colleague@company.com"
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="invite-role" className="block text-xs font-medium text-gray-600 mb-1.5">Role</label>
                  <select
                    id="invite-role"
                    value={inviteRole}
                    onChange={e => setRole(e.target.value as 'admin' | 'reviewer' | 'viewer')}
                    className="px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 bg-white"
                  >
                    <option value="admin">Admin</option>
                    <option value="reviewer">Reviewer</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={inviting || !inviteEmail}
                  className="px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                  style={{ background: '#2E75B6' }}
                >
                  {inviting ? 'Sending…' : 'Invite'}
                </button>
              </form>
              <div className="mt-4 p-3 rounded-lg bg-gray-50 text-xs text-gray-500">
                <strong>Role permissions:</strong> Owner → full access · Admin → approve/reject + invite · Reviewer → act on exceptions · Viewer → read-only
              </div>
            </div>
          </div>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
