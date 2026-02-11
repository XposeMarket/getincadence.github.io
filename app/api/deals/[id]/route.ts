import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// DELETE /api/deals/[id] — Delete deal and correlated photographer_booking
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  // Get user/org context (assume auth middleware or add here if needed)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // Get org_id for user
  const { data: profile } = await supabase
    .from('users')
    .select('org_id')
    .eq('id', user.id)
    .single()
  if (!profile) {
    return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
  }
  const orgId = profile.org_id
  const dealId = params.id

  // Delete from photographer_bookings first (if exists)
  await supabase
    .from('photographer_bookings')
    .delete()
    .eq('org_id', orgId)
    .eq('deal_id', dealId)

  // Delete the deal
  const { error: dealError } = await supabase
    .from('deals')
    .delete()
    .eq('id', dealId)
    .eq('org_id', orgId)

  if (dealError) {
    return NextResponse.json({ error: 'Failed to delete deal' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
