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
  const [tab, setTab]           = useState<'profile' | 'billing' | 'integrations' | 'team'>('profile')
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
          {(['profile', 'billing', 'integrations', 'team'] as const).map(t => (
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
