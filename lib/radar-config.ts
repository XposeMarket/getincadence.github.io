/**
 * Revenue Radar — Industry-Aware Configuration
 * 
 * Defines per-industry data sources, scoring signals, filter chips,
 * lead panel fields, map layers, and legend entries.
 */

// ─── Radar Industry Types ────────────────────────────────────────────────────
// Extends the CRM IndustryType with more granular radar categories
export type RadarIndustryType =
  | 'roofing'
  | 'solar'
  | 'hvac'
  | 'residential_service'  // catch-all for roofing/solar/hvac
  | 'b2b_service'          // marketing agency, IT, consulting, SaaS
  | 'commercial_service'   // cleaning, landscaping, security
  | 'retail'               // franchise, expansion
  | 'photographer'
  | 'default'

// ─── Signal / Filter Definition ──────────────────────────────────────────────
export interface RadarSignal {
  id: string
  label: string
  description: string
  color: string       // hex for legend/chips
  icon?: string       // lucide icon name
  defaultOn: boolean
}

// ─── Lead Panel Field ────────────────────────────────────────────────────────
export interface RadarPanelField {
  key: string
  label: string
  type: 'text' | 'number' | 'boolean' | 'badge' | 'url'
}

// ─── Map Layer Config ────────────────────────────────────────────────────────
export interface RadarLayerConfig {
  id: string
  label: string
  type: 'fill' | 'circle' | 'heatmap' | 'line'
  color: string
  toggleable: boolean
  defaultVisible: boolean
}

// ─── Full Radar Config per Industry ──────────────────────────────────────────
export interface RadarIndustryConfig {
  id: RadarIndustryType
  label: string
  description: string
  dataSources: string[]
  maxRadiusMiles: number
  maxResults: number
  signals: RadarSignal[]
  panelFields: RadarPanelField[]
  layers: RadarLayerConfig[]
  scoringFactors: string[]
  leadNoun: string            // "property" | "business" | "location"
  leadNounPlural: string
  searchPlaceholder: string
}

// ─── Configurations ──────────────────────────────────────────────────────────

const RESIDENTIAL_SERVICE_CONFIG: RadarIndustryConfig = {
  id: 'residential_service',
  label: 'Residential Service',
  description: 'Home lifecycle intelligence — all trades',
  dataSources: ['US Census', 'NOAA Storm Data', 'Permit Datasets', 'Google Geocoding'],
  maxRadiusMiles: 50,
  maxResults: 200,
  signals: [
    { id: 'age', label: 'Home Age', description: 'Homes in service window for your trade', color: '#35FF7A', icon: 'Home', defaultOn: true },
    { id: 'income', label: 'Income Tier', description: 'Median household income in area', color: '#F59E0B', icon: 'DollarSign', defaultOn: true },
    { id: 'owner', label: 'Owner Occupied', description: 'High homeownership areas', color: '#8B5CF6', icon: 'Key', defaultOn: true },
    { id: 'storm', label: 'Storm', description: 'Recent severe weather events', color: '#FF3B3B', icon: 'CloudLightning', defaultOn: true },
    { id: 'permit', label: 'Permits', description: 'Active building permits nearby', color: '#3B82F6', icon: 'FileText', defaultOn: false },
  ],
  panelFields: [
    { key: 'address', label: 'Address', type: 'text' },
    { key: 'propertyAge', label: 'Area Home Age', type: 'text' },
    { key: 'medianYearBuilt', label: 'Median Year Built', type: 'text' },
    { key: 'medianIncome', label: 'Median Income', type: 'text' },
    { key: 'ownerOccupied', label: 'Owner Occupied', type: 'text' },
    { key: 'stormProximity', label: 'Storm Proximity', type: 'text' },
    { key: 'permitHistory', label: 'Permit Activity', type: 'text' },
    { key: 'distance', label: 'Distance', type: 'number' },
  ],
  layers: [
    { id: 'storm-zones', label: 'Storm Zones', type: 'fill', color: '#FF3B3B', toggleable: true, defaultVisible: true },
    { id: 'permit-points', label: 'Permits', type: 'circle', color: '#3B82F6', toggleable: true, defaultVisible: true },
  ],
  scoringFactors: ['Home age', 'Income tier', 'Owner occupancy', 'Storm proximity', 'Permit activity', 'Distance'],
  leadNoun: 'property',
  leadNounPlural: 'properties',
  searchPlaceholder: 'Search neighborhoods in this area...',
}

const B2B_SERVICE_CONFIG: RadarIndustryConfig = {
  id: 'b2b_service',
  label: 'B2B Service',
  description: 'Marketing, IT, Consulting — business prospecting',
  dataSources: ['Google Places API', 'Business Directories', 'Website Signals'],
  maxRadiusMiles: 25,
  maxResults: 200,
  signals: [
    { id: 'low_rating', label: 'Low Rating', description: 'Businesses rated under 3.8', color: '#F59E0B', icon: 'Star', defaultOn: true },
    { id: 'no_website', label: 'No Website', description: 'No web presence detected', color: '#EF4444', icon: 'Globe', defaultOn: true },
    { id: 'low_reviews', label: 'Few Reviews', description: 'Low review count', color: '#8B5CF6', icon: 'MessageSquare', defaultOn: false },
    { id: 'industry_match', label: 'Industry Match', description: 'Matches your target industry', color: '#10B981', icon: 'Target', defaultOn: true },
  ],
  panelFields: [
    { key: 'businessName', label: 'Business', type: 'text' },
    { key: 'rating', label: 'Rating', type: 'number' },
    { key: 'reviewCount', label: 'Reviews', type: 'number' },
    { key: 'website', label: 'Website', type: 'url' },
    { key: 'category', label: 'Category', type: 'text' },
    { key: 'phone', label: 'Phone', type: 'text' },
  ],
  layers: [
    { id: 'business-points', label: 'Businesses', type: 'circle', color: '#3B82F6', toggleable: true, defaultVisible: true },
    { id: 'competitor-clusters', label: 'Competitor Clusters', type: 'heatmap', color: '#EF4444', toggleable: true, defaultVisible: false },
  ],
  scoringFactors: ['Rating under threshold', 'Low review count', 'No website', 'Industry match', 'Distance'],
  leadNoun: 'business',
  leadNounPlural: 'businesses',
  searchPlaceholder: 'Search businesses in this area...',
}

const COMMERCIAL_SERVICE_CONFIG: RadarIndustryConfig = {
  id: 'commercial_service',
  label: 'Commercial Service',
  description: 'Cleaning, Landscaping, Security — commercial property prospecting',
  dataSources: ['Google Places', 'Building Footprints', 'Office Clusters'],
  maxRadiusMiles: 30,
  maxResults: 300,
  signals: [
    { id: 'low_rating', label: 'Low Rating', description: 'Businesses rated under 3.8', color: '#F59E0B', icon: 'Star', defaultOn: true },
    { id: 'no_website', label: 'No Website', description: 'No web presence detected', color: '#EF4444', icon: 'Globe', defaultOn: true },
    { id: 'low_reviews', label: 'Few Reviews', description: 'Low review count', color: '#8B5CF6', icon: 'MessageSquare', defaultOn: false },
    { id: 'industry_match', label: 'Industry Match', description: 'Matches target industry', color: '#10B981', icon: 'Target', defaultOn: true },
  ],
  panelFields: [
    { key: 'businessName', label: 'Business', type: 'text' },
    { key: 'rating', label: 'Rating', type: 'number' },
    { key: 'reviewCount', label: 'Reviews', type: 'number' },
    { key: 'website', label: 'Website', type: 'url' },
    { key: 'category', label: 'Category', type: 'text' },
    { key: 'phone', label: 'Phone', type: 'text' },
  ],
  layers: [
    { id: 'commercial-points', label: 'Commercial Properties', type: 'circle', color: '#6366F1', toggleable: true, defaultVisible: true },
  ],
  scoringFactors: ['Rating', 'Review count', 'Web presence', 'Industry match', 'Distance'],
  leadNoun: 'business',
  leadNounPlural: 'businesses',
  searchPlaceholder: 'Search commercial properties...',
}

const RETAIL_CONFIG: RadarIndustryConfig = {
  id: 'retail',
  label: 'Retail / Franchise',
  description: 'Expansion strategy — gap analysis & competitor mapping',
  dataSources: ['Google Places', 'Population Density', 'Competitor Data', 'Zoning'],
  maxRadiusMiles: 50,
  maxResults: 300,
  signals: [
    { id: 'low_rating', label: 'Low Rating', description: 'Businesses rated under 3.8', color: '#F59E0B', icon: 'Star', defaultOn: true },
    { id: 'no_website', label: 'No Website', description: 'No web presence detected', color: '#EF4444', icon: 'Globe', defaultOn: true },
    { id: 'low_reviews', label: 'Few Reviews', description: 'Low review count', color: '#8B5CF6', icon: 'MessageSquare', defaultOn: false },
    { id: 'industry_match', label: 'Industry Match', description: 'Matches target industry', color: '#10B981', icon: 'Target', defaultOn: true },
  ],
  panelFields: [
    { key: 'businessName', label: 'Business', type: 'text' },
    { key: 'rating', label: 'Rating', type: 'number' },
    { key: 'reviewCount', label: 'Reviews', type: 'number' },
    { key: 'website', label: 'Website', type: 'url' },
    { key: 'category', label: 'Category', type: 'text' },
    { key: 'phone', label: 'Phone', type: 'text' },
  ],
  layers: [
    { id: 'competitor-points', label: 'Competitors', type: 'circle', color: '#EF4444', toggleable: true, defaultVisible: true },
    { id: 'gap-zones', label: 'Gap Zones', type: 'fill', color: '#10B981', toggleable: true, defaultVisible: true },
  ],
  scoringFactors: ['Rating', 'Review count', 'Web presence', 'Industry match', 'Distance'],
  leadNoun: 'business',
  leadNounPlural: 'businesses',
  searchPlaceholder: 'Search retail businesses...',
}

const PHOTOGRAPHER_CONFIG: RadarIndustryConfig = {
  id: 'photographer',
  label: 'Photographer',
  description: 'Location intelligence — scout shoots by niche',
  dataSources: ['Google Places', 'Street View', 'Location Intelligence'],
  maxRadiusMiles: 30,
  maxResults: 150,
  signals: [
    { id: 'venue_match', label: 'Niche Match', description: 'Location matches your photography niche', color: '#E91E8C', icon: 'Camera', defaultOn: true },
    { id: 'popular', label: 'Popular', description: 'Highly rated & reviewed locations', color: '#F59E0B', icon: 'Star', defaultOn: true },
    { id: 'scenic', label: 'Scenic', description: 'Outdoor, natural, or visually interesting', color: '#10B981', icon: 'Sparkles', defaultOn: true },
  ],
  panelFields: [
    { key: 'venueName', label: 'Location', type: 'text' },
    { key: 'locationType', label: 'Type', type: 'text' },
    { key: 'rating', label: 'Rating', type: 'number' },
    { key: 'reviewCount', label: 'Reviews', type: 'number' },
    { key: 'website', label: 'Website', type: 'url' },
    { key: 'phone', label: 'Phone', type: 'text' },
  ],
  layers: [
    { id: 'venue-points', label: 'Locations', type: 'circle', color: '#E91E8C', toggleable: true, defaultVisible: true },
  ],
  scoringFactors: ['Niche match', 'Rating & reviews', 'Photo-friendly environment', 'Public access', 'Distance'],
  leadNoun: 'location',
  leadNounPlural: 'locations',
  searchPlaceholder: 'Search photo locations in this area...',
}

const DEFAULT_CONFIG: RadarIndustryConfig = {
  ...B2B_SERVICE_CONFIG,
  id: 'default',
  label: 'General Prospecting',
  description: 'General-purpose lead prospecting',
}

// ─── Registry ────────────────────────────────────────────────────────────────

export const RADAR_CONFIGS: Record<RadarIndustryType, RadarIndustryConfig> = {
  roofing: { ...RESIDENTIAL_SERVICE_CONFIG, id: 'roofing', label: 'Roofing' },
  solar: { ...RESIDENTIAL_SERVICE_CONFIG, id: 'solar', label: 'Solar' },
  hvac: { ...RESIDENTIAL_SERVICE_CONFIG, id: 'hvac', label: 'HVAC' },
  residential_service: RESIDENTIAL_SERVICE_CONFIG,
  b2b_service: B2B_SERVICE_CONFIG,
  commercial_service: COMMERCIAL_SERVICE_CONFIG,
  retail: RETAIL_CONFIG,
  photographer: PHOTOGRAPHER_CONFIG,
  default: DEFAULT_CONFIG,
}

/**
 * Get radar config for an industry type.
 * Maps CRM industry types to radar types where needed.
 */
export function getRadarConfig(industryType: string | null | undefined): RadarIndustryConfig {
  if (!industryType) return RADAR_CONFIGS.default

  // Direct match
  if (industryType in RADAR_CONFIGS) {
    return RADAR_CONFIGS[industryType as RadarIndustryType]
  }

  // Map CRM industry types to radar types
  const mapping: Record<string, RadarIndustryType> = {
    'service_professional': 'b2b_service',
  }

  const mapped = mapping[industryType]
  if (mapped) return RADAR_CONFIGS[mapped]

  return RADAR_CONFIGS.default
}

/**
 * Score color helpers matching the map marker colors
 */
export function getScoreColor(score: number): string {
  if (score >= 8.5) return '#35FF7A'
  if (score >= 7.0) return '#FFD84D'
  return '#FF2D8A'
}

export function getScoreLabel(score: number): string {
  if (score >= 8.5) return 'High'
  if (score >= 7.0) return 'Medium'
  return 'Low'
}
