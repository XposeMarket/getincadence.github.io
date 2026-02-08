import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { PLAN_LIMITS, PlanType, getRemainingSeats } from '@/lib/subscription/plans'

export async function GET() {
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

    // Get user's org_id
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Get subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('org_id', userProfile.org_id)
      .single()

    // Default to solo plan if no subscription exists
    const plan = (subscription?.plan || 'solo') as PlanType
    const additionalSeats = subscription?.extra_seats || 0
    
    // Count current users
    const { count: userCount } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', userProfile.org_id)

    // Count pending invites
    const { count: pendingInviteCount } = await supabase
      .from('team_invites')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', userProfile.org_id)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())

    const currentUserCount = userCount || 0
    const pendingInvites = pendingInviteCount || 0
    const totalUsers = currentUserCount + pendingInvites

    const planConfig = PLAN_LIMITS[plan]
    const maxUsers = plan === 'growth' 
      ? planConfig.maxUsers + additionalSeats 
      : planConfig.maxUsers
    
    const remainingSeats = getRemainingSeats(plan, totalUsers, additionalSeats)

    return NextResponse.json({
      plan,
      planName: planConfig.name,
      status: subscription?.status || 'active',
      currentUserCount,
      pendingInvites,
      maxUsers,
      remainingSeats,
      extraSeats: additionalSeats,
      canAddUsers: remainingSeats > 0,
      // Billing info
      currentPeriodStart: subscription?.current_period_start || null,
      currentPeriodEnd: subscription?.current_period_end || null,
      cancelAtPeriodEnd: subscription?.cancel_at_period_end || false,
      // Trial info
      isTrialing: subscription?.status === 'trialing',
    })
  } catch (error) {
    console.error('Subscription fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
