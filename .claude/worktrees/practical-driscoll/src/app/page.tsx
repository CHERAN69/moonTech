import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-gray-100 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#1E3A5F' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 8L6 12L14 4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="font-bold text-lg" style={{ color: '#1E3A5F' }}>FinOpsAi</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="#features" className="text-sm text-gray-600 hover:text-gray-900">Features</Link>
          <Link href="#pricing" className="text-sm text-gray-600 hover:text-gray-900">Pricing</Link>
          <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">Sign in</Link>
          <Link href="/signup" className="text-sm font-medium text-white px-4 py-2 rounded-lg transition-opacity hover:opacity-90" style={{ background: '#1E3A5F' }}>
            Start free trial
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-8 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-6 border" style={{ borderColor: '#2E75B6', color: '#2E75B6', background: '#EFF6FF' }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#2E75B6' }}></span>
          AI-native finance operations — 2026
        </div>
        <h1 className="text-5xl font-bold leading-tight mb-6" style={{ color: '#1E3A5F' }}>
          Cut your month-end close<br />
          <span style={{ color: '#2E75B6' }}>from 5 days to 1 day.</span>
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          FinOpsAi automates the reconciliation work that consumes 20–50 hours per month from every finance team.
          AI matches, flags, explains, and reports — automatically.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/signup" className="px-8 py-4 rounded-xl font-semibold text-white text-lg transition-opacity hover:opacity-90" style={{ background: '#1E3A5F' }}>
            Start free — no credit card
          </Link>
          <Link href="#features" className="px-8 py-4 rounded-xl font-semibold text-gray-700 text-lg border border-gray-200 hover:border-gray-300 transition-colors">
            See how it works →
          </Link>
        </div>
        <p className="text-sm text-gray-400 mt-4">Same-day setup · No ERP required · Cancel anytime</p>

        {/* Stats */}
        <div className="mt-20 grid grid-cols-3 gap-8 border-t border-gray-100 pt-16">
          {[
            { stat: '20–50 hrs', label: 'saved per month per team' },
            { stat: '10×', label: 'cheaper than FloQast' },
            { stat: '1 day', label: 'average close time with FinOpsAi' },
          ].map(({ stat, label }) => (
            <div key={stat} className="text-center">
              <div className="text-3xl font-bold mb-1" style={{ color: '#1E3A5F' }}>{stat}</div>
              <div className="text-sm text-gray-500">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4" style={{ color: '#1E3A5F' }}>Everything your finance team needs</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Built from the ground up with AI at the core — not bolted on as an afterthought.</p>
          </div>
          <div className="grid grid-cols-3 gap-6">
            {features.map(f => (
              <div key={f.title} className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-blue-100 transition-colors">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 text-xl" style={{ background: '#EFF6FF' }}>
                  {f.icon}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24">
        <div className="max-w-5xl mx-auto px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4" style={{ color: '#1E3A5F' }}>Simple, transparent pricing</h2>
            <p className="text-gray-500">Enterprise-grade AI at SMB-friendly pricing. 14-day free trial on all plans.</p>
          </div>
          <div className="grid grid-cols-3 gap-6">
            {plans.map(plan => (
              <div key={plan.name} className={`rounded-2xl p-8 border ${plan.highlight ? 'border-blue-500 shadow-lg shadow-blue-100' : 'border-gray-200'}`} style={plan.highlight ? { background: '#1E3A5F' } : {}}>
                <div className={`text-xs font-semibold uppercase tracking-wide mb-2 ${plan.highlight ? 'text-blue-300' : 'text-gray-400'}`}>{plan.name}</div>
                <div className={`text-4xl font-bold mb-1 ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>{plan.price}</div>
                <div className={`text-sm mb-6 ${plan.highlight ? 'text-blue-200' : 'text-gray-400'}`}>/month, billed monthly</div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map(f => (
                    <li key={f} className={`text-sm flex items-start gap-2 ${plan.highlight ? 'text-blue-100' : 'text-gray-600'}`}>
                      <span className="mt-0.5" style={{ color: plan.highlight ? '#93C5FD' : '#2E75B6' }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/signup" className={`block text-center py-3 rounded-xl font-medium text-sm transition-opacity hover:opacity-90 ${plan.highlight ? 'bg-white text-blue-900' : 'text-white'}`} style={plan.highlight ? {} : { background: '#1E3A5F' }}>
                  Start free trial
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-12">
        <div className="max-w-6xl mx-auto px-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: '#1E3A5F' }}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path d="M2 8L6 12L14 4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-semibold text-sm" style={{ color: '#1E3A5F' }}>FinOpsAi</span>
          </div>
          <p className="text-sm text-gray-400">© 2026 FinOpsAi. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

const features = [
  { icon: '🔄', title: 'ReconcileAI', desc: 'Upload any bank or invoice CSV. AI matches, flags duplicates, explains every anomaly in plain English.' },
  { icon: '✅', title: 'Close Confidence Score', desc: 'A real-time 0–100 score showing how close-ready your books are. Share it with your CFO instead of status emails.' },
  { icon: '📓', title: 'Journal Entry Drafting', desc: 'AI drafts 80% of your journal entries automatically. You review and approve — not create from scratch.' },
  { icon: '💰', title: 'Cash Flow Forecasting', desc: '13-week AI cash flow forecast. Runway calculator. Cash alerts before you hit a problem.' },
  { icon: '📊', title: 'One-Click Board Packs', desc: 'Generate a board-ready financial package in seconds. P&L, cash flow, variance, and AI-written commentary.' },
  { icon: '🏢', title: 'Firm Platform', desc: 'Multi-client dashboard for accounting firms. White-label branding. Manage 10–50 clients from one place.' },
  { icon: '🤖', title: 'AI CFO Briefing', desc: 'Daily AI-generated financial briefing delivered to your inbox. Proactive insights before you ask.' },
  { icon: '🔍', title: 'Audit Trail', desc: 'Every AI decision is logged with full reasoning. Auditors see exactly why every transaction was categorized.' },
  { icon: '🔗', title: 'Native Integrations', desc: 'QuickBooks, Xero, Stripe, PayPal, Plaid, Gusto, and more. Zero CSV exports required.' },
]

const plans = [
  {
    name: 'Starter',
    price: '$499',
    highlight: false,
    features: [
      '1 entity',
      'Up to 1,000 transactions/mo',
      'ReconcileAI module',
      'CSV & PDF upload',
      'AI anomaly explanation',
      'Basic dashboard',
      'Email support',
    ],
  },
  {
    name: 'Growth',
    price: '$1,499',
    highlight: true,
    features: [
      '5 entities',
      'Unlimited transactions',
      'All modules (CloseOS + FinanceIntel)',
      'QuickBooks & Xero sync',
      '13-week cash flow forecast',
      'Board pack generation',
      'AI CFO daily briefing',
      'Priority support',
    ],
  },
  {
    name: 'Agency',
    price: '$2,999',
    highlight: false,
    features: [
      'Unlimited clients',
      'White-label branding',
      'Multi-client dashboard',
      'Client portal',
      'Bulk close processing',
      'Team role management',
      'SSO (SAML 2.0)',
      'Dedicated support',
    ],
  },
]
