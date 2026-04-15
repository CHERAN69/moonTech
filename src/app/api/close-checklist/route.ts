import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, getIP, API_LIMIT } from '@/lib/rate-limit'
import { requireRole } from '@/lib/rbac'
import { CreateChecklistSchema, UpdateTaskSchema, SignOffSchema } from '@/lib/validation'

const DEFAULT_TASKS = [
  { id: 't1', title: 'Reconcile main checking account',          category: 'reconciliation',  status: 'not_started', is_recurring: true },
  { id: 't2', title: 'Reconcile Stripe payouts',                 category: 'reconciliation',  status: 'not_started', is_recurring: true },
  { id: 't3', title: 'Reconcile credit card statements',         category: 'reconciliation',  status: 'not_started', is_recurring: true },
  { id: 't4', title: 'Review and approve AI journal entries',    category: 'journal_entries', status: 'not_started', is_recurring: false },
  { id: 't5', title: 'Post depreciation journal entries',        category: 'journal_entries', status: 'not_started', is_recurring: true },
  { id: 't6', title: 'Accrue unpaid vendor invoices',            category: 'journal_entries', status: 'not_started', is_recurring: true },
  { id: 't7', title: 'Review AP aging',                          category: 'review',          status: 'not_started', is_recurring: false },
  { id: 't8', title: 'Review AR aging',                          category: 'review',          status: 'not_started', is_recurring: false },
  { id: 't9', title: 'Variance analysis vs. prior month',        category: 'review',          status: 'not_started', is_recurring: true },
  { id: 't10', title: 'CFO review and sign-off',                 category: 'approval',        status: 'not_started', is_recurring: true, depends_on: ['t1','t2','t3','t4','t5','t6'] },
]

export async function GET(req: NextRequest) {
  const ip = getIP(req)
  const rl = rateLimit(`${ip}:/api/close-checklist`, API_LIMIT)
  if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period') // 'YYYY-MM' optional

  let query = supabase
    .from('close_checklists')
    .select('*')
    .eq('user_id', user.id)
    .order('period_end', { ascending: false })
    .limit(1)

  if (period) {
    query = query.gte('period_start', `${period}-01`)
  }

  const { data, error } = await query

  // Gracefully handle missing table (migration not yet run) by returning defaults
  if (error) {
    const isTableMissing = error.message?.includes('does not exist') || error.message?.includes('schema cache') || error.code === '42P01' || error.code === 'PGRST204'
    if (isTableMissing) {
      const now   = new Date()
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
      const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
      return NextResponse.json({
        checklist:    null,
        tasks:        DEFAULT_TASKS,
        period_start: start,
        period_end:   end,
        signed_off:   false,
        _warning:     'close_checklists table not found — run migrations to persist checklist data',
      })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // If no checklist exists for this period, return default tasks
  if (!data || data.length === 0) {
    const now   = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
    const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
    return NextResponse.json({
      checklist: null,
      tasks: DEFAULT_TASKS,
      period_start: start,
      period_end:   end,
      signed_off:   false,
    })
  }

  const checklist = data[0]
  return NextResponse.json({
    checklist,
    tasks:        checklist.tasks ?? DEFAULT_TASKS,
    period_start: checklist.period_start,
    period_end:   checklist.period_end,
    signed_off:   checklist.signed_off ?? false,
    signed_off_by: checklist.signed_off_by,
    signed_off_at: checklist.signed_off_at,
  })
}

export async function POST(req: NextRequest) {
  const ip = getIP(req)
  const rl = rateLimit(`${ip}:/api/close-checklist`, API_LIMIT)
  if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') // 'update_task' | 'sign_off' | 'create'

  if (action === 'update_task') {
    const parse = UpdateTaskSchema.safeParse(body)
    if (!parse.success) return NextResponse.json({ error: parse.error.issues[0].message }, { status: 422 })

    const { task_id, status } = parse.data

    // Category dependency enforcement (only when marking complete)
    if (status === 'complete') {
      const CATEGORY_ORDER = ['reconciliation', 'journal_entries', 'review', 'approval'] as const
      type TaskCategory = typeof CATEGORY_ORDER[number]

      // We need the current tasks to check dependencies — fetch checklist first for dependency check
      const { data: checklistForDeps } = await supabase
        .from('close_checklists')
        .select('tasks')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (checklistForDeps) {
        const allTasks = (checklistForDeps.tasks as Array<{ id: string; category: string; status: string }>) || []
        const targetTask = allTasks.find(t => t.id === task_id)

        if (targetTask) {
          const taskCategory = targetTask.category as TaskCategory
          const catIndex = CATEGORY_ORDER.indexOf(taskCategory)

          if (catIndex > 0) {
            const precedingCategories = CATEGORY_ORDER.slice(0, catIndex)
            for (const prevCat of precedingCategories) {
              const prevTasks = allTasks.filter(t => t.category === prevCat)
              const allPrevComplete = prevTasks.every(t => t.status === 'complete')
              if (!allPrevComplete) {
                return NextResponse.json(
                  { error: `Complete all ${prevCat.replace('_', ' ')} tasks first.` },
                  { status: 400 }
                )
              }
            }
          }
        }
      }
    }

    // Get current checklist
    const { data: checklist } = await supabase
      .from('close_checklists')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!checklist) {
      return NextResponse.json({ error: 'No active checklist found' }, { status: 404 })
    }

    if (checklist.signed_off) {
      return NextResponse.json({ error: 'Cannot modify a signed-off checklist' }, { status: 422 })
    }

    // Update the specific task within the tasks JSONB array
    const tasks = (checklist.tasks as typeof DEFAULT_TASKS) || DEFAULT_TASKS
    const updatedTasks = tasks.map((t: { id: string; status: string }) =>
      t.id === task_id ? { ...t, status } : t
    )

    const { data: updated, error } = await supabase
      .from('close_checklists')
      .update({ tasks: updatedTasks, updated_at: new Date().toISOString() })
      .eq('id', checklist.id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Audit log
    await supabase.from('audit_log').insert({
      user_id:     user.id,
      entity_type: 'close_checklist',
      entity_id:   checklist.id,
      action:      'task_updated',
      changes:     { task_id, status },
      ai_involved: false,
      ip_address:  ip,
    })

    return NextResponse.json({ checklist: updated })
  }

  if (action === 'sign_off') {
    // Only admin+ can sign off
    const rbac = await requireRole(supabase, user.id, 'admin')
    if (rbac) return rbac

    const parse = SignOffSchema.safeParse(body)
    if (!parse.success) return NextResponse.json({ error: parse.error.issues[0].message }, { status: 422 })

    const { data: checklist } = await supabase
      .from('close_checklists')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!checklist) return NextResponse.json({ error: 'No active checklist' }, { status: 404 })

    const tasks = (checklist.tasks as typeof DEFAULT_TASKS) || DEFAULT_TASKS
    const allComplete = tasks.every((t: { status: string }) => t.status === 'complete')
    if (!allComplete) {
      return NextResponse.json({ error: 'All tasks must be complete before sign-off' }, { status: 422 })
    }

    const now = new Date().toISOString()
    const { data: signed, error } = await supabase
      .from('close_checklists')
      .update({ signed_off: true, signed_off_by: user.id, signed_off_at: now })
      .eq('id', checklist.id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await supabase.from('audit_log').insert({
      user_id:     user.id,
      entity_type: 'close_checklist',
      entity_id:   checklist.id,
      action:      'close_signed_off',
      changes:     { period: parse.data.period, signed_off_at: now },
      ai_involved: false,
      ip_address:  ip,
    })

    return NextResponse.json({ checklist: signed })
  }

  // action === 'create' (or default: create new checklist for the period)
  const parse = CreateChecklistSchema.safeParse(body)
  if (!parse.success) return NextResponse.json({ error: parse.error.issues[0].message }, { status: 422 })

  const { data, error } = await supabase
    .from('close_checklists')
    .insert({
      user_id:      user.id,
      period_start: parse.data.period_start,
      period_end:   parse.data.period_end,
      tasks:        DEFAULT_TASKS,
      signed_off:   false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ checklist: data }, { status: 201 })
}
