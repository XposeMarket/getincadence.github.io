import { createClient } from '@/lib/supabase/client'
import { getCurrentUserOrgId } from '@/lib/org-helpers'
import type {
  Communication,
  CreateCallData,
  CreateEmailData,
  CreateNoteData,
  CreateSMSData,
  UpdateCommunicationData,
  CommunicationType,
  EditHistoryEntry,
} from '@/types/communications'

const supabase = createClient()

// =====================================================
// Fetch communications for a lead or deal
// =====================================================

export async function getCommunications(params: {
  leadId?: string
  dealId?: string
  type?: CommunicationType
  includeDeleted?: boolean
  limit?: number
  offset?: number
}): Promise<{ data: Communication[]; count: number }> {
  const { leadId, dealId, type, includeDeleted = false, limit = 50, offset = 0 } = params

  let query = supabase
    .from('communications')
    .select(`
      *,
      creator:created_by(full_name),
      editor:edited_by(full_name)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (leadId) query = query.eq('lead_id', leadId)
  if (dealId) query = query.eq('deal_id', dealId)
  if (type) query = query.eq('communication_type', type)
  if (!includeDeleted) query = query.is('deleted_at', null)

  const { data, error, count } = await query

  if (error) {
    console.error('Failed to fetch communications:', error)
    return { data: [], count: 0 }
  }

  return { data: (data || []) as Communication[], count: count || 0 }
}

// =====================================================
// Create a communication
// =====================================================

async function createCommunication(
  commType: CommunicationType,
  payload: Record<string, any>
): Promise<Communication | null> {
  const orgId = await getCurrentUserOrgId()
  if (!orgId) return null

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('communications')
    .insert({
      ...payload,
      org_id: orgId,
      communication_type: commType,
      created_by: user.id,
    })
    .select(`
      *,
      creator:created_by(full_name),
      editor:edited_by(full_name)
    `)
    .single()

  if (error) {
    console.error(`Failed to create ${commType}:`, error)
    return null
  }

  return data as Communication
}

export async function logCall(data: CreateCallData): Promise<Communication | null> {
  return createCommunication('call', {
    lead_id: data.lead_id || null,
    deal_id: data.deal_id || null,
    duration_seconds: data.duration_seconds,
    body: data.body || null,
    direction: data.direction || 'outbound',
    recipient_contact: data.recipient_contact || null,
  })
}

export async function logEmail(data: CreateEmailData): Promise<Communication | null> {
  return createCommunication('email', {
    lead_id: data.lead_id || null,
    deal_id: data.deal_id || null,
    recipient_contact: data.recipient_contact,
    subject: data.subject,
    body: data.body || null,
    direction: data.direction || 'outbound',
  })
}

export async function logNote(data: CreateNoteData): Promise<Communication | null> {
  return createCommunication('note', {
    lead_id: data.lead_id || null,
    deal_id: data.deal_id || null,
    body: data.body,
    direction: 'internal',
  })
}

export async function logSMS(data: CreateSMSData): Promise<Communication | null> {
  return createCommunication('sms', {
    lead_id: data.lead_id || null,
    deal_id: data.deal_id || null,
    recipient_contact: data.recipient_contact,
    body: data.body || null,
    direction: data.direction || 'outbound',
  })
}

// =====================================================
// Update a communication (with edit history)
// =====================================================

export async function updateCommunication(
  commId: string,
  updates: UpdateCommunicationData,
  currentComm: Communication
): Promise<Communication | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Get user name for edit history
  const { data: userProfile } = await supabase
    .from('users')
    .select('full_name')
    .eq('id', user.id)
    .single()

  // Build edit history entry
  const changes: Record<string, { old: any; new: any }> = {}
  for (const [key, newVal] of Object.entries(updates)) {
    const oldVal = (currentComm as any)[key]
    if (oldVal !== newVal) {
      changes[key] = { old: oldVal, new: newVal }
    }
  }

  // Only update if something actually changed
  if (Object.keys(changes).length === 0) return currentComm

  const historyEntry: EditHistoryEntry = {
    timestamp: new Date().toISOString(),
    edited_by: user.id,
    edited_by_name: userProfile?.full_name || 'Unknown',
    changes,
  }

  const newHistory = [...(currentComm.edit_history || []), historyEntry]

  const { data, error } = await supabase
    .from('communications')
    .update({
      ...updates,
      edited_by: user.id,
      edit_history: newHistory,
    })
    .eq('id', commId)
    .select(`
      *,
      creator:created_by(full_name),
      editor:edited_by(full_name)
    `)
    .single()

  if (error) {
    console.error('Failed to update communication:', error)
    return null
  }

  return data as Communication
}

// =====================================================
// Soft delete a communication
// =====================================================

export async function softDeleteCommunication(commId: string): Promise<boolean> {
  const { error } = await supabase
    .from('communications')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', commId)

  if (error) {
    console.error('Failed to soft delete communication:', error)
    return false
  }
  return true
}

// =====================================================
// Undo soft delete
// =====================================================

export async function restoreCommunication(commId: string): Promise<boolean> {
  const { error } = await supabase
    .from('communications')
    .update({ deleted_at: null })
    .eq('id', commId)

  if (error) {
    console.error('Failed to restore communication:', error)
    return false
  }
  return true
}

// =====================================================
// Email client helper
// =====================================================

export function openEmailClient(
  recipientEmail: string,
  subject: string,
  notesSummary?: string
) {
  const body = notesSummary ? `\n\nNotes: ${notesSummary}` : ''
  const mailtoLink = `mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`

  const link = document.createElement('a')
  link.href = mailtoLink
  link.click()
}

// =====================================================
// Duration formatting helpers
// =====================================================

export function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return '0m'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins === 0) return `${secs}s`
  if (secs === 0) return `${mins}m`
  return `${mins}m ${secs}s`
}

export function durationToSeconds(minutes: number): number {
  return minutes * 60
}
