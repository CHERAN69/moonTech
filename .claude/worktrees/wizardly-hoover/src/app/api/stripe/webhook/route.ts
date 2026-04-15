import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', { apiVersion: '2026-03-25.dahlia' })
}

const PLAN_MAP: Record<string, string> = {
  [process.env.STRIPE_STARTER_PRICE_ID!]: 'starter',
  [process.env.STRIPE_GROWTH_PRICE_ID!]: 'growth',
  [process.env.STRIPE_AGENCY_PRICE_ID!]: 'agency',
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    return NextResponse.json({ error: 'Webhook signature failed' }, { status: 400 })
  }

  const supabase = await createClient()

  if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
    const sub = event.data.object as Stripe.Subscription
    const userId = sub.metadata.supabase_user_id
    const priceId = sub.items.data[0]?.price.id
    const plan = PLAN_MAP[priceId] || 'starter'
    const status = sub.status === 'trialing' ? 'trialing' :
                   sub.status === 'active' ? 'active' :
                   sub.status === 'past_due' ? 'past_due' : 'canceled'

    if (userId) {
      await supabase.from('profiles').update({
        subscription_tier: plan,
        subscription_status: status,
      }).eq('id', userId)
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription
    const userId = sub.metadata.supabase_user_id
    if (userId) {
      await supabase.from('profiles').update({
        subscription_tier: 'starter',
        subscription_status: 'canceled',
      }).eq('id', userId)
    }
  }

  return NextResponse.json({ received: true })
}
