import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'

// ─── CSV helper ───────────────────────────────────────────────────────────────

function toCSV(rows: Record<string, unknown>[], columns: string[]): string {
  const header = columns.join(',')
  const body = rows.map(row =>
    columns.map(col => {
      const val = row[col]
      if (val === null || val === undefined) return ''
      const str = typeof val === 'object' ? JSON.stringify(val) : String(val)
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str
    }).join(',')
  )
  return [header, ...body].join('\n')
}

// ─── Excel helper ─────────────────────────────────────────────────────────────

function toExcel(
  sheets: Array<{ name: string; rows: Record<string, unknown>[]; columns: string[] }>
): Buffer {
  const wb = XLSX.utils.book_new()
  for (const sheet of sheets) {
    const header = sheet.columns
    const data   = sheet.rows.map(row => sheet.columns.map(c => row[c] ?? ''))
    const ws     = XLSX.utils.aoa_to_sheet([header, ...data])

    // Column widths
    ws['!cols'] = sheet.columns.map(c => ({ wch: Math.max(c.length + 2, 14) }))

    // Header row style (xlsx community edition doesn't support cell styles,
    // but we set freeze pane and auto filter)
    ws['!freeze'] = { xSplit: 0, ySplit: 1 }
    ws['!autofilter'] = { ref: `A1:${XLSX.utils.encode_col(sheet.columns.length - 1)}1` }

    XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31))
  }
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  return Buffer.from(buf)
}

// ─── PDF (HTML) helper ────────────────────────────────────────────────────────

function htmlReport(title: string, subtitle: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 12px; color: #111; background: #fff; padding: 32px 40px; }
  h1  { font-size: 20px; font-weight: 700; color: #1E3A5F; margin-bottom: 4px; }
  h2  { font-size: 14px; font-weight: 600; color: #1E3A5F; margin: 20px 0 8px; padding-bottom: 4px; border-bottom: 2px solid #E5E7EB; }
  h3  { font-size: 11px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.05em; margin: 12px 0 6px; }
  .subtitle { color: #6B7280; font-size: 11px; margin-bottom: 6px; }
  .meta     { color: #9CA3AF; font-size: 10px; margin-bottom: 24px; }
  .logo-bar { display: flex; align-items: center; gap: 10px; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #E5E7EB; }
  .logo     { width: 28px; height: 28px; background: #1E3A5F; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 14px; }
  .brand    { font-weight: 700; font-size: 16px; color: #1E3A5F; }
  table   { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 12px; }
  thead   { background: #F9FAFB; }
  th      { text-align: left; padding: 7px 10px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.04em; font-size: 10px; border-bottom: 1px solid #E5E7EB; }
  td      { padding: 6px 10px; border-bottom: 1px solid #F3F4F6; vertical-align: top; }
  tr:last-child td { border-bottom: none; }
  .total  { font-weight: 700; background: #F9FAFB; }
  .pos    { color: #16A34A; }
  .neg    { color: #DC2626; }
  .warn   { color: #D97706; }
  .badge  { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 600; }
  .badge-green  { background: #F0FDF4; color: #16A34A; }
  .badge-blue   { background: #EFF6FF; color: #2563EB; }
  .badge-red    { background: #FEF2F2; color: #DC2626; }
  .badge-amber  { background: #FFFBEB; color: #D97706; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
  .kpi      { border: 1px solid #E5E7EB; border-radius: 8px; padding: 12px; }
  .kpi-label { font-size: 10px; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
  .kpi-value { font-size: 18px; font-weight: 700; color: #111; }
  .section  { page-break-inside: avoid; margin-bottom: 28px; }
  .note     { background: #EFF6FF; border-left: 3px solid #2563EB; padding: 8px 12px; font-size: 10px; color: #1D4ED8; margin-bottom: 16px; border-radius: 0 4px 4px 0; }
  @media print {
    body { padding: 16px 24px; }
    .no-print { display: none !important; }
    table { page-break-inside: auto; }
    tr    { page-break-inside: avoid; }
  }
</style>
</head>
<body>
<div class="logo-bar">
  <div class="logo">C</div>
  <div class="brand">ClosePilot</div>
</div>
<h1>${title}</h1>
<div class="subtitle">${subtitle}</div>
<div class="meta">Generated ${new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })}</div>

${body}

<script>window.addEventListener('load', () => setTimeout(() => window.print(), 400))<\/script>
</body>
</html>`
}

// ─── Data fetchers ────────────────────────────────────────────────────────────

async function fetchMatchPairs(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, sessionId?: string | null, dateFrom?: string | null, dateTo?: string | null) {
  let q = supabase.from('match_pairs').select(`
    id, status, confidence, match_method, gl_category, gl_override,
    resolution, note, flags, bank_transaction, invoice_transaction,
    created_at, reviewed_at
  `).eq('user_id', userId).order('created_at', { ascending: false })

  if (sessionId) q = q.eq('session_id', sessionId)
  if (dateFrom)  q = q.gte('created_at', dateFrom)
  if (dateTo)    q = q.lte('created_at', dateTo + 'T23:59:59Z')

  const { data, error } = await q
  if (error) throw new Error(error.message)
  return data ?? []
}

async function fetchAuditLog(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, dateFrom?: string | null, dateTo?: string | null) {
  let q = supabase.from('audit_log')
    .select('id, entity_type, entity_id, action, ai_involved, user_email, ip_address, created_at, changes')
    .eq('user_id', userId).order('created_at', { ascending: false })

  if (dateFrom) q = q.gte('created_at', dateFrom)
  if (dateTo)   q = q.lte('created_at', dateTo + 'T23:59:59Z')

  const { data, error } = await q
  if (error) throw new Error(error.message)
  return data ?? []
}

async function fetchSessions(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, limit = 24) {
  const { data, error } = await supabase
    .from('reconciliation_sessions').select('*')
    .eq('user_id', userId).order('created_at', { ascending: false }).limit(limit)
  if (error) throw new Error(error.message)
  return data ?? []
}

// ─── Row mappers ──────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPairRow(p: any): Record<string, unknown> {
  return {
    id:                p.id,
    status:            p.status,
    resolution:        p.resolution ?? '',
    confidence:        p.confidence,
    match_method:      p.match_method ?? '',
    gl_category:       p.gl_override || p.gl_category || '',
    bank_date:         p.bank_transaction?.date ?? '',
    bank_amount:       p.bank_transaction?.amount ?? '',
    bank_vendor:       p.bank_transaction?.vendor ?? '',
    bank_description:  p.bank_transaction?.description ?? '',
    invoice_date:      p.invoice_transaction?.date ?? '',
    invoice_amount:    p.invoice_transaction?.amount ?? '',
    invoice_reference: p.invoice_transaction?.reference ?? '',
    flags:             JSON.stringify(p.flags ?? []),
    note:              p.note ?? '',
    reviewed_at:       p.reviewed_at ?? '',
    created_at:        p.created_at,
  }
}

const PAIR_COLS = [
  'id','status','resolution','confidence','match_method','gl_category',
  'bank_date','bank_amount','bank_vendor','bank_description',
  'invoice_date','invoice_amount','invoice_reference',
  'flags','note','reviewed_at','created_at',
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapAuditRow(e: any): Record<string, unknown> {
  return {
    id:          e.id,
    entity_type: e.entity_type,
    entity_id:   e.entity_id,
    action:      e.action,
    ai_involved: e.ai_involved,
    actor:       e.user_email ?? '',
    changes:     JSON.stringify(e.changes ?? {}),
    ip_address:  e.ip_address ?? '',
    created_at:  e.created_at,
  }
}

const AUDIT_COLS = ['id','entity_type','entity_id','action','ai_involved','actor','changes','ip_address','created_at']

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSessionRow(s: any): Record<string, unknown> {
  return {
    id:                          s.id,
    name:                        s.name,
    period_start:                s.period_start ?? '',
    period_end:                  s.period_end ?? '',
    status:                      s.status,
    close_confidence_score:      s.close_confidence_score,
    total_bank_transactions:     s.total_bank_transactions,
    total_invoice_transactions:  s.total_invoice_transactions,
    matched_count:               s.matched_count,
    unmatched_count:             s.unmatched_count,
    flagged_count:               s.flagged_count,
    duplicate_count:             s.duplicate_count,
    total_matched_amount:        s.total_matched_amount,
    total_unmatched_amount:      s.total_unmatched_amount,
    signed_off:                  s.signed_off_by ? 'Yes' : 'No',
    created_at:                  s.created_at,
  }
}

const SESSION_COLS = [
  'id','name','period_start','period_end','status','close_confidence_score',
  'total_bank_transactions','total_invoice_transactions',
  'matched_count','unmatched_count','flagged_count','duplicate_count',
  'total_matched_amount','total_unmatched_amount','signed_off','created_at',
]

// ─── HTML body builders ───────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fmt(n: number) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n) }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pct(n: number) { return `${n}%` }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sessionTableHTML(sessions: any[]): string {
  if (!sessions.length) return '<p style="color:#9CA3AF">No sessions found.</p>'
  const rows = sessions.map(s => {
    const sc = s.close_confidence_score
    const color = sc >= 80 ? '#16A34A' : sc >= 50 ? '#D97706' : '#DC2626'
    const badgeClass = s.status === 'complete' ? 'badge-green' : s.status === 'error' ? 'badge-red' : 'badge-blue'
    const label     = s.status === 'processing' ? 'Active' : s.status.charAt(0).toUpperCase() + s.status.slice(1)
    return `<tr>
      <td>${s.name}</td>
      <td>${s.period_start ?? ''} – ${s.period_end ?? ''}</td>
      <td style="color:${color};font-weight:700;text-align:center">${sc}</td>
      <td style="text-align:right">${s.matched_count.toLocaleString()}</td>
      <td style="text-align:right;color:#DC2626">${s.unmatched_count > 0 ? s.unmatched_count : '—'}</td>
      <td style="text-align:right;color:#D97706">${s.flagged_count > 0 ? s.flagged_count : '—'}</td>
      <td style="text-align:right">${fmt(s.total_matched_amount)}</td>
      <td style="text-align:center"><span class="badge ${badgeClass}">${label}</span></td>
    </tr>`
  }).join('')

  return `<table>
    <thead><tr>
      <th>Name</th><th>Period</th><th style="text-align:center">Score</th>
      <th style="text-align:right">Matched</th><th style="text-align:right">Unmatched</th>
      <th style="text-align:right">Flagged</th><th style="text-align:right">Matched $</th>
      <th style="text-align:center">Status</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function auditTableHTML(entries: any[], limit = 50): string {
  const slice = entries.slice(0, limit)
  if (!slice.length) return '<p style="color:#9CA3AF">No audit entries found.</p>'
  const rows = slice.map(e => {
    const ai = e.ai_involved
      ? '<span class="badge badge-blue">✨ AI</span>'
      : '<span style="color:#9CA3AF;font-size:10px">Human</span>'
    return `<tr>
      <td>${new Date(e.created_at).toLocaleString()}</td>
      <td>${ai}</td>
      <td>${e.user_email ?? '—'}</td>
      <td>${e.entity_type}</td>
      <td>${e.action.replace(/_/g, ' ')}</td>
    </tr>`
  }).join('')

  const note = entries.length > limit
    ? `<p style="font-size:10px;color:#9CA3AF;margin-top:6px">Showing first ${limit} of ${entries.length} entries. Download CSV for full history.</p>`
    : ''

  return `<table>
    <thead><tr><th>Timestamp</th><th>Source</th><th>Actor</th><th>Entity</th><th>Action</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>${note}`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function cfoBodyHTML(sessions: any[], auditEntries: any[]): string {
  const total     = sessions.length
  const completed = sessions.filter(s => s.status === 'complete').length
  const avgScore  = total ? Math.round(sessions.reduce((s, r) => s + r.close_confidence_score, 0) / total) : 0
  const totalAmt  = sessions.reduce((s, r) => s + Number(r.total_matched_amount), 0)
  const openIssues = sessions.reduce((s, r) => s + r.unmatched_count + r.flagged_count, 0)
  const lastClose = sessions.find(s => s.status === 'complete')
  const aiActions = auditEntries.filter(e => e.ai_involved).length

  const scoreColor = avgScore >= 80 ? '#16A34A' : avgScore >= 60 ? '#D97706' : '#DC2626'

  return `
<div class="section">
  <div class="note">This report is auto-generated by ClosePilot AI. All figures derive from reconciliation sessions completed by your team.</div>
  <h2>Executive Summary</h2>
  <div class="kpi-grid">
    <div class="kpi">
      <div class="kpi-label">Close Confidence</div>
      <div class="kpi-value" style="color:${scoreColor}">${pct(avgScore)}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Total Reconciled</div>
      <div class="kpi-value">${fmt(totalAmt)}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Open Issues</div>
      <div class="kpi-value" style="color:${openIssues > 0 ? '#DC2626' : '#16A34A'}">${openIssues}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">AI Decisions</div>
      <div class="kpi-value">${aiActions}</div>
    </div>
  </div>
  <table>
    <tbody>
      <tr><td style="width:200px;color:#6B7280">Sessions completed</td><td><strong>${completed} of ${total}</strong></td></tr>
      <tr><td style="color:#6B7280">Last close date</td><td><strong>${lastClose ? new Date(lastClose.created_at).toLocaleDateString('en-US', { dateStyle: 'long' }) : '—'}</strong></td></tr>
      <tr><td style="color:#6B7280">Audit log entries</td><td><strong>${auditEntries.length}</strong></td></tr>
    </tbody>
  </table>
</div>

<div class="section">
  <h2>Reconciliation Sessions</h2>
  ${sessionTableHTML(sessions)}
</div>

<div class="section">
  <h2>Recent Audit Activity</h2>
  ${auditTableHTML(auditEntries, 20)}
</div>
`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function reconBodyHTML(pairs: any[]): string {
  const total    = pairs.length
  const matched  = pairs.filter(p => p.status === 'matched').length
  const flagged  = pairs.filter(p => p.status === 'flagged').length
  const unmatched= pairs.filter(p => p.status === 'unmatched').length

  const rows = pairs.slice(0, 200).map(p => {
    const bt = p.bank_transaction ?? {}
    const it = p.invoice_transaction ?? {}
    const statusClass = p.status === 'matched' ? 'badge-green' : p.status === 'flagged' ? 'badge-amber' : 'badge-red'
    return `<tr>
      <td>${bt.date ?? ''}</td>
      <td>${bt.vendor ?? bt.description ?? ''}</td>
      <td style="text-align:right">${bt.amount != null ? fmt(Number(bt.amount)) : ''}</td>
      <td><span class="badge ${statusClass}">${p.status}</span></td>
      <td style="text-align:center">${p.confidence}%</td>
      <td>${p.gl_override || p.gl_category || ''}</td>
      <td>${it.date ?? ''}</td>
      <td style="text-align:right">${it.amount != null ? fmt(Number(it.amount)) : ''}</td>
    </tr>`
  }).join('')

  const note = total > 200
    ? `<p style="font-size:10px;color:#9CA3AF;margin-top:6px">Showing first 200 of ${total} pairs. Download CSV/Excel for full data.</p>`
    : ''

  return `
<div class="section">
  <h2>Summary</h2>
  <div class="kpi-grid">
    <div class="kpi"><div class="kpi-label">Total Pairs</div><div class="kpi-value">${total}</div></div>
    <div class="kpi"><div class="kpi-label">Matched</div><div class="kpi-value pos">${matched}</div></div>
    <div class="kpi"><div class="kpi-label">Flagged</div><div class="kpi-value warn">${flagged}</div></div>
    <div class="kpi"><div class="kpi-label">Unmatched</div><div class="kpi-value neg">${unmatched}</div></div>
  </div>
</div>
<div class="section">
  <h2>Transaction Pairs</h2>
  <table>
    <thead><tr>
      <th>Bank Date</th><th>Vendor</th><th style="text-align:right">Bank Amount</th>
      <th>Status</th><th style="text-align:center">Confidence</th><th>GL Category</th>
      <th>Invoice Date</th><th style="text-align:right">Invoice Amount</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  ${note}
</div>`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function auditBodyHTML(entries: any[]): string {
  return `<div class="section"><h2>Audit Log</h2>${auditTableHTML(entries, 500)}</div>`
}

// ─── Main route ───────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const reportType = searchParams.get('type') || 'reconciliation'
  const format     = (searchParams.get('format') || 'csv').toLowerCase()
  const sessionId  = searchParams.get('session_id')
  const dateFrom   = searchParams.get('date_from')
  const dateTo     = searchParams.get('date_to')

  const dateTag = new Date().toISOString().slice(0, 10)

  try {
    // ── CSV ────────────────────────────────────────────────────────────────────
    if (format === 'csv') {
      let csvData = ''
      let filename = `closepilot-${reportType}-${dateTag}`

      if (reportType === 'reconciliation') {
        const pairs = await fetchMatchPairs(supabase, user.id, sessionId, dateFrom, dateTo)
        csvData = toCSV(pairs.map(mapPairRow), PAIR_COLS)
        filename = `reconciliation-${sessionId ?? 'all'}-${dateTag}`

      } else if (reportType === 'audit_trail') {
        const entries = await fetchAuditLog(supabase, user.id, dateFrom, dateTo)
        csvData = toCSV(entries.map(mapAuditRow), AUDIT_COLS)
        filename = `audit-trail-${dateTag}`

      } else if (reportType === 'close_summary' || reportType === 'cfo_summary') {
        const sessions = await fetchSessions(supabase, user.id)
        csvData = toCSV(sessions.map(mapSessionRow), SESSION_COLS)
        filename = `close-summary-${dateTag}`

      } else {
        return NextResponse.json({ error: `Unsupported report type: ${reportType}` }, { status: 400 })
      }

      return new NextResponse(csvData, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}.csv"`,
          'Cache-Control': 'no-store',
        },
      })
    }

    // ── Excel ──────────────────────────────────────────────────────────────────
    if (format === 'excel' || format === 'xlsx') {
      let excelBuf: Buffer
      let filename = `closepilot-${reportType}-${dateTag}`

      if (reportType === 'reconciliation') {
        const pairs = await fetchMatchPairs(supabase, user.id, sessionId, dateFrom, dateTo)
        excelBuf = toExcel([{ name: 'Match Pairs', rows: pairs.map(mapPairRow), columns: PAIR_COLS }])
        filename = `reconciliation-${sessionId ?? 'all'}-${dateTag}`

      } else if (reportType === 'audit_trail') {
        const entries = await fetchAuditLog(supabase, user.id, dateFrom, dateTo)
        excelBuf = toExcel([{ name: 'Audit Log', rows: entries.map(mapAuditRow), columns: AUDIT_COLS }])
        filename = `audit-trail-${dateTag}`

      } else if (reportType === 'close_summary') {
        const sessions = await fetchSessions(supabase, user.id)
        excelBuf = toExcel([{ name: 'Close Summary', rows: sessions.map(mapSessionRow), columns: SESSION_COLS }])
        filename = `close-summary-${dateTag}`

      } else if (reportType === 'cfo_summary') {
        const [sessions, auditEntries, pairs] = await Promise.all([
          fetchSessions(supabase, user.id),
          fetchAuditLog(supabase, user.id, dateFrom, dateTo),
          fetchMatchPairs(supabase, user.id, sessionId, dateFrom, dateTo),
        ])
        excelBuf = toExcel([
          { name: 'Sessions',   rows: sessions.map(mapSessionRow),   columns: SESSION_COLS },
          { name: 'Match Pairs',rows: pairs.map(mapPairRow),         columns: PAIR_COLS    },
          { name: 'Audit Log',  rows: auditEntries.map(mapAuditRow), columns: AUDIT_COLS   },
        ])
        filename = `cfo-summary-${dateTag}`

      } else {
        return NextResponse.json({ error: `Unsupported report type: ${reportType}` }, { status: 400 })
      }

      return new NextResponse(excelBuf, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
          'Cache-Control': 'no-store',
        },
      })
    }

    // ── PDF (HTML) ─────────────────────────────────────────────────────────────
    if (format === 'pdf') {
      let html = ''

      if (reportType === 'reconciliation') {
        const pairs = await fetchMatchPairs(supabase, user.id, sessionId, dateFrom, dateTo)
        html = htmlReport(
          'Reconciliation Report',
          `${pairs.length.toLocaleString()} transaction pairs`,
          reconBodyHTML(pairs),
        )

      } else if (reportType === 'audit_trail') {
        const entries = await fetchAuditLog(supabase, user.id, dateFrom, dateTo)
        html = htmlReport(
          'Audit Trail',
          `${entries.length.toLocaleString()} entries`,
          auditBodyHTML(entries),
        )

      } else if (reportType === 'close_summary') {
        const sessions = await fetchSessions(supabase, user.id)
        html = htmlReport(
          'Close Summary',
          `${sessions.length} reconciliation session${sessions.length !== 1 ? 's' : ''}`,
          `<div class="section"><h2>Reconciliation Sessions</h2>${sessionTableHTML(sessions)}</div>`,
        )

      } else if (reportType === 'cfo_summary') {
        const [sessions, auditEntries] = await Promise.all([
          fetchSessions(supabase, user.id),
          fetchAuditLog(supabase, user.id, dateFrom, dateTo),
        ])
        html = htmlReport(
          'CFO Summary Report',
          'Month-End Close Overview · ClosePilot AI',
          cfoBodyHTML(sessions, auditEntries),
        )

      } else {
        return NextResponse.json({ error: `Unsupported report type: ${reportType}` }, { status: 400 })
      }

      return new NextResponse(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      })
    }

    return NextResponse.json({ error: `Unsupported format: ${format}. Use csv, excel, or pdf.` }, { status: 400 })

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Export failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
