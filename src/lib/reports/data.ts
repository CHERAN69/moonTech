import { SupabaseClient } from '@supabase/supabase-js'

export type ReportFilter = {
  sessionId?: string | null
  dateFrom?: string | null
  dateTo?: string | null
  period?: string | null
}

export type ReportData = {
  type: string
  rows: Record<string, unknown>[]
  columns: string[]
  generatedAt: string
  sessionName?: string
}

export async function fetchReportData(
  supabase: SupabaseClient,
  userId: string,
  type: string,
  filters: ReportFilter
): Promise<ReportData> {
  const generatedAt = new Date().toISOString()

  if (type === 'reconciliation') {
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
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (filters.sessionId) query = query.eq('session_id', filters.sessionId)
    if (filters.dateFrom)  query = query.gte('created_at', filters.dateFrom)
    if (filters.dateTo)    query = query.lte('created_at', filters.dateTo + 'T23:59:59Z')

    const { data, error } = await query
    if (error) throw new Error(error.message)

    const rows = (data ?? []).map(p => ({
      id:                p.id,
      status:            p.status,
      resolution:        p.resolution ?? '',
      confidence:        p.confidence,
      match_method:      p.match_method ?? '',
      gl_category:       (p.gl_override as string | null) || (p.gl_category as string | null) || '',
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

    return {
      type,
      rows,
      columns: [
        'id', 'status', 'resolution', 'confidence', 'match_method', 'gl_category',
        'bank_date', 'bank_amount', 'bank_vendor', 'bank_description',
        'invoice_date', 'invoice_amount', 'invoice_reference',
        'flags', 'note', 'reviewed_at', 'created_at',
      ],
      generatedAt,
    }
  }

  if (type === 'audit_trail') {
    let query = supabase
      .from('audit_log')
      .select('id, entity_type, entity_id, action, ai_involved, ip_address, created_at, changes')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom)
    if (filters.dateTo)   query = query.lte('created_at', filters.dateTo + 'T23:59:59Z')

    const { data, error } = await query
    if (error) throw new Error(error.message)

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

    return {
      type,
      rows,
      columns: ['id', 'entity_type', 'entity_id', 'action', 'ai_involved', 'changes', 'ip_address', 'created_at'],
      generatedAt,
    }
  }

  if (type === 'close_summary') {
    let query = supabase
      .from('reconciliation_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(12)

    // Apply period filter if provided (match against period_start)
    if (filters.period) {
      const periodStart = filters.period + '-01'
      query = query.gte('period_start', periodStart)
    }

    const { data: sessions, error } = await query
    if (error) throw new Error(error.message)

    const rows = (sessions ?? []).map(s => ({
      id:                         s.id,
      name:                       s.name,
      period_start:               s.period_start ?? '',
      period_end:                 s.period_end ?? '',
      status:                     s.status,
      close_confidence_score:     s.close_confidence_score,
      total_bank_transactions:    s.total_bank_transactions,
      total_invoice_transactions: s.total_invoice_transactions,
      matched_count:              s.matched_count,
      unmatched_count:            s.unmatched_count,
      flagged_count:              s.flagged_count,
      duplicate_count:            s.duplicate_count,
      total_matched_amount:       s.total_matched_amount,
      total_unmatched_amount:     s.total_unmatched_amount,
      signed_off:                 s.signed_off_by ? 'Yes' : 'No',
      created_at:                 s.created_at,
    }))

    // Find session name for display if filtering by sessionId
    const sessionName = filters.sessionId
      ? (sessions ?? []).find(s => s.id === filters.sessionId)?.name
      : undefined

    return {
      type,
      rows,
      columns: [
        'id', 'name', 'period_start', 'period_end', 'status', 'close_confidence_score',
        'total_bank_transactions', 'total_invoice_transactions',
        'matched_count', 'unmatched_count', 'flagged_count', 'duplicate_count',
        'total_matched_amount', 'total_unmatched_amount', 'signed_off', 'created_at',
      ],
      generatedAt,
      sessionName,
    }
  }

  throw new Error(`Unsupported report type: ${type}`)
}
