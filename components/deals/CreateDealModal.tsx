'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUserOrgId } from '@/lib/org-helpers'
import { X, Loader2, Zap } from 'lucide-react'
import { ActivityLogger } from '@/lib/activity-logger'
import { onDealCreated } from '@/lib/automation-engine'
import { useIndustry } from '@/lib/contexts/IndustryContext'

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
  
  // Photographer-specific fields
  const [bookingType, setBookingType] = useState<string>('personal')
  const [numPeople, setNumPeople] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventStartTime, setEventStartTime] = useState('')
  const [eventEndTime, setEventEndTime] = useState('')
  const [locationType, setLocationType] = useState<string>('client')
  const [location, setLocation] = useState('')
  const [specialRequests, setSpecialRequests] = useState('')
  
  const supabase = createClient()
  const { terminology, config } = useIndustry()
  const isPhotographer = config.id === 'photographer'

  useEffect(() => {
    const init = async () => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      
      const id = await getCurrentUserOrgId()
      setOrgId(id)
      if (id) {
        loadRelatedData(id)
        
        // Verify user exists in users table before setting as owner
        if (user) {
          const { data: userRecord } = await supabase
            .from('users')
            .select('id')
            .eq('id', user.id)
            .single()
          
          if (userRecord) {
            setCurrentUserId(user.id)
            setOwnerId(user.id)
          }
        }
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
        company_id: isPhotographer ? null : (companyId || null),
        owner_id: ownerId || currentUserId || null,
        close_date: expectedCloseDate || null,
        org_id: orgId,
        // Photographer-specific fields
        ...(isPhotographer && {
          booking_type: bookingType,
          num_people: bookingType === 'event' && numPeople ? parseInt(numPeople) : null,
          event_date: eventDate || null,
          event_start_time: eventStartTime || null,
          event_end_time: eventEndTime || null,
          location_type: locationType,
          location: locationType === 'provided' ? location : null,
          special_requests: specialRequests || null,
        }),
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
          <h2 className="text-lg font-semibold text-gray-900">Create {terminology.deal}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
              {error}
            </div>
          )}

          {automationRan && (
            <div className="p-3 text-sm text-primary-700 bg-primary-50 border border-primary-200 rounded-lg flex items-center gap-2">
              <Zap size={16} className="text-primary-500" />
              <span>Task created: "Qualify {terminology.deal.toLowerCase()}: {name}"</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {terminology.deal} Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isPhotographer ? "e.g., Smith Wedding" : "e.g., Website Redesign Project"}
              required
              className="input"
              disabled={loading || automationRan}
            />
          </div>

          {/* Photographer: Booking Type */}
          {isPhotographer && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Booking Type *
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="bookingType"
                    value="personal"
                    checked={bookingType === 'personal'}
                    onChange={() => setBookingType('personal')}
                    disabled={loading || automationRan}
                    className="text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">Personal Shoot</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="bookingType"
                    value="event"
                    checked={bookingType === 'event'}
                    onChange={() => setBookingType('event')}
                    disabled={loading || automationRan}
                    className="text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">Event</span>
                </label>
              </div>
            </div>
          )}

          {/* Photographer: Number of People (for events) */}
          {isPhotographer && bookingType === 'event' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Number of People
              </label>
              <input
                type="number"
                value={numPeople}
                onChange={(e) => setNumPeople(e.target.value)}
                placeholder="e.g., 50"
                min="1"
                className="input"
                disabled={loading || automationRan}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {terminology.dealAmount}
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

          {/* Photographer: Event Date & Time */}
          {isPhotographer && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {terminology.closeDate}
                  </label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="input"
                    disabled={loading || automationRan}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={eventStartTime}
                      onChange={(e) => setEventStartTime(e.target.value)}
                      className="input"
                      disabled={loading || automationRan}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={eventEndTime}
                      onChange={(e) => setEventEndTime(e.target.value)}
                      className="input"
                      disabled={loading || automationRan}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Location
                </label>
                <div className="flex gap-4 mb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="locationType"
                      value="flexible"
                      checked={locationType === 'flexible'}
                      onChange={() => setLocationType('flexible')}
                      disabled={loading || automationRan}
                      className="text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">TBD / Flexible</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="locationType"
                      value="provided"
                      checked={locationType === 'provided'}
                      onChange={() => setLocationType('provided')}
                      disabled={loading || automationRan}
                      className="text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">Specific Location</span>
                  </label>
                </div>
                {locationType === 'provided' && (
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g., Central Park, NYC"
                    className="input"
                    disabled={loading || automationRan}
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Special Requests / Notes
                </label>
                <textarea
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  placeholder="Any special requests or notes for this booking..."
                  rows={2}
                  className="input resize-none"
                  disabled={loading || automationRan}
                />
              </div>
            </>
          )}

          {/* Contact / Client selector */}
          <div className={isPhotographer ? '' : 'grid grid-cols-2 gap-4'}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {terminology.contact}
              </label>
              <select
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
                className="input"
                disabled={loading || automationRan}
              >
                <option value="">Select {terminology.contact.toLowerCase()}...</option>
                {contacts.map(contact => (
                  <option key={contact.id} value={contact.id}>
                    {contact.first_name} {contact.last_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Company - only for non-photographer */}
            {!isPhotographer && (
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
            )}
          </div>

          {/* Owner and Close Date - for non-photographers */}
          {!isPhotographer && (
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
                  {terminology.closeDate}
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
          )}

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
                `Create ${terminology.deal}`
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
