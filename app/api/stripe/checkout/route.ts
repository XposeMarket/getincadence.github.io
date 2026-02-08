import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { PRICE_IDS } from '@/lib/subscription/plans'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { plan, period } = await request.json()

    // Validate plan and period
    if (!plan || !['starter', 'team', 'growth'].includes(plan)) {
      return NextResponse.json(
        { error: 'Invalid plan' },
        { status: 400 }
      )
    }

    if (!period || !['monthly', 'annual'].includes(period)) {
      return NextResponse.json(
        { error: 'Invalid billing period' },
        { status: 400 }
      )
    }

    // Get user's org
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('org_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Only admins can change subscription
    if (userProfile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can manage subscriptions' },
        { status: 403 }
      )
    }

    // Get or create Stripe customer
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('org_id', userProfile.org_id)
      .single()

    let customerId = subscription?.stripe_customer_id

    if (!customerId) {
      // Get org details for customer creation
      const { data: org } = await supabase
        .from('orgs')
        .select('name')
        .eq('id', userProfile.org_id)
        .single()

      // Create Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          org_id: userProfile.org_id,
          user_id: user.id,
        },
        name: org?.name || undefined,
      })

      customerId = customer.id

      // Save customer ID
      await supabase
        .from('subscriptions')
        .upsert({
          org_id: userProfile.org_id,
          stripe_customer_id: customerId,
          plan: 'solo',
          status: 'active',
        })
    }

    // Get price ID from centralized config
    const priceId = PRICE_IDS[plan as keyof typeof PRICE_IDS][period as 'monthly' | 'annual']

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${request.nextUrl.origin}/settings?tab=billing&success=true`,
      cancel_url: `${request.nextUrl.origin}/settings?tab=billing&canceled=true`,
      subscription_data: {
        metadata: {
          org_id: userProfile.org_id,
          plan: plan,
        },
        trial_period_days: 14,
      },
      metadata: {
        org_id: userProfile.org_id,
        plan: plan,
      },
    })

    return NextResponse.json({
      url: session.url,
    })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
