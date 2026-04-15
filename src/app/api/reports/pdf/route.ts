import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchReportData } from '@/lib/reports/data'
import { computeReportReadiness, ReportType } from '@/lib/reports/readiness'
import { PDF_STYLES } from '@/lib/reports/pdf/styles'

// GET /api/reports/pdf?type=close_summary&session_id=xxx&period=2026-03
// Returns a print-ready HTML page that triggers window.print() on load.

const REPORT_TITLES: Record<string, string> = {
  reconciliation: 'Reconciliation Detail',
  audit_trail:    'Audit Trail',
  close_summary:  'Close Summary',
  pl:             'Profit & Loss Statement',
  ar_aging:       'AR Aging Report',
  board_pack:     'Board Pack',
}

function escapeHtml(str: unknown): string {
  const s = str === null || str === undefined ? '' : String(str)
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildHtml(params: {
  reportType: string
  period: string | null
  generatedAt: string
  rows: Record<string, unknown>[]
  columns: string[]
  aiReviewedCount: number
  humanApprovedCount: number
}): string {
  const { reportType, period, generatedAt, rows, columns, aiReviewedCount, humanApprovedCount } = params
  const title = REPORT_TITLES[reportType] ?? reportType
  const formattedDate = new Date(generatedAt).toLocaleString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  const tableHeaders = columns.map(c => `<th>${escapeHtml(c.replace(/_/g, ' '))}</th>`).join('')
  const tableRows = rows.map(row =>
    `<tr>${columns.map(col => `<td>${escapeHtml(row[col])}</td>`).join('')}</tr>`
  ).join('')

  const { s } = { s: PDF_STYLES }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)} — FinOpsAi</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: ${s.fontFamily};
      color: ${s.textColor};
      background: #fff;
      font-size: 12px;
      line-height: 1.5;
      padding: 32px 40px;
    }

    /* ── Header ── */
    .report-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 16px;
      border-bottom: 2px solid ${s.primaryColor};
      margin-bottom: 20px;
    }
    .report-brand {
      font-size: 11px;
      font-weight: 600;
      color: ${s.mutedColor};
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .report-title {
      font-size: 20px;
      font-weight: 700;
      color: ${s.primaryColor};
      margin-top: 4px;
    }
    .report-meta {
      text-align: right;
      font-size: 11px;
      color: ${s.mutedColor};
    }
    .report-meta strong {
      display: block;
      color: ${s.textColor};
      font-size: 13px;
      font-weight: 600;
    }

    /* ── Confidence Summary ── */
    .confidence-section {
      display: flex;
      gap: 24px;
      background: #F8FAFF;
      border: 1px solid ${s.borderColor};
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 20px;
      font-size: 11px;
    }
    .confidence-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .confidence-label {
      color: ${s.mutedColor};
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-size: 10px;
    }
    .confidence-value {
      font-size: 18px;
      font-weight: 700;
      color: ${s.primaryColor};
    }

    /* ── Table ── */
    .data-table-wrapper {
      overflow: hidden;
      border: 1px solid ${s.borderColor};
      border-radius: 8px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    thead {
      background: ${s.primaryColor};
      color: #fff;
    }
    thead th {
      padding: 8px 10px;
      text-align: left;
      font-weight: 600;
      white-space: nowrap;
      text-transform: capitalize;
      letter-spacing: 0.03em;
    }
    tbody tr:nth-child(even) {
      background: #F9FAFB;
    }
    tbody td {
      padding: 7px 10px;
      border-bottom: 1px solid ${s.borderColor};
      color: ${s.textColor};
      max-width: 180px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    tbody tr:last-child td {
      border-bottom: none;
    }

    /* ── Empty state ── */
    .no-data {
      padding: 32px;
      text-align: center;
      color: ${s.mutedColor};
      font-size: 13px;
    }

    /* ── Footer ── */
    .report-footer {
      margin-top: 24px;
      padding-top: 12px;
      border-top: 1px solid ${s.borderColor};
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
      color: ${s.mutedColor};
    }

    /* ── Print styles ── */
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }

      @page {
        size: A4 landscape;
        margin: 15mm 12mm;
        @bottom-right {
          content: "Page " counter(page) " of " counter(pages);
          font-size: 9pt;
          color: ${s.mutedColor};
        }
      }

      .data-table-wrapper {
        border: 1px solid ${s.borderColor};
      }

      thead {
        display: table-header-group;
      }

      tbody tr {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>

  <!-- Print button (hidden when printing) -->
  <div class="no-print" style="margin-bottom:16px; display:flex; gap:8px;">
    <button
      onclick="window.print()"
      style="padding:8px 16px; background:${s.primaryColor}; color:#fff; border:none; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer;"
    >
      Print / Save as PDF
    </button>
    <button
      onclick="window.close()"
      style="padding:8px 16px; background:#fff; color:${s.mutedColor}; border:1px solid ${s.borderColor}; border-radius:6px; font-size:12px; cursor:pointer;"
    >
      Close
    </button>
  </div>

  <!-- Report header -->
  <div class="report-header">
    <div>
      <div class="report-brand">FinOpsAi — Financial Report</div>
      <div class="report-title">${escapeHtml(title)}</div>
    </div>
    <div class="report-meta">
      <strong>${period ? escapeHtml(period) : 'All Periods'}</strong>
      Generated ${escapeHtml(formattedDate)}
    </div>
  </div>

  <!-- Confidence Summary -->
  <div class="confidence-section">
    <div class="confidence-item">
      <span class="confidence-label">AI-reviewed</span>
      <span class="confidence-value">${aiReviewedCount.toLocaleString()}</span>
    </div>
    <div class="confidence-item">
      <span class="confidence-label">Human-approved</span>
      <span class="confidence-value">${humanApprovedCount.toLocaleString()}</span>
    </div>
    <div class="confidence-item">
      <span class="confidence-label">Total records</span>
      <span class="confidence-value">${rows.length.toLocaleString()}</span>
    </div>
    <div class="confidence-item">
      <span class="confidence-label">Report period</span>
      <span class="confidence-value" style="font-size:13px;">${period ? escapeHtml(period) : 'All'}</span>
    </div>
  </div>

  <!-- Data table -->
  ${rows.length === 0
    ? `<div class="no-data">No data available for the selected filters.</div>`
    : `<div class="data-table-wrapper">
        <table>
          <thead><tr>${tableHeaders}</tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>`
  }

  <!-- Footer -->
  <div class="report-footer">
    <span>Generated by FinOpsAi &mdash; Confidential</span>
    <span>${escapeHtml(formattedDate)}</span>
  </div>

  <script>window.onload = () => window.print()</script>
</body>
</html>`
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const reportType = searchParams.get('type') || 'close_summary'
  const sessionId  = searchParams.get('session_id')
  const period     = searchParams.get('period')
  const dateFrom   = searchParams.get('date_from')
  const dateTo     = searchParams.get('date_to')

  // Fetch metrics to compute readiness
  const [exceptionsRes, journalRes, checklistRes, reconcileRes] = await Promise.allSettled([
    supabase.from('match_pairs').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('resolution', 'pending'),
    supabase.from('journal_entries').select('id', { count: 'exact', head: true }).eq('user_id', user.id).in('status', ['draft', 'pending_approval']),
    supabase.from('close_checklists').select('signed_off_by').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('reconciliation_sessions').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
  ])

  const unmatchedCount        = exceptionsRes.status === 'fulfilled' ? (exceptionsRes.value.count ?? 0) : 0
  const pendingJournalEntries = journalRes.status === 'fulfilled'    ? (journalRes.value.count ?? 0)    : 0
  const checklistData         = checklistRes.status === 'fulfilled'  ? checklistRes.value.data           : null
  const checklistComplete     = Boolean(checklistData && (checklistData as Record<string, unknown>).signed_off_by)
  const hasData               = reconcileRes.status === 'fulfilled'  ? (reconcileRes.value.count ?? 0) > 0 : false

  const readiness = computeReportReadiness(reportType as ReportType, {
    unmatchedCount,
    pendingJournalEntries,
    checklistComplete,
    hasData,
  })

  if (readiness.percentage < 100) {
    return NextResponse.json(
      {
        error: 'Report not ready',
        percentage: readiness.percentage,
        blockers: readiness.blockers,
      },
      { status: 400 }
    )
  }

  // Fetch the actual report data
  let reportData
  try {
    reportData = await fetchReportData(supabase, user.id, reportType, {
      sessionId,
      dateFrom,
      dateTo,
      period,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }

  // Compute confidence summary metrics from rows
  const aiReviewedCount    = reportData.rows.filter(r => r.ai_involved === true || r.match_method != null).length
  const humanApprovedCount = reportData.rows.filter(r => r.resolution === 'approved' || r.action === 'approved').length

  const html = buildHtml({
    reportType,
    period,
    generatedAt: reportData.generatedAt,
    rows: reportData.rows,
    columns: reportData.columns,
    aiReviewedCount,
    humanApprovedCount,
  })

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}
