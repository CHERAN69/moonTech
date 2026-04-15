import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Converts an array of objects to CSV string
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

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const reportType = searchParams.get('type') || 'reconciliation'
  const format     = searchParams.get('format') || 'csv'
  const sessionId  = searchParams.get('session_id')
  const dateFrom   = searchParams.get('date_from')
  const dateTo     = searchParams.get('date_to')

  let csvData = ''
  let filename = `finopsai-${reportType}-${new Date().toISOString().slice(0, 10)}`

  if (reportType === 'reconciliation') {
    let query = supabase
      .from('match_pairs')
      .select(`
        id,
        status,
        confidence,
        match_method,
        gl_category,
        gl_override,
        resolution,
        note,
        flags,
        bank_transaction,
        invoice_transaction,
        created_at,
        reviewed_at
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (sessionId) query = query.eq('session_id', sessionId)
    if (dateFrom)  query = query.gte('created_at', dateFrom)
    if (dateTo)    query = query.lte('created_at', dateTo + 'T23:59:59Z')

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const rows = (data ?? []).map(p => ({
      id:                p.id,
      status:            p.status,
      resolution:        p.resolution ?? '',
      confidence:        p.confidence,
      match_method:      p.match_method ?? '',
      gl_category:       p.gl_override || p.gl_category || '',
      bank_date:         (p.bank_transaction as Record<string, unknown>)?.date ?? '',
      bank_amount:       (p.bank_transaction as Record<string, unknown>)?.amount ?? '',
      bank_vendor:       (p.bank_transaction as Record<string, unknown>)?.vendor ?? '',
      bank_description:  (p.bank_transaction as Record<string, unknown>)?.description ?? '',
      invoice_date:      (p.invoice_transaction as Record<string, unknown>)?.date ?? '',
      invoice_amount:    (p.invoice_transaction as Record<string, unknown>)?.amount ?? '',
      invoice_reference: (p.invoice_transaction as Record<string, unknown>)?.reference ?? '',
      flags:             JSON.stringify(p.flags ?? []),
      note:              p.note ?? '',
      reviewed_at:       p.reviewed_at ?? '',
      created_at:        p.created_at,
    }))

    csvData = toCSV(rows, [
      'id','status','resolution','confidence','match_method','gl_category',
      'bank_date','bank_amount','bank_vendor','bank_description',
      'invoice_date','invoice_amount','invoice_reference',
      'flags','note','reviewed_at','created_at',
    ])
    filename = `reconciliation-export-${sessionId ?? 'all'}-${new Date().toISOString().slice(0, 10)}`

  } else if (reportType === 'audit_trail') {
    let query = supabase
      .from('audit_log')
      .select('id, entity_type, entity_id, action, ai_involved, ip_address, created_at, changes')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (dateFrom) query = query.gte('created_at', dateFrom)
    if (dateTo)   query = query.lte('created_at', dateTo + 'T23:59:59Z')

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const rows = (data ?? []).map(e => ({
      id:          e.id,
      entity_type: e.entity_type,
      entity_id:   e.entity_id,
      action:      e.action,
      ai_involved: e.ai_involved,
      changes:     JSON.stringify(e.changes ?? {}),
      ip_address:  e.ip_address ?? '',
      created_at:  e.created_at,
    }))

    csvData = toCSV(rows, ['id','entity_type','entity_id','action','ai_involved','changes','ip_address','created_at'])
    filename = `audit-trail-${new Date().toISOString().slice(0, 10)}`

  } else if (reportType === 'close_summary') {
    const { data: sessions, error } = await supabase
      .from('reconciliation_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(12)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const rows = (sessions ?? []).map(s => ({
      id:                        s.id,
      name:                      s.name,
      period_start:              s.period_start ?? '',
      period_end:                s.period_end ?? '',
      status:                    s.status,
      close_confidence_score:    s.close_confidence_score,
      total_bank_transactions:   s.total_bank_transactions,
      total_invoice_transactions:s.total_invoice_transactions,
      matched_count:             s.matched_count,
      unmatched_count:           s.unmatched_count,
      flagged_count:             s.flagged_count,
      duplicate_count:           s.duplicate_count,
      total_matched_amount:      s.total_matched_amount,
      total_unmatched_amount:    s.total_unmatched_amount,
      signed_off:                s.signed_off_by ? 'Yes' : 'No',
      created_at:                s.created_at,
    }))

    csvData = toCSV(rows, [
      'id','name','period_start','period_end','status','close_confidence_score',
      'total_bank_transactions','total_invoice_transactions',
      'matched_count','unmatched_count','flagged_count','duplicate_count',
      'total_matched_amount','total_unmatched_amount','signed_off','created_at',
    ])
    filename = `close-summary-${new Date().toISOString().slice(0, 10)}`

  } else {
    return NextResponse.json({ error: `Unsupported report type: ${reportType}` }, { status: 400 })
  }

  return new NextResponse(csvData, {
    status: 200,
    headers: {
      'Content-Type':        'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}.csv"`,
      'Cache-Control':       'no-store',
    },
  })
}
