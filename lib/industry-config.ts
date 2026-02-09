/**
 * Industry Type Configuration
 * Defines terminology and defaults for different Cadence vertical implementations
 */

export type IndustryType = 'default' | 'photographer'

export interface IndustryConfig {
  id: IndustryType
  label: string
  description: string
  terminology: {
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
  features: {
    showCompanies: boolean
    showSalesReports: boolean
    showForecast: boolean
    showConversionFunnel: boolean
    showSalesVelocity: boolean
  }
  defaultPipelineStages: Array<{
    name: string
    position: number
    color: string
    is_won?: boolean
    is_lost?: boolean
  }>
}

export const INDUSTRY_CONFIGS: Record<IndustryType, IndustryConfig> = {
  default: {
    id: 'default',
    label: 'Default (Sales)',
    description: 'Standard sales CRM workflow',
    terminology: {
      deals: 'Deals',
      deal: 'Deal',
      pipeline: 'Pipeline',
      contacts: 'Contacts',
      contact: 'Contact',
      tasks: 'Tasks',
      task: 'Task',
      reports: 'Reports',
      closeDate: 'Close Date',
      dealAmount: 'Deal Amount',
      activity: 'Activity',
    },
    features: {
      showCompanies: true,
      showSalesReports: true,
      showForecast: true,
      showConversionFunnel: true,
      showSalesVelocity: true,
    },
    defaultPipelineStages: [
      { name: 'Prospect', position: 1, color: '#94A3B8' },
      { name: 'Qualified', position: 2, color: '#3B82F6' },
      { name: 'Proposal', position: 3, color: '#F59E0B' },
      { name: 'Negotiation', position: 4, color: '#EC4899' },
      { name: 'Won', position: 5, color: '#10B981', is_won: true },
      { name: 'Lost', position: 6, color: '#EF4444', is_lost: true },
    ],
  },
  photographer: {
    id: 'photographer',
    label: 'Photographer',
    description: 'Photography booking and project management',
    terminology: {
      deals: 'Bookings',
      deal: 'Booking',
      pipeline: 'Booking Flow',
      contacts: 'Clients',
      contact: 'Client',
      tasks: 'To-Dos',
      task: 'To-Do',
      reports: 'Insights',
      closeDate: 'Event Date',
      dealAmount: 'Package Price',
      activity: 'Activity',
    },
    features: {
      showCompanies: false,
      showSalesReports: false,
      showForecast: false,
      showConversionFunnel: false,
      showSalesVelocity: false,
    },
    defaultPipelineStages: [
      { name: 'Inquiry', position: 1, color: '#94A3B8' },
      { name: 'Booked', position: 2, color: '#3B82F6' },
      { name: 'Shoot Complete', position: 3, color: '#F59E0B' },
      { name: 'Editing', position: 4, color: '#8B5CF6' },
      { name: 'Delivered', position: 5, color: '#10B981', is_won: true },
      { name: 'Paid', position: 6, color: '#06B6D4', is_won: true },
      { name: 'Declined', position: 7, color: '#EF4444', is_lost: true },
      { name: 'Cancelled', position: 8, color: '#F87171', is_lost: true },
    ],
  },
}

/**
 * Get industry config by type
 */
export function getIndustryConfig(industryType: IndustryType | null): IndustryConfig {
  if (!industryType || !INDUSTRY_CONFIGS[industryType]) {
    return INDUSTRY_CONFIGS.default
  }
  return INDUSTRY_CONFIGS[industryType]
}

/**
 * Get terminology for a specific industry
 */
export function getTerminology(industryType: IndustryType | null) {
  return getIndustryConfig(industryType).terminology
}

/**
 * Get features enabled for an industry
 */
export function getIndustryFeatures(industryType: IndustryType | null) {
  return getIndustryConfig(industryType).features
}

/**
 * Check if a report type is available for this industry
 */
export function isReportAvailable(industryType: IndustryType | null, reportType: 'forecast' | 'funnel' | 'velocity' | 'sales'): boolean {
  const features = getIndustryFeatures(industryType)
  switch (reportType) {
    case 'forecast':
      return features.showForecast
    case 'funnel':
      return features.showConversionFunnel
    case 'velocity':
      return features.showSalesVelocity
    case 'sales':
      return features.showSalesReports
    default:
      return true
  }
}
