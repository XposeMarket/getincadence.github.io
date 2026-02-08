'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUserOrgId } from '@/lib/org-helpers'
import { X, Loader2 } from 'lucide-react'
import { ActivityLogger } from '@/lib/activity-logger'

interface Contact {
  id: string
  first_name: string
  last_name: string
}

interface Company {
  id: string
  name: string
}

interface Deal {
  id: string
  name: string
}

interface CreateTaskModalProps {
  onClose: () => void
  onCreated: () => void
  prefillContactId?: string
  prefillCompanyId?: string
  prefillDealId?: string
}

export default function CreateTaskModal({ 
  onClose, 
  onCreated,
  prefillContactId,
  prefillCompanyId,
  prefillDealId
}: CreateTaskModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<'low' | 'normal' | 'high'>('normal')
  const [dueDate, setDueDate] = useState('')
  const [contactId, setContactId] = useState(prefillContactId || '')
  const [companyId, setCompanyId] = useState(prefillCompanyId || '')
  const [dealId, setDealId] = useState(prefillDealId || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [orgId, setOrgId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const id = await getCurrentUserOrgId()
      setOrgId(id)
      if (id) {
        loadRelatedData(id)
      }
    }
    init()
  }, [])

  const loadRelatedData = async (currentOrgId: string) => {
    const [contactsRes, companiesRes, dealsRes] = await Promise.all([
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
        .from('deals')
        .select('id, name')
        .eq('org_id', currentOrgId)
        .order('name', { ascending: true })
    ])

    if (contactsRes.data) setContacts(contactsRes.data)
    if (companiesRes.data) setCompanies(companiesRes.data)
    if (dealsRes.data) setDeals(dealsRes.data)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!orgId) {
      setError('Unable to determine organization. Please try again.')
      return
    }

    setLoading(true)
    setError(null)

    const { data: newTask, error: insertError } = await supabase
      .from('tasks')
      .insert({
        title,
        description: description || null,
        priority,
        due_date: dueDate || null,
        contact_id: contactId || null,
        company_id: companyId || null,
        deal_id: dealId || null,
        status: 'open',
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
    const contact = contacts.find(c => c.id === contactId)
    const company = companies.find(c => c.id === companyId)
    const deal = deals.find(d => d.id === dealId)
    
    await ActivityLogger.taskCreated({
      id: newTask.id,
      title,
      contact_name: contact ? `${contact.first_name} ${contact.last_name}` : undefined,
      company_name: company?.name,
      deal_name: deal?.name
    })

    onCreated()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold text-gray-900">Create Task</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Task Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Follow up with client"
              required
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details about this task..."
              rows={3}
              className="input resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'low' | 'normal' | 'high')}
                className="input"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Related Contact
            </label>
            <select
              value={contactId}
              onChange={(e) => setContactId(e.target.value)}
              className="input"
            >
              <option value="">None</option>
              {contacts.map(contact => (
                <option key={contact.id} value={contact.id}>
                  {contact.first_name} {contact.last_name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Related Company
              </label>
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="input"
              >
                <option value="">None</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Related Deal
              </label>
              <select
                value={dealId}
                onChange={(e) => setDealId(e.target.value)}
                className="input"
              >
                <option value="">None</option>
                {deals.map(deal => (
                  <option key={deal.id} value={deal.id}>
                    {deal.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading || !orgId} className="btn btn-primary">
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                'Create Task'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
