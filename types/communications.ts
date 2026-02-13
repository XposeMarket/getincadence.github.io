// =====================================================
// Communication Logging Types
// =====================================================

export type CommunicationType = 'email' | 'sms' | 'call' | 'note'
export type CommunicationDirection = 'inbound' | 'outbound' | 'internal'

export interface Communication {
  id: string
  lead_id: string | null
  deal_id: string | null
  org_id: string
  communication_type: CommunicationType
  direction: CommunicationDirection | null
  recipient_contact: string | null
  subject: string | null
  body: string | null
  created_at: string
  updated_at: string | null
  deleted_at: string | null
  created_by: string | null
  edited_by: string | null
  duration_seconds: number | null
  edit_history: EditHistoryEntry[]
  is_auto_logged: boolean
  // Joined fields
  creator?: { full_name: string } | null
  editor?: { full_name: string } | null
}

export interface EditHistoryEntry {
  timestamp: string
  edited_by: string
  edited_by_name: string
  changes: Record<string, { old: any; new: any }>
}

// --- Create payloads ---

export interface CreateCallData {
  lead_id?: string
  deal_id?: string
  duration_seconds: number
  body: string
  direction?: CommunicationDirection
  recipient_contact?: string
}

export interface CreateEmailData {
  lead_id?: string
  deal_id?: string
  recipient_contact: string
  subject: string
  body: string
  direction?: CommunicationDirection
}

export interface CreateNoteData {
  lead_id?: string
  deal_id?: string
  body: string
}

export interface CreateSMSData {
  lead_id?: string
  deal_id?: string
  recipient_contact: string
  body: string
  direction?: CommunicationDirection
}

// --- Update payload ---

export interface UpdateCommunicationData {
  body?: string
  subject?: string
  recipient_contact?: string
  duration_seconds?: number
  direction?: CommunicationDirection
}

// --- API response ---

export interface CommunicationsResponse {
  communications: Communication[]
  total: number
}

// --- Filter ---

export type CommunicationFilterType = 'all' | CommunicationType
