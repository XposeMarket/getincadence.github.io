import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { extractDomain, extractDomainFromUrl, getCompanyLogoUrl, scrapeDomainMeta } from '@/lib/enrichment'

/**
 * POST /api/enrichment
 * 
 * Enriches a contact and/or company using domain meta scraping.
 * Dedup: skips if already enriched (enriched_at is set).
 * 
 * Body: { contact_id?, company_id?, domain? }
 */
export async function POST(request: NextRequest) {
  try {
    const { contact_id, company_id, domain: rawDomain } = await request.json()

    if (!contact_id && !company_id) {
      return NextResponse.json({ error: 'contact_id or company_id required' }, { status: 400 })
    }

    const supabase = createAdminClient()
    let domain = rawDomain

    // ── Dedup check + domain resolution for contacts ──────────
    if (contact_id) {
      const { data: contact } = await supabase
        .from('contacts')
        .select('email, company_id, enriched_at')
        .eq('id', contact_id)
        .single()

      if (!contact) {
        return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
      }

      // Already enriched — skip
      if (contact.enriched_at) {
        return NextResponse.json({ success: true, skipped: true, reason: 'already_enriched' })
      }

      if (!domain && contact.email) {
        domain = extractDomain(contact.email)
      }

      if (!domain) {
        return NextResponse.json({ error: 'No business email domain found' }, { status: 400 })
      }
    }

    // ── Dedup check + domain resolution for companies ─────────
    if (company_id && !contact_id) {
      const { data: company } = await supabase
        .from('companies')
        .select('website, domain, name, enriched_at')
        .eq('id', company_id)
        .single()

      if (!company) {
        return NextResponse.json({ error: 'Company not found' }, { status: 404 })
      }

      if (company.enriched_at) {
        return NextResponse.json({ success: true, skipped: true, reason: 'already_enriched' })
      }

      if (!domain) {
        domain = company.domain || extractDomainFromUrl(company.website)
      }
      if (!domain && company.name) {
        // Last resort: guess domain from name
        domain = company.name.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com'
      }
    }

    if (!domain) {
      return NextResponse.json({ error: 'Could not determine domain for enrichment' }, { status: 400 })
    }

    // ── Scrape domain meta ────────────────────────────────────
    const meta = await scrapeDomainMeta(domain)
    const logoUrl = getCompanyLogoUrl(domain)

    // Build enrichment data blob
    const enrichmentData: Record<string, any> = {
      source: 'domain_scrape',
      domain,
      logo_url: logoUrl,
    }
    if (meta) {
      enrichmentData.title = meta.title
      enrichmentData.description = meta.description || meta.ogDescription
      enrichmentData.og_image = meta.ogImage
      enrichmentData.og_title = meta.ogTitle
      enrichmentData.favicon = meta.favicon
    }

    const description = meta?.ogDescription || meta?.description || null
    const companyName = meta?.ogTitle || meta?.title || null

    // ── Update contact ────────────────────────────────────────
    if (contact_id) {
      const contactUpdate: Record<string, any> = {
        enrichment_data: enrichmentData,
        enrichment_source: 'domain_scrape',
        enriched_at: new Date().toISOString(),
      }
      if (logoUrl) contactUpdate.avatar_url = logoUrl

      await supabase.from('contacts').update(contactUpdate).eq('id', contact_id)

      // Also enrich the linked company if it hasn't been enriched yet
      const { data: contact } = await supabase
        .from('contacts')
        .select('company_id')
        .eq('id', contact_id)
        .single()

      if (contact?.company_id) {
        const { data: company } = await supabase
          .from('companies')
          .select('enriched_at')
          .eq('id', contact.company_id)
          .single()

        if (company && !company.enriched_at) {
          const companyUpdate: Record<string, any> = {
            domain,
            enrichment_data: enrichmentData,
            enrichment_source: 'domain_scrape',
            enriched_at: new Date().toISOString(),
          }
          if (logoUrl) companyUpdate.logo_url = logoUrl
          if (description) companyUpdate.description = description

          await supabase.from('companies').update(companyUpdate).eq('id', contact.company_id)
        }
      }
    }

    // ── Update company directly ───────────────────────────────
    if (company_id) {
      const companyUpdate: Record<string, any> = {
        domain,
        enrichment_data: enrichmentData,
        enrichment_source: 'domain_scrape',
        enriched_at: new Date().toISOString(),
      }
      if (logoUrl) companyUpdate.logo_url = logoUrl
      if (description) companyUpdate.description = description

      await supabase.from('companies').update(companyUpdate).eq('id', company_id)
    }

    return NextResponse.json({
      success: true,
      domain,
      logo_url: logoUrl,
      meta: meta ? {
        title: meta.title,
        description: meta.description || meta.ogDescription,
        og_image: meta.ogImage,
      } : null,
    })
  } catch (error) {
    console.error('Enrichment error:', error)
    return NextResponse.json({ error: 'Enrichment failed' }, { status: 500 })
  }
}
