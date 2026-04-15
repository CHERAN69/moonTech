'use client'

import { useState } from 'react'
import { TopBar } from '@/components/layout/TopBar'

export default function SettingsPage() {
  const [tab, setTab] = useState<'profile' | 'billing' | 'integrations' | 'team'>('profile')

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
              <h2 className="font-semibold text-gray-900 mb-5">Company Profile</h2>
              <div className="space-y-4">
                {[
                  { label: 'Company name', value: 'Acme Corporation', type: 'text' },
                  { label: 'Industry', value: 'B2B SaaS', type: 'text' },
                  { label: 'Fiscal year end', value: 'December 31', type: 'text' },
                  { label: 'Base currency', value: 'USD', type: 'text' },
                ].map(f => (
                  <div key={f.label}>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">{f.label}</label>
                    <input type={f.type} defaultValue={f.value}
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all" />
                  </div>
                ))}
              </div>
              <button className="mt-5 px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90" style={{ background: '#1E3A5F' }}>
                Save Changes
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
                  { name: 'Growth', price: '$1,499/mo', current: false },
                  { name: 'Agency', price: '$2,999/mo', current: false },
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
                { name: 'Xero', desc: 'Bi-directional sync — pull transactions, push journal entries', connected: false, logo: '📗' },
                { name: 'Stripe', desc: 'Real-time payout and charge reconciliation', connected: true, logo: '💳' },
                { name: 'PayPal', desc: 'Business account transaction sync', connected: false, logo: '🅿️' },
                { name: 'Plaid', desc: 'Direct bank feed — 11,000+ US financial institutions', connected: false, logo: '🏦' },
                { name: 'Gusto', desc: 'Payroll journal entry automation', connected: false, logo: '💼' },
                { name: 'Slack', desc: 'Anomaly alerts and close status updates', connected: false, logo: '💬' },
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
            <div className="space-y-3">
              {[
                { name: 'Sarah Lin', email: 'sarah@acme.com', role: 'Owner', active: true },
                { name: 'Marcus Chen', email: 'marcus@acme.com', role: 'Admin', active: true },
                { name: 'James Park', email: 'james@acme.com', role: 'Reviewer', active: false },
              ].map(member => (
                <div key={member.email} className="flex items-center justify-between p-3 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold" style={{ background: '#1E3A5F' }}>
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <div className="font-medium text-sm text-gray-800">{member.name}</div>
                      <div className="text-xs text-gray-400">{member.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">{member.role}</span>
                    {!member.active && <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">Pending</span>}
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
