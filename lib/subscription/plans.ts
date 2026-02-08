// Plan configuration with user limits
export const PLAN_LIMITS = {
  solo: {
    maxUsers: 1,
    name: 'Solo',
    price: 0,
  },
  starter: {
    maxUsers: 3,
    name: 'Starter',
    price: 29,
  },
  team: {
    maxUsers: 8,
    name: 'Team',
    price: 59,
  },
  growth: {
    maxUsers: 12, // Base limit, can add more for $10/user
    additionalUserPrice: 10,
    name: 'Growth',
    price: 99,
  },
} as const

export type PlanType = keyof typeof PLAN_LIMITS

// Stripe Price IDs
export const PRICE_IDS = {
  starter: {
    monthly: 'price_1SyLsH4K55W1qqBCyNoE84Qi',
    annual: 'price_1SyLvi4K55W1qqBCNLInlqAA',
  },
  team: {
    monthly: 'price_1SyLtO4K55W1qqBCJLAjrf92',
    annual: 'price_1SyLwV4K55W1qqBCgqhObR5z',
  },
  growth: {
    monthly: 'price_1SyLuQ4K55W1qqBCA7wh4GUm',
    annual: 'price_1SyLxU4K55W1qqBCVLFsgYSR',
  },
} as const

// Map Stripe price IDs to plan names
export const PRICE_TO_PLAN: Record<string, PlanType> = {
  // Starter
  'price_1SyLsH4K55W1qqBCyNoE84Qi': 'starter',
  'price_1SyLvi4K55W1qqBCNLInlqAA': 'starter',
  // Team
  'price_1SyLtO4K55W1qqBCJLAjrf92': 'team',
  'price_1SyLwV4K55W1qqBCgqhObR5z': 'team',
  // Growth
  'price_1SyLuQ4K55W1qqBCA7wh4GUm': 'growth',
  'price_1SyLxU4K55W1qqBCVLFsgYSR': 'growth',
}

/**
 * Check if an organization can add more users based on their plan
 */
export function canAddMoreUsers(
  plan: PlanType,
  currentUserCount: number,
  additionalSeats: number = 0
): { allowed: boolean; reason?: string; maxUsers: number } {
  const planConfig = PLAN_LIMITS[plan]
  
  // For growth plan, check if they have additional seats purchased
  let maxUsers = planConfig.maxUsers
  if (plan === 'growth' && additionalSeats > 0) {
    maxUsers += additionalSeats
  }

  if (currentUserCount >= maxUsers) {
    if (plan === 'solo') {
      return {
        allowed: false,
        reason: 'Solo plan is limited to 1 user. Upgrade to add team members.',
        maxUsers,
      }
    }
    
    if (plan === 'growth') {
      return {
        allowed: false,
        reason: `You've reached your user limit (${maxUsers}). Contact support to add more seats at $10/user/month.`,
        maxUsers,
      }
    }
    
    return {
      allowed: false,
      reason: `${planConfig.name} plan is limited to ${maxUsers} users. Upgrade to add more team members.`,
      maxUsers,
    }
  }

  return {
    allowed: true,
    maxUsers,
  }
}

/**
 * Get the upgrade path for a plan
 */
export function getUpgradePath(currentPlan: PlanType): PlanType | null {
  const upgradePaths: Record<PlanType, PlanType | null> = {
    solo: 'starter',
    starter: 'team',
    team: 'growth',
    growth: null, // Already at highest plan
  }
  return upgradePaths[currentPlan]
}

/**
 * Get remaining seats for an organization
 */
export function getRemainingSeats(
  plan: PlanType,
  currentUserCount: number,
  additionalSeats: number = 0
): number {
  const maxUsers = plan === 'growth' 
    ? PLAN_LIMITS.growth.maxUsers + additionalSeats 
    : PLAN_LIMITS[plan].maxUsers
  
  return Math.max(0, maxUsers - currentUserCount)
}
