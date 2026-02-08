import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { canAddMoreUsers, PlanType } from '@/lib/subscription/plans'

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

    const { email, role } = await request.json()

    if (!email || !role) {
      return NextResponse.json(
        { error: 'Email and role are required' },
        { status: 400 }
      )
    }

    if (!['admin', 'member'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be admin or member' },
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

    // Only admins can invite
    if (userProfile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can invite team members' },
        { status: 403 }
      )
    }

    // Get organization's subscription to check plan limits
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan, additional_seats')
      .eq('org_id', userProfile.org_id)
      .single()

    const currentPlan = (subscription?.plan || 'solo') as PlanType
    const additionalSeats = subscription?.extra_seats || 0

    // Count current users in the organization
    const { count: currentUserCount, error: countError } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', userProfile.org_id)

    if (countError) {
      console.error('Error counting users:', countError)
      return NextResponse.json(
        { error: 'Failed to verify user limits' },
        { status: 500 }
      )
    }

    // Count pending invites (they count toward the limit)
    const { count: pendingInviteCount } = await supabase
      .from('team_invites')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', userProfile.org_id)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())

    const totalUsers = (currentUserCount || 0) + (pendingInviteCount || 0)

    // Check if organization can add more users
    const { allowed, reason, maxUsers } = canAddMoreUsers(
      currentPlan,
      totalUsers,
      additionalSeats
    )

    if (!allowed) {
      return NextResponse.json(
        { 
          error: reason,
          code: 'USER_LIMIT_REACHED',
          currentPlan,
          currentUserCount: totalUsers,
          maxUsers,
        },
        { status: 403 }
      )
    }

    // Check if email already exists in this org
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .eq('org_id', userProfile.org_id)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'This email is already a member of your organization' },
        { status: 400 }
      )
    }

    // Check for existing unused invite
    const { data: existingInvite } = await supabase
      .from('team_invites')
      .select('id')
      .eq('email', email)
      .eq('org_id', userProfile.org_id)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (existingInvite) {
      return NextResponse.json(
        { error: 'An active invitation already exists for this email' },
        { status: 400 }
      )
    }

    // Generate unique token
    const token = crypto.randomBytes(32).toString('hex')

    // Create invite (expires in 7 days)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const { data: invite, error: inviteError } = await supabase
      .from('team_invites')
      .insert({
        org_id: userProfile.org_id,
        email,
        role,
        token,
        invited_by: user.id,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single()

    if (inviteError) {
      console.error('Invite creation error:', inviteError)
      return NextResponse.json(
        { error: 'Failed to create invitation' },
        { status: 500 }
      )
    }

    // Generate invite URL
    const inviteUrl = `${request.nextUrl.origin}/invite/${token}`

    return NextResponse.json({
      success: true,
      inviteUrl,
      expiresAt: expiresAt.toISOString(),
      remainingSeats: maxUsers - totalUsers - 1, // -1 for this new invite
    })
  } catch (error) {
    console.error('Invite error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
