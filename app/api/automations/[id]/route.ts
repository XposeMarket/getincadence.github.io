import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * DELETE /api/automations/[id] — Delete a user-created automation
 * Only works when created_by IS NOT NULL (presets cannot be deleted)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role, org_id')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Check the automation exists, belongs to this org, and is user-created
    const { data: automation } = await supabase
      .from('automations')
      .select('id, created_by')
      .eq('id', params.id)
      .eq('org_id', profile.org_id)
      .single()

    if (!automation) {
      return NextResponse.json({ error: 'Automation not found' }, { status: 404 })
    }

    if (automation.created_by === null) {
      return NextResponse.json({ error: 'Preset automations cannot be deleted. You can toggle them off instead.' }, { status: 403 })
    }

    // Delete
    const { error } = await supabase
      .from('automations')
      .delete()
      .eq('id', params.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Delete automation error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
