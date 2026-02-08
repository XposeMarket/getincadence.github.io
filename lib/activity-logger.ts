import { createClient } from '@/lib/supabase/client'
import { getCurrentUserOrgId } from '@/lib/org-helpers'

export type ActivityType = 
  | 'contact_created'
  | 'contact_updated'
  | 'contact_deleted'
  | 'company_created'
  | 'company_updated'
  | 'company_deleted'
  | 'deal_created'
  | 'deal_updated'
  | 'deal_deleted'
  | 'deal_stage_changed'
  | 'task_created'
  | 'task_completed'
  | 'task_updated'
  | 'task_deleted'
  | 'note_added'

interface LogActivityParams {
  type: ActivityType
  subject: string
  body?: string
  contactId?: string
  companyId?: string
  dealId?: string
  taskId?: string
  metadata?: Record<string, any>
  userName?: string
}

export async function logActivity({
  type,
  subject,
  body,
  contactId,
  companyId,
  dealId,
  taskId,
  metadata = {},
  userName = 'User'
}: LogActivityParams) {
  const supabase = createClient()
  
  // Get the org_id for the current user
  const orgId = await getCurrentUserOrgId()
  if (!orgId) {
    console.error('Failed to get org_id for activity log')
    return
  }
  
  const { error } = await supabase.from('activities').insert({
    activity_type: type,
    subject,
    body,
    contact_id: contactId || null,
    company_id: companyId || null,
    deal_id: dealId || null,
    task_id: taskId || null,
    metadata: {
      ...metadata,
      user_name: userName
    },
    org_id: orgId
  })

  if (error) {
    console.error('Failed to log activity:', error)
  }
}

// Helper functions for common activities
export const ActivityLogger = {
  contactCreated: (contact: { id: string; first_name: string; last_name: string; company_name?: string }, userName = 'User') => {
    const contactName = `${contact.first_name} ${contact.last_name}`
    return logActivity({
      type: 'contact_created',
      subject: `${userName} created a new contact: ${contactName}`,
      contactId: contact.id,
      userName,
      metadata: {
        entity_type: 'contact',
        entity_id: contact.id,
        entity_name: contactName,
        company_name: contact.company_name
      }
    })
  },

  companyCreated: (company: { id: string; name: string }, userName = 'User') => {
    return logActivity({
      type: 'company_created',
      subject: `${userName} created a new company: ${company.name}`,
      companyId: company.id,
      userName,
      metadata: {
        entity_type: 'company',
        entity_id: company.id,
        entity_name: company.name
      }
    })
  },

  dealCreated: (deal: { id: string; name: string; amount?: number; stage_name?: string; contact_name?: string; company_name?: string }, userName = 'User') => {
    return logActivity({
      type: 'deal_created',
      subject: `${userName} created a new deal: ${deal.name}`,
      dealId: deal.id,
      userName,
      metadata: {
        entity_type: 'deal',
        entity_id: deal.id,
        entity_name: deal.name,
        amount: deal.amount,
        stage_name: deal.stage_name,
        contact_name: deal.contact_name,
        company_name: deal.company_name
      }
    })
  },

  dealStageChanged: (deal: { id: string; name: string; old_stage: string; new_stage: string }, userName = 'User') => {
    return logActivity({
      type: 'deal_stage_changed',
      subject: `${userName} moved "${deal.name}" from ${deal.old_stage} to ${deal.new_stage}`,
      dealId: deal.id,
      userName,
      metadata: {
        entity_type: 'deal',
        entity_id: deal.id,
        entity_name: deal.name,
        old_stage: deal.old_stage,
        new_stage: deal.new_stage
      }
    })
  },

  taskCreated: (task: { id: string; title: string; deal_name?: string; contact_name?: string; company_name?: string }, userName = 'User') => {
    return logActivity({
      type: 'task_created',
      subject: `${userName} created a new task: ${task.title}`,
      taskId: task.id,
      userName,
      metadata: {
        entity_type: 'task',
        entity_id: task.id,
        entity_name: task.title,
        deal_name: task.deal_name,
        contact_name: task.contact_name,
        company_name: task.company_name
      }
    })
  },

  taskCompleted: (task: { id: string; title: string }, userName = 'User') => {
    return logActivity({
      type: 'task_completed',
      subject: `${userName} completed task: ${task.title}`,
      taskId: task.id,
      userName,
      metadata: {
        entity_type: 'task',
        entity_id: task.id,
        entity_name: task.title
      }
    })
  },

  noteAdded: (params: { entity_type: string; entity_id: string; entity_name: string; note: string; contactId?: string; companyId?: string; dealId?: string }, userName = 'User') => {
    return logActivity({
      type: 'note_added',
      subject: `${userName} added a note to ${params.entity_type}: ${params.entity_name}`,
      body: params.note,
      contactId: params.contactId,
      companyId: params.companyId,
      dealId: params.dealId,
      userName,
      metadata: {
        entity_type: params.entity_type,
        entity_id: params.entity_id,
        entity_name: params.entity_name
      }
    })
  }
}
