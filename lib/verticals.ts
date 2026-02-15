/**
 * Cadence CRM — Unified Vertical Registry
 *
 * Single source of truth for all industry/vertical configuration.
 * Replaces lib/industry-config.ts and lib/radar-config.ts.
 *
 * Each vertical defines:
 *  - Identity (id, label, description, category)
 *  - Terminology (what things are called in the UI)
 *  - Feature flags (which pages/capabilities are visible)
 *  - Pipeline defaults (stages seeded on org creation)
 *  - Task templates (seeded on org creation)
 *  - Radar config (prospecting signals/scoring, or null if not applicable)
 */

// ─── Vertical ID ──────────────────────────────────────────────────────────────

export type VerticalId =
  // Residential Service
  | 'roofing'
  | 'solar'
  | 'hvac'
  | 'remodeling'
  | 'plumbing'
  | 'general_contractor'
  // B2B
  | 'default'
  // Creative
  | 'photographer'
  // Recurring Service
  | 'barbershop'
  | 'service_professional'

/**
 * @deprecated Use VerticalId instead. Kept for backward compatibility
 * with existing components that import IndustryType.
 */
export type IndustryType = VerticalId

export type VerticalCategory =
  | 'residential_service'
  | 'b2b'
  | 'creative'
  | 'recurring_service'

// ─── Terminology ──────────────────────────────────────────────────────────────

export interface Terminology {
  deals: string
  deal: string
  pipeline: string
  contacts: string
  contact: string
  tasks: string
  task: string
  reports: string
  closeDate: string
  dealAmount: string
  activity: string
}

// ─── Feature Flags ────────────────────────────────────────────────────────────

export interface FeatureFlags {
  showCompanies: boolean
  showProspector: boolean
  showPlanner: boolean
  showSalesReports: boolean
  showForecast: boolean
  showConversionFunnel: boolean
  showSalesVelocity: boolean
  showEnrichment: boolean
}

// ─── Pipeline Stage ───────────────────────────────────────────────────────────

export interface DefaultPipelineStage {
  name: string
  position: number
  color: string
  is_won?: boolean
  is_lost?: boolean
}

// ─── Task Template ────────────────────────────────────────────────────────────

export interface DefaultTaskTemplate {
  name: string
  description: string
}

// ─── Radar Config (embedded in vertical) ──────────────────────────────────────

export interface RadarSignal {
  id: string
  label: string
  description: string
  color: string
  icon?: string
  defaultOn: boolean
}

export interface RadarPanelField {
  key: string
  label: string
  type: 'text' | 'number' | 'boolean' | 'badge' | 'url'
}

export interface RadarLayerConfig {
  id: string
  label: string
  type: 'fill' | 'circle' | 'heatmap' | 'line'
  color: string
  toggleable: boolean
  defaultVisible: boolean
}

export interface VerticalRadarConfig {
  radarMode: string
  defaultTrade: string | null
  label: string
  description: string
  dataSources: string[]
  maxRadiusMiles: number
  maxResults: number
  signals: RadarSignal[]
  panelFields: RadarPanelField[]
  layers: RadarLayerConfig[]
  scoringFactors: string[]
  leadNoun: string
  leadNounPlural: string
  searchPlaceholder: string
}

// ─── Vertical Definition ──────────────────────────────────────────────────────

export interface VerticalDefinition {
  id: VerticalId
  label: string
  description: string
  category: VerticalCategory
  terminology: Terminology
  features: FeatureFlags
  defaultPipelineStages: DefaultPipelineStage[]
  defaultTaskTemplates: DefaultTaskTemplate[]
  radar: VerticalRadarConfig | null
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED BUILDING BLOCKS
// ═══════════════════════════════════════════════════════════════════════════════

const RESIDENTIAL_SIGNALS: RadarSignal[] = [
  { id: 'age', label: 'Home Age', description: 'Homes in service window for your trade', color: '#35FF7A', icon: 'Home', defaultOn: true },
  { id: 'income', label: 'Income Tier', description: 'Median household income in area', color: '#F59E0B', icon: 'DollarSign', defaultOn: true },
  { id: 'owner', label: 'Owner Occupied', description: 'High homeownership areas', color: '#8B5CF6', icon: 'Key', defaultOn: true },
  { id: 'storm', label: 'Storm', description: 'Recent severe weather events', color: '#FF3B3B', icon: 'CloudLightning', defaultOn: true },
  { id: 'permit', label: 'Permits', description: 'Active building permits nearby', color: '#3B82F6', icon: 'FileText', defaultOn: false },
]

const RESIDENTIAL_PANEL_FIELDS: RadarPanelField[] = [
  { key: 'address', label: 'Address', type: 'text' },
  { key: 'propertyAge', label: 'Area Home Age', type: 'text' },
  { key: 'medianYearBuilt', label: 'Median Year Built', type: 'text' },
  { key: 'medianIncome', label: 'Median Income', type: 'text' },
  { key: 'ownerOccupied', label: 'Owner Occupied', type: 'text' },
  { key: 'stormProximity', label: 'Storm Proximity', type: 'text' },
  { key: 'permitHistory', label: 'Permit Activity', type: 'text' },
  { key: 'distance', label: 'Distance', type: 'number' },
]

const RESIDENTIAL_LAYERS: RadarLayerConfig[] = [
  { id: 'storm-zones', label: 'Storm Zones', type: 'fill', color: '#FF3B3B', toggleable: true, defaultVisible: true },
  { id: 'permit-points', label: 'Permits', type: 'circle', color: '#3B82F6', toggleable: true, defaultVisible: true },
]

const RESIDENTIAL_SCORING_FACTORS = ['Home age', 'Income tier', 'Owner occupancy', 'Storm proximity', 'Permit activity', 'Distance']

function makeResidentialRadar(trade: string, label: string): VerticalRadarConfig {
  return {
    radarMode: 'residential_service',
    defaultTrade: trade,
    label,
    description: 'Home lifecycle intelligence — targeted to your trade',
    dataSources: ['US Census', 'NOAA Storm Data', 'Permit Datasets', 'Google Geocoding'],
    maxRadiusMiles: 30,
    maxResults: 200,
    signals: RESIDENTIAL_SIGNALS,
    panelFields: RESIDENTIAL_PANEL_FIELDS,
    layers: RESIDENTIAL_LAYERS,
    scoringFactors: RESIDENTIAL_SCORING_FACTORS,
    leadNoun: 'property',
    leadNounPlural: 'properties',
    searchPlaceholder: 'Search neighborhoods in this area...',
  }
}

const B2B_SIGNALS: RadarSignal[] = [
  { id: 'low_rating', label: 'Low Rating', description: 'Businesses rated under 3.8', color: '#F59E0B', icon: 'Star', defaultOn: true },
  { id: 'no_website', label: 'No Website', description: 'No web presence detected', color: '#EF4444', icon: 'Globe', defaultOn: true },
  { id: 'low_reviews', label: 'Few Reviews', description: 'Low review count', color: '#8B5CF6', icon: 'MessageSquare', defaultOn: false },
  { id: 'industry_match', label: 'Industry Match', description: 'Matches your target industry', color: '#10B981', icon: 'Target', defaultOn: true },
]

const B2B_PANEL_FIELDS: RadarPanelField[] = [
  { key: 'businessName', label: 'Business', type: 'text' },
  { key: 'rating', label: 'Rating', type: 'number' },
  { key: 'reviewCount', label: 'Reviews', type: 'number' },
  { key: 'website', label: 'Website', type: 'url' },
  { key: 'category', label: 'Category', type: 'text' },
  { key: 'phone', label: 'Phone', type: 'text' },
]

const B2B_RADAR: VerticalRadarConfig = {
  radarMode: 'b2b_service',
  defaultTrade: null,
  label: 'B2B Service',
  description: 'Marketing, IT, Consulting — business prospecting',
  dataSources: ['Google Places API', 'Business Directories', 'Website Signals'],
  maxRadiusMiles: 30,
  maxResults: 200,
  signals: B2B_SIGNALS,
  panelFields: B2B_PANEL_FIELDS,
  layers: [
    { id: 'business-points', label: 'Businesses', type: 'circle', color: '#3B82F6', toggleable: true, defaultVisible: true },
    { id: 'competitor-clusters', label: 'Competitor Clusters', type: 'heatmap', color: '#EF4444', toggleable: true, defaultVisible: false },
  ],
  scoringFactors: ['Rating under threshold', 'Low review count', 'No website', 'Industry match', 'Distance'],
  leadNoun: 'business',
  leadNounPlural: 'businesses',
  searchPlaceholder: 'Search businesses in this area...',
}

const PHOTOGRAPHER_RADAR: VerticalRadarConfig = {
  radarMode: 'photographer',
  defaultTrade: null,
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

const SALES_TERMINOLOGY: Terminology = {
  deals: 'Deals', deal: 'Deal', pipeline: 'Pipeline',
  contacts: 'Contacts', contact: 'Contact',
  tasks: 'Tasks', task: 'Task', reports: 'Reports',
  closeDate: 'Close Date', dealAmount: 'Deal Amount', activity: 'Activity',
}

const DEFAULT_FEATURES: FeatureFlags = {
  showCompanies: true, showProspector: true, showPlanner: true,
  showSalesReports: true, showForecast: true, showConversionFunnel: true, showSalesVelocity: true,
  showEnrichment: true,
}

// ═══════════════════════════════════════════════════════════════════════════════
// VERTICAL DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

const ROOFING: VerticalDefinition = {
  id: 'roofing', label: 'Roofing', description: 'Storm damage, aging roofs, replacement cycles', category: 'residential_service',
  terminology: { ...SALES_TERMINOLOGY, deals: 'Jobs', deal: 'Job', contacts: 'Homeowners', contact: 'Homeowner', closeDate: 'Target Date', dealAmount: 'Job Value' },
  features: { ...DEFAULT_FEATURES, showCompanies: false },
  defaultPipelineStages: [
    { name: 'Lead', position: 1, color: '#94A3B8' }, { name: 'Inspection', position: 2, color: '#3B82F6' },
    { name: 'Estimate Sent', position: 3, color: '#F59E0B' }, { name: 'Contracted', position: 4, color: '#8B5CF6' },
    { name: 'In Progress', position: 5, color: '#06B6D4' }, { name: 'Completed', position: 6, color: '#10B981', is_won: true },
    { name: 'Paid', position: 7, color: '#059669', is_won: true }, { name: 'Lost', position: 8, color: '#EF4444', is_lost: true },
  ],
  defaultTaskTemplates: [
    { name: 'Schedule inspection', description: 'Set up on-site roof inspection with homeowner' },
    { name: 'Prepare estimate', description: 'Measure, document damage, and create estimate' },
    { name: 'Send estimate', description: 'Send estimate to homeowner for review' },
    { name: 'Follow up on estimate', description: 'Check if homeowner reviewed the estimate' },
    { name: 'Order materials', description: 'Order materials once contract is signed' },
    { name: 'Schedule crew', description: 'Assign crew and schedule the job' },
    { name: 'Send invoice', description: 'Send final invoice after job completion' },
  ],
  radar: makeResidentialRadar('roofing', 'Roofing'),
}

const SOLAR: VerticalDefinition = {
  id: 'solar', label: 'Solar', description: 'Panel installation, energy savings, incentives', category: 'residential_service',
  terminology: { ...SALES_TERMINOLOGY, deals: 'Projects', deal: 'Project', contacts: 'Homeowners', contact: 'Homeowner', closeDate: 'Install Date', dealAmount: 'Project Value' },
  features: { ...DEFAULT_FEATURES, showCompanies: false },
  defaultPipelineStages: [
    { name: 'Lead', position: 1, color: '#94A3B8' }, { name: 'Site Survey', position: 2, color: '#3B82F6' },
    { name: 'Proposal', position: 3, color: '#F59E0B' }, { name: 'Contract Signed', position: 4, color: '#8B5CF6' },
    { name: 'Permitting', position: 5, color: '#06B6D4' }, { name: 'Installation', position: 6, color: '#EC4899' },
    { name: 'Inspection', position: 7, color: '#10B981' }, { name: 'Completed', position: 8, color: '#059669', is_won: true },
    { name: 'Lost', position: 9, color: '#EF4444', is_lost: true },
  ],
  defaultTaskTemplates: [
    { name: 'Schedule site survey', description: 'Book site assessment and roof measurement' },
    { name: 'Run design proposal', description: 'Create system design and savings estimate' },
    { name: 'Send proposal', description: 'Present proposal and financing options' },
    { name: 'Submit permit application', description: 'File permits with local municipality' },
    { name: 'Schedule installation', description: 'Coordinate crew and equipment' },
    { name: 'Schedule final inspection', description: 'Book city/utility inspection' },
  ],
  radar: makeResidentialRadar('solar', 'Solar'),
}

const HVAC: VerticalDefinition = {
  id: 'hvac', label: 'HVAC', description: 'System replacements, efficiency upgrades, seasonal maintenance', category: 'residential_service',
  terminology: { ...SALES_TERMINOLOGY, deals: 'Jobs', deal: 'Job', contacts: 'Homeowners', contact: 'Homeowner', closeDate: 'Service Date', dealAmount: 'Job Value' },
  features: { ...DEFAULT_FEATURES, showCompanies: false },
  defaultPipelineStages: [
    { name: 'Lead', position: 1, color: '#94A3B8' }, { name: 'Diagnostic', position: 2, color: '#3B82F6' },
    { name: 'Quote Sent', position: 3, color: '#F59E0B' }, { name: 'Approved', position: 4, color: '#8B5CF6' },
    { name: 'Scheduled', position: 5, color: '#06B6D4' }, { name: 'Completed', position: 6, color: '#10B981', is_won: true },
    { name: 'Paid', position: 7, color: '#059669', is_won: true }, { name: 'Lost', position: 8, color: '#EF4444', is_lost: true },
  ],
  defaultTaskTemplates: [
    { name: 'Schedule diagnostic', description: 'Book on-site system evaluation' },
    { name: 'Prepare quote', description: 'Document findings and create repair/replacement quote' },
    { name: 'Follow up on quote', description: 'Check if homeowner reviewed the quote' },
    { name: 'Order equipment', description: 'Order parts or new system' },
    { name: 'Schedule install/repair', description: 'Assign technician and schedule work' },
    { name: 'Send invoice', description: 'Send final invoice after completion' },
  ],
  radar: makeResidentialRadar('hvac', 'HVAC'),
}

const REMODELING: VerticalDefinition = {
  id: 'remodeling', label: 'Remodeling', description: 'Kitchen, bath, whole-home renovations', category: 'residential_service',
  terminology: { ...SALES_TERMINOLOGY, deals: 'Projects', deal: 'Project', contacts: 'Homeowners', contact: 'Homeowner', closeDate: 'Target Date', dealAmount: 'Project Value' },
  features: { ...DEFAULT_FEATURES, showCompanies: false },
  defaultPipelineStages: [
    { name: 'Lead', position: 1, color: '#94A3B8' }, { name: 'Consultation', position: 2, color: '#3B82F6' },
    { name: 'Design', position: 3, color: '#F59E0B' }, { name: 'Proposal', position: 4, color: '#8B5CF6' },
    { name: 'Contracted', position: 5, color: '#06B6D4' }, { name: 'In Progress', position: 6, color: '#EC4899' },
    { name: 'Completed', position: 7, color: '#10B981', is_won: true }, { name: 'Lost', position: 8, color: '#EF4444', is_lost: true },
  ],
  defaultTaskTemplates: [
    { name: 'Schedule consultation', description: 'Meet homeowner to discuss vision and scope' },
    { name: 'Create design plan', description: 'Draft layout, materials, and design selections' },
    { name: 'Prepare proposal', description: 'Finalize scope, timeline, and pricing' },
    { name: 'Order materials', description: 'Order all materials and finishes' },
    { name: 'Schedule crew', description: 'Coordinate subcontractors and schedule' },
    { name: 'Final walkthrough', description: 'Walk through completed work with homeowner' },
  ],
  radar: makeResidentialRadar('remodeling', 'Remodeling'),
}

const PLUMBING: VerticalDefinition = {
  id: 'plumbing', label: 'Plumbing & Electrical', description: 'Aging infrastructure, code upgrades, emergency service', category: 'residential_service',
  terminology: { ...SALES_TERMINOLOGY, deals: 'Jobs', deal: 'Job', contacts: 'Homeowners', contact: 'Homeowner', closeDate: 'Service Date', dealAmount: 'Job Value' },
  features: { ...DEFAULT_FEATURES, showCompanies: false },
  defaultPipelineStages: [
    { name: 'Lead', position: 1, color: '#94A3B8' }, { name: 'Diagnostic', position: 2, color: '#3B82F6' },
    { name: 'Quote Sent', position: 3, color: '#F59E0B' }, { name: 'Approved', position: 4, color: '#8B5CF6' },
    { name: 'Scheduled', position: 5, color: '#06B6D4' }, { name: 'Completed', position: 6, color: '#10B981', is_won: true },
    { name: 'Paid', position: 7, color: '#059669', is_won: true }, { name: 'Lost', position: 8, color: '#EF4444', is_lost: true },
  ],
  defaultTaskTemplates: [
    { name: 'Schedule diagnostic', description: 'Book on-site evaluation' },
    { name: 'Prepare quote', description: 'Document issue and create repair/upgrade quote' },
    { name: 'Follow up on quote', description: 'Check if customer reviewed the quote' },
    { name: 'Order parts', description: 'Order necessary parts and materials' },
    { name: 'Schedule work', description: 'Assign technician and confirm time' },
    { name: 'Send invoice', description: 'Send final invoice after completion' },
  ],
  radar: makeResidentialRadar('plumbing_electrical', 'Plumbing & Electrical'),
}

const GENERAL_CONTRACTOR: VerticalDefinition = {
  id: 'general_contractor', label: 'General Contractor', description: 'Balanced scoring across all home service needs', category: 'residential_service',
  terminology: { ...SALES_TERMINOLOGY, deals: 'Jobs', deal: 'Job', contacts: 'Homeowners', contact: 'Homeowner', closeDate: 'Target Date', dealAmount: 'Job Value' },
  features: { ...DEFAULT_FEATURES, showCompanies: false },
  defaultPipelineStages: [
    { name: 'Lead', position: 1, color: '#94A3B8' }, { name: 'Site Visit', position: 2, color: '#3B82F6' },
    { name: 'Estimate Sent', position: 3, color: '#F59E0B' }, { name: 'Contracted', position: 4, color: '#8B5CF6' },
    { name: 'In Progress', position: 5, color: '#06B6D4' }, { name: 'Completed', position: 6, color: '#10B981', is_won: true },
    { name: 'Paid', position: 7, color: '#059669', is_won: true }, { name: 'Lost', position: 8, color: '#EF4444', is_lost: true },
  ],
  defaultTaskTemplates: [
    { name: 'Schedule site visit', description: 'Visit property to assess scope of work' },
    { name: 'Prepare estimate', description: 'Create detailed estimate with materials and labor' },
    { name: 'Follow up on estimate', description: 'Check if customer reviewed the estimate' },
    { name: 'Order materials', description: 'Order all materials for the job' },
    { name: 'Schedule crew', description: 'Assign crew and schedule work dates' },
    { name: 'Final walkthrough', description: 'Walk through completed work with homeowner' },
    { name: 'Send invoice', description: 'Send final invoice after completion' },
  ],
  radar: makeResidentialRadar('general', 'General Contractor'),
}

const DEFAULT_SALES: VerticalDefinition = {
  id: 'default', label: 'Sales / Business Development', description: 'Standard sales CRM for B2B and general business', category: 'b2b',
  terminology: SALES_TERMINOLOGY,
  features: DEFAULT_FEATURES,
  defaultPipelineStages: [
    { name: 'Prospect', position: 1, color: '#94A3B8' }, { name: 'Qualified', position: 2, color: '#3B82F6' },
    { name: 'Proposal', position: 3, color: '#F59E0B' }, { name: 'Negotiation', position: 4, color: '#EC4899' },
    { name: 'Won', position: 5, color: '#10B981', is_won: true }, { name: 'Lost', position: 6, color: '#EF4444', is_lost: true },
  ],
  defaultTaskTemplates: [
    { name: 'Qualify lead', description: 'Research and qualify the prospect' },
    { name: 'Send proposal', description: 'Prepare and send proposal document' },
    { name: 'Follow up', description: 'Follow up on proposal or last contact' },
    { name: 'Schedule demo', description: 'Schedule product demo or meeting' },
    { name: 'Negotiate terms', description: 'Review and negotiate deal terms' },
    { name: 'Close deal', description: 'Finalize and close the deal' },
  ],
  radar: B2B_RADAR,
}

const PHOTOGRAPHER: VerticalDefinition = {
  id: 'photographer', label: 'Photographer', description: 'Photography booking and project management', category: 'creative',
  terminology: {
    deals: 'Bookings', deal: 'Booking', pipeline: 'Booking Flow',
    contacts: 'Clients', contact: 'Client', tasks: 'To-Dos', task: 'To-Do',
    reports: 'Insights', closeDate: 'Event Date', dealAmount: 'Package Price', activity: 'Activity',
  },
  features: { ...DEFAULT_FEATURES, showCompanies: false, showEnrichment: false },
  defaultPipelineStages: [
    { name: 'Inquiry', position: 1, color: '#94A3B8' }, { name: 'Booked', position: 2, color: '#3B82F6' },
    { name: 'Shoot Complete', position: 3, color: '#F59E0B' }, { name: 'Editing', position: 4, color: '#8B5CF6' },
    { name: 'Delivered', position: 5, color: '#10B981', is_won: true }, { name: 'Paid', position: 6, color: '#06B6D4', is_won: true },
    { name: 'Declined', position: 7, color: '#EF4444', is_lost: true }, { name: 'Cancelled', position: 8, color: '#F87171', is_lost: true },
  ],
  defaultTaskTemplates: [
    { name: 'Send questionnaire', description: 'Send client questionnaire to gather shoot details' },
    { name: 'Confirm booking details', description: 'Confirm date, time, location, and package' },
    { name: 'Prepare for shoot', description: 'Charge gear, scout location, plan shot list' },
    { name: 'Edit & cull photos', description: 'Cull selects and edit final gallery' },
    { name: 'Deliver gallery', description: 'Upload and deliver final gallery to client' },
    { name: 'Send invoice', description: 'Send final invoice and follow up on payment' },
  ],
  radar: PHOTOGRAPHER_RADAR,
}

const BARBERSHOP: VerticalDefinition = {
  id: 'barbershop', label: 'Barbershop / Salon', description: 'Appointments, repeat clients, retention tracking', category: 'recurring_service',
  terminology: {
    deals: 'Appointments', deal: 'Appointment', pipeline: 'Client Flow',
    contacts: 'Clients', contact: 'Client', tasks: 'Tasks', task: 'Task',
    reports: 'Reports', closeDate: 'Appointment Date', dealAmount: 'Service Price', activity: 'Activity',
  },
  features: { ...DEFAULT_FEATURES, showCompanies: false, showProspector: false, showEnrichment: false },
  defaultPipelineStages: [
    { name: 'Inquiry', position: 1, color: '#94A3B8' }, { name: 'Booked', position: 2, color: '#3B82F6' },
    { name: 'Completed', position: 3, color: '#10B981', is_won: true }, { name: 'Repeat Client', position: 4, color: '#8B5CF6', is_won: true },
    { name: 'No Show', position: 5, color: '#EF4444', is_lost: true }, { name: 'Cancelled', position: 6, color: '#F87171', is_lost: true },
  ],
  defaultTaskTemplates: [
    { name: 'Confirm appointment', description: 'Send confirmation reminder to client' },
    { name: 'Follow up after visit', description: 'Check in and ask for review' },
    { name: 'Send rebooking reminder', description: 'Remind client to schedule their next visit' },
  ],
  radar: null,
}

const SERVICE_PROFESSIONAL: VerticalDefinition = {
  id: 'service_professional', label: 'Consultant / Freelancer', description: 'Client projects, proposals, and deliverables', category: 'recurring_service',
  terminology: {
    deals: 'Projects', deal: 'Project', pipeline: 'Pipeline',
    contacts: 'Clients', contact: 'Client', tasks: 'Tasks', task: 'Task',
    reports: 'Reports', closeDate: 'Due Date', dealAmount: 'Project Value', activity: 'Activity',
  },
  features: { ...DEFAULT_FEATURES, showCompanies: true, showProspector: false },
  defaultPipelineStages: [
    { name: 'Inquiry', position: 1, color: '#94A3B8' }, { name: 'Discovery', position: 2, color: '#3B82F6' },
    { name: 'Proposal', position: 3, color: '#F59E0B' }, { name: 'Confirmed', position: 4, color: '#8B5CF6' },
    { name: 'In Progress', position: 5, color: '#06B6D4' }, { name: 'Review', position: 6, color: '#EC4899' },
    { name: 'Delivered', position: 7, color: '#10B981', is_won: true }, { name: 'Paid', position: 8, color: '#059669', is_won: true },
    { name: 'Declined', position: 9, color: '#EF4444', is_lost: true },
  ],
  defaultTaskTemplates: [
    { name: 'Schedule discovery call', description: 'Understand client needs and scope' },
    { name: 'Send proposal', description: 'Prepare and send project proposal' },
    { name: 'Send contract', description: 'Draft and send contract for signing' },
    { name: 'Kick off project', description: 'Schedule kickoff and share project plan' },
    { name: 'Deliver final work', description: 'Send deliverables and collect feedback' },
    { name: 'Send invoice', description: 'Send final invoice and follow up on payment' },
  ],
  radar: null,
}

// ═══════════════════════════════════════════════════════════════════════════════
// REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

export const VERTICALS: Record<VerticalId, VerticalDefinition> = {
  roofing: ROOFING, solar: SOLAR, hvac: HVAC, remodeling: REMODELING,
  plumbing: PLUMBING, general_contractor: GENERAL_CONTRACTOR,
  default: DEFAULT_SALES, photographer: PHOTOGRAPHER,
  barbershop: BARBERSHOP, service_professional: SERVICE_PROFESSIONAL,
}

export const VERTICAL_IDS = Object.keys(VERTICALS) as VerticalId[]

export const VERTICALS_BY_CATEGORY: Record<VerticalCategory, VerticalDefinition[]> = {
  residential_service: [ROOFING, SOLAR, HVAC, REMODELING, PLUMBING, GENERAL_CONTRACTOR],
  b2b: [DEFAULT_SALES],
  creative: [PHOTOGRAPHER],
  recurring_service: [BARBERSHOP, SERVICE_PROFESSIONAL],
}

export const CATEGORY_LABELS: Record<VerticalCategory, string> = {
  residential_service: 'Home Services',
  b2b: 'Business Services',
  creative: 'Creative',
  recurring_service: 'Recurring Services',
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACCESSOR FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export function getVertical(id: string | null | undefined): VerticalDefinition {
  if (id && id in VERTICALS) return VERTICALS[id as VerticalId]
  return VERTICALS.default
}

export function getTerminology(id: string | null | undefined): Terminology {
  return getVertical(id).terminology
}

export function getFeatures(id: string | null | undefined): FeatureFlags {
  return getVertical(id).features
}

export function getVerticalRadarConfig(id: string | null | undefined): VerticalRadarConfig | null {
  return getVertical(id).radar
}

export function isValidVertical(id: string): boolean {
  return id in VERTICALS
}

export function getVerticalCategory(id: string | null | undefined): VerticalCategory {
  return getVertical(id).category
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROSPECTOR CONFIG (org-level overrides saved in settings)
// ═══════════════════════════════════════════════════════════════════════════════

export interface ProspectorConfig {
  radar_mode: string
  trade: string | null
  default_radius_miles: number
  default_signals: Record<string, boolean>
}

export const RADAR_MODES = [
  { id: 'residential_service', label: 'Residential Service', description: 'Census-powered home lifecycle intelligence' },
  { id: 'b2b_service', label: 'B2B Service', description: 'Business prospecting via Google Places' },
  { id: 'commercial_service', label: 'Commercial Service', description: 'Commercial property prospecting' },
  { id: 'retail', label: 'Retail', description: 'Retail location intelligence' },
  { id: 'photographer', label: 'Photographer', description: 'Location scouting by niche' },
] as const

export type RadarModeId = typeof RADAR_MODES[number]['id']

export function getEffectiveProspectorConfig(
  verticalId: string | null | undefined,
  orgProspectorConfig: ProspectorConfig | null | undefined,
  orgProspectorEnabled: boolean | null | undefined,
): { enabled: boolean; config: ProspectorConfig | null } {
  const vertical = getVertical(verticalId)
  const verticalDefault = vertical.features.showProspector
  const enabled = orgProspectorEnabled !== null && orgProspectorEnabled !== undefined
    ? orgProspectorEnabled
    : verticalDefault

  if (!enabled) return { enabled: false, config: null }

  if (orgProspectorConfig) return { enabled: true, config: orgProspectorConfig }

  if (vertical.radar) {
    return {
      enabled: true,
      config: {
        radar_mode: vertical.radar.radarMode,
        trade: vertical.radar.defaultTrade,
        default_radius_miles: vertical.radar.maxRadiusMiles,
        default_signals: Object.fromEntries(vertical.radar.signals.map(s => [s.id, s.defaultOn])),
      },
    }
  }

  // Vertical has no radar but admin manually enabled — use b2b fallback
  return {
    enabled: true,
    config: {
      radar_mode: 'b2b_service',
      trade: null,
      default_radius_miles: B2B_RADAR.maxRadiusMiles,
      default_signals: Object.fromEntries(B2B_SIGNALS.map(s => [s.id, s.defaultOn])),
    },
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// UI HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Verticals grouped by category with labels — used by signup and settings pickers.
 * Shape: { [categoryId]: { label, verticals: VerticalId[] } }
 */
export const VERTICAL_CATEGORIES: Record<string, { label: string; verticals: VerticalId[] }> = {
  residential_service: {
    label: 'Home Services',
    verticals: ['roofing', 'solar', 'hvac', 'remodeling', 'plumbing', 'general_contractor'],
  },
  b2b: {
    label: 'Business Services',
    verticals: ['default'],
  },
  creative: {
    label: 'Creative',
    verticals: ['photographer'],
  },
  recurring_service: {
    label: 'Recurring Services',
    verticals: ['barbershop', 'service_professional'],
  },
}

/** Alias for RADAR_MODES — used by settings page */
export const PROSPECTOR_MODES = RADAR_MODES

// ═══════════════════════════════════════════════════════════════════════════════
// BACKWARD COMPATIBILITY
// ═══════════════════════════════════════════════════════════════════════════════

/** @deprecated Use VERTICALS instead */
export const INDUSTRY_CONFIGS = VERTICALS
/** @deprecated Use getVertical instead */
export function getIndustryConfig(id: string | null | undefined): VerticalDefinition { return getVertical(id) }
/** @deprecated Use getFeatures instead */
export function getIndustryFeatures(id: string | null | undefined): FeatureFlags { return getFeatures(id) }
