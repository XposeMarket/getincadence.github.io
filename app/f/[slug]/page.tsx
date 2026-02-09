import { createAdminClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import IntakeForm from './IntakeForm'

interface PageProps {
  params: { slug: string }
}

export default async function IntakeFormPage({ params }: PageProps) {
  const supabase = createAdminClient()

  // Look up org by slug
  const { data: org, error } = await supabase
    .from('orgs')
    .select('id, name, logo_url, industry_type')
    .eq('intake_form_slug', params.slug)
    .single()

  if (error || !org) {
    notFound()
  }

  return <IntakeForm org={org} slug={params.slug} />
}

// Generate metadata for the page
export async function generateMetadata({ params }: PageProps) {
  const supabase = createAdminClient()

  const { data: org } = await supabase
    .from('orgs')
    .select('name')
    .eq('intake_form_slug', params.slug)
    .single()

  return {
    title: org ? `Contact ${org.name}` : 'Contact Form',
    description: org ? `Submit an inquiry to ${org.name}` : 'Submit an inquiry',
  }
}
