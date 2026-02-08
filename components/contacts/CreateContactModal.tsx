'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUserOrgId } from '@/lib/org-helpers'
import { X, Loader2, Zap } from 'lucide-react'
import { ActivityLogger } from '@/lib/activity-logger'
import { onContactCreated } from '@/lib/automation-engine'

interface Company {
  id: string
  name: string
}

interface CreateContactModalProps {
  onClose: () => void
  onCreated: () => void
  prefillCompanyId?: string
}

export default function CreateContactModal({ onClose, onCreated, prefillCompanyId }: CreateContactModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [automationRan, setAutomationRan] = useState(false)
  const [orgId, setOrgId] = useState<string | null>(null)
  const supabase = createClient()

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    title: '',
    company_id: prefillCompanyId || '',
  })

  useEffect(() => {
    const init = async () => {
      const id = await getCurrentUserOrgId()
      setOrgId(id)
      if (id) {
        loadCompanies(id)
      }
    }
    init()
  }, [])

  const loadCompanies = async (currentOrgId: string) => {
    const { data } = await supabase
      .from('companies')
      .select('id, name')
      .eq('org_id', currentOrgId)
      .order('name', { ascending: true })
    
    if (data) setCompanies(data)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!orgId) {
      setError('Unable to determine organization. Please try again.')
      return
    }

    setLoading(true)
    setError(null)

    const { data: newContact, error: insertError } = await supabase
      .from('contacts')
      .insert({
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email || null,
        phone: formData.phone || null,
        title: formData.title || null,
        company_id: formData.company_id || null,
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
    const company = companies.find(c => c.id === formData.company_id)
    await ActivityLogger.contactCreated({
      id: newContact.id,
      first_name: formData.first_name,
      last_name: formData.last_name,
      company_name: company?.name
    })

    // Run automation: Create "First Touch" task
    const automationResult = await onContactCreated({
      contactId: newContact.id,
      contactName: `${formData.first_name} ${formData.last_name}`,
      companyId: formData.company_id || undefined,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold text-gray-900">Add New Contact</h2>
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

          {automationRan && (
            <div className="p-3 text-sm text-primary-700 bg-primary-50 border border-primary-200 rounded-lg flex items-center gap-2">
              <Zap size={16} className="text-primary-500 flex-shrink-0" />
              <span>Task created: "Reach out to {formData.first_name} {formData.last_name}"</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">First name *</label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                required
                className="input"
                placeholder="John"
                disabled={loading || automationRan}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Last name *</label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                required
                className="input"
                placeholder="Smith"
                disabled={loading || automationRan}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input"
              placeholder="john@company.com"
              disabled={loading || automationRan}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="input"
              placeholder="+1 (555) 123-4567"
              disabled={loading || automationRan}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Job title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="input"
                placeholder="Marketing Director"
                disabled={loading || automationRan}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Company</label>
              <select
                value={formData.company_id}
                onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
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

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={loading || automationRan}>
              Cancel
            </button>
            <button type="submit" disabled={loading || automationRan || !orgId} className="btn btn-primary">
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Creating...
                </>
              ) : automationRan ? (
                <>
                  <Zap size={16} className="mr-2" />
                  Created!
                </>
              ) : (
                'Create Contact'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
