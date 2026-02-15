import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { enrichCompanyByDomain, extractDomain, getCompanyLogoUrl } from '@/lib/enrichment'

export async function POST(request: NextRequest) {
  try {
    const { contact_id, company_id, domain: rawDomain } = await request.json()

    if (!contact_id && !company_id) {
      return NextResponse.json({ error: 'contact_id or company_id required' }, { status: 400 })
    }

    const supabase = createAdminClient()
    let domain = rawDomain

    // If enriching a contact, extract domain from their email
    if (contact_id && !domain) {
      const { data: contact } = await supabase
        .from('contacts')
        .select('email, company')
        .eq('id', contact_id)
        .single()

      if (!contact?.email) {
        return NextResponse.json({ error: 'Contact has no email' }, { status: 400 })
      }

      domain = extractDomain(contact.email)
      if (!domain) {
        return NextResponse.json({ error: 'Personal email domain — no company data available' }, { status: 400 })
      }
    }

    // If enriching a company, get domain from website or provided domain
    if (company_id && !domain) {
      const { data: company } = await supabase
        .from('companies')
        .select('website, domain, name')
        .eq('id', company_id)
        .single()

      if (company?.domain) {
        domain = company.domain
      } else if (company?.website) {
        domain = company.website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
      } else if (company?.name) {
        // Try name-based domain guess
        domain = company.name.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com'
      }
    }

    if (!domain) {
      return NextResponse.json({ error: 'Could not determine domain for enrichment' }, { status: 400 })
    }

    // Try full Clearbit enrichment (if API key configured)
    const enrichment = await enrichCompanyByDomain(domain)

    // Always get logo URL (free, no API key)
    const logoUrl = enrichment?.logo_url || getCompanyLogoUrl(domain)

    // Update contact
    if (contact_id) {
      const updateData: any = {
        enrichment_data: enrichment?.raw || { domain, logo_url: logoUrl },
        enriched_at: new Date().toISOString(),
      }
      if (logoUrl) updateData.avatar_url = logoUrl

      await supabase.from('contacts').update(updateData).eq('id', contact_id)
    }

    // Update company
    if (company_id) {
      const updateData: any = {
        domain,
        enriched_at: new Date().toISOString(),
      }
      if (logoUrl) updateData.logo_url = logoUrl
      if (enrichment) {
        updateData.enrichment_data = enrichment.raw
        if (enrichment.description) updateData.description = enrichment.description
        if (enrichment.employee_count) updateData.employee_count = enrichment.employee_count
        if (enrichment.linkedin_url) updateData.linkedin_url = enrichment.linkedin_url
        if (enrichment.twitter_url) updateData.twitter_url = enrichment.twitter_url
        if (enrichment.facebook_url) updateData.facebook_url = enrichment.facebook_url
      }

      await supabase.from('companies').update(updateData).eq('id', company_id)
    }

    // If it's a contact with a company_id, also try updating the company
    if (contact_id && !company_id) {
      const { data: contact } = await supabase
        .from('contacts')
        .select('company_id')
        .eq('id', contact_id)
        .single()

      if (contact?.company_id) {
        const companyUpdate: any = { domain }
        if (logoUrl) companyUpdate.logo_url = logoUrl
        if (enrichment?.description) companyUpdate.description = enrichment.description
        if (enrichment?.employee_count) companyUpdate.employee_count = enrichment.employee_count
        if (enrichment?.linkedin_url) companyUpdate.linkedin_url = enrichment.linkedin_url

        await supabase.from('companies')
          .update(companyUpdate)
          .eq('id', contact.company_id)
          .is('enriched_at', null) // Only if not already enriched
      }
    }

    return NextResponse.json({
      success: true,
      domain,
      logo_url: logoUrl,
      enrichment: enrichment ? {
        name: enrichment.name,
        description: enrichment.description,
        industry: enrichment.industry,
        employee_count: enrichment.employee_count,
        location: enrichment.location,
        linkedin_url: enrichment.linkedin_url,
        twitter_url: enrichment.twitter_url,
        facebook_url: enrichment.facebook_url,
        founded_year: enrichment.founded_year,
        annual_revenue: enrichment.annual_revenue,
      } : null,
    })
  } catch (error) {
    console.error('Enrichment error:', error)
    return NextResponse.json({ error: 'Enrichment failed' }, { status: 500 })
  }
}
