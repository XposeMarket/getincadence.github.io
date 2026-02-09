import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getPresetById } from '@/lib/automation-presets'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    const { data: profile } = await supabase
      .from('users')
      .select('role, org_id')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { preset_id } = await request.json()
    if (!preset_id) {
      return NextResponse.json({ error: 'preset_id is required' }, { status: 400 })
    }

    const preset = getPresetById(preset_id)
    if (!preset) {
      return NextResponse.json({ error: 'Unknown preset' }, { status: 404 })
    }

    // Check if this preset already exists for this org
    const { data: existing } = await supabase
      .from('automations')
      .select('id')
      .eq('org_id', profile.org_id)
      .contains('trigger_config', { preset_id })
      .single()

    if (existing) {
      // Just re-enable it
      await supabase
        .from('automations')
        .update({ is_active: true })
        .eq('id', existing.id)

      return NextResponse.json({ success: true, id: existing.id, reactivated: true })
    }

    // Insert new automation from preset
    const { data, error } = await supabase
      .from('automations')
      .insert({
        org_id: profile.org_id,
        name: preset.name,
        description: preset.description,
        is_active: true,
        trigger_type: preset.trigger_type,
        trigger_config: {
          ...preset.trigger_config,
          preset_id: preset.preset_id,
        },
        conditions: [],
        actions: preset.actions,
        created_by: null,
      })
      .select('id')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, id: data.id })
  } catch (err) {
    console.error('Enable preset error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
