import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { PRICE_TO_PLAN, PlanType } from '@/lib/subscription/plans'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

// Use service role for webhook (bypasses RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const orgId = session.metadata?.org_id
        const plan = session.metadata?.plan as PlanType

        if (orgId && plan) {
          // Get the subscription
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          )

          await supabase
            .from('subscriptions')
            .upsert({
              org_id: orgId,
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: subscription.id,
              plan: plan,
              status: subscription.status === 'trialing' ? 'trialing' : 'active',
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              cancel_at_period_end: subscription.cancel_at_period_end,
            })

          console.log(`Subscription created for org ${orgId}: ${plan}`)
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const orgId = subscription.metadata?.org_id

        // Get plan from price ID using centralized config
        const priceId = subscription.items.data[0]?.price.id
        const plan: PlanType = PRICE_TO_PLAN[priceId] || 'solo'

        const updateData = {
          plan: plan,
          status: subscription.status === 'trialing' ? 'trialing' : 
                 subscription.status === 'active' ? 'active' :
                 subscription.status === 'past_due' ? 'past_due' : 
                 subscription.status,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
        }

        if (orgId) {
          await supabase
            .from('subscriptions')
            .update(updateData)
            .eq('org_id', orgId)

          console.log(`Subscription updated for org ${orgId}: ${plan}`)
        } else {
          // Try to find by subscription ID
          await supabase
            .from('subscriptions')
            .update(updateData)
            .eq('stripe_subscription_id', subscription.id)

          console.log(`Subscription updated by ID ${subscription.id}: ${plan}`)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription

        // Reset to solo plan when subscription is canceled
        await supabase
          .from('subscriptions')
          .update({
            plan: 'solo',
            status: 'canceled',
            stripe_subscription_id: null,
            current_period_start: null,
            current_period_end: null,
            cancel_at_period_end: false,
          })
          .eq('stripe_subscription_id', subscription.id)

        console.log(`Subscription deleted: ${subscription.id}`)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        
        if (invoice.subscription) {
          await supabase
            .from('subscriptions')
            .update({
              status: 'past_due',
            })
            .eq('stripe_subscription_id', invoice.subscription as string)

          console.log(`Payment failed for subscription: ${invoice.subscription}`)
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        
        if (invoice.subscription) {
          await supabase
            .from('subscriptions')
            .update({
              status: 'active',
            })
            .eq('stripe_subscription_id', invoice.subscription as string)

          console.log(`Payment succeeded for subscription: ${invoice.subscription}`)
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
