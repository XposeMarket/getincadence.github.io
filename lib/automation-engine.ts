import { createClient } from '@/lib/supabase/client'
import { getCurrentUserOrgId } from '@/lib/org-helpers'
import { format, addDays, addHours } from 'date-fns'

// ============================================
// TYPES
// ============================================

export type TriggerType = 
  | 'contact_created'
  | 'deal_created'
  | 'deal_stage_changed'
  | 'deal_won'
  | 'deal_lost'
  | 'task_completed'
  | 'deal_idle_7_days'
  | 'task_overdue'

export type ActionType = 
  | 'create_task'
  | 'send_notification'

export interface AutomationContext {
  contactId?: string
  contactName?: string
  companyId?: string
  companyName?: string
  dealId?: string
  dealName?: string
  dealAmount?: number
  stageName?: string
  oldStageName?: string
  newStageName?: string
}

export interface TaskTemplate {
  titleTemplate: string
  descriptionTemplate?: string
  dueDays: number
  dueHours?: number
  priority: 'low' | 'normal' | 'high'
}

// ============================================
// TASK TEMPLATES
// ============================================

export const TASK_TEMPLATES = {
  // Contact created → First touch task
  firstTouch: {
    titleTemplate: 'Reach out to {{contactName}}',
    descriptionTemplate: 'New contact created. Send intro message and confirm next steps.',
    dueDays: 1,
    priority: 'high' as const
  },

  // Deal created → Qualify task (varies by stage)
  qualifyDeal: {
    titleTemplate: 'Qualify deal: {{dealName}}',
    descriptionTemplate: '• Confirm decision maker\n• Confirm timeline\n• Confirm budget\n• Set expected close date\n• Log initial notes',
    dueDays: 1,
    priority: 'high' as const
  },

  // Deal → Proposal stage
  proposalFollowUp: {
    titleTemplate: 'Follow up on proposal: {{dealName}}',
    descriptionTemplate: 'Ask if they had a chance to review the proposal. Address any questions. Offer a quick call to discuss.',
    dueDays: 2,
    priority: 'high' as const
  },

  // Deal → Negotiation stage
  negotiationFollowUp: {
    titleTemplate: 'Resolve blockers: {{dealName}}',
    descriptionTemplate: 'Identify and address any remaining concerns or objections. Confirm decision timeline.',
    dueDays: 2,
    priority: 'high' as const
  },

  // Deal idle 7 days
  reengageDeal: {
    titleTemplate: 'Re-engage: {{dealName}} (inactive 7 days)',
    descriptionTemplate: 'This deal has had no activity for 7 days. Send a check-in message and propose next steps.',
    dueDays: 0,
    priority: 'high' as const
  },

  // Deal Won → Onboarding tasks
  onboarding: {
    welcome: {
      titleTemplate: 'Send welcome email: {{dealName}}',
      descriptionTemplate: 'Send welcome/congratulations email to the client with next steps.',
      dueDays: 0,
      priority: 'high' as const
    },
    collectRequirements: {
      titleTemplate: 'Collect requirements: {{dealName}}',
      descriptionTemplate: 'Gather all necessary information and requirements from the client.',
      dueDays: 2,
      priority: 'normal' as const
    },
    kickoffCall: {
      titleTemplate: 'Schedule kickoff call: {{dealName}}',
      descriptionTemplate: 'Schedule and prepare for the project kickoff meeting.',
      dueDays: 2,
      priority: 'high' as const
    },
    projectSetup: {
      titleTemplate: 'Create project folder & docs: {{dealName}}',
      descriptionTemplate: 'Set up project folder, documentation, and any necessary tools.',
      dueDays: 3,
      priority: 'normal' as const
    },
    billingConfirm: {
      titleTemplate: 'Confirm billing & contract: {{dealName}}',
      descriptionTemplate: 'Verify contract is signed and billing/payment details are in order.',
      dueDays: 1,
      priority: 'high' as const
    }
  },

  // Deal Lost → Revisit reminder
  revisitLostDeal: {
    titleTemplate: 'Revisit lost deal: {{dealName}}',
    descriptionTemplate: 'Check in to see if circumstances have changed. Timing may be better now.',
    dueDays: 60,
    priority: 'low' as const
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function interpolateTemplate(template: string, context: AutomationContext): string {
  return template
    .replace(/\{\{contactName\}\}/g, context.contactName || 'Contact')
    .replace(/\{\{companyName\}\}/g, context.companyName || 'Company')
    .replace(/\{\{dealName\}\}/g, context.dealName || 'Deal')
    .replace(/\{\{dealAmount\}\}/g, context.dealAmount?.toLocaleString() || '0')
    .replace(/\{\{stageName\}\}/g, context.stageName || 'Stage')
    .replace(/\{\{oldStageName\}\}/g, context.oldStageName || '')
    .replace(/\{\{newStageName\}\}/g, context.newStageName || '')
}

function calculateDueDate(dueDays: number, dueHours?: number): string {
  let dueDate = new Date()
  
  if (dueHours) {
    dueDate = addHours(dueDate, dueHours)
  }
  
  if (dueDays > 0) {
    dueDate = addDays(dueDate, dueDays)
  }
  
  return format(dueDate, 'yyyy-MM-dd')
}

// ============================================
// AUTOMATION ACTIONS
// ============================================

export async function createAutomatedTask(
  template: TaskTemplate,
  context: AutomationContext,
  automationSource: string
): Promise<{ success: boolean; taskId?: string; error?: string }> {
  const supabase = createClient()
  
  // Get the org_id for the current user
  const orgId = await getCurrentUserOrgId()
  if (!orgId) {
    console.error('Failed to get org_id for automated task')
    return { success: false, error: 'Unable to determine organization' }
  }
  
  const title = interpolateTemplate(template.titleTemplate, context)
  const description = template.descriptionTemplate 
    ? interpolateTemplate(template.descriptionTemplate, context)
    : null
  const dueDate = calculateDueDate(template.dueDays, template.dueHours)
  
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title,
      description,
      due_date: dueDate,
      priority: template.priority,
      status: 'open',
      contact_id: context.contactId || null,
      company_id: context.companyId || null,
      deal_id: context.dealId || null,
      org_id: orgId,
      metadata: {
        automated: true,
        automation_source: automationSource
      }
    })
    .select('id')
    .single()
  
  if (error) {
    console.error('Failed to create automated task:', error)
    return { success: false, error: error.message }
  }
  
  // Log the automation run
  await logAutomationRun(automationSource, context, 'success', { taskId: data.id, title }, orgId)
  
  return { success: true, taskId: data.id }
}

export async function createMultipleTasks(
  templates: TaskTemplate[],
  context: AutomationContext,
  automationSource: string
): Promise<{ success: boolean; taskIds: string[]; errors: string[] }> {
  const results = await Promise.all(
    templates.map(template => createAutomatedTask(template, context, automationSource))
  )
  
  const taskIds = results.filter(r => r.success && r.taskId).map(r => r.taskId!)
  const errors = results.filter(r => !r.success && r.error).map(r => r.error!)
  
  return {
    success: errors.length === 0,
    taskIds,
    errors
  }
}

async function logAutomationRun(
  automationType: string,
  context: AutomationContext,
  status: 'success' | 'failed',
  result: any,
  orgId: string
) {
  const supabase = createClient()
  
  try {
    await supabase.from('automation_logs').insert({
      automation_type: automationType,
      trigger_entity_type: context.dealId ? 'deal' : context.contactId ? 'contact' : 'unknown',
      trigger_entity_id: context.dealId || context.contactId || null,
      status,
      result,
      org_id: orgId
    })
  } catch (err) {
    // Don't fail if logging fails (table might not exist yet)
    console.warn('Failed to log automation run (table may not exist):', err)
  }
}

// ============================================
// AUTOMATION TRIGGERS
// ============================================

/**
 * Trigger: Contact Created
 * Action: Create "First Touch" task
 */
export async function onContactCreated(context: {
  contactId: string
  contactName: string
  companyId?: string
  companyName?: string
}) {
  return createAutomatedTask(
    TASK_TEMPLATES.firstTouch,
    {
      contactId: context.contactId,
      contactName: context.contactName,
      companyId: context.companyId,
      companyName: context.companyName
    },
    'contact_created_first_touch'
  )
}

/**
 * Trigger: Deal Created
 * Action: Create qualifying task
 */
export async function onDealCreated(context: {
  dealId: string
  dealName: string
  dealAmount?: number
  stageName?: string
  contactId?: string
  contactName?: string
  companyId?: string
  companyName?: string
}) {
  return createAutomatedTask(
    TASK_TEMPLATES.qualifyDeal,
    {
      dealId: context.dealId,
      dealName: context.dealName,
      dealAmount: context.dealAmount,
      stageName: context.stageName,
      contactId: context.contactId,
      contactName: context.contactName,
      companyId: context.companyId,
      companyName: context.companyName
    },
    'deal_created_qualify'
  )
}

/**
 * Trigger: Deal Stage Changed
 * Action: Create stage-specific follow-up task
 */
export async function onDealStageChanged(context: {
  dealId: string
  dealName: string
  dealAmount?: number
  oldStageName: string
  newStageName: string
  contactId?: string
  contactName?: string
  companyId?: string
  companyName?: string
}): Promise<{ tasksCreated: number; isWon: boolean; isLost: boolean }> {
  const newStage = context.newStageName.toLowerCase()
  const automationContext: AutomationContext = {
    dealId: context.dealId,
    dealName: context.dealName,
    dealAmount: context.dealAmount,
    oldStageName: context.oldStageName,
    newStageName: context.newStageName,
    stageName: context.newStageName,
    contactId: context.contactId,
    contactName: context.contactName,
    companyId: context.companyId,
    companyName: context.companyName
  }
  
  let tasksCreated = 0
  
  // Check for Proposal stage
  if (newStage.includes('proposal')) {
    await createAutomatedTask(
      TASK_TEMPLATES.proposalFollowUp,
      automationContext,
      'deal_stage_proposal'
    )
    tasksCreated++
  }
  
  // Check for Negotiation stage
  if (newStage.includes('negotiation')) {
    await createAutomatedTask(
      TASK_TEMPLATES.negotiationFollowUp,
      automationContext,
      'deal_stage_negotiation'
    )
    tasksCreated++
  }
  
  // Check for Closed Won
  if (newStage.includes('won') || newStage.includes('closed won')) {
    const onboardingTasks = [
      TASK_TEMPLATES.onboarding.welcome,
      TASK_TEMPLATES.onboarding.billingConfirm,
      TASK_TEMPLATES.onboarding.collectRequirements,
      TASK_TEMPLATES.onboarding.kickoffCall,
      TASK_TEMPLATES.onboarding.projectSetup
    ]
    
    const result = await createMultipleTasks(
      onboardingTasks,
      automationContext,
      'deal_won_onboarding'
    )
    tasksCreated += result.taskIds.length
    
    return { tasksCreated, isWon: true, isLost: false }
  }
  
  // Check for Closed Lost
  if (newStage.includes('lost') || newStage.includes('closed lost')) {
    return { tasksCreated, isWon: false, isLost: true }
  }
  
  return { tasksCreated, isWon: false, isLost: false }
}

/**
 * Helper: Create revisit task for lost deal (called after user provides reason)
 */
export async function createRevisitTaskForLostDeal(context: {
  dealId: string
  dealName: string
  contactId?: string
  companyId?: string
}) {
  return createAutomatedTask(
    TASK_TEMPLATES.revisitLostDeal,
    {
      dealId: context.dealId,
      dealName: context.dealName,
      contactId: context.contactId,
      companyId: context.companyId
    },
    'deal_lost_revisit'
  )
}

// ============================================
// SUGGESTED TASKS (for UI)
// ============================================

export interface SuggestedTask {
  title: string
  description: string
  priority: 'low' | 'normal' | 'high'
  dueDays: number
}

export function getSuggestedTasksForStage(stageName: string): SuggestedTask[] {
  const stage = stageName.toLowerCase()
  
  if (stage.includes('lead')) {
    return [
      { title: 'Qualify deal', description: 'Confirm budget, timeline, and decision maker', priority: 'high', dueDays: 1 },
      { title: 'Schedule intro call', description: 'Set up initial discovery call', priority: 'high', dueDays: 1 },
      { title: 'Request more info', description: 'Ask for additional context or requirements', priority: 'normal', dueDays: 2 }
    ]
  }
  
  if (stage.includes('qualified')) {
    return [
      { title: 'Send proposal', description: 'Prepare and send formal proposal', priority: 'high', dueDays: 2 },
      { title: 'Send follow-up', description: 'Check in on status and questions', priority: 'normal', dueDays: 3 },
      { title: 'Confirm timeline', description: 'Verify expected decision date', priority: 'normal', dueDays: 2 }
    ]
  }
  
  if (stage.includes('proposal')) {
    return [
      { title: 'Follow up on proposal', description: 'Ask if they reviewed the proposal', priority: 'high', dueDays: 2 },
      { title: 'Offer quick call', description: 'Propose a call to discuss questions', priority: 'normal', dueDays: 3 },
      { title: 'Send revised scope', description: 'Update proposal based on feedback', priority: 'normal', dueDays: 2 }
    ]
  }
  
  if (stage.includes('negotiation')) {
    return [
      { title: 'Confirm blockers', description: 'Identify any remaining concerns', priority: 'high', dueDays: 1 },
      { title: 'Send updated pricing', description: 'Provide revised pricing if needed', priority: 'normal', dueDays: 2 },
      { title: 'Set decision date', description: 'Agree on final decision timeline', priority: 'high', dueDays: 1 }
    ]
  }
  
  if (stage.includes('won')) {
    return [
      { title: 'Schedule kickoff call', description: 'Set up project kickoff meeting', priority: 'high', dueDays: 1 },
      { title: 'Collect requirements', description: 'Gather detailed project requirements', priority: 'high', dueDays: 2 },
      { title: 'Send invoice', description: 'Send initial invoice or payment request', priority: 'normal', dueDays: 1 }
    ]
  }
  
  if (stage.includes('lost')) {
    return [
      { title: 'Follow up in 60 days', description: 'Check if circumstances have changed', priority: 'low', dueDays: 60 }
    ]
  }
  
  // Default suggestions
  return [
    { title: 'Follow up', description: 'Check in on status', priority: 'normal', dueDays: 2 },
    { title: 'Schedule call', description: 'Set up a discussion', priority: 'normal', dueDays: 1 }
  ]
}
