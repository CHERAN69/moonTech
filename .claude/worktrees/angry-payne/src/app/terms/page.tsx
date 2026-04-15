import Link from 'next/link'

export default function TermsPage() {
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

        <h1 className="text-3xl font-bold mb-2" style={{ color: '#1E3A5F' }}>Terms of Service</h1>
        <p className="text-gray-400 text-sm mb-10">Last updated: April 13, 2026</p>

        <div className="prose prose-gray max-w-none space-y-8 text-sm text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">1. Acceptance of Terms</h2>
            <p>By creating an account and using ClosePilot AI (&ldquo;Service&rdquo;), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">2. Description of Service</h2>
            <p>ClosePilot AI is an AI-powered financial close management platform that assists accounting teams with bank reconciliation, exception management, journal entry drafting, and month-end close workflows.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">3. Data and Privacy</h2>
            <p>You retain full ownership of all financial data you upload. ClosePilot AI processes your data solely to provide the Service. We do not sell or share your data with third parties except as required to operate the Service (e.g., Supabase for storage, OpenAI for AI analysis). See our <Link href="/privacy" className="underline" style={{ color: '#2E75B6' }}>Privacy Policy</Link> for full details.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">4. Subscription and Billing</h2>
            <p>Paid plans are billed monthly via Stripe. You may cancel at any time. Cancellation takes effect at the end of the current billing period. No refunds are issued for partial months.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">5. Disclaimer of Warranties</h2>
            <p>The Service is provided &ldquo;as is&rdquo; without warranties of any kind. AI-generated outputs — including reconciliation matches, anomaly explanations, and journal entry suggestions — are for informational purposes only and do not constitute professional accounting, legal, or financial advice. Always have a qualified professional review material decisions.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">6. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, ClosePilot AI shall not be liable for any indirect, incidental, or consequential damages arising out of your use of the Service.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">7. Changes to Terms</h2>
            <p>We may update these Terms at any time. Continued use of the Service after changes constitutes acceptance of the new Terms.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">8. Contact</h2>
            <p>Questions? Email us at <a href="mailto:legal@closepilot.ai" className="underline" style={{ color: '#2E75B6' }}>legal@closepilot.ai</a>.</p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200 flex items-center gap-4 text-sm">
          <Link href="/signup" className="font-medium" style={{ color: '#2E75B6' }}>← Back to sign up</Link>
          <Link href="/privacy" className="text-gray-400 hover:text-gray-600">Privacy Policy</Link>
        </div>
      </div>
    </div>
  )
}
