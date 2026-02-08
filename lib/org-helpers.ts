// Helper function to get current user's org_id
// This ensures all queries are properly scoped to the user's organization

import { createClient } from '@/lib/supabase/client'

export async function getCurrentUserOrgId(): Promise<string | null> {
  const supabase = createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    console.error('Failed to get authenticated user:', authError)
    return null
  }

  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (profileError || !userProfile) {
    console.error('Failed to get user profile:', profileError)
    return null
  }

  return userProfile.org_id
}
