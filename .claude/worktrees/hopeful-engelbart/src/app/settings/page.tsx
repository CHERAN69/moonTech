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
        <div className="flex gap-1 rounded-xl p-1 mb-6 w-fit" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          {(['profile', 'billing', 'integrations', 'team'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors"
              style={tab === t ? { background: 'var(--brand)', color: '#fff' } : { color: 'var(--text-secondary)' }}>
              {t}
            </button>
          ))}
        </div>

        {tab === 'profile' && (
          <div className="space-y-4">
            <div className="rounded-2xl p-6" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
              <h2 className="font-semibold mb-5" style={{ color: 'var(--text-primary)' }}>Company Profile</h2>
              <div className="space-y-4">
                {[
                  { label: 'Company name', value: '', type: 'text', placeholder: 'Your company name' },
                  { label: 'Industry', value: '', type: 'text', placeholder: 'e.g. B2B SaaS' },
                  { label: 'Fiscal year end', value: 'December 31', type: 'text', placeholder: 'December 31' },
                  { label: 'Base currency', value: 'USD', type: 'text', placeholder: 'USD' },
                ].map(f => (
                  <div key={f.label}>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>{f.label}</label>
                    <input type={f.type} defaultValue={f.value} placeholder={f.placeholder}
                      className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all"
                      style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
                  </div>
                ))}
              </div>
              <button className="mt-5 px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90" style={{ background: 'var(--brand)' }}>
                Save Changes
              </button>
            </div>
          </div>
        )}

        {tab === 'billing' && (
          <div className="space-y-4">
            <div className="rounded-2xl p-6" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Current Plan</h2>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Starter · 14-day free trial</p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>Trialing</span>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { name: 'Starter', price: '$499/mo', current: true },
                  { name: 'Growth', price: '$1,499/mo', current: false },
                  { name: 'Agency', price: '$2,999/mo', current: false },
                ].map(plan => (
                  <div key={plan.name} className="p-3 rounded-xl text-center"
                    style={plan.current ? { background: 'var(--info-bg)', border: '1px solid var(--brand)' } : { background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
                    <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{plan.name}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{plan.price}</div>
                    {!plan.current && (
                      <button className="mt-2 text-xs font-medium py-1 px-2 rounded-lg text-white w-full" style={{ background: 'var(--brand)' }}>Upgrade</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'integrations' && (
          <div className="rounded-2xl p-6" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            <h2 className="font-semibold mb-5" style={{ color: 'var(--text-primary)' }}>Connected Integrations</h2>
            <div className="space-y-3">
              {[
                { name: 'QuickBooks Online', desc: 'Bi-directional sync for journal entries', connected: false, logo: '📊' },
                { name: 'Xero', desc: 'Pull transactions, push journal entries', connected: false, logo: '📗' },
                { name: 'Stripe', desc: 'Real-time payout reconciliation', connected: false, logo: '💳' },
                { name: 'Plaid', desc: 'Direct bank feed — 11,000+ institutions', connected: false, logo: '🏦' },
                { name: 'Gusto', desc: 'Payroll journal entry automation', connected: false, logo: '💼' },
                { name: 'Slack', desc: 'Anomaly alerts and close status updates', connected: false, logo: '💬' },
              ].map(integration => (
                <div key={integration.name} className="flex items-center justify-between p-4 rounded-xl transition-colors"
                  style={{ border: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{integration.logo}</span>
                    <div>
                      <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{integration.name}</div>
                      <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{integration.desc}</div>
                    </div>
                  </div>
                  {integration.connected ? (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>Connected</span>
                  ) : (
                    <button className="text-xs font-medium text-white px-3 py-1.5 rounded-lg transition-opacity hover:opacity-90" style={{ background: 'var(--brand)' }}>Connect</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'team' && (
          <div className="rounded-2xl p-6" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Team Members</h2>
              <button className="text-xs font-medium text-white px-3 py-1.5 rounded-lg" style={{ background: 'var(--brand)' }}>+ Invite Member</button>
            </div>
            <div className="p-8 text-center">
              <div className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>No team members yet</div>
              <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Invite your team to start collaborating on close.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
