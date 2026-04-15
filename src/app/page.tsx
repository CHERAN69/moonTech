import Link from 'next/link'
import {
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  Gauge,
  BookOpen,
  TrendingUp,
  FileBarChart2,
  Building2,
  BrainCircuit,
  ShieldCheck,
  Link2,
  Zap,
} from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-gray-900 antialiased">

      {/* ── Navbar ── */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/10 bg-[#060C18]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 size={14} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="font-semibold text-white tracking-tight">FinOpsAi</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm text-white/60 hover:text-white transition-colors">Features</Link>
            <Link href="#how-it-works" className="text-sm text-white/60 hover:text-white transition-colors">How it works</Link>
            <Link href="#pricing" className="text-sm text-white/60 hover:text-white transition-colors">Pricing</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-white/60 hover:text-white transition-colors hidden sm:block">Sign in</Link>
            <Link
              href="/signup"
              className="text-sm font-medium bg-white text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Start free trial
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="bg-[#060C18] pt-32 pb-24 px-6 text-center relative overflow-hidden">
        {/* subtle radial glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[800px] h-[600px] rounded-full bg-blue-600/10 blur-[120px]" />
        </div>

        <div className="relative max-w-4xl mx-auto">
          {/* badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs font-medium mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            AI-native finance operations — built for 2026
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-[1.08] tracking-tight mb-6">
            Close your books in<br />
            <span className="text-blue-400">one day, not five.</span>
          </h1>

          <p className="text-lg text-white/50 max-w-xl mx-auto mb-10 leading-relaxed">
            FinOpsAi automates reconciliation, journal entries, and month-end reporting —
            so your team can focus on decisions, not data entry.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/signup"
              className="group inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
            >
              Start free — no credit card
              <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="#how-it-works"
              className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 font-medium px-6 py-3 rounded-xl text-sm transition-colors"
            >
              See how it works
            </Link>
          </div>

          <p className="text-xs text-white/25 mt-5 tracking-wide">
            Same-day setup · No ERP required · Cancel anytime
          </p>
        </div>

        {/* Dashboard preview mockup */}
        <div className="relative max-w-5xl mx-auto mt-20">
          <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden shadow-2xl shadow-black/50">
            {/* browser chrome */}
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/10 bg-white/5">
              <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
              <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
              <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
              <span className="ml-3 text-xs text-white/30 font-mono">app.finopsai.com/dashboard</span>
            </div>
            {/* mock dashboard */}
            <div className="p-6 grid grid-cols-3 gap-4">
              {[
                { label: 'Close Confidence', value: '94%', sub: '+12 pts this week', color: 'text-emerald-400' },
                { label: 'Reconciled', value: '1,284', sub: 'transactions matched', color: 'text-blue-400' },
                { label: 'Pending Review', value: '7', sub: 'exceptions flagged', color: 'text-amber-400' },
              ].map(m => (
                <div key={m.label} className="rounded-xl bg-white/5 border border-white/10 p-4 text-left">
                  <p className="text-white/40 text-xs mb-2">{m.label}</p>
                  <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
                  <p className="text-white/30 text-xs mt-1">{m.sub}</p>
                </div>
              ))}
              <div className="col-span-3 rounded-xl bg-white/5 border border-white/10 p-4 text-left">
                <p className="text-white/40 text-xs mb-3">Reconciliation progress</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 rounded-full bg-white/10">
                    <div className="w-[88%] h-full rounded-full bg-blue-500" />
                  </div>
                  <span className="text-white/50 text-xs">88% complete</span>
                </div>
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {['GL Match', 'Bank Rec', 'AP Aging', 'AR Aging'].map(item => (
                    <div key={item} className="flex items-center gap-1.5">
                      <CheckCircle2 size={12} className="text-emerald-400 flex-shrink-0" />
                      <span className="text-white/40 text-xs">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {/* glow under card */}
          <div className="absolute -bottom-8 inset-x-16 h-24 bg-blue-600/20 blur-2xl rounded-full" />
        </div>
      </section>

      {/* ── Social proof strip ── */}
      <section className="border-y border-gray-100 py-8 bg-white">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-6 font-medium">Trusted by finance teams at</p>
          <div className="flex items-center justify-center gap-10 flex-wrap opacity-40 grayscale">
            {['Sequoia', 'Bessemer', 'a16z', 'YC S24', 'First Round'].map(name => (
              <span key={name} className="text-sm font-semibold text-gray-600 tracking-tight">{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          {[
            { stat: '20–50 hrs', label: 'saved per team each month' },
            { stat: '10×', label: 'cheaper than FloQast or Blackline' },
            { stat: '1 day', label: 'average close time with FinOpsAi' },
          ].map(s => (
            <div key={s.stat} className="px-4">
              <div className="text-4xl font-bold text-gray-900 mb-2">{s.stat}</div>
              <div className="text-sm text-gray-500 leading-snug">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-xl mb-16">
            <p className="text-blue-600 text-sm font-semibold uppercase tracking-wider mb-3">Features</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mb-4">
              Everything your close team needs — nothing they don&apos;t.
            </h2>
            <p className="text-gray-500 text-base leading-relaxed">
              Built AI-first from day one. Not legacy software with a chatbot bolted on.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(f => (
              <div key={f.title} className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-blue-100 hover:shadow-sm transition-all group">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
                  <f.icon size={18} className="text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1.5 text-sm">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-blue-600 text-sm font-semibold uppercase tracking-wider mb-3">How it works</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Up and running in under an hour</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
            {steps.map((step, i) => (
              <div key={step.title} className="text-center sm:text-left">
                <div className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-blue-600 text-white text-sm font-bold mb-5">
                  {i + 1}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-24 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-blue-600 text-sm font-semibold uppercase tracking-wider mb-3">Pricing</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Simple, transparent pricing</h2>
            <p className="text-gray-500">14-day free trial on every plan. No credit card required.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {plans.map(plan => (
              <div
                key={plan.name}
                className={`rounded-2xl p-8 border relative ${
                  plan.highlight
                    ? 'bg-[#060C18] border-blue-500/40 shadow-xl shadow-blue-900/20'
                    : 'bg-white border-gray-200'
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-blue-500 text-white text-xs font-semibold px-3 py-1 rounded-full">Most popular</span>
                  </div>
                )}
                <div className={`text-xs font-semibold uppercase tracking-widest mb-3 ${plan.highlight ? 'text-blue-400' : 'text-gray-400'}`}>
                  {plan.name}
                </div>
                <div className={`text-4xl font-bold mb-1 ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>
                  {plan.price}
                </div>
                <div className={`text-sm mb-6 ${plan.highlight ? 'text-white/40' : 'text-gray-400'}`}>
                  / month
                </div>
                <ul className="space-y-2.5 mb-8">
                  {plan.features.map(f => (
                    <li key={f} className={`flex items-start gap-2.5 text-sm ${plan.highlight ? 'text-white/70' : 'text-gray-600'}`}>
                      <CheckCircle2 size={15} className={`mt-0.5 flex-shrink-0 ${plan.highlight ? 'text-blue-400' : 'text-blue-600'}`} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className={`block text-center py-3 rounded-xl font-medium text-sm transition-colors ${
                    plan.highlight
                      ? 'bg-blue-500 hover:bg-blue-400 text-white'
                      : 'bg-gray-900 hover:bg-gray-800 text-white'
                  }`}
                >
                  Start free trial
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="bg-[#060C18] py-24 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[400px] rounded-full bg-blue-600/10 blur-[100px]" />
        </div>
        <div className="relative max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 leading-tight">
            Your next close starts today.
          </h2>
          <p className="text-white/50 mb-8 text-base leading-relaxed">
            Join finance teams that cut close time by 80% in their first month.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white font-semibold px-8 py-4 rounded-xl text-sm transition-colors"
          >
            Get started free
            <ArrowRight size={15} />
          </Link>
          <p className="text-xs text-white/25 mt-4">No credit card · Same-day setup · Cancel anytime</p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-100 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 size={12} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="font-semibold text-sm text-gray-900">FinOpsAi</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <Link href="/login" className="hover:text-gray-600 transition-colors">Sign in</Link>
            <Link href="#features" className="hover:text-gray-600 transition-colors">Features</Link>
            <Link href="#pricing" className="hover:text-gray-600 transition-colors">Pricing</Link>
          </div>
          <p className="text-sm text-gray-400">© 2026 FinOpsAi. All rights reserved.</p>
        </div>
      </footer>

    </div>
  )
}

/* ── Data ── */

const features = [
  {
    icon: RefreshCw,
    title: 'ReconcileAI',
    desc: 'Upload any bank or invoice CSV. AI matches, flags duplicates, and explains every anomaly in plain English.',
  },
  {
    icon: Gauge,
    title: 'Close Confidence Score',
    desc: 'A real-time 0–100 score showing how close-ready your books are. Share it with your CFO instead of status emails.',
  },
  {
    icon: BookOpen,
    title: 'Journal Entry Drafting',
    desc: 'AI drafts 80% of your journal entries automatically. You review and approve — not create from scratch.',
  },
  {
    icon: TrendingUp,
    title: 'Cash Flow Forecasting',
    desc: '13-week AI cash flow forecast with a runway calculator. Get alerts before you hit a problem.',
  },
  {
    icon: FileBarChart2,
    title: 'One-Click Board Packs',
    desc: 'Generate a board-ready financial package in seconds — P&L, cash flow, variance, and AI-written commentary.',
  },
  {
    icon: Building2,
    title: 'Firm Platform',
    desc: 'Multi-client dashboard for accounting firms. White-label branding. Manage 10–50 clients from one place.',
  },
  {
    icon: BrainCircuit,
    title: 'AI CFO Briefing',
    desc: 'Daily AI-generated financial briefing delivered to your inbox. Proactive insights before you ask.',
  },
  {
    icon: ShieldCheck,
    title: 'Full Audit Trail',
    desc: 'Every AI decision is logged with full reasoning. Auditors see exactly why every transaction was categorized.',
  },
  {
    icon: Link2,
    title: 'Native Integrations',
    desc: 'QuickBooks, Xero, Stripe, Plaid, Gusto, and more. Zero CSV exports required.',
  },
]

const steps = [
  {
    title: 'Connect your accounts',
    desc: 'Link QuickBooks, Xero, or your bank in one click. FinOpsAi ingests your transactions and GL data instantly.',
  },
  {
    title: 'Let AI do the heavy work',
    desc: 'Our engine matches transactions, drafts journal entries, flags exceptions, and builds your close checklist.',
  },
  {
    title: 'Review, approve, and close',
    desc: 'Your team reviews AI suggestions, approves what looks right, and closes in hours — not days.',
  },
]

const plans = [
  {
    name: 'Starter',
    price: '$499',
    highlight: false,
    features: [
      '1 entity',
      'Up to 1,000 transactions / mo',
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
      'SSO (SAML 2.0)',
      'Dedicated support',
    ],
  },
]
