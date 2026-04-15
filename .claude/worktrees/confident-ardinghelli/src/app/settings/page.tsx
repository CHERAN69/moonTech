'use client'

import { useState, useEffect } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { createClient } from '@/lib/supabase/client'

export default function SettingsPage() {
  const [tab,     setTab]     = useState<'profile' | 'billing' | 'integrations' | 'team'>('profile')
  const [userEmail, setEmail] = useState<string>('')
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)

  // Profile fields
  const [company,  setCompany]  = useState('')
  const [industry, setIndustry] = useState('')
  const [fyEnd,    setFyEnd]    = useState('')
  const [currency, setCurrency] = useState('USD')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setEmail(data.user.email ?? '')
        const meta = data.user.user_metadata ?? {}
        setCompany(meta.company_name ?? '')
        setIndustry(meta.industry ?? '')
        setFyEnd(meta.fiscal_year_end ?? '')
        setCurrency(meta.base_currency ?? 'USD')
      }
    })
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const supabase = createClient()
      await supabase.auth.updateUser({
        data: {
          company_name:     company,
          industry,
          fiscal_year_end:  fyEnd,
          base_currency:    currency,
        },
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Settings" subtitle="Manage your account and integrations" />

      <div className="flex-1 p-6 max-w-3xl mx-auto w-full">
        {/* Sub-tabs */}
        <div className="flex gap-1 bg-white rounded-xl border border-gray-100 p-1 mb-6 w-fit">
          {(['profile', 'billing', 'integrations', 'team'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${tab === t ? 'text-white' : 'text-gray-500 hover:text-gray-700'}`}
              style={tab === t ? { background: '#1E3A5F' } : {}}>
              {t}
            </button>
          ))}
        </div>

        {tab === 'profile' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-1">Company Profile</h2>
              {userEmail && <p className="text-xs text-gray-400 mb-5">{userEmail}</p>}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Company name</label>
                  <input type="text" value={company} onChange={e => setCompany(e.target.value)} placeholder="Your company name"
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Industry</label>
                  <input type="text" value={industry} onChange={e => setIndustry(e.target.value)} placeholder="e.g. B2B SaaS"
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Fiscal year end</label>
                  <input type="text" value={fyEnd} onChange={e => setFyEnd(e.target.value)} placeholder="e.g. December 31"
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Base currency</label>
                  <input type="text" value={currency} onChange={e => setCurrency(e.target.value)} placeholder="USD"
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all" />
                </div>
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="mt-5 px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: saved ? '#16A34A' : '#1E3A5F' }}
              >
                {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}

        {tab === 'billing' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-semibold text-gray-900">Current Plan</h2>
                  <p className="text-sm text-gray-400 mt-0.5">Starter · 14-day free trial</p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-green-50 text-green-600">Trialing</span>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { name: 'Starter', price: '$499/mo', current: true },
                  { name: 'Growth',  price: '$1,499/mo', current: false },
                  { name: 'Agency',  price: '$2,999/mo', current: false },
                ].map(plan => (
                  <div key={plan.name} className={`p-3 rounded-xl border text-center ${plan.current ? 'border-blue-400' : 'border-gray-100'}`}
                    style={plan.current ? { background: '#EFF6FF' } : {}}>
                    <div className="font-semibold text-sm text-gray-900">{plan.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{plan.price}</div>
                    {!plan.current && (
                      <button className="mt-2 text-xs font-medium py-1 px-2 rounded-lg text-white w-full" style={{ background: '#2E75B6' }}>
                        Upgrade
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'integrations' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-semibold text-gray-900 mb-5">Connected Integrations</h2>
            <div className="space-y-3">
              {[
                { name: 'QuickBooks Online', desc: 'Bi-directional sync for journal entries and transactions', connected: false, logo: '📊' },
                { name: 'Xero',              desc: 'Bi-directional sync — pull transactions, push journal entries', connected: false, logo: '📗' },
                { name: 'Stripe',            desc: 'Real-time payout and charge reconciliation', connected: false, logo: '💳' },
                { name: 'PayPal',            desc: 'Business account transaction sync', connected: false, logo: '🅿️' },
                { name: 'Plaid',             desc: 'Direct bank feed — 11,000+ US financial institutions', connected: false, logo: '🏦' },
                { name: 'Gusto',             desc: 'Payroll journal entry automation', connected: false, logo: '💼' },
                { name: 'Slack',             desc: 'Anomaly alerts and close status updates', connected: false, logo: '💬' },
              ].map(integration => (
                <div key={integration.name} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{integration.logo}</span>
                    <div>
                      <div className="font-medium text-sm text-gray-800">{integration.name}</div>
                      <div className="text-xs text-gray-400">{integration.desc}</div>
                    </div>
                  </div>
                  {integration.connected ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Connected</span>
                      <button className="text-xs text-gray-400 hover:text-red-500 transition-colors">Disconnect</button>
                    </div>
                  ) : (
                    <button className="text-xs font-medium text-white px-3 py-1.5 rounded-lg transition-opacity hover:opacity-90" style={{ background: '#2E75B6' }}>
                      Connect
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'team' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-gray-900">Team Members</h2>
              <button className="text-xs font-medium text-white px-3 py-1.5 rounded-lg" style={{ background: '#2E75B6' }}>
                + Invite Member
              </button>
            </div>
            <div className="py-10 text-center">
              <div className="text-3xl mb-2">👥</div>
              <div className="text-sm text-gray-500 mb-1">No team members yet.</div>
              <p className="text-xs text-gray-400">Invite your accountant or controller to collaborate on the close.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
