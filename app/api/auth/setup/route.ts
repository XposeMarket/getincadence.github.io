import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getVertical, VerticalId } from '@/lib/verticals'
import { buildSeedRows } from '@/lib/automation-presets'

export async function POST(request: NextRequest) {
  try {
    const { userId, email, fullName, orgName, industryType } = await request.json()

    console.log('=== Setup API Called ===')
    console.log('User ID:', userId)
    console.log('Email:', email)
    console.log('Full Name:', fullName)
    console.log('Org Name:', orgName)
    console.log('Industry Type:', industryType)

    if (!userId || !email || !fullName || !orgName) {
      console.error('Missing required fields')
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()
    console.log('Admin client created')

    // Get vertical config for pipeline creation
    const verticalConfig = getVertical(industryType as VerticalId || 'default')
    console.log('Using vertical config:', verticalConfig.id)

    // Create the organization
    console.log('Creating organization...')
    const { data: org, error: orgError } = await supabase
      .from('orgs')
      .insert({
        name: orgName,
        slug: orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        industry_type: industryType || 'default',
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

    // Create default subscription (Solo plan - free)
    console.log('Creating default subscription...')
    const { error: subError } = await supabase
      .from('subscriptions')
      .insert({
        org_id: org.id,
        plan: 'solo',
        status: 'active',
      })

    if (subError) {
      console.error('Subscription creation error:', subError)
      // Non-critical - continue anyway, subscription can be created later
    } else {
      console.log('Default subscription created successfully')
    }

    // Create default pipeline for the org
    console.log('Creating default pipeline...')
    const pipelineName = verticalConfig.terminology.pipeline || 'Pipeline'
    const { data: pipeline, error: pipelineError } = await supabase
      .from('pipelines')
      .insert({
        org_id: org.id,
        name: pipelineName,
        is_default: true,
      })
      .select()
      .single()

    if (!pipelineError && pipeline) {
      // Create default pipeline stages based on vertical
      const defaultStages = verticalConfig.defaultPipelineStages

      await supabase.from('pipeline_stages').insert(
        defaultStages.map((stage) => ({
          ...stage,
          org_id: org.id,
          pipeline_id: pipeline.id,
        }))
      )
      console.log(`Created ${defaultStages.length} pipeline stages for ${verticalConfig.id} vertical`)
    }

    // Seed default automations for this industry
    console.log('Seeding default automations...')
    const automationRows = buildSeedRows(org.id, industryType || 'default')
    if (automationRows.length > 0) {
      const { error: autoError } = await supabase
        .from('automations')
        .insert(automationRows)
      if (autoError) {
        console.error('Automation seeding error:', autoError)
        // Non-critical — continue
      } else {
        console.log(`Seeded ${automationRows.length} default automations`)
      }
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
