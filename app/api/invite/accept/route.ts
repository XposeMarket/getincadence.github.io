import { createAdminClient, createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { token, email, password, fullName } = await request.json()

    if (!token || !email || !password || !fullName) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    const adminSupabase = createAdminClient()

    // Get invite details
    const { data: invite, error: inviteError } = await adminSupabase
      .from('team_invites')
      .select('*')
      .eq('token', token)
      .single()

    if (inviteError || !invite) {
      return NextResponse.json(
        { error: 'Invalid invitation link' },
        { status: 404 }
      )
    }

    // Verify email matches exactly
    if (invite.email.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json(
        { error: 'Email does not match the invitation' },
        { status: 400 }
      )
    }

    // Check if already used
    if (invite.used) {
      return NextResponse.json(
        { error: 'This invitation has already been used' },
        { status: 400 }
      )
    }

    // Check if expired
    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'This invitation has expired' },
        { status: 400 }
      )
    }

    // Create auth user
    const supabase = createClient()
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })

    if (authError) {
      console.error('Auth signup error:', authError)
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create account' },
        { status: 500 }
      )
    }

    // Create user profile with org from invite
    const { error: userError } = await adminSupabase
      .from('users')
      .insert({
        id: authData.user.id,
        org_id: invite.org_id,
        email,
        full_name: fullName,
        role: invite.role,
      })

    if (userError) {
      console.error('User profile creation error:', userError)
      // Cleanup: delete auth user if profile creation fails
      await adminSupabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: 'Failed to create user profile' },
        { status: 500 }
      )
    }

    // Mark invite as used
    await adminSupabase
      .from('team_invites')
      .update({
        used: true,
        used_at: new Date().toISOString(),
      })
      .eq('id', invite.id)

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
    })
  } catch (error) {
    console.error('Invite acceptance error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
