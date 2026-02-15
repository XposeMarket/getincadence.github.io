// Contact & Company enrichment utilities
// Uses Clearbit Logo API (free, unlimited) and Clearbit Company API (free tier: 50/month)

/**
 * Extract domain from an email address
 */
export function extractDomain(email: string | null | undefined): string | null {
  if (!email) return null
  const match = email.trim().match(/@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/)
  if (!match) return null

  const domain = match[1].toLowerCase()

  // Skip personal email providers — no useful company data
  const personalDomains = new Set([
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
    'icloud.com', 'me.com', 'mac.com', 'live.com', 'msn.com',
    'protonmail.com', 'proton.me', 'mail.com', 'zoho.com', 'ymail.com',
    'comcast.net', 'verizon.net', 'att.net', 'sbcglobal.net',
    'cox.net', 'charter.net', 'earthlink.net', 'juno.com',
    'gmx.com', 'gmx.net', 'web.de', 't-online.de',
    'qq.com', '163.com', '126.com', 'sina.com',
  ])

  return personalDomains.has(domain) ? null : domain
}

/**
 * Get the Clearbit logo URL for a domain — free, no API key needed
 * Returns null if no domain can be extracted
 */
export function getCompanyLogoUrl(emailOrDomain: string | null | undefined): string | null {
  if (!emailOrDomain) return null

  // If it looks like an email, extract domain
  const domain = emailOrDomain.includes('@')
    ? extractDomain(emailOrDomain)
    : emailOrDomain.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].toLowerCase()

  if (!domain || domain.length < 3) return null
  return `https://logo.clearbit.com/${domain}`
}

/**
 * Get logo URL from a website URL
 */
export function getLogoFromWebsite(website: string | null | undefined): string | null {
  if (!website) return null
  const domain = website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].toLowerCase()
  if (!domain || domain.length < 3) return null
  return `https://logo.clearbit.com/${domain}`
}

/**
 * Enrich a company using Clearbit Company API
 * Requires CLEARBIT_API_KEY env var
 * Free tier: 50 lookups/month
 */
export async function enrichCompanyByDomain(domain: string): Promise<EnrichmentResult | null> {
  const apiKey = process.env.CLEARBIT_API_KEY
  if (!apiKey) return null

  try {
    const res = await fetch(`https://company.clearbit.com/v2/companies/find?domain=${domain}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })

    if (!res.ok) return null

    const data = await res.json()

    return {
      name: data.name || null,
      description: data.description || null,
      domain: data.domain || domain,
      logo_url: data.logo || getCompanyLogoUrl(domain),
      industry: data.category?.industry || null,
      employee_count: data.metrics?.employees
        ? formatEmployeeCount(data.metrics.employees)
        : data.metrics?.employeesRange || null,
      location: [data.geo?.city, data.geo?.stateCode, data.geo?.country].filter(Boolean).join(', ') || null,
      linkedin_url: data.linkedin?.handle ? `https://linkedin.com/company/${data.linkedin.handle}` : null,
      twitter_url: data.twitter?.handle ? `https://twitter.com/${data.twitter.handle}` : null,
      facebook_url: data.facebook?.handle ? `https://facebook.com/${data.facebook.handle}` : null,
      tech: data.tech || [],
      tags: data.tags || [],
      founded_year: data.foundedYear || null,
      annual_revenue: data.metrics?.annualRevenue
        ? formatRevenue(data.metrics.annualRevenue)
        : data.metrics?.estimatedAnnualRevenue || null,
      raw: data,
    }
  } catch (err) {
    console.error('Clearbit enrichment failed:', err)
    return null
  }
}

export interface EnrichmentResult {
  name: string | null
  description: string | null
  domain: string
  logo_url: string | null
  industry: string | null
  employee_count: string | null
  location: string | null
  linkedin_url: string | null
  twitter_url: string | null
  facebook_url: string | null
  tech: string[]
  tags: string[]
  founded_year: number | null
  annual_revenue: string | null
  raw: any
}

function formatEmployeeCount(count: number): string {
  if (count >= 10000) return `${(count / 1000).toFixed(0)}k+`
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`
  return count.toString()
}

function formatRevenue(amount: number): string {
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(0)}M`
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`
  return `$${amount}`
}
