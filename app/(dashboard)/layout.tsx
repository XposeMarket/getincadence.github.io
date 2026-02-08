import { createClient } from '@/lib/supabase/server'
import DashboardShell from '@/components/dashboard/DashboardShell'

// Demo user for unauthenticated access
const demoUser = {
  id: 'demo-user',
  full_name: 'Demo User',
  email: 'demo@cadence.app',
  role: 'admin',
  orgs: {
    id: 'demo-org',
    name: 'Demo Organization'
  }
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  let profile = demoUser

  if (user) {
    // Get real user profile with org
    const { data } = await supabase
      .from('users')
      .select('*, orgs(*)')
      .eq('id', user.id)
      .single()

    if (data) {
      profile = data
    }
  }

  return <DashboardShell user={profile}>{children}</DashboardShell>
}
