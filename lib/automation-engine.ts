import { createClient } from '@/lib/supabase/client'
import { getCurrentUserOrgId } from '@/lib/org-helpers'
import { format, addDays, addHours } from 'date-fns'
import type { AutomationAction } from '@/lib/automation-presets'

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

interface DBAutomation {
  id: string
  name: string
  trigger_type: string
  trigger_config: Record<string, any>
  conditions: Array<{ field: string; value: any }>
  actions: AutomationAction[]
  is_active: boolean
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
// DB QUERY: Find matching active automations
// ============================================

async function getActiveAutomations(
  orgId: string,
  triggerType: string
): Promise<DBAutomation[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('automations')
    .select('id, name, trigger_type, trigger_config, conditions, actions, is_active')
    .eq('org_id', orgId)
    .eq('trigger_type', triggerType)
    .eq('is_active', true)

  if (error) {
    console.warn('Failed to query automations table:', error)
    return []
  }
  
  return (data || []) as DBAutomation[]
}

/** Check if a stage-change automation matches the new stage */
function matchesStageChange(
  triggerConfig: Record<string, any>,
  newStageName: string,
  stageIsWon: boolean,
  stageIsLost: boolean
): boolean {
  // Match by is_won / is_lost flag
  if (triggerConfig.is_won === true && stageIsWon) return true
  if (triggerConfig.is_lost === true && stageIsLost) return true

  // Match by stage name substring
  if (triggerConfig.to_stage_contains) {
    const target = triggerConfig.to_stage_contains.toLowerCase()
    const actual = newStageName.toLowerCase()
    if (actual.includes(target)) return true
  }

  // If no specific stage filter, match any stage change
  if (!triggerConfig.to_stage_contains && !triggerConfig.is_won && !triggerConfig.is_lost) {
    return true
  }

  return false
}

/** Evaluate user-defined conditions against the automation context */
function matchesConditions(
  conditions: Array<{ field: string; value: any }>,
  context: AutomationContext
): boolean {
  if (!conditions || conditions.length === 0) return true

  for (const cond of conditions) {
    switch (cond.field) {
      case 'stage_is':
        if (context.newStageName?.toLowerCase() !== String(cond.value).toLowerCase() &&
            context.stageName?.toLowerCase() !== String(cond.value).toLowerCase()) {
          return false
        }
        break
      case 'stage_is_not':
        if (context.newStageName?.toLowerCase() === String(cond.value).toLowerCase() ||
            context.stageName?.toLowerCase() === String(cond.value).toLowerCase()) {
          return false
        }
        break
      case 'value_greater_than':
        if (!context.dealAmount || context.dealAmount <= Number(cond.value)) return false
        break
      case 'value_less_than':
        if (!context.dealAmount || context.dealAmount >= Number(cond.value)) return false
        break
      case 'priority_is':
        // Priority conditions would need priority in context — skip for now
        break
      case 'owner_is':
        // Owner conditions would need owner_id in context — skip for now
        break
    }
  }
  return true
}

/** Deduplication: prevent the same automation from firing on the same entity within 5 minutes */
async function isDuplicate(
  automationId: string,
  entityId: string | undefined,
  orgId: string
): Promise<boolean> {
  if (!entityId) return false

  const supabase = createClient()
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

  const { data } = await supabase
    .from('automation_logs')
    .select('id')
    .eq('automation_type', automationId)
    .eq('trigger_entity_id', entityId)
    .eq('org_id', orgId)
    .gte('created_at', fiveMinutesAgo)
    .limit(1)

  return (data?.length || 0) > 0
}

// ============================================
// AUTOMATION ACTIONS
// ============================================

async function executeActions(
  actions: AutomationAction[],
  context: AutomationContext,
  automationId: string,
  automationName: string,
  orgId: string
): Promise<{ tasksCreated: number }> {
  const supabase = createClient()
  let tasksCreated = 0

  for (const action of actions) {
    if (action.type === 'create_task' || action.type === 'create_multiple_tasks') {
      const cfg = action.config
      const title = interpolateTemplate(cfg.title_template, context)
      const description = cfg.description_template
        ? interpolateTemplate(cfg.description_template, context)
        : null
      const dueDate = calculateDueDate(cfg.due_days, cfg.due_hours)

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title,
          description,
          due_date: dueDate,
          priority: cfg.priority || 'normal',
          status: 'open',
          contact_id: context.contactId || null,
          company_id: context.companyId || null,
          deal_id: context.dealId || null,
          org_id: orgId,
          metadata: {
            automated: true,
            automation_source: automationName,
            automation_id: automationId
          }
        })
        .select('id')
        .single()

      if (!error && data) {
        tasksCreated++
      } else if (error) {
        console.error(`Failed to create task for automation ${automationName}:`, error)
      }
    }
  }

  // Update execution count and last_executed_at
  try {
    const { data: existing } = await supabase
      .from('automations')
      .select('execution_count')
      .eq('id', automationId)
      .single()

    await supabase
      .from('automations')
      .update({
        execution_count: (existing?.execution_count || 0) + tasksCreated,
        last_executed_at: new Date().toISOString()
      })
      .eq('id', automationId)
  } catch {
    // Non-critical — don't fail the automation
  }

  return { tasksCreated }
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
    console.warn('Failed to log automation run:', err)
  }
}

// ============================================
// AUTOMATION TRIGGERS (DB-driven)
// ============================================

/**
 * Trigger: Contact Created
 * Finds all active automations with trigger_type = 'contact_created' and runs them
 */
export async function onContactCreated(context: {
  contactId: string
  contactName: string
  companyId?: string
  companyName?: string
}): Promise<{ success: boolean; taskId?: string; error?: string }> {
  const orgId = await getCurrentUserOrgId()
  if (!orgId) return { success: false, error: 'No org found' }

  const automations = await getActiveAutomations(orgId, 'contact_created')
  if (automations.length === 0) return { success: true }

  const ctx: AutomationContext = {
    contactId: context.contactId,
    contactName: context.contactName,
    companyId: context.companyId,
    companyName: context.companyName
  }

  let lastTaskId: string | undefined
  for (const auto of automations) {
    if (!matchesConditions(auto.conditions || [], ctx)) continue
    if (await isDuplicate(auto.id, context.contactId, orgId)) continue

    const result = await executeActions(auto.actions, ctx, auto.id, auto.name, orgId)
    if (result.tasksCreated > 0) {
      await logAutomationRun(auto.name, ctx, 'success', { tasksCreated: result.tasksCreated }, orgId)
    }
  }

  return { success: true, taskId: lastTaskId }
}

/**
 * Trigger: Deal Created
 * Finds all active automations with trigger_type = 'deal_created' and runs them
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
}): Promise<{ success: boolean; taskId?: string; error?: string }> {
  const orgId = await getCurrentUserOrgId()
  if (!orgId) return { success: false, error: 'No org found' }

  const automations = await getActiveAutomations(orgId, 'deal_created')
  if (automations.length === 0) return { success: true }

  const ctx: AutomationContext = {
    dealId: context.dealId,
    dealName: context.dealName,
    dealAmount: context.dealAmount,
    stageName: context.stageName,
    contactId: context.contactId,
    contactName: context.contactName,
    companyId: context.companyId,
    companyName: context.companyName
  }

  for (const auto of automations) {
    if (!matchesConditions(auto.conditions || [], ctx)) continue
    if (await isDuplicate(auto.id, context.dealId, orgId)) continue

    const result = await executeActions(auto.actions, ctx, auto.id, auto.name, orgId)
    if (result.tasksCreated > 0) {
      await logAutomationRun(auto.name, ctx, 'success', { tasksCreated: result.tasksCreated }, orgId)
    }
  }

  return { success: true }
}

/**
 * Trigger: Deal Stage Changed
 * Finds all active automations with trigger_type = 'deal_stage_changed',
 * filters by stage match, and runs matching ones
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
  isWonStage?: boolean
  isLostStage?: boolean
}): Promise<{ tasksCreated: number; isWon: boolean; isLost: boolean }> {
  const orgId = await getCurrentUserOrgId()
  if (!orgId) return { tasksCreated: 0, isWon: false, isLost: false }

  const automations = await getActiveAutomations(orgId, 'deal_stage_changed')
  
  const newStage = context.newStageName.toLowerCase()
  const isWon = context.isWonStage ?? (newStage.includes('won') || newStage.includes('delivered') || newStage.includes('paid'))
  const isLost = context.isLostStage ?? (newStage.includes('lost') || newStage.includes('declined') || newStage.includes('cancelled'))

  const ctx: AutomationContext = {
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

  let totalTasksCreated = 0

  for (const auto of automations) {
    if (!matchesStageChange(auto.trigger_config, context.newStageName, isWon, isLost)) continue
    if (!matchesConditions(auto.conditions || [], ctx)) continue
    if (await isDuplicate(auto.id, context.dealId, orgId)) continue

    const result = await executeActions(auto.actions, ctx, auto.id, auto.name, orgId)
    totalTasksCreated += result.tasksCreated
    if (result.tasksCreated > 0) {
      await logAutomationRun(auto.name, ctx, 'success', { tasksCreated: result.tasksCreated }, orgId)
    }
  }

  return { tasksCreated: totalTasksCreated, isWon, isLost }
}

/**
 * Helper: Create revisit task for lost deal (called after user provides reason)
 * This still runs directly — it's triggered by user action, not a DB automation
 */
export async function createRevisitTaskForLostDeal(context: {
  dealId: string
  dealName: string
  contactId?: string
  companyId?: string
}): Promise<{ success: boolean; taskId?: string; error?: string }> {
  const supabase = createClient()
  const orgId = await getCurrentUserOrgId()
  if (!orgId) return { success: false, error: 'No org found' }

  const title = `Revisit lost deal: ${context.dealName || 'Deal'}`
  const description = 'Check in to see if circumstances have changed. Timing may be better now.'
  const dueDate = calculateDueDate(60)

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title,
      description,
      due_date: dueDate,
      priority: 'low',
      status: 'open',
      contact_id: context.contactId || null,
      deal_id: context.dealId || null,
      org_id: orgId,
      metadata: {
        automated: true,
        automation_source: 'Deal Lost Revisit'
      }
    })
    .select('id')
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  await logAutomationRun('deal_lost_revisit', { dealId: context.dealId, dealName: context.dealName }, 'success', { taskId: data.id, title }, orgId)
  return { success: true, taskId: data.id }
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
  
  if (stage.includes('lead') || stage.includes('inquiry') || stage.includes('prospect')) {
    return [
      { title: 'Qualify deal', description: 'Confirm budget, timeline, and decision maker', priority: 'high', dueDays: 1 },
      { title: 'Schedule intro call', description: 'Set up initial discovery call', priority: 'high', dueDays: 1 },
      { title: 'Request more info', description: 'Ask for additional context or requirements', priority: 'normal', dueDays: 2 }
    ]
  }
  
  if (stage.includes('qualified') || stage.includes('booked') || stage.includes('confirmed')) {
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
  
  if (stage.includes('won') || stage.includes('delivered') || stage.includes('paid')) {
    return [
      { title: 'Schedule kickoff call', description: 'Set up project kickoff meeting', priority: 'high', dueDays: 1 },
      { title: 'Collect requirements', description: 'Gather detailed project requirements', priority: 'high', dueDays: 2 },
      { title: 'Send invoice', description: 'Send initial invoice or payment request', priority: 'normal', dueDays: 1 }
    ]
  }
  
  if (stage.includes('lost') || stage.includes('declined') || stage.includes('cancelled')) {
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
