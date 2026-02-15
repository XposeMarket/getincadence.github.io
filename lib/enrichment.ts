// Contact & Company enrichment utilities
// Sources:
//   1. Clearbit Logo CDN (free, unlimited, no API key) — logo.clearbit.com/{domain}
//   2. Domain meta scraping (free, unlimited) — fetch homepage, parse meta tags
//   3. Google Places data (persisted from Prospector) — already paid for

// ─── Domain Extraction ────────────────────────────────────────────────────────

const PERSONAL_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
  'icloud.com', 'me.com', 'mac.com', 'live.com', 'msn.com',
  'protonmail.com', 'proton.me', 'mail.com', 'zoho.com', 'ymail.com',
  'comcast.net', 'verizon.net', 'att.net', 'sbcglobal.net',
  'cox.net', 'charter.net', 'earthlink.net', 'juno.com',
  'gmx.com', 'gmx.net', 'web.de', 't-online.de',
  'qq.com', '163.com', '126.com', 'sina.com',
])

/**
 * Extract domain from an email address. Returns null for personal domains.
 */
export function extractDomain(email: string | null | undefined): string | null {
  if (!email) return null
  const match = email.trim().match(/@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/)
  if (!match) return null
  const domain = match[1].toLowerCase()
  return PERSONAL_DOMAINS.has(domain) ? null : domain
}

/**
 * Extract domain from a website URL
 */
export function extractDomainFromUrl(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const domain = url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].toLowerCase()
    if (!domain || domain.length < 3 || !domain.includes('.')) return null
    return domain
  } catch {
    return null
  }
}

// ─── Logo URLs (Clearbit CDN — free, no API key) ─────────────────────────────

/**
 * Get company logo URL from email or domain. Free, unlimited, no API key.
 */
export function getCompanyLogoUrl(emailOrDomain: string | null | undefined): string | null {
  if (!emailOrDomain) return null
  const domain = emailOrDomain.includes('@')
    ? extractDomain(emailOrDomain)
    : extractDomainFromUrl(emailOrDomain) || emailOrDomain
  if (!domain || domain.length < 3) return null
  return `https://logo.clearbit.com/${domain}`
}

/**
 * Get logo URL from a website URL
 */
export function getLogoFromWebsite(website: string | null | undefined): string | null {
  if (!website) return null
  const domain = extractDomainFromUrl(website)
  if (!domain) return null
  return `https://logo.clearbit.com/${domain}`
}

// ─── Domain Meta Scraping (server-side only) ──────────────────────────────────

export interface DomainMetaResult {
  title: string | null
  description: string | null
  ogImage: string | null
  ogTitle: string | null
  ogDescription: string | null
  favicon: string | null
  domain: string
}

/**
 * Scrape meta tags from a domain's homepage. Server-side only.
 * Returns basic company info extracted from HTML meta tags.
 */
export async function scrapeDomainMeta(domain: string): Promise<DomainMetaResult | null> {
  const urls = [`https://${domain}`, `https://www.${domain}`]

  for (const url of urls) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)

      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; CadenceCRM/1.0; +https://cadencecrm.com)',
          'Accept': 'text/html',
        },
        redirect: 'follow',
      })

      clearTimeout(timeout)

      if (!res.ok) continue

      const html = await res.text()
      // Only parse the <head> section to be efficient
      const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i)
      const head = headMatch ? headMatch[1] : html.slice(0, 10000)

      const getMetaContent = (name: string): string | null => {
        // Match both name="" and property="" attributes
        const pattern = new RegExp(
          `<meta[^>]*(?:name|property)=["']${name}["'][^>]*content=["']([^"']*)["']|<meta[^>]*content=["']([^"']*)["'][^>]*(?:name|property)=["']${name}["']`,
          'i'
        )
        const match = head.match(pattern)
        return match ? (match[1] || match[2] || null) : null
      }

      const titleMatch = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
      const title = titleMatch ? titleMatch[1].trim().replace(/\s+/g, ' ') : null

      // Get favicon
      const faviconMatch = head.match(/<link[^>]*rel=["'](?:icon|shortcut icon)["'][^>]*href=["']([^"']*)["']/i)
      let favicon: string | null = null
      if (faviconMatch?.[1]) {
        favicon = faviconMatch[1]
        if (favicon.startsWith('/')) favicon = `https://${domain}${favicon}`
        else if (!favicon.startsWith('http')) favicon = `https://${domain}/${favicon}`
      }

      return {
        title,
        description: getMetaContent('description'),
        ogImage: getMetaContent('og:image'),
        ogTitle: getMetaContent('og:title'),
        ogDescription: getMetaContent('og:description'),
        favicon,
        domain,
      }
    } catch {
      continue
    }
  }

  return null
}

// ─── Google Places Data Mapping ───────────────────────────────────────────────

/**
 * Map raw Google Places data to company enrichment fields.
 * Used when creating leads from Prospector — the data is already fetched.
 */
export function mapPlacesDataToCompany(lead: any, placeDetails?: any): Record<string, any> {
  const data: Record<string, any> = {}

  // Basic info from lead
  if (lead.website) {
    data.website = lead.website
    data.domain = extractDomainFromUrl(lead.website)
    if (data.domain) data.logo_url = getCompanyLogoUrl(data.domain)
  }

  if (lead.phone) data.phone = lead.phone
  if (lead.address) data.address = lead.address
  if (lead.city) data.city = lead.city
  if (lead.state) data.state = lead.state
  if (lead.category) data.category = lead.category
  if (lead.place_id) data.google_place_id = lead.place_id

  // Rating data
  if (lead.rating) data.google_rating = lead.rating
  if (lead.reviewCount) data.google_review_count = lead.reviewCount

  // Place details (if passed as separate object)
  if (placeDetails) {
    if (placeDetails.formatted_phone_number && !data.phone) {
      data.phone = placeDetails.formatted_phone_number
    }
    if (placeDetails.website && !data.website) {
      data.website = placeDetails.website
      data.domain = extractDomainFromUrl(placeDetails.website)
      if (data.domain) data.logo_url = getCompanyLogoUrl(data.domain)
    }
    if (placeDetails.opening_hours?.weekday_text) {
      data.business_hours = { weekday_text: placeDetails.opening_hours.weekday_text }
    }
    if (placeDetails.photos && placeDetails.photos.length > 0) {
      data.google_photos = placeDetails.photos.slice(0, 5).map((p: any) => p.photo_reference || p.url).filter(Boolean)
    }
    if (placeDetails.types) {
      data.category = data.category || placeDetails.types[0]?.replace(/_/g, ' ')
    }
  }

  // Also check for merged place details keys (from LeadSidePanel enrichment)
  if (lead.businessHours) {
    data.business_hours = { weekday_text: lead.businessHours }
  }
  if (lead.placePhotos && lead.placePhotos.length > 0) {
    data.google_photos = lead.placePhotos.slice(0, 5).map((p: any) => p.photo_reference || p.url || p).filter(Boolean)
  }
  if (lead.placeTypes && !data.category) {
    data.category = lead.placeTypes[0]?.replace(/_/g, ' ')
  }

  data.enrichment_source = 'google_places'
  data.enriched_at = new Date().toISOString()

  return data
}

/**
 * Build full enrichment_data JSONB blob from Places lead
 */
export function buildPlacesEnrichmentData(lead: any, placeDetails?: any): Record<string, any> {
  return {
    source: 'google_places',
    place_id: lead.place_id,
    name: lead.businessName || lead.venueName || lead.name,
    address: lead.address,
    city: lead.city,
    state: lead.state,
    rating: lead.rating,
    review_count: lead.reviewCount,
    category: lead.category,
    website: lead.website,
    phone: lead.phone,
    score: lead.score,
    reasons: lead.reasons,
    ...(placeDetails ? {
      opening_hours: placeDetails.opening_hours,
      types: placeDetails.types,
      formatted_address: placeDetails.formatted_address,
    } : {}),
  }
}
