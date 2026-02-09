/**
 * Automation Preset Registry
 * 
 * Presets are code-defined templates that get seeded into the `automations` table
 * on org creation. They can be toggled on/off but not deleted by users.
 * 
 * The automation engine checks the `automations` table before running any trigger.
 * If a matching automation is found with is_active = true, the actions execute.
 */

import { IndustryType } from '@/lib/industry-config'

// ============================================
// TYPES
// ============================================

export interface AutomationAction {
  type: 'create_task' | 'create_multiple_tasks'
  config: {
    title_template: string
    description_template?: string
    due_days: number
    due_hours?: number
    priority: 'low' | 'normal' | 'high'
  }
}

export interface AutomationPreset {
  /** Unique string ID used to identify this preset across code and DB */
  preset_id: string
  name: string
  /** Plain-language explanation of why this automation exists */
  description: string
  trigger_type: string
  trigger_config: Record<string, any>
  actions: AutomationAction[]
  /** Which industry types this preset applies to */
  target: 'all' | IndustryType
  /** Whether this preset is enabled by default when seeded */
  default_enabled: boolean
  /** Display metadata for the automations page */
  display: {
    icon: string       // Lucide icon name
    color: string      // Tailwind text color
    bg_color: string   // Tailwind bg color
  }
}

// ============================================
// GLOBAL PRESETS (all industries)
// ============================================

const GLOBAL_PRESETS: AutomationPreset[] = [
  {
    preset_id: 'contact_first_touch',
    name: 'First Touch Task',
    description: 'Ensures every new contact gets a timely response to build momentum',
    trigger_type: 'contact_created',
    trigger_config: {},
    actions: [
      {
        type: 'create_task',
        config: {
          title_template: 'Reach out to {{contactName}}',
          description_template: 'New contact created. Send intro message and confirm next steps.',
          due_days: 1,
          priority: 'high'
        }
      }
    ],
    target: 'all',
    default_enabled: true,
    display: {
      icon: 'UserPlus',
      color: 'text-blue-600',
      bg_color: 'bg-blue-100'
    }
  },
  {
    preset_id: 'deal_created_qualify',
    name: 'Qualify New Deal',
    description: 'Creates a checklist task so new deals get properly qualified upfront',
    trigger_type: 'deal_created',
    trigger_config: {},
    actions: [
      {
        type: 'create_task',
        config: {
          title_template: 'Qualify deal: {{dealName}}',
          description_template: '• Confirm decision maker\n• Confirm timeline\n• Confirm budget\n• Set expected close date\n• Log initial notes',
          due_days: 1,
          priority: 'high'
        }
      }
    ],
    target: 'all',
    default_enabled: true,
    display: {
      icon: 'Handshake',
      color: 'text-pink-600',
      bg_color: 'bg-pink-100'
    }
  },
  {
    preset_id: 'deal_stage_proposal',
    name: 'Proposal Follow-up',
    description: 'Makes sure proposals never go cold by scheduling a follow-up',
    trigger_type: 'deal_stage_changed',
    trigger_config: { to_stage_contains: 'proposal' },
    actions: [
      {
        type: 'create_task',
        config: {
          title_template: 'Follow up on proposal: {{dealName}}',
          description_template: 'Ask if they had a chance to review the proposal. Address any questions. Offer a quick call to discuss.',
          due_days: 2,
          priority: 'high'
        }
      }
    ],
    target: 'all',
    default_enabled: true,
    display: {
      icon: 'TrendingUp',
      color: 'text-yellow-600',
      bg_color: 'bg-yellow-100'
    }
  },
  {
    preset_id: 'deal_stage_negotiation',
    name: 'Negotiation Follow-up',
    description: 'Keeps negotiations moving by addressing blockers early',
    trigger_type: 'deal_stage_changed',
    trigger_config: { to_stage_contains: 'negotiation' },
    actions: [
      {
        type: 'create_task',
        config: {
          title_template: 'Resolve blockers: {{dealName}}',
          description_template: 'Identify and address any remaining concerns or objections. Confirm decision timeline.',
          due_days: 2,
          priority: 'high'
        }
      }
    ],
    target: 'all',
    default_enabled: true,
    display: {
      icon: 'TrendingUp',
      color: 'text-purple-600',
      bg_color: 'bg-purple-100'
    }
  },
  {
    preset_id: 'deal_won_onboarding',
    name: 'Deal Won Onboarding',
    description: 'Kicks off client onboarding automatically so nothing slips after closing',
    trigger_type: 'deal_stage_changed',
    trigger_config: { is_won: true },
    actions: [
      {
        type: 'create_task',
        config: {
          title_template: 'Send welcome email: {{dealName}}',
          description_template: 'Send welcome/congratulations email to the client with next steps.',
          due_days: 0,
          priority: 'high'
        }
      },
      {
        type: 'create_task',
        config: {
          title_template: 'Confirm billing & contract: {{dealName}}',
          description_template: 'Verify contract is signed and billing/payment details are in order.',
          due_days: 1,
          priority: 'high'
        }
      },
      {
        type: 'create_task',
        config: {
          title_template: 'Collect requirements: {{dealName}}',
          description_template: 'Gather all necessary information and requirements from the client.',
          due_days: 2,
          priority: 'normal'
        }
      },
      {
        type: 'create_task',
        config: {
          title_template: 'Schedule kickoff call: {{dealName}}',
          description_template: 'Schedule and prepare for the project kickoff meeting.',
          due_days: 2,
          priority: 'high'
        }
      },
      {
        type: 'create_task',
        config: {
          title_template: 'Create project folder & docs: {{dealName}}',
          description_template: 'Set up project folder, documentation, and any necessary tools.',
          due_days: 3,
          priority: 'normal'
        }
      },
    ],
    target: 'all',
    default_enabled: true,
    display: {
      icon: 'Trophy',
      color: 'text-green-600',
      bg_color: 'bg-green-100'
    }
  },
  {
    preset_id: 'deal_lost_reason',
    name: 'Deal Lost Reason',
    description: 'Captures why deals are lost so you can learn and improve over time',
    trigger_type: 'deal_stage_changed',
    trigger_config: { is_lost: true },
    actions: [
      {
        type: 'create_task',
        config: {
          title_template: 'Revisit lost deal: {{dealName}}',
          description_template: 'Check in to see if circumstances have changed. Timing may be better now.',
          due_days: 60,
          priority: 'low'
        }
      }
    ],
    target: 'all',
    default_enabled: true,
    display: {
      icon: 'XCircle',
      color: 'text-red-600',
      bg_color: 'bg-red-100'
    }
  },
]

// ============================================
// PHOTOGRAPHER PRESETS
// ============================================

const PHOTOGRAPHER_PRESETS: AutomationPreset[] = [
  {
    preset_id: 'photographer_booked_prepare',
    name: 'Booking Confirmed — Prepare',
    description: 'When a booking is confirmed, start preparation tasks immediately',
    trigger_type: 'deal_stage_changed',
    trigger_config: { to_stage_contains: 'booked' },
    actions: [
      {
        type: 'create_task',
        config: {
          title_template: 'Confirm booking details for {{dealName}}',
          description_template: 'Confirm date, time, location, package, and any special requests with the client.',
          due_days: 0,
          priority: 'high'
        }
      },
      {
        type: 'create_task',
        config: {
          title_template: 'Send pre-shoot checklist to {{contactName}}',
          description_template: 'What to wear, what to bring, location details, and what to expect.',
          due_days: 1,
          priority: 'normal'
        }
      }
    ],
    target: 'photographer',
    default_enabled: true,
    display: {
      icon: 'Calendar',
      color: 'text-blue-600',
      bg_color: 'bg-blue-100'
    }
  },
  {
    preset_id: 'photographer_shoot_complete',
    name: 'Shoot Complete — Edit & Deliver',
    description: 'After shooting, queues up editing and delivery tasks',
    trigger_type: 'deal_stage_changed',
    trigger_config: { to_stage_contains: 'shoot complete' },
    actions: [
      {
        type: 'create_task',
        config: {
          title_template: 'Edit & cull photos for {{dealName}}',
          description_template: 'Cull selects and process final gallery for delivery.',
          due_days: 7,
          priority: 'high'
        }
      }
    ],
    target: 'photographer',
    default_enabled: true,
    display: {
      icon: 'ImageIcon',
      color: 'text-purple-600',
      bg_color: 'bg-purple-100'
    }
  },
  {
    preset_id: 'photographer_delivered_review',
    name: 'Photos Delivered — Request Review',
    description: 'After delivering photos, follow up for a testimonial and review',
    trigger_type: 'deal_stage_changed',
    trigger_config: { to_stage_contains: 'delivered' },
    actions: [
      {
        type: 'create_task',
        config: {
          title_template: 'Request testimonial from {{contactName}}',
          description_template: 'Ask for written review and permission to use photos in portfolio.',
          due_days: 3,
          priority: 'normal'
        }
      }
    ],
    target: 'photographer',
    default_enabled: true,
    display: {
      icon: 'MessageSquare',
      color: 'text-yellow-600',
      bg_color: 'bg-yellow-100'
    }
  },
  {
    preset_id: 'photographer_paid_thankyou',
    name: 'Payment Received — Thank You',
    description: 'Send a thank-you message when final payment is received',
    trigger_type: 'deal_stage_changed',
    trigger_config: { to_stage_contains: 'paid' },
    actions: [
      {
        type: 'create_task',
        config: {
          title_template: 'Send thank-you to {{contactName}}',
          description_template: 'Send a personal thank-you message. Ask if they\'d refer you to friends.',
          due_days: 0,
          priority: 'normal'
        }
      }
    ],
    target: 'photographer',
    default_enabled: true,
    display: {
      icon: 'Heart',
      color: 'text-pink-600',
      bg_color: 'bg-pink-100'
    }
  },
]

// ============================================
// SERVICE PROFESSIONAL PRESETS
// ============================================

const SERVICE_PROFESSIONAL_PRESETS: AutomationPreset[] = [
  {
    preset_id: 'service_confirmed_kickoff',
    name: 'Project Confirmed — Kickoff',
    description: 'When a project is confirmed, schedule the kickoff tasks',
    trigger_type: 'deal_stage_changed',
    trigger_config: { to_stage_contains: 'confirmed' },
    actions: [
      {
        type: 'create_task',
        config: {
          title_template: 'Schedule kickoff for {{dealName}}',
          description_template: 'Set up kickoff call, share project plan, and confirm expectations.',
          due_days: 1,
          priority: 'high'
        }
      },
      {
        type: 'create_task',
        config: {
          title_template: 'Send onboarding materials to {{contactName}}',
          description_template: 'Share questionnaire, intake form, or onboarding docs with client.',
          due_days: 0,
          priority: 'normal'
        }
      }
    ],
    target: 'service_professional',
    default_enabled: true,
    display: {
      icon: 'Briefcase',
      color: 'text-blue-600',
      bg_color: 'bg-blue-100'
    }
  },
  {
    preset_id: 'service_delivered_invoice',
    name: 'Project Delivered — Invoice',
    description: 'After delivering work, send invoice and schedule follow-up',
    trigger_type: 'deal_stage_changed',
    trigger_config: { to_stage_contains: 'delivered' },
    actions: [
      {
        type: 'create_task',
        config: {
          title_template: 'Send invoice for {{dealName}}',
          description_template: 'Prepare and send final invoice to client.',
          due_days: 0,
          priority: 'high'
        }
      },
      {
        type: 'create_task',
        config: {
          title_template: 'Follow up on payment: {{dealName}}',
          description_template: 'Check that invoice was received and payment is on track.',
          due_days: 7,
          priority: 'normal'
        }
      }
    ],
    target: 'service_professional',
    default_enabled: true,
    display: {
      icon: 'FileText',
      color: 'text-green-600',
      bg_color: 'bg-green-100'
    }
  },
]

// ============================================
// REGISTRY HELPERS
// ============================================

/** All presets in a flat array */
export const ALL_PRESETS: AutomationPreset[] = [
  ...GLOBAL_PRESETS,
  ...PHOTOGRAPHER_PRESETS,
  ...SERVICE_PROFESSIONAL_PRESETS,
]

/** Get all presets that should be seeded for a given industry type */
export function getPresetsForIndustry(industryType: IndustryType | string): AutomationPreset[] {
  const globalPresets = GLOBAL_PRESETS

  switch (industryType) {
    case 'photographer':
      return [...globalPresets, ...PHOTOGRAPHER_PRESETS]
    case 'service_professional':
      return [...globalPresets, ...SERVICE_PROFESSIONAL_PRESETS]
    default:
      return globalPresets
  }
}

/** Get presets NOT currently in the org's automations — for the "Suggested" section */
export function getUnsuggestedPresets(
  industryType: IndustryType | string,
  existingPresetIds: string[]
): AutomationPreset[] {
  const allForIndustry = getPresetsForIndustry(industryType)
  return allForIndustry.filter(p => !existingPresetIds.includes(p.preset_id))
}

/** Find a preset by its ID */
export function getPresetById(presetId: string): AutomationPreset | undefined {
  return ALL_PRESETS.find(p => p.preset_id === presetId)
}

/** Build automations table rows for seeding */
export function buildSeedRows(orgId: string, industryType: IndustryType | string) {
  const presets = getPresetsForIndustry(industryType)

  return presets
    .filter(p => p.default_enabled)
    .map(preset => ({
      org_id: orgId,
      name: preset.name,
      description: preset.description,
      is_active: true,
      trigger_type: preset.trigger_type,
      trigger_config: {
        ...preset.trigger_config,
        preset_id: preset.preset_id,
      },
      conditions: [],
      actions: preset.actions,
      created_by: null, // NULL = preset automation
    }))
}
