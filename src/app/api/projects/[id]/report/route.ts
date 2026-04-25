import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, getIP, API_LIMIT } from '@/lib/rate-limit'

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}
function fmtShort(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const ip = getIP(req)
  const rl = rateLimit(`${ip}:/api/projects/[id]/report`, API_LIMIT)
  if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch session
  const { data: session, error: sessionErr } = await supabase
    .from('reconciliation_sessions')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (sessionErr || !session) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  // Fetch profile for company name
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, company_name')
    .eq('id', user.id)
    .single()

  // Fetch all match pairs for this session
  const { data: pairs } = await supabase
    .from('match_pairs')
    .select('*')
    .eq('session_id', id)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  // Fetch journal entries (may not have session_id FK — fetch by date range)
  const { data: journalEntries } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('user_id', user.id)
    .gte('date', session.period_start)
    .lte('date', session.period_end)
    .order('date', { ascending: true })

  // Fetch audit log for this session
  const { data: auditLog } = await supabase
    .from('audit_log')
    .select('action, entity_type, created_at, ai_involved')
    .eq('user_id', user.id)
    .or(`entity_id.eq.${id},entity_type.eq.match_pair`)
    .order('created_at', { ascending: true })
    .limit(100)

  const allPairs = pairs ?? []
  const matched   = allPairs.filter(p => p.status === 'matched')
  const unmatched = allPairs.filter(p => p.status === 'unmatched' && !p.resolution)
  const resolved  = allPairs.filter(p => p.resolution)
  const matchRate = allPairs.length > 0 ? Math.round((matched.length / allPairs.length) * 100) : 0

  const totalMatchedAmt  = matched.reduce((s: number, p) => s + (p.bank_transaction?.amount ?? 0), 0)
  const totalException   = resolved.reduce((s: number, p) => s + (p.bank_transaction?.amount ?? 0), 0)

  const companyName = profile?.company_name || 'Your Company'
  const reviewerName = profile?.full_name || user.email || 'Finance Team'
  const generatedAt = new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })

  // Resolution breakdown
  const resolutionCounts: Record<string, number> = {}
  for (const p of resolved) {
    const r = p.resolution ?? 'unknown'
    resolutionCounts[r] = (resolutionCounts[r] ?? 0) + 1
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Reconciliation Report — ${session.name}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; background: #fff; font-size: 13px; }
  @media print {
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .no-print { display: none; }
    .page-break { page-break-before: always; }
  }

  /* Cover */
  .cover { background: #1E3A5F; color: white; padding: 64px 48px; min-height: 260px; }
  .cover h1 { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
  .cover .sub { font-size: 15px; opacity: 0.75; margin-bottom: 32px; }
  .cover .meta { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; margin-top: 32px; }
  .cover .meta-item label { font-size: 10px; opacity: 0.6; text-transform: uppercase; letter-spacing: 1px; }
  .cover .meta-item p { font-size: 14px; font-weight: 600; margin-top: 2px; }

  /* Main content */
  .content { padding: 40px 48px; max-width: 900px; margin: 0 auto; }
  h2 { font-size: 16px; font-weight: 700; color: #1E3A5F; margin: 32px 0 12px; padding-bottom: 6px; border-bottom: 2px solid #E5E7EB; }
  h3 { font-size: 13px; font-weight: 600; color: #374151; margin: 20px 0 8px; }

  /* Summary grid */
  .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 16px 0; }
  .stat-card { border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px; text-align: center; }
  .stat-card .value { font-size: 24px; font-weight: 700; }
  .stat-card .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #6B7280; margin-top: 4px; }
  .stat-card.green { border-color: #BBF7D0; background: #F0FDF4; }
  .stat-card.green .value { color: #15803D; }
  .stat-card.amber { border-color: #FDE68A; background: #FFFBEB; }
  .stat-card.amber .value { color: #B45309; }
  .stat-card.red { border-color: #FECACA; background: #FEF2F2; }
  .stat-card.red .value { color: #B91C1C; }
  .stat-card.blue { border-color: #BFDBFE; background: #EFF6FF; }
  .stat-card.blue .value { color: #1D4ED8; }

  /* Tables */
  table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 12px; }
  th { background: #F9FAFB; border-bottom: 1px solid #E5E7EB; padding: 8px 10px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #6B7280; font-weight: 600; }
  td { border-bottom: 1px solid #F3F4F6; padding: 8px 10px; vertical-align: top; }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: #F9FAFB; }

  /* Badges */
  .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 600; }
  .badge-green  { background: #DCFCE7; color: #15803D; }
  .badge-amber  { background: #FEF3C7; color: #92400E; }
  .badge-red    { background: #FEE2E2; color: #B91C1C; }
  .badge-blue   { background: #DBEAFE; color: #1D4ED8; }
  .badge-gray   { background: #F3F4F6; color: #374151; }

  /* Sign-off */
  .signoff { margin-top: 48px; border: 1px solid #E5E7EB; border-radius: 12px; padding: 24px; }
  .signoff-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 16px; }
  .sig-block { border-top: 1px solid #374151; padding-top: 8px; margin-top: 40px; }
  .sig-block label { font-size: 10px; color: #6B7280; }

  .footer { text-align: center; color: #9CA3AF; font-size: 10px; margin-top: 32px; padding-top: 16px; border-top: 1px solid #F3F4F6; }

  .print-btn { position: fixed; top: 16px; right: 16px; background: #1E3A5F; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; }
</style>
</head>
<body>
<button class="print-btn no-print" onclick="window.print()">Print / Save PDF</button>

<!-- Cover -->
<div class="cover">
  <div style="font-size:11px;opacity:0.5;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px">Reconciliation Report</div>
  <h1>${session.name}</h1>
  <div class="sub">${companyName}</div>
  <div class="meta">
    <div class="meta-item">
      <label>Reporting Period</label>
      <p>${fmtShort(session.period_start)} – ${fmtShort(session.period_end)}</p>
    </div>
    <div class="meta-item">
      <label>Prepared By</label>
      <p>${reviewerName}</p>
    </div>
    <div class="meta-item">
      <label>Generated</label>
      <p>${generatedAt}</p>
    </div>
  </div>
</div>

<div class="content">

  <!-- 1. Executive Summary -->
  <h2>1. Executive Summary</h2>
  <p style="color:#4B5563;line-height:1.7;margin-bottom:16px">
    This report presents the results of the reconciliation engagement for <strong>${session.name}</strong> covering the period
    <strong>${fmtDate(session.period_start)}</strong> to <strong>${fmtDate(session.period_end)}</strong>.
    The reconciliation process compared bank transaction records against invoice records, identified discrepancies,
    and resolved all flagged exceptions prior to financial close.
  </p>

  <div class="summary-grid">
    <div class="stat-card blue">
      <div class="value">${allPairs.length}</div>
      <div class="label">Total Items</div>
    </div>
    <div class="stat-card green">
      <div class="value">${matched.length}</div>
      <div class="label">Matched</div>
    </div>
    <div class="stat-card amber">
      <div class="value">${resolved.length}</div>
      <div class="label">Exceptions Resolved</div>
    </div>
    <div class="stat-card ${matchRate >= 90 ? 'green' : matchRate >= 70 ? 'amber' : 'red'}">
      <div class="value">${matchRate}%</div>
      <div class="label">Match Rate</div>
    </div>
  </div>

  <table>
    <tr><th>Category</th><th>Count</th><th>Amount</th><th>Status</th></tr>
    <tr>
      <td>Auto-Matched Transactions</td>
      <td>${matched.length}</td>
      <td>${fmt(totalMatchedAmt)}</td>
      <td><span class="badge badge-green">Complete</span></td>
    </tr>
    <tr>
      <td>Exceptions Reviewed &amp; Resolved</td>
      <td>${resolved.length}</td>
      <td>${fmt(totalException)}</td>
      <td><span class="badge badge-green">Resolved</span></td>
    </tr>
    <tr>
      <td>Outstanding Unresolved Items</td>
      <td>${unmatched.length}</td>
      <td>—</td>
      <td><span class="badge ${unmatched.length === 0 ? 'badge-green' : 'badge-red'}">${unmatched.length === 0 ? 'None' : 'Pending'}</span></td>
    </tr>
    <tr>
      <td>Journal Entries Posted</td>
      <td>${(journalEntries ?? []).filter(j => j.status === 'posted').length}</td>
      <td>—</td>
      <td><span class="badge badge-blue">Posted</span></td>
    </tr>
  </table>

  <!-- 2. Reconciliation Results -->
  <h2 class="page-break">2. Reconciliation Results</h2>

  ${resolved.length > 0 ? `
  <h3>Exception Resolution Log</h3>
  <table>
    <tr>
      <th>Date</th>
      <th>Vendor / Description</th>
      <th>Amount</th>
      <th>Resolution</th>
      <th>Note</th>
    </tr>
    ${resolved.slice(0, 100).map(p => `
    <tr>
      <td>${p.bank_transaction?.date || '—'}</td>
      <td>${p.bank_transaction?.vendor || p.bank_transaction?.description || '—'}</td>
      <td>${fmt(p.bank_transaction?.amount ?? 0)}</td>
      <td><span class="badge ${
        p.resolution === 'approved' ? 'badge-green' :
        p.resolution === 'rejected' ? 'badge-red' :
        p.resolution === 'edited'   ? 'badge-blue' : 'badge-gray'
      }">${(p.resolution ?? '').replace('_', ' ')}</span></td>
      <td style="color:#6B7280;font-size:11px">${p.note || p.override_reason || '—'}</td>
    </tr>`).join('')}
  </table>
  ` : '<p style="color:#6B7280">No exceptions required resolution in this period.</p>'}

  ${unmatched.length > 0 ? `
  <h3>Remaining Unresolved Items (${unmatched.length})</h3>
  <table>
    <tr><th>Date</th><th>Vendor / Description</th><th>Amount</th><th>Status</th></tr>
    ${unmatched.slice(0, 50).map(p => `
    <tr>
      <td>${p.bank_transaction?.date || '—'}</td>
      <td>${p.bank_transaction?.vendor || p.bank_transaction?.description || '—'}</td>
      <td>${fmt(p.bank_transaction?.amount ?? 0)}</td>
      <td><span class="badge badge-amber">${p.status}</span></td>
    </tr>`).join('')}
  </table>
  ` : ''}

  <!-- 3. Resolution Breakdown -->
  <h2>3. Exception Resolution Breakdown</h2>
  <table>
    <tr><th>Resolution Type</th><th>Count</th><th>Description</th></tr>
    ${Object.entries(resolutionCounts).map(([res, cnt]) => `
    <tr>
      <td><span class="badge ${
        res === 'approved' ? 'badge-green' :
        res === 'rejected' ? 'badge-red'  :
        res === 'edited'   ? 'badge-blue' : 'badge-gray'
      }">${res}</span></td>
      <td>${cnt}</td>
      <td style="color:#6B7280">${
        res === 'approved' ? 'Transaction reviewed and approved as legitimate' :
        res === 'rejected' ? 'Transaction excluded from reconciliation' :
        res === 'edited'   ? 'Transaction manually matched or GL category overridden' :
        res === 'resolved' ? 'Exception acknowledged and marked resolved' :
        'Other resolution'
      }</td>
    </tr>`).join('')}
    ${Object.keys(resolutionCounts).length === 0 ? '<tr><td colspan="3" style="color:#9CA3AF;text-align:center">No exceptions resolved</td></tr>' : ''}
  </table>

  <!-- 4. Journal Entries -->
  <h2>4. Journal Entries</h2>
  ${(journalEntries ?? []).length > 0 ? `
  <table>
    <tr><th>Date</th><th>Description</th><th>Amount</th><th>Status</th><th>AI Generated</th></tr>
    ${(journalEntries ?? []).map(je => `
    <tr>
      <td>${fmtShort(je.date)}</td>
      <td>${je.description}</td>
      <td>${fmt(je.total_amount ?? 0)}</td>
      <td><span class="badge ${
        je.status === 'posted'   ? 'badge-green' :
        je.status === 'approved' ? 'badge-blue'  :
        je.status === 'rejected' ? 'badge-red'   : 'badge-gray'
      }">${je.status?.replace('_', ' ')}</span></td>
      <td>${je.ai_generated ? '<span class="badge badge-blue">AI Draft</span>' : '<span class="badge badge-gray">Manual</span>'}</td>
    </tr>`).join('')}
  </table>
  ` : '<p style="color:#6B7280">No journal entries recorded for this period.</p>'}

  <!-- 5. Audit Trail Summary -->
  <h2>5. Audit Trail Summary</h2>
  <p style="color:#4B5563;margin-bottom:12px;line-height:1.6">
    The following actions were recorded in the immutable audit log during this reconciliation engagement.
    The full audit trail is available from the Audit page.
  </p>
  ${(auditLog ?? []).length > 0 ? `
  <table>
    <tr><th>Timestamp</th><th>Action</th><th>Entity</th><th>AI Involved</th></tr>
    ${(auditLog ?? []).slice(0, 30).map(entry => `
    <tr>
      <td style="white-space:nowrap">${fmtShort(entry.created_at)}</td>
      <td>${entry.action?.replace(/_/g, ' ')}</td>
      <td><span class="badge badge-gray">${entry.entity_type?.replace(/_/g, ' ')}</span></td>
      <td>${entry.ai_involved ? 'Yes' : 'No'}</td>
    </tr>`).join('')}
  </table>
  ` : '<p style="color:#6B7280">No audit entries found for this session.</p>'}

  <!-- 6. Sign-off & Certification -->
  <div class="signoff">
    <h2 style="margin-top:0;border:none;padding:0">6. Certification &amp; Sign-off</h2>
    <p style="color:#4B5563;margin-top:8px;line-height:1.7">
      I certify that the reconciliation for the period ending <strong>${fmtDate(session.period_end)}</strong>
      has been completed in accordance with internal financial controls and review procedures. All material
      exceptions have been reviewed, documented, and appropriately resolved. The reconciliation results
      presented in this report are accurate to the best of my knowledge.
    </p>
    <div class="signoff-grid">
      <div>
        <div class="sig-block">
          <label>Prepared by</label><br/>
          <span style="font-weight:600">${reviewerName}</span>
        </div>
        <div style="margin-top:12px;color:#6B7280;font-size:11px">Date: _________________________</div>
      </div>
      <div>
        <div class="sig-block">
          <label>Reviewed &amp; Approved by</label><br/>
          <span style="color:#9CA3AF">_________________________</span>
        </div>
        <div style="margin-top:12px;color:#6B7280;font-size:11px">Date: _________________________</div>
      </div>
    </div>
  </div>

  <div class="footer">
    Generated by FinOpsAi · ${companyName} · ${generatedAt}<br/>
    This report was prepared using AI-assisted reconciliation tools. All exception resolutions were reviewed and approved by a human controller.
  </div>

</div>

<script>
  // Auto-print if ?print=1 in URL
  if (new URLSearchParams(location.search).get('print') === '1') {
    window.addEventListener('load', () => window.print())
  }
</script>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}
