import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { isFreeTier, FREE_TIER_LIMITS } from '@/lib/subscription/free-tier-limits'

/**
 * POST /api/automations — Create a user-defined automation
 * Enforces plan limits on custom automations (created_by IS NOT NULL)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get profile with org + plan info
    const { data: profile } = await supabase
      .from('users')
      .select('role, org_id')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, trigger_type, trigger_config, conditions, actions } = body

    // Validate required fields
    if (!name || !trigger_type || !actions || !Array.isArray(actions) || actions.length === 0) {
      return NextResponse.json({ error: 'Name, trigger_type, and at least one action are required' }, { status: 400 })
    }

    // Validate trigger type
    const ALLOWED_TRIGGERS = ['contact_created', 'deal_created', 'deal_stage_changed']
    if (!ALLOWED_TRIGGERS.includes(trigger_type)) {
      return NextResponse.json({ error: 'Invalid trigger type' }, { status: 400 })
    }

    // Validate conditions (max 3, AND only)
    const safeConditions = Array.isArray(conditions) ? conditions.slice(0, 3) : []

    // Check plan limits for custom automations
    const { data: org } = await supabase
      .from('orgs')
      .select('plan')
      .eq('id', profile.org_id)
      .single()

    if (isFreeTier(org?.plan)) {
      // Count existing custom automations (created_by IS NOT NULL)
      const { count } = await supabase
        .from('automations')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', profile.org_id)
        .not('created_by', 'is', null)

      if ((count || 0) >= FREE_TIER_LIMITS.customAutomations) {
        return NextResponse.json({
          error: 'Custom automation limit reached',
          limit: FREE_TIER_LIMITS.customAutomations,
          upgrade: true,
        }, { status: 403 })
      }
    }

    // Insert the automation
    const { data, error } = await supabase
      .from('automations')
      .insert({
        org_id: profile.org_id,
        name: name.trim(),
        description: (description || '').trim(),
        is_active: true,
        trigger_type,
        trigger_config: trigger_config || {},
        conditions: safeConditions,
        actions,
        created_by: user.id,
      })
      .select('id')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, id: data.id })
  } catch (err) {
    console.error('Create automation error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
