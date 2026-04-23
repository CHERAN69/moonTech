import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Security & Privacy — FinOpsAi',
  description: 'How FinOpsAi protects your financial data. Encryption, access controls, and data handling explained.',
}

const SECTIONS = [
  {
    icon: '🔒',
    title: 'Your data is encrypted end-to-end',
    body: 'Every file you upload is encrypted in transit (TLS 1.3) and at rest (AES-256). This means your bank statements and invoices are unreadable to anyone — including us — unless you are logged in as the account owner. Encryption keys are managed by Supabase, which runs on AWS infrastructure certified to ISO 27001 and SOC 2 Type II.',
  },
  {
    icon: '🤖',
    title: 'What gets sent to AI (OpenAI)',
    body: 'FinOpsAi uses OpenAI at two points in the workflow. (1) Classification: when you upload a file, up to 5 sample rows and column headers are sent to identify the document type (bank statement, invoice, payroll, etc). (2) Exception analysis: for unmatched or flagged transactions, the amount, date, vendor name, and description of those specific transactions are sent so the AI can explain why they are flagged and suggest a resolution. Your full transaction history is never bulk-exported to OpenAI — only the items actively under review. OpenAI does not use API-submitted data to train its models.',
  },
  {
    icon: '👁️',
    title: 'We do not read your financial data',
    body: 'FinOpsAi is a tool — not a financial advisor, auditor, or data broker. We do not read, analyze, sell, or share your financial data with any third party. Your uploaded files, transaction records, and reconciliation results are visible only to you and anyone you explicitly invite to your account.',
  },
  {
    icon: '🏗️',
    title: 'Infrastructure & hosting',
    body: 'The application runs on Vercel (edge network, globally distributed). Your database and file storage run on Supabase (PostgreSQL on AWS). Both platforms maintain SOC 2 Type II compliance, offer 99.9%+ uptime SLAs, and operate in data centers with physical security, redundant power, and automated backups.',
  },
  {
    icon: '🔑',
    title: 'Access controls',
    body: 'Every API endpoint requires authentication. Row-Level Security (RLS) is enforced at the database level — meaning even if someone obtained raw database access, they could only see rows belonging to their own account. Sessions expire automatically and all authentication is handled by Supabase Auth, which supports multi-factor authentication.',
  },
  {
    icon: '🗑️',
    title: 'Data deletion',
    body: 'You can delete any uploaded file, reconciliation session, or your entire account at any time from Settings. Deletion is permanent and irreversible — we do not retain soft-deleted records. If you close your account, all associated data is purged from our systems within 30 days.',
  },
  {
    icon: '📋',
    title: 'Audit trail',
    body: 'Every action taken in FinOpsAi — uploads, approvals, rejections, classification changes — is written to an immutable audit log. This log is yours: you can export it at any time from the Audit page. It is designed to satisfy internal compliance reviews and external audit requirements.',
  },
  {
    icon: '🌍',
    title: 'GDPR & data residency',
    body: 'If you are located in the EU, your data is processed in accordance with GDPR. You have the right to access, correct, export, or delete your personal data at any time by contacting us or using the account settings page. Data is stored in US-East AWS regions by default. EU-region hosting is available on the Agency plan.',
  },
]

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div style={{ background: '#1E3A5F' }} className="px-6 py-16 text-center">
        <div className="text-4xl mb-4">🔐</div>
        <h1 className="text-3xl font-bold text-white mb-3">Security & Privacy</h1>
        <p className="text-blue-200 text-base max-w-xl mx-auto">
          Your financial data is sensitive. Here is exactly how we protect it — no marketing fluff, just the facts.
        </p>
      </div>

      {/* Trust badges */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
          {[
            { label: 'TLS 1.3', sub: 'Data in transit' },
            { label: 'AES-256', sub: 'Data at rest' },
            { label: 'SOC 2 Type II', sub: 'Infrastructure' },
            { label: 'RLS enforced', sub: 'Database layer' },
          ].map(b => (
            <div key={b.label} className="bg-white rounded-xl border border-gray-100 p-4 text-center shadow-sm">
              <div className="text-sm font-bold text-gray-800">{b.label}</div>
              <div className="text-xs text-gray-400 mt-0.5">{b.sub}</div>
            </div>
          ))}
        </div>

        {/* Sections */}
        <div className="space-y-6">
          {SECTIONS.map(s => (
            <div key={s.title} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <span className="text-2xl flex-shrink-0">{s.icon}</span>
                <div>
                  <h2 className="text-base font-semibold text-gray-900 mb-2">{s.title}</h2>
                  <p className="text-sm text-gray-600 leading-relaxed">{s.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Contact */}
        <div className="mt-10 rounded-2xl p-6 text-center" style={{ background: '#EFF6FF' }}>
          <h3 className="text-base font-semibold mb-1" style={{ color: '#1E3A5F' }}>Questions about your data?</h3>
          <p className="text-sm text-gray-500 mb-3">We respond to all security and privacy inquiries within 24 hours.</p>
          <a
            href="mailto:security@finopsai.com"
            className="inline-block text-sm font-medium px-4 py-2 rounded-lg text-white transition-opacity hover:opacity-90"
            style={{ background: '#1E3A5F' }}
          >
            Contact security@finopsai.com
          </a>
        </div>

        <p className="text-center text-xs text-gray-300 mt-8">Last updated April 2026</p>
      </div>
    </div>
  )
}
