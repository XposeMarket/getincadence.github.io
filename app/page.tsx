import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MarketingLayout from '@/components/marketing/MarketingLayout'
import LandingPageContent from '@/components/marketing/LandingPageContent'

export default async function HomePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If user is logged in, redirect to dashboard
  if (user) {
    redirect('/dashboard')
  }
  
  // Show marketing landing page for logged-out users
  return (
    <MarketingLayout>
      <LandingPageContent />
    </MarketingLayout>
  )
}
