import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-03-25.dahlia' })
}

/**
 * PLAN_MAP built lazily inside the handler to avoid module-scope env var issues.
 * At module load time env vars may not yet be injected (e.g. serverless cold start).
 */
function buildPlanMap(): Record<string, string> {
  const map: Record<string, string> = {}
  if (process.env.STRIPE_STARTER_PRICE_ID) map[process.env.STRIPE_STARTER_PRICE_ID] = 'starter'
  if (process.env.STRIPE_GROWTH_PRICE_ID)  map[process.env.STRIPE_GROWTH_PRICE_ID]  = 'growth'
  if (process.env.STRIPE_AGENCY_PRICE_ID)  map[process.env.STRIPE_AGENCY_PRICE_ID]  = 'agency'
  return map
}

const MAX_RETRIES = 3

async function processWebhookEvent(
  event: Stripe.Event,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  planMap: Record<string, string>,
  attempt = 1
): Promise<void> {
  try {
    if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated'
    ) {
      const sub    = event.data.object as Stripe.Subscription
      const userId = sub.metadata?.supabase_user_id
      const priceId = sub.items.data[0]?.price.id
      const plan   = planMap[priceId] || 'starter'
      const status = sub.status === 'trialing'  ? 'trialing'  :
                     sub.status === 'active'     ? 'active'    :
                     sub.status === 'past_due'   ? 'past_due'  : 'canceled'

      if (!userId) {
        // Log missing metadata so ops can investigate
        console.error('[Stripe webhook] Missing supabase_user_id in subscription metadata', { subscriptionId: sub.id, customerId: sub.customer })
        // Store in dead-letter queue for manual resolution
        await supabase.from('webhook_dead_letters').insert({
          event_id:   event.id,
          event_type: event.type,
          payload:    event.data.object,
          error:      'Missing supabase_user_id in metadata',
          attempts:   attempt,
        })
        return
      }

      const { error: updateError } = await supabase.from('profiles').update({
        subscription_tier:   plan,
        subscription_status: status,
      }).eq('id', userId)

      if (updateError) throw updateError

      // Audit trail for subscription changes
      await supabase.from('audit_log').insert({
        user_id:     userId,
        entity_type: 'profile',
        entity_id:   userId,
        action:      `subscription_${event.type === 'customer.subscription.created' ? 'created' : 'updated'}`,
        changes:     { subscription_tier: plan, subscription_status: status, price_id: priceId },
        ai_involved: false,
      })
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub    = event.data.object as Stripe.Subscription
      const userId = sub.metadata?.supabase_user_id

      if (!userId) {
        console.error('[Stripe webhook] Missing supabase_user_id in subscription.deleted', { subscriptionId: sub.id })
        await supabase.from('webhook_dead_letters').insert({
          event_id:   event.id,
          event_type: event.type,
          payload:    event.data.object,
          error:      'Missing supabase_user_id in metadata',
          attempts:   attempt,
        })
        return
      }

      const { error: updateError } = await supabase.from('profiles').update({
        subscription_tier:   'starter',
        subscription_status: 'canceled',
      }).eq('id', userId)

      if (updateError) throw updateError

      await supabase.from('audit_log').insert({
        user_id:     userId,
        entity_type: 'profile',
        entity_id:   userId,
        action:      'subscription_canceled',
        changes:     { subscription_tier: 'starter', subscription_status: 'canceled' },
        ai_involved: false,
      })
    }
  } catch (err) {
    if (attempt < MAX_RETRIES) {
      // Exponential backoff: 1s, 2s, 4s
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)))
      return processWebhookEvent(event, supabase, planMap, attempt + 1)
    }
    // After max retries, write to dead-letter queue
    await supabase.from('webhook_dead_letters').insert({
      event_id:   event.id,
      event_type: event.type,
      payload:    event.data.object,
      error:      String(err),
      attempts:   attempt,
    }).catch(console.error)
    throw err
  }
}

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 503 })
  }

  const body = await req.text()
  const sig  = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
  }

  const supabase = await createClient()
  const planMap  = buildPlanMap()

  await processWebhookEvent(event, supabase, planMap)

  return NextResponse.json({ received: true })
}
