import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { maskEmail } from '@/lib/utils/email'

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Get invite details
    const { data: invite, error: inviteError } = await supabase
      .from('team_invites')
      .select(`
        id,
        email,
        role,
        org_id,
        expires_at,
        used,
        orgs (
          name
        )
      `)
      .eq('token', token)
      .single()

    if (inviteError || !invite) {
      return NextResponse.json(
        { error: 'Invalid invitation link' },
        { status: 404 }
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

    // Return masked email and org info
    return NextResponse.json({
      valid: true,
      maskedEmail: maskEmail(invite.email),
      orgName: invite.orgs?.name || 'Unknown Organization',
      role: invite.role,
    })
  } catch (error) {
    console.error('Invite validation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
