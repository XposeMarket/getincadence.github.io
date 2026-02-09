import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const BUDGET_RANGES = [
  'Under $500',
  '$500 - $1,000',
  '$1,000 - $5,000',
  '$5,000 - $10,000',
  '$10,000+',
  'Not sure',
]

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()

    const { name, email, phone, message, budget } = body

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    // Validate budget if provided
    if (budget && !BUDGET_RANGES.includes(budget)) {
      return NextResponse.json(
        { error: 'Invalid budget range' },
        { status: 400 }
      )
    }

    // Look up org by intake_form_slug
    const { data: org, error: orgError } = await supabase
      .from('orgs')
      .select('id, name')
      .eq('intake_form_slug', params.slug)
      .single()

    if (orgError || !org) {
      return NextResponse.json(
        { error: 'Form not found' },
        { status: 404 }
      )
    }

    // Split name into first and last
    const nameParts = name.trim().split(/\s+/)
    const firstName = nameParts[0]
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : ''

    // Check for existing contact by email in this org
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, phone')
      .eq('org_id', org.id)
      .eq('email', email.toLowerCase().trim())
      .single()

    let contactId: string

    if (existingContact) {
      // Merge: update fields if the new submission has newer/better data
      const updates: Record<string, string> = {}
      if (firstName && !existingContact.first_name) updates.first_name = firstName
      if (lastName && !existingContact.last_name) updates.last_name = lastName
      if (phone && !existingContact.phone) updates.phone = phone

      if (Object.keys(updates).length > 0) {
        await supabase
          .from('contacts')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', existingContact.id)
      }

      contactId = existingContact.id
    } else {
      // Create new contact
      const { data: newContact, error: contactError } = await supabase
        .from('contacts')
        .insert({
          org_id: org.id,
          first_name: firstName,
          last_name: lastName || null,
          email: email.toLowerCase().trim(),
          phone: phone || null,
          notes: `Submitted via intake form`,
        })
        .select('id')
        .single()

      if (contactError || !newContact) {
        console.error('Failed to create contact:', contactError)
        return NextResponse.json(
          { error: 'Failed to process submission' },
          { status: 500 }
        )
      }

      contactId = newContact.id
    }

    // Get the default pipeline and its first stage
    const { data: pipeline } = await supabase
      .from('pipelines')
      .select('id')
      .eq('org_id', org.id)
      .eq('is_default', true)
      .single()

    if (!pipeline) {
      console.error('No default pipeline found for org:', org.id)
      return NextResponse.json(
        { error: 'Failed to process submission' },
        { status: 500 }
      )
    }

    const { data: firstStage } = await supabase
      .from('pipeline_stages')
      .select('id')
      .eq('pipeline_id', pipeline.id)
      .order('position', { ascending: true })
      .limit(1)
      .single()

    if (!firstStage) {
      console.error('No pipeline stages found for pipeline:', pipeline.id)
      return NextResponse.json(
        { error: 'Failed to process submission' },
        { status: 500 }
      )
    }

    // Create deal (owner left unassigned — can be claimed from dashboard)
    const { data: newDeal, error: dealError } = await supabase
      .from('deals')
      .insert({
        org_id: org.id,
        pipeline_id: pipeline.id,
        stage_id: firstStage.id,
        contact_id: contactId,
        name: `${name} — Intake Form`,
        amount: 0,
        source: 'intake_form',
        description: message,
        metadata: {
          budget: budget || null,
          submitted_at: new Date().toISOString(),
          submitted_via: 'intake_form',
        },
      })
      .select('id')
      .single()

    if (dealError || !newDeal) {
      console.error('Failed to create deal:', dealError)
      return NextResponse.json(
        { error: 'Failed to process submission' },
        { status: 500 }
      )
    }

    // Create follow-up task
    const { error: taskError } = await supabase
      .from('tasks')
      .insert({
        org_id: org.id,
        title: `Follow up with ${name}`,
        description: `New inquiry submitted via intake form.\n\nMessage: ${message}${budget ? `\nBudget: ${budget}` : ''}`,
        status: 'pending',
        priority: 'high',
        deal_id: newDeal.id,
        contact_id: contactId,
        due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Due in 24 hours
      })

    if (taskError) {
      console.error('Failed to create task (non-fatal):', taskError)
      // Non-fatal — the deal was still created successfully
    }

    // Log activity
    await supabase
      .from('activities')
      .insert({
        org_id: org.id,
        activity_type: 'lead_form',
        subject: `New lead from intake form: ${name}`,
        body: `${name} (${email}) submitted an inquiry via the lead form.${phone ? `\nPhone: ${phone}` : ''}${budget ? `\nBudget: ${budget}` : ''}\n\nMessage: ${message}`,
        deal_id: newDeal.id,
        contact_id: contactId,
      })

    return NextResponse.json({ success: true }, { status: 201 })

  } catch (error) {
    console.error('Intake form error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
