import { PlanType } from './plans'

// =====================================================
// FREE TIER CAPACITY LIMITS
// =====================================================
// Core UX Rule: Never block finishing work. Only block starting more.
// Users can always view, complete, and close existing items.
// Limits only apply when creating NEW objects.
// =====================================================

export const FREE_TIER_LIMITS = {
  contacts: 25,
  activeDeals: 10, // Deals NOT in Closed/Paid/Declined status
  companies: 5,
  intakeForms: 1,
  monthlySubmissions: 25,
  historyDays: 30, // Days of visible activity history
  customAutomations: 1, // User-created automations (presets don't count)
} as const

// Statuses that count as "closed" (not active) — case-insensitive
export const CLOSED_DEAL_STATUSES = [
  'closed won',
  'closed lost',
  'paid',
  'declined',
  'completed',
  'cancelled',
  'canceled',
]

/**
 * Check if a plan is free tier (solo)
 */
export function isFreeTier(plan: PlanType | string | null | undefined): boolean {
  return !plan || plan === 'solo'
}

/**
 * Get the limit for a given resource type.
 * Returns null if no limit applies (paid plans).
 */
export function getResourceLimit(
  plan: PlanType | string | null | undefined,
  resource: keyof typeof FREE_TIER_LIMITS
): number | null {
  if (!isFreeTier(plan)) return null
  return FREE_TIER_LIMITS[resource]
}

/**
 * Check if a resource count has reached the free tier limit.
 * Returns { atLimit, current, max, remaining } for UI display.
 */
export function checkLimit(
  plan: PlanType | string | null | undefined,
  resource: keyof typeof FREE_TIER_LIMITS,
  currentCount: number
): {
  atLimit: boolean
  current: number
  max: number | null
  remaining: number | null
  isFreeTier: boolean
} {
  const free = isFreeTier(plan)
  if (!free) {
    return { atLimit: false, current: currentCount, max: null, remaining: null, isFreeTier: false }
  }

  const max = FREE_TIER_LIMITS[resource]
  const remaining = Math.max(0, max - currentCount)

  return {
    atLimit: currentCount >= max,
    current: currentCount,
    max,
    remaining,
    isFreeTier: true,
  }
}

/**
 * Friendly messages for each limit type
 */
export const LIMIT_MESSAGES: Record<keyof typeof FREE_TIER_LIMITS, {
  title: string
  description: string
  upgradeText: string
}> = {
  contacts: {
    title: 'Contact limit reached',
    description: `You've reached the free plan limit of ${FREE_TIER_LIMITS.contacts} contacts. Your existing contacts are fully usable — upgrade to add more.`,
    upgradeText: 'Upgrade for unlimited contacts',
  },
  activeDeals: {
    title: 'Active deal limit reached',
    description: `You have ${FREE_TIER_LIMITS.activeDeals} active deals, the maximum on the free plan. You can still close or complete existing deals — upgrade to create more.`,
    upgradeText: 'Upgrade for unlimited deals',
  },
  companies: {
    title: 'Company limit reached',
    description: `You've reached the free plan limit of ${FREE_TIER_LIMITS.companies} companies. Your existing companies are fully usable — upgrade to add more.`,
    upgradeText: 'Upgrade for unlimited companies',
  },
  intakeForms: {
    title: 'Form limit reached',
    description: `The free plan includes ${FREE_TIER_LIMITS.intakeForms} lead intake form. Upgrade to create additional forms.`,
    upgradeText: 'Upgrade for more forms',
  },
  monthlySubmissions: {
    title: 'Monthly submission limit reached',
    description: `You've received ${FREE_TIER_LIMITS.monthlySubmissions} form submissions this month, the maximum on the free plan. Upgrade to accept unlimited submissions.`,
    upgradeText: 'Upgrade for unlimited submissions',
  },
  historyDays: {
    title: 'History limited to 30 days',
    description: 'Your full history is safely stored. Upgrade to view all past activity and unlock reporting trends.',
    upgradeText: 'Upgrade for full history',
  },
  customAutomations: {
    title: 'Custom automation limit reached',
    description: `The free plan includes ${FREE_TIER_LIMITS.customAutomations} custom automation. Presets are always available — upgrade to create more custom automations.`,
    upgradeText: 'Upgrade for more automations',
  },
}
