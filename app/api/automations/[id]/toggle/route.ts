import { createClient } from '@/lib/supabase/server'
import { getCurrentUserOrgId } from '@/lib/org-helpers'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { is_active } = await request.json()
    if (typeof is_active !== 'boolean') {
      return NextResponse.json({ error: 'is_active must be a boolean' }, { status: 400 })
    }

    // Update the automation — scoped to org
    const { error } = await supabase
      .from('automations')
      .update({ is_active })
      .eq('id', params.id)
      .eq('org_id', profile.org_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, is_active })
  } catch (err) {
    console.error('Automation toggle error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
