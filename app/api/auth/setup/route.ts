import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { userId, email, fullName, orgName } = await request.json()

    console.log('=== Setup API Called ===')
    console.log('User ID:', userId)
    console.log('Email:', email)
    console.log('Full Name:', fullName)
    console.log('Org Name:', orgName)

    if (!userId || !email || !fullName || !orgName) {
      console.error('Missing required fields')
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()
    console.log('Admin client created')

    // Create the organization
    console.log('Creating organization...')
    const { data: org, error: orgError } = await supabase
      .from('orgs')
      .insert({
        name: orgName,
        slug: orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      })
      .select()
      .single()

    if (orgError) {
      console.error('Org creation error:', orgError)
      console.error('Org creation error details:', JSON.stringify(orgError, null, 2))
      return NextResponse.json(
        { error: `Failed to create organization: ${orgError.message}` },
        { status: 500 }
      )
    }

    console.log('Organization created successfully:', org.id)

    // Create the user profile
    console.log('Creating user profile...')
    console.log('User data:', { id: userId, org_id: org.id, email, full_name: fullName, role: 'admin' })
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: userId,
        org_id: org.id,
        email,
        full_name: fullName,
        role: 'admin', // First user is admin
      })

    if (userError) {
      console.error('User creation error:', userError)
      console.error('User creation error details:', JSON.stringify(userError, null, 2))
      console.error('Attempting rollback of org:', org.id)
      // Rollback org creation
      await supabase.from('orgs').delete().eq('id', org.id)
      return NextResponse.json(
        { error: `Failed to create user profile: ${userError.message}` },
        { status: 500 }
      )
    }

    console.log('User profile created successfully')

    // Create default pipeline for the org
    console.log('Creating default pipeline...')
    const { data: pipeline, error: pipelineError } = await supabase
      .from('pipelines')
      .insert({
        org_id: org.id,
        name: 'Sales Pipeline',
        is_default: true,
      })
      .select()
      .single()

    if (!pipelineError && pipeline) {
      // Create default pipeline stages
      const defaultStages = [
        { name: 'Lead', position: 0, color: '#6B7280' },
        { name: 'Qualified', position: 1, color: '#3B82F6' },
        { name: 'Proposal', position: 2, color: '#F59E0B' },
        { name: 'Negotiation', position: 3, color: '#8B5CF6' },
        { name: 'Closed Won', position: 4, color: '#10B981', is_won: true },
        { name: 'Closed Lost', position: 5, color: '#EF4444', is_lost: true },
      ]

      await supabase.from('pipeline_stages').insert(
        defaultStages.map((stage) => ({
          ...stage,
          org_id: org.id,
          pipeline_id: pipeline.id,
        }))
      )
    }

    return NextResponse.json({ success: true, orgId: org.id })
  } catch (error) {
    console.error('Setup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
