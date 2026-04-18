/**
 * POST /api/inbox/upload
 *
 * Accepts a file upload, parses it, classifies it with AI, and stores
 * the result in the `uploads` table.
 *
 * Input:  FormData { file: File, category_hint?: string }
 * Output: { upload_id, classification, confidence, transactions_count, reasoning }
 *
 * 10.3 — Idempotency via X-Idempotency-Key header.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, getIP, API_LIMIT } from '@/lib/rate-limit'
import { validateFile, parseFile } from '@/lib/matching/file-parser'
import { classifyUpload } from '@/lib/openai/analyze'
import { sanitizeForPrompt } from '@/lib/validation'

export async function POST(req: NextRequest) {
  const ip = getIP(req)
  const rl = rateLimit(`${ip}:/api/inbox/upload`, API_LIMIT)
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many requests' }, {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
    })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 10.3 — Idempotency key
  const idempotencyKey = req.headers.get('x-idempotency-key')
  if (idempotencyKey) {
    const { data: existing } = await supabase
      .from('uploads')
      .select('id, classification, classification_confidence, transactions_count, status')
      .eq('user_id', user.id)
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle()
    if (existing) return NextResponse.json({ upload_id: existing.id, ...existing, cached: true })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'File is required' }, { status: 400 })

  const categoryHint = (formData.get('category_hint') as string | null) || undefined

  // Read the file buffer once — calling file.arrayBuffer() multiple times
  // can return empty data in Next.js server runtimes after the first read.
  const fileBuffer = Buffer.from(await file.arrayBuffer())

  // Server-side validation (reuse existing validateFile)
  const validationError = validateFile(fileBuffer, file.name)
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })

  // Create upload record immediately in "processing" state
  const { data: uploadRecord, error: createErr } = await supabase
    .from('uploads')
    .insert({
      user_id:         user.id,
      filename:        file.name.slice(0, 500),
      file_size_bytes: file.size,
      mime_type:       file.type || null,
      status:          'processing',
      category_hint:   categoryHint ? sanitizeForPrompt(categoryHint).slice(0, 100) : null,
      ...(idempotencyKey ? { idempotency_key: idempotencyKey } : {}),
    })
    .select('id')
    .single()

  if (createErr || !uploadRecord) {
    console.error('[inbox/upload] Insert failed:', createErr)
    return NextResponse.json(
      { error: 'Failed to create upload record', detail: createErr?.message ?? 'unknown' },
      { status: 500 }
    )
  }

  const uploadId = uploadRecord.id

  try {
    // Parse file (fileBuffer was read once before validation — reuse it here)
    console.log(`[inbox/upload] [${uploadId}] parsing file buffer — name=${file.name} size=${file.size}`)

    console.log(`[inbox/upload] [${uploadId}] calling parseFile`)
    const parseResult = await parseFile(fileBuffer, file.name)
    console.log(`[inbox/upload] [${uploadId}] parseFile done — transactions=${parseResult.transactions.length} errors=${JSON.stringify(parseResult.errors)} warnings=${JSON.stringify(parseResult.warnings)}`)

    if (parseResult.errors.length > 0 && parseResult.transactions.length === 0) {
      await supabase
        .from('uploads')
        .update({ status: 'error', error_message: parseResult.errors[0] })
        .eq('id', uploadId)
      return NextResponse.json({ error: parseResult.errors[0] }, { status: 400 })
    }

    // Build headers + sample rows for AI classification
    const headers    = Object.keys(parseResult.detected_columns).length > 0
      ? Object.keys(parseResult.detected_columns)
      : parseResult.transactions.length > 0
        ? Object.keys(parseResult.transactions[0])
        : []

    const sampleRows: Record<string, string>[] = parseResult.transactions
      .slice(0, 5)
      .map(tx => ({
        date:        tx.date,
        amount:      String(tx.amount),
        description: tx.description,
        vendor:      tx.vendor || '',
        reference:   tx.reference || '',
      }))

    // AI classification
    console.log(`[inbox/upload] [${uploadId}] calling classifyUpload — headers=${JSON.stringify(headers)}`)
    const classification = await classifyUpload(
      file.name,
      headers,
      sampleRows,
      categoryHint,
    )
    console.log(`[inbox/upload] [${uploadId}] classifyUpload done — classification=${classification.classification} confidence=${classification.confidence}`)

    // Update upload record with classification result
    console.log(`[inbox/upload] [${uploadId}] writing classified status to DB`)
    await supabase
      .from('uploads')
      .update({
        classification:              classification.classification,
        classification_confidence:   classification.confidence,
        classification_reasoning:    classification.reasoning,
        detected_entity:             classification.detected_entity,
        suggested_period_start:      classification.suggested_period?.start || null,
        suggested_period_end:        classification.suggested_period?.end   || null,
        column_mapping:              classification.column_mapping,
        transactions_count:          parseResult.transactions.length,
        parsed_data:                 parseResult.transactions,
        status:                      'classified',
      })
      .eq('id', uploadId)

    // Audit log
    await supabase.from('audit_log').insert({
      user_id:     user.id,
      entity_type: 'upload',
      entity_id:   uploadId,
      action:      'classified',
      changes: {
        filename:         file.name,
        classification:   classification.classification,
        confidence:       classification.confidence,
        rows_parsed:      parseResult.transactions.length,
      },
      ai_involved: true,
      ip_address:  ip,
    })

    return NextResponse.json({
      upload_id:            uploadId,
      classification:       classification.classification,
      confidence:           classification.confidence,
      reasoning:            classification.reasoning,
      detected_entity:      classification.detected_entity,
      suggested_period:     classification.suggested_period,
      column_mapping:       classification.column_mapping,
      transactions_count:   parseResult.transactions.length,
      warnings:             parseResult.warnings,
      status:               'classified',
    })
  } catch (err) {
  console.error('[inbox/upload] Unexpected error:', err)

  const errorMessage =
    err instanceof Error
      ? err.message
      : String(err)

  await supabase
    .from('uploads')
    .update({
      status: 'error',
      error_message: errorMessage
    })
    .eq('id', uploadId)

  return NextResponse.json(
    {
      error: 'Failed to process file',
      details: errorMessage
    },
    { status: 500 }
  )
}
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { id?: string; status?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const allowedStatuses = ['confirmed', 'classified']
  if (body.status && !allowedStatuses.includes(body.status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const { error } = await supabase
    .from('uploads')
    .update({ status: body.status || 'confirmed', updated_at: new Date().toISOString() })
    .eq('id', body.id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const { error } = await supabase
    .from('uploads')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function GET(req: NextRequest) {
  const ip = getIP(req)
  const rl = rateLimit(`${ip}:/api/inbox/upload`, API_LIMIT)
  if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const limit  = Math.min(parseInt(searchParams.get('limit')  || '50'), 200)
  const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)
  const status = searchParams.get('status')

  let query = supabase
    .from('uploads')
    .select('id, filename, file_size_bytes, classification, classification_confidence, classification_reasoning, detected_entity, suggested_period_start, suggested_period_end, transactions_count, status, category_hint, session_id, created_at, updated_at', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq('status', status)

  const { data, error, count } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    uploads: data || [],
    total:   count ?? 0,
    limit,
    offset,
    hasMore: (count ?? 0) > offset + limit,
  })
}