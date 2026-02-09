'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUserOrgId } from '@/lib/org-helpers'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, DollarSign, Calendar, Building2, Edit2, Trash2, 
  Plus, CheckSquare, MessageSquare, Clock, X, UserCircle, MapPin, Users, Camera
} from 'lucide-react'
import { formatActivityTime, formatFullTimestamp } from '@/lib/date-utils'
import CreateTaskModal from '@/components/tasks/CreateTaskModal'
import { ActivityLogger } from '@/lib/activity-logger'
import { getSuggestedTasksForStage, SuggestedTask } from '@/lib/automation-engine'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
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

interface Deal {
  id: string
  name: string
  amount: number | null
  stage_id: string
  pipeline_id: string
  contact_id: string | null
  company_id: string | null
  close_date: string | null
  description: string | null
  created_at: string
  contacts: { id: string; first_name: string; last_name: string; email: string | null }[] | { id: string; first_name: string; last_name: string; email: string | null } | null
  companies: { id: string; name: string }[] | { id: string; name: string } | null
  // Photographer fields
  booking_type: 'personal' | 'event' | null
  num_people: number | null
  event_date: string | null
  event_start_time: string | null
  event_end_time: string | null
  location_type: 'provided' | 'flexible' | null
  location: string | null
  special_requests: string | null
}

interface Task {
  id: string
  title: string
  status: string
  due_date: string | null
}

interface Activity {
  id: string
  activity_type: string
  subject: string | null
  body: string | null
  created_at: string
  metadata: any
}

// Helper to get first item from Supabase join that could be array or object
const getFirst = <T,>(data: T[] | T | null): T | null => {
  if (!data) return null
  return Array.isArray(data) ? data[0] || null : data
}

export default function DealDetailPage({ params }: { params: { id: string } }) {
  const [deal, setDeal] = useState<Deal | null>(null)
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [stageConfirmation, setStageConfirmation] = useState<{ stageId: string; stageName: string } | null>(null)
  const [showSuggestedTasks, setShowSuggestedTasks] = useState(false)
  const [creatingSuggestedTask, setCreatingSuggestedTask] = useState(false)
  const [orgId, setOrgId] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()
  const { terminology, config } = useIndustry()
  const isPhotographer = config.id === 'photographer'

  useEffect(() => {
    const initOrg = async () => {
      const id = await getCurrentUserOrgId()
      setOrgId(id)
    }
    initOrg()
  }, [])

  useEffect(() => {
    if (orgId) {
      loadDeal()
      loadContactsAndCompanies()
    }
  }, [params.id, orgId])

  const loadDeal = async () => {
    if (!orgId) return
    
    const dealRes = await supabase
      .from('deals')
      .select('*, contacts(id, first_name, last_name, email), companies(id, name)')
      .eq('id', params.id)
      .eq('org_id', orgId)
      .single()

    if (dealRes.data) {
      setDeal(dealRes.data as Deal)
      const [stagesRes, tasksRes, activitiesRes] = await Promise.all([
        supabase.from('pipeline_stages').select('*').eq('pipeline_id', dealRes.data.pipeline_id).order('position'),
        supabase.from('tasks').select('id, title, status, due_date').eq('deal_id', params.id).neq('status', 'completed'),
        supabase.from('activities').select('id, activity_type, subject, body, created_at, metadata').eq('deal_id', params.id).order('created_at', { ascending: false }).limit(20)
      ])
      if (stagesRes.data) setStages(stagesRes.data)
      if (tasksRes.data) setTasks(tasksRes.data)
      if (activitiesRes.data) setActivities(activitiesRes.data)
    }
    setLoading(false)
  }

  const loadContactsAndCompanies = async () => {
    if (!orgId) return
    
    const [contactsRes, companiesRes] = await Promise.all([
      supabase.from('contacts').select('id, first_name, last_name').eq('org_id', orgId).order('first_name'),
      supabase.from('companies').select('id, name').eq('org_id', orgId).order('name')
    ])
    if (contactsRes.data) setContacts(contactsRes.data)
    if (companiesRes.data) setCompanies(companiesRes.data)
  }

  const handleStageClick = (stageId: string, stageName: string) => {
    if (!deal || stageId === deal.stage_id) return
    setStageConfirmation({ stageId, stageName })
  }

  const confirmStageChange = async () => {
    if (!deal || !stageConfirmation) return
    
    const oldStage = stages.find(s => s.id === deal.stage_id)
    
    setDeal({ ...deal, stage_id: stageConfirmation.stageId })
    await supabase.from('deals').update({ stage_id: stageConfirmation.stageId }).eq('id', params.id)
    
    await ActivityLogger.dealStageChanged({
      id: params.id,
      name: deal.name,
      old_stage: oldStage?.name || 'Unknown',
      new_stage: stageConfirmation.stageName
    })
    
    setStageConfirmation(null)
    loadDeal()
  }

  const handleDelete = async () => {
    if (!confirm('Delete this deal?')) return
    await supabase.from('deals').delete().eq('id', params.id)
    router.push('/deals')
  }

  const handleAddNote = async () => {
    if (!newNote.trim() || !deal) return
    setSavingNote(true)
    
    await ActivityLogger.noteAdded({
      entity_type: 'deal',
      entity_id: params.id,
      entity_name: deal.name,
      note: newNote,
      dealId: params.id
    })
    
    setNewNote('')
    setSavingNote(false)
    loadDeal()
  }

  const handleCreateSuggestedTask = async (suggestion: SuggestedTask) => {
    if (!deal || !orgId) return
    setCreatingSuggestedTask(true)
    
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + suggestion.dueDays)
    
    await supabase.from('tasks').insert({
      title: suggestion.title,
      description: suggestion.description,
      priority: suggestion.priority,
      due_date: dueDate.toISOString().split('T')[0],
      status: 'open',
      deal_id: params.id,
      contact_id: deal.contact_id,
      company_id: deal.company_id,
      org_id: orgId
    })
    
    setCreatingSuggestedTask(false)
    setShowSuggestedTasks(false)
    loadDeal()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="md" />
      </div>
    )
  }

  if (!deal) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">{terminology.deal} not found</h2>
        <Link href="/deals" className="text-primary-600 mt-2 inline-block">Back to {terminology.deals.toLowerCase()}</Link>
      </div>
    )
  }

  const currentStage = stages.find(s => s.id === deal.stage_id)
  const dealAmount = deal.amount || 0

  const company = getFirst(deal.companies)
  const contact = getFirst(deal.contacts)

  // Format time for display (HH:MM:SS -> HH:MM AM/PM)
  const formatTime = (time: string | null) => {
    if (!time) return null
    try {
      const [hours, minutes] = time.split(':')
      const h = parseInt(hours)
      const ampm = h >= 12 ? 'PM' : 'AM'
      const h12 = h % 12 || 12
      return `${h12}:${minutes} ${ampm}`
    } catch {
      return time
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header - Mobile responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <Link href="/deals" className="btn btn-ghost p-2 self-start"><ArrowLeft size={20} /></Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{deal.name}</h1>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1 text-sm text-gray-500">
            {dealAmount > 0 && <span className="font-medium text-gray-900">${dealAmount.toLocaleString()}</span>}
            {!isPhotographer && company && (
              <>
                <span className="hidden sm:inline">·</span>
                <Link href={`/companies/${company.id}`} className="hover:text-primary-600">
                  {company.name}
                </Link>
              </>
            )}
            {isPhotographer && deal.booking_type && (
              <>
                <span className="hidden sm:inline">·</span>
                <span className="capitalize">{deal.booking_type} shoot</span>
              </>
            )}
          </div>
        </div>
        <div className="flex gap-2 self-start sm:self-center">
          <button onClick={() => setShowEditModal(true)} className="btn btn-secondary">
            <Edit2 size={16} className="sm:mr-2" />
            <span className="hidden sm:inline">Edit</span>
          </button>
          <button onClick={handleDelete} className="btn btn-ghost text-red-600 hover:bg-red-50">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Pipeline stages - horizontally scrollable on mobile */}
      <div className="card p-3 sm:p-4 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max sm:min-w-0">
          {stages.map((stage, idx) => {
            const isActive = stage.id === deal.stage_id
            const isPast = stages.findIndex(s => s.id === deal.stage_id) > idx
            return (
              <button
                key={stage.id}
                onClick={() => handleStageClick(stage.id, stage.name)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-2 sm:px-3 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                  isActive ? 'text-white' : isPast ? 'bg-gray-100 text-gray-600' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                }`}
                style={isActive ? { backgroundColor: stage.color } : {}}
              >
                {stage.name}
              </button>
            )
          })}
        </div>
      </div>

      {/* Main content - responsive grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left column - Activity */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <button onClick={() => setShowTaskModal(true)} className="btn btn-secondary text-sm">
              <Plus size={16} className="mr-1 sm:mr-2" />Add {terminology.task}
            </button>
          </div>

          {/* Note input */}
          <div className="card p-3 sm:p-4">
            <div className="flex gap-3">
              <div className="hidden sm:flex w-8 h-8 rounded-full bg-gray-200 items-center justify-center shrink-0">
                <MessageSquare size={16} className="text-gray-600" />
              </div>
              <div className="flex-1">
                <textarea 
                  value={newNote} 
                  onChange={(e) => setNewNote(e.target.value)} 
                  placeholder="Add a note..." 
                  rows={2} 
                  className="input resize-none text-sm" 
                />
                {newNote.trim() && (
                  <div className="mt-2 flex justify-end">
                    <button onClick={handleAddNote} disabled={savingNote} className="btn btn-primary text-sm">
                      {savingNote ? 'Saving...' : 'Add Note'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Activity feed */}
          <div className="card">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">{terminology.activity}</h2>
            </div>
            {activities.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {activities.map(activity => (
                  <div key={activity.id} className="p-3 sm:p-4">
                    <p className="text-sm text-gray-900">
                      {activity.subject}
                    </p>
                    {activity.body && (
                      <p className="text-sm text-gray-500 mt-1 bg-gray-50 p-2 rounded">
                        {activity.body}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Clock size={12} className="text-gray-400" />
                      <span className="text-xs text-gray-400">
                        {formatActivityTime(activity.created_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 sm:p-6 text-center text-gray-500 text-sm">No activity yet</div>
            )}
          </div>
        </div>

        {/* Right column - Info cards */}
        <div className="space-y-4 sm:space-y-6">
          {/* Photographer: Booking Details */}
          {isPhotographer && (deal.event_date || deal.location || deal.booking_type) && (
            <div className="card p-4 sm:p-6">
              <h3 className="font-semibold mb-4 text-gray-900 flex items-center gap-2">
                <Camera size={16} className="text-gray-400" />
                Booking Details
              </h3>
              <div className="space-y-3 text-sm">
                {deal.booking_type && (
                  <div className="flex items-start gap-3">
                    <Users size={16} className="text-gray-400 mt-0.5" />
                    <div>
                      <span className="text-gray-600 capitalize">{deal.booking_type} shoot</span>
                      {deal.booking_type === 'event' && deal.num_people && (
                        <span className="text-gray-500 ml-1">({deal.num_people} people)</span>
                      )}
                    </div>
                  </div>
                )}
                {deal.event_date && (
                  <div className="flex items-start gap-3">
                    <Calendar size={16} className="text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-gray-600">{new Date(deal.event_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                      {(deal.event_start_time || deal.event_end_time) && (
                        <p className="text-gray-500 text-xs mt-0.5">
                          {formatTime(deal.event_start_time)} {deal.event_end_time && `- ${formatTime(deal.event_end_time)}`}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                {(deal.location || deal.location_type) && (
                  <div className="flex items-start gap-3">
                    <MapPin size={16} className="text-gray-400 mt-0.5" />
                    <div>
                      {deal.location ? (
                        <p className="text-gray-600">{deal.location}</p>
                      ) : deal.location_type === 'flexible' ? (
                        <p className="text-gray-500 italic">Location TBD</p>
                      ) : null}
                    </div>
                  </div>
                )}
                {deal.special_requests && (
                  <div className="pt-2 mt-2 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-1">Special Requests</p>
                    <p className="text-gray-600 text-sm">{deal.special_requests}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Deal/Booking Info */}
          <div className="card p-4 sm:p-6">
            <h3 className="font-semibold mb-4 text-gray-900">{terminology.deal} Info</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <DollarSign size={16} className="text-gray-400" />
                <span className="text-gray-600">${dealAmount.toLocaleString()}</span>
              </div>
              {currentStage && (
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: currentStage.color }} />
                  <span className="text-gray-600">{currentStage.name}</span>
                </div>
              )}
              {!isPhotographer && deal.close_date && (
                <div className="flex items-center gap-3">
                  <Calendar size={16} className="text-gray-400" />
                  <span className="text-gray-600">{terminology.closeDate}: {new Date(deal.close_date).toLocaleDateString()}</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Clock size={16} className="text-gray-400" />
                <span className="text-gray-500 text-xs">{formatFullTimestamp(deal.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Contact / Client */}
          {contact && (
            <div className="card p-4 sm:p-6">
              <h3 className="font-semibold mb-4 text-gray-900">{terminology.contact}</h3>
              <Link href={`/contacts/${contact.id}`} className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                <p className="font-medium text-gray-900">{contact.first_name} {contact.last_name}</p>
                {contact.email && <p className="text-xs text-gray-500 truncate">{contact.email}</p>}
              </Link>
            </div>
          )}

          {/* Company - only for non-photographer */}
          {!isPhotographer && company && (
            <div className="card p-4 sm:p-6">
              <h3 className="font-semibold mb-4 text-gray-900">Company</h3>
              <Link href={`/companies/${company.id}`} className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                <div className="flex items-center gap-3">
                  <Building2 size={16} className="text-gray-400" />
                  <span className="font-medium text-gray-900">{company.name}</span>
                </div>
              </Link>
            </div>
          )}

          {/* Open Tasks */}
          <div className="card p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Open {terminology.tasks}</h3>
              <span className="text-sm text-gray-500">{tasks.length}</span>
            </div>
            {tasks.length > 0 ? (
              <div className="space-y-2">
                {tasks.map(t => (
                  <div key={t.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                    <CheckSquare size={16} className="text-gray-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-gray-900">{t.title}</p>
                      {t.due_date && <p className="text-xs text-gray-500">Due {new Date(t.due_date).toLocaleDateString()}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No open {terminology.tasks.toLowerCase()}</p>
            )}

            {/* Suggested Tasks */}
            {currentStage && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="relative">
                  <button
                    onClick={() => setShowSuggestedTasks(!showSuggestedTasks)}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                  >
                    <Plus size={14} />
                    Suggested {terminology.tasks.toLowerCase()} for {currentStage.name}
                  </button>
                  
                  {showSuggestedTasks && (
                    <div className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                      <div className="p-2 space-y-1">
                        {getSuggestedTasksForStage(currentStage.name).map((suggestion, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleCreateSuggestedTask(suggestion)}
                            disabled={creatingSuggestedTask}
                            className="w-full text-left p-2 rounded hover:bg-gray-50 transition-colors"
                          >
                            <p className="text-sm font-medium text-gray-900">{suggestion.title}</p>
                            <p className="text-xs text-gray-500">
                              Due in {suggestion.dueDays} day{suggestion.dueDays !== 1 ? 's' : ''} · {suggestion.priority} priority
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showTaskModal && (
        <CreateTaskModal 
          onClose={() => setShowTaskModal(false)} 
          onCreated={() => { setShowTaskModal(false); loadDeal() }} 
          prefillDealId={params.id} 
        />
      )}

      {showEditModal && (
        <EditDealModal 
          deal={deal}
          stages={stages}
          contacts={contacts}
          companies={companies}
          onClose={() => setShowEditModal(false)}
          onSaved={() => { setShowEditModal(false); loadDeal() }}
        />
      )}

      {stageConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-slide-up">
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Change {terminology.deal} Stage</h2>
              <button onClick={() => setStageConfirmation(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 sm:p-6">
              <p className="text-gray-600">
                Are you sure you want to move <strong>{deal.name}</strong> to <strong>{stageConfirmation.stageName}</strong>?
              </p>
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 mt-6">
                <button onClick={() => setStageConfirmation(null)} className="btn btn-secondary">Cancel</button>
                <button onClick={confirmStageChange} className="btn btn-primary">Confirm</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface EditDealModalProps {
  deal: Deal
  stages: PipelineStage[]
  contacts: Contact[]
  companies: Company[]
  onClose: () => void
  onSaved: () => void
}

function EditDealModal({ deal, stages, contacts, companies, onClose, onSaved }: EditDealModalProps) {
  const { terminology, config } = useIndustry()
  const isPhotographer = config.type === 'photographer'
  
  const [name, setName] = useState(deal.name)
  const [amount, setAmount] = useState(deal.amount?.toString() || '')
  const [stageId, setStageId] = useState(deal.stage_id)
  const [contactId, setContactId] = useState(deal.contact_id || '')
  const [companyId, setCompanyId] = useState(deal.company_id || '')
  const [closeDate, setCloseDate] = useState(deal.close_date || '')
  const [description, setDescription] = useState(deal.description || '')
  
  // Photographer-specific fields
  const [bookingType, setBookingType] = useState(deal.booking_type || 'personal')
  const [numPeople, setNumPeople] = useState(deal.num_people?.toString() || '')
  const [eventDate, setEventDate] = useState(deal.event_date || '')
  const [eventStartTime, setEventStartTime] = useState(deal.event_start_time || '')
  const [eventEndTime, setEventEndTime] = useState(deal.event_end_time || '')
  const [locationType, setLocationType] = useState(deal.location_type || 'client')
  const [location, setLocation] = useState(deal.location || '')
  const [specialRequests, setSpecialRequests] = useState(deal.special_requests || '')
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const updateData: Record<string, unknown> = {
      name,
      amount: amount ? parseFloat(amount) : null,
      stage_id: stageId,
      contact_id: contactId || null,
      company_id: companyId || null,
      close_date: closeDate || null,
      description: description || null
    }

    // Add photographer fields if applicable
    if (isPhotographer) {
      updateData.booking_type = bookingType
      updateData.num_people = numPeople ? parseInt(numPeople) : null
      updateData.event_date = eventDate || null
      updateData.event_start_time = eventStartTime || null
      updateData.event_end_time = eventEndTime || null
      updateData.location_type = locationType
      updateData.location = location || null
      updateData.special_requests = specialRequests || null
    }

    const { error: updateError } = await supabase
      .from('deals')
      .update(updateData)
      .eq('id', deal.id)

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-gray-900">Edit {terminology.deal}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
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
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{terminology.deal} Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="input"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Value</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="0"
                  step="0.01"
                  className="input pl-7"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Stage</label>
              <select value={stageId} onChange={(e) => setStageId(e.target.value)} className="input">
                {stages.map(stage => (
                  <option key={stage.id} value={stage.id}>{stage.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={`grid gap-4 ${isPhotographer ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{terminology.contact}</label>
              <select value={contactId} onChange={(e) => setContactId(e.target.value)} className="input">
                <option value="">None</option>
                {contacts.map(c => (
                  <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                ))}
              </select>
            </div>
            {!isPhotographer && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{terminology.company}</label>
                <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="input">
                  <option value="">None</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Photographer-specific fields */}
          {isPhotographer && (
            <>
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Camera size={16} className="text-primary-600" />
                  Session Details
                </h3>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Booking Type</label>
                      <select value={bookingType} onChange={(e) => setBookingType(e.target.value)} className="input">
                        <option value="personal">Personal Shoot</option>
                        <option value="event">Event Coverage</option>
                        <option value="commercial">Commercial/Business</option>
                        <option value="wedding">Wedding</option>
                        <option value="portrait">Portrait Session</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Number of People</label>
                      <input
                        type="number"
                        value={numPeople}
                        onChange={(e) => setNumPeople(e.target.value)}
                        min="1"
                        className="input"
                        placeholder="e.g., 2"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Event Date</label>
                    <input
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="input"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Start Time</label>
                      <input
                        type="time"
                        value={eventStartTime}
                        onChange={(e) => setEventStartTime(e.target.value)}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">End Time</label>
                      <input
                        type="time"
                        value={eventEndTime}
                        onChange={(e) => setEventEndTime(e.target.value)}
                        className="input"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Location Type</label>
                    <select value={locationType} onChange={(e) => setLocationType(e.target.value)} className="input">
                      <option value="client">Client&apos;s Location</option>
                      <option value="studio">My Studio</option>
                      <option value="outdoor">Outdoor Location</option>
                      <option value="venue">Event Venue</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Location Address</label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="input"
                      placeholder="Full address or location name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Special Requests</label>
                    <textarea
                      value={specialRequests}
                      onChange={(e) => setSpecialRequests(e.target.value)}
                      rows={2}
                      className="input resize-none"
                      placeholder="Any special requirements or requests..."
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {!isPhotographer && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Expected Close Date</label>
              <input
                type="date"
                value={closeDate}
                onChange={(e) => setCloseDate(e.target.value)}
                className="input"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {isPhotographer ? 'Notes' : 'Description'}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="input resize-none"
              placeholder={isPhotographer ? 'Add notes about this booking...' : 'Add notes about this deal...'}
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
