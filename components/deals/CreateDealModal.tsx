'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUserOrgId } from '@/lib/org-helpers'
import { X, Loader2, Zap } from 'lucide-react'
import { ActivityLogger } from '@/lib/activity-logger'
import { onDealCreated } from '@/lib/automation-engine'

interface PipelineStage {
  id: string
  name: string
  color: string
  position: number
}

interface Contact {
  id: string
  first_name: string
  last_name: string
}

interface Company {
  id: string
  name: string
}

interface User {
  id: string
  full_name: string
}

interface CreateDealModalProps {
  pipelineId: string
  stages: PipelineStage[]
  onClose: () => void
  onCreated: () => void
}

export default function CreateDealModal({ pipelineId, stages, onClose, onCreated }: CreateDealModalProps) {
  const [name, setName] = useState('')
  const [value, setValue] = useState('')
  const [stageId, setStageId] = useState(stages[0]?.id || '')
  const [contactId, setContactId] = useState('')
  const [companyId, setCompanyId] = useState('')
  const [ownerId, setOwnerId] = useState('')
  const [expectedCloseDate, setExpectedCloseDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [automationRan, setAutomationRan] = useState(false)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
        setOwnerId(user.id) // Default owner to current user
      }

      const id = await getCurrentUserOrgId()
      setOrgId(id)
      if (id) {
        loadRelatedData(id)
      }
    }
    init()
  }, [])

  useEffect(() => {
    if (stages.length > 0 && !stageId) {
      setStageId(stages[0].id)
    }
  }, [stages])

  const loadRelatedData = async (currentOrgId: string) => {
    const [contactsRes, companiesRes, usersRes] = await Promise.all([
      supabase
        .from('contacts')
        .select('id, first_name, last_name')
        .eq('org_id', currentOrgId)
        .order('first_name', { ascending: true }),
      supabase
        .from('companies')
        .select('id, name')
        .eq('org_id', currentOrgId)
        .order('name', { ascending: true }),
      supabase
        .from('users')
        .select('id, full_name')
        .eq('org_id', currentOrgId)
        .order('full_name', { ascending: true })
    ])

    if (contactsRes.data) setContacts(contactsRes.data)
    if (companiesRes.data) setCompanies(companiesRes.data)
    if (usersRes.data) setUsers(usersRes.data)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!orgId) {
      setError('Unable to determine organization. Please try again.')
      return
    }

    setLoading(true)
    setError(null)

    const { data: newDeal, error: insertError } = await supabase
      .from('deals')
      .insert({
        name,
        amount: value ? parseFloat(value) : 0,
        pipeline_id: pipelineId,
        stage_id: stageId,
        contact_id: contactId || null,
        company_id: companyId || null,
        owner_id: ownerId || currentUserId || null,
        close_date: expectedCloseDate || null,
        org_id: orgId,
      })
      .select('id')
      .single()

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    // Log activity
    const stage = stages.find(s => s.id === stageId)
    const contact = contacts.find(c => c.id === contactId)
    const company = companies.find(c => c.id === companyId)
    
    await ActivityLogger.dealCreated({
      id: newDeal.id,
      name,
      amount: value ? parseFloat(value) : undefined,
      stage_name: stage?.name,
      contact_name: contact ? `${contact.first_name} ${contact.last_name}` : undefined,
      company_name: company?.name
    })

    // Run automation: Create qualifying task
    const automationResult = await onDealCreated({
      dealId: newDeal.id,
      dealName: name,
      dealAmount: value ? parseFloat(value) : undefined,
      stageName: stage?.name,
      contactId: contactId || undefined,
      contactName: contact ? `${contact.first_name} ${contact.last_name}` : undefined,
      companyId: companyId || undefined,
      companyName: company?.name
    })

    if (automationResult.success) {
      setAutomationRan(true)
      setTimeout(() => {
        onCreated()
      }, 800)
    } else {
      onCreated()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg animate-slide-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Create Deal</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
              {error}
            </div>
          )}

          {automationRan && (
            <div className="p-3 text-sm text-primary-700 bg-primary-50 border border-primary-200 rounded-lg flex items-center gap-2">
              <Zap size={16} className="text-primary-500" />
              <span>Task created: "Qualify deal: {name}"</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Deal Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Website Redesign Project"
              required
              className="input"
              disabled={loading || automationRan}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Value
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <input
                  type="number"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="0"
                  min="0"
                  step="0.01"
                  className="input pl-7"
                  disabled={loading || automationRan}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Stage *
              </label>
              <select
                value={stageId}
                onChange={(e) => setStageId(e.target.value)}
                required
                className="input"
                disabled={loading || automationRan}
              >
                {stages.map(stage => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Contact
              </label>
              <select
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
                className="input"
                disabled={loading || automationRan}
              >
                <option value="">Select contact...</option>
                {contacts.map(contact => (
                  <option key={contact.id} value={contact.id}>
                    {contact.first_name} {contact.last_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Company
              </label>
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="input"
                disabled={loading || automationRan}
              >
                <option value="">Select company...</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Owner
              </label>
              <select
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
                className="input"
                disabled={loading || automationRan}
              >
                <option value="">Unassigned</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Expected Close Date
              </label>
              <input
                type="date"
                value={expectedCloseDate}
                onChange={(e) => setExpectedCloseDate(e.target.value)}
                className="input"
                disabled={loading || automationRan}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={loading || automationRan}>
              Cancel
            </button>
            <button type="submit" disabled={loading || automationRan || !orgId} className="btn btn-primary">
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin mr-2" />
                  Creating...
                </>
              ) : automationRan ? (
                <>
                  <Zap size={18} className="mr-2" />
                  Created!
                </>
              ) : (
                'Create Deal'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
