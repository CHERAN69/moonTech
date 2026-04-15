import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen" style={{ background: '#F8FAFC' }}>
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="flex items-center gap-2 mb-10">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#1E3A5F' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 8L6 12L14 4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="font-bold text-lg" style={{ color: '#1E3A5F' }}>ClosePilot AI</span>
        </div>

        <h1 className="text-3xl font-bold mb-2" style={{ color: '#1E3A5F' }}>Privacy Policy</h1>
        <p className="text-gray-400 text-sm mb-10">Last updated: April 13, 2026</p>

        <div className="prose prose-gray max-w-none space-y-8 text-sm text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">1. Data We Collect</h2>
            <p>We collect the following data when you use ClosePilot AI:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Account data:</strong> name, email, company name, subscription tier.</li>
              <li><strong>Financial data:</strong> CSV/XLSX files you upload (bank statements, invoices, payroll exports).</li>
              <li><strong>Usage data:</strong> audit log entries, reconciliation sessions, exception actions.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">2. How We Use Your Data</h2>
            <p>Your data is used exclusively to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Run AI-powered reconciliation matching and anomaly detection.</li>
              <li>Generate CFO briefings, journal entries, and close reports.</li>
              <li>Maintain your audit trail for compliance purposes.</li>
              <li>Process billing through Stripe.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">3. Third-Party Processors</h2>
            <p>We use the following sub-processors to operate the Service:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Supabase</strong> — database storage and authentication (SOC 2 Type II).</li>
              <li><strong>OpenAI</strong> — AI analysis of transaction data. Data is not used to train OpenAI models per our API agreement.</li>
              <li><strong>Stripe</strong> — payment processing (PCI DSS Level 1).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">4. Data Retention</h2>
            <p>Your data is retained for the duration of your account plus 90 days after cancellation, after which it is permanently deleted. You may request deletion at any time by emailing <a href="mailto:privacy@closepilot.ai" className="underline" style={{ color: '#2E75B6' }}>privacy@closepilot.ai</a>.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">5. Security</h2>
            <p>All data is encrypted at rest (AES-256) and in transit (TLS 1.3). Access is restricted to authenticated users only, enforced via Supabase Row Level Security policies.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">6. Your Rights</h2>
            <p>You have the right to access, correct, export, or delete your personal data at any time. Contact us at <a href="mailto:privacy@closepilot.ai" className="underline" style={{ color: '#2E75B6' }}>privacy@closepilot.ai</a> to exercise these rights.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">7. Changes to this Policy</h2>
            <p>We will notify you via email of material changes to this policy at least 30 days before they take effect.</p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200 flex items-center gap-4 text-sm">
          <Link href="/signup" className="font-medium" style={{ color: '#2E75B6' }}>← Back to sign up</Link>
          <Link href="/terms" className="text-gray-400 hover:text-gray-600">Terms of Service</Link>
        </div>
      </div>
    </div>
  )
}
