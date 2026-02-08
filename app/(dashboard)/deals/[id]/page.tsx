'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUserOrgId } from '@/lib/org-helpers'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, DollarSign, Calendar, Building2, Edit2, Trash2, 
  Plus, CheckSquare, MessageSquare, Clock, X, UserCircle
} from 'lucide-react'
import { formatActivityTime, formatFullTimestamp } from '@/lib/date-utils'
import CreateTaskModal from '@/components/tasks/CreateTaskModal'
import { ActivityLogger } from '@/lib/activity-logger'
import { getSuggestedTasksForStage, SuggestedTask } from '@/lib/automation-engine'

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
      setDeal(dealRes.data)
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (!deal) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Deal not found</h2>
        <Link href="/deals" className="text-primary-600 mt-2 inline-block">Back to deals</Link>
      </div>
    )
  }

  const currentStage = stages.find(s => s.id === deal.stage_id)
  const dealAmount = deal.amount || 0

  const company = getFirst(deal.companies)
  const contact = getFirst(deal.contacts)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/deals" className="btn btn-ghost p-2"><ArrowLeft size={20} /></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{deal.name}</h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
            {dealAmount > 0 && <span className="font-medium text-gray-900">${dealAmount.toLocaleString()}</span>}
            {company && (
              <>
                <span>·</span>
                <Link href={`/companies/${company.id}`} className="hover:text-primary-600">
                  {company.name}
                </Link>
              </>
            )}
          </div>
        </div>
        <button onClick={() => setShowEditModal(true)} className="btn btn-secondary">
          <Edit2 size={16} className="mr-2" />Edit
        </button>
        <button onClick={handleDelete} className="btn btn-ghost text-red-600 hover:bg-red-50">
          <Trash2 size={16} />
        </button>
      </div>

      {/* Pipeline stages */}
      <div className="card p-4">
        <div className="flex items-center gap-1">
          {stages.map((stage, idx) => {
            const isActive = stage.id === deal.stage_id
            const isPast = stages.findIndex(s => s.id === deal.stage_id) > idx
            return (
              <button
                key={stage.id}
                onClick={() => handleStageClick(stage.id, stage.name)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
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

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="flex gap-3">
            <button onClick={() => setShowTaskModal(true)} className="btn btn-secondary">
              <Plus size={16} className="mr-2" />Add Task
            </button>
          </div>

          <div className="card p-4">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                <MessageSquare size={16} className="text-gray-600" />
              </div>
              <div className="flex-1">
                <textarea 
                  value={newNote} 
                  onChange={(e) => setNewNote(e.target.value)} 
                  placeholder="Add a note..." 
                  rows={2} 
                  className="input resize-none" 
                />
                {newNote.trim() && (
                  <div className="mt-2 flex justify-end">
                    <button onClick={handleAddNote} disabled={savingNote} className="btn btn-primary">
                      {savingNote ? 'Saving...' : 'Add Note'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Activity</h2>
            </div>
            {activities.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {activities.map(activity => (
                  <div key={activity.id} className="p-4">
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
              <div className="p-6 text-center text-gray-500">No activity yet</div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="font-semibold mb-4 text-gray-900">Deal Info</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <DollarSign size={16} className="text-gray-400" />
                <span className="text-gray-600">${dealAmount.toLocaleString()}</span>
              </div>
              {currentStage && (
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: currentStage.color }} />
                  <span className="text-gray-600">{currentStage.name}</span>
                </div>
              )}
              {deal.close_date && (
                <div className="flex items-center gap-3">
                  <Calendar size={16} className="text-gray-400" />
                  <span className="text-gray-600">Close: {new Date(deal.close_date).toLocaleDateString()}</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Clock size={16} className="text-gray-400" />
                <span className="text-gray-500">{formatFullTimestamp(deal.created_at)}</span>
              </div>
              <div className="flex items-center gap-3">
                <UserCircle size={16} className="text-gray-400" />
                <span className="text-gray-500">Created by Demo User</span>
              </div>
            </div>
          </div>

          {contact && (
            <div className="card p-6">
              <h3 className="font-semibold mb-4 text-gray-900">Contact</h3>
              <Link href={`/contacts/${contact.id}`} className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                <p className="font-medium text-gray-900">{contact.first_name} {contact.last_name}</p>
                {contact.email && <p className="text-xs text-gray-500">{contact.email}</p>}
              </Link>
            </div>
          )}

          {company && (
            <div className="card p-6">
              <h3 className="font-semibold mb-4 text-gray-900">Company</h3>
              <Link href={`/companies/${company.id}`} className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                <div className="flex items-center gap-3">
                  <Building2 size={16} className="text-gray-400" />
                  <span className="font-medium text-gray-900">{company.name}</span>
                </div>
              </Link>
            </div>
          )}

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Open Tasks</h3>
              <span className="text-sm text-gray-500">{tasks.length}</span>
            </div>
            {tasks.length > 0 ? (
              <div className="space-y-2">
                {tasks.map(t => (
                  <div key={t.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                    <CheckSquare size={16} className="text-gray-400" />
                    <div className="flex-1">
                      <p className="text-sm font-medium truncate text-gray-900">{t.title}</p>
                      {t.due_date && <p className="text-xs text-gray-500">Due {new Date(t.due_date).toLocaleDateString()}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No open tasks</p>
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
                    Suggested tasks for {currentStage.name}
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
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Change Deal Stage</h2>
              <button onClick={() => setStageConfirmation(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-gray-600">
                Are you sure you want to move <strong>{deal.name}</strong> to <strong>{stageConfirmation.stageName}</strong>?
              </p>
              <div className="flex justify-end gap-3 mt-6">
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
  const [name, setName] = useState(deal.name)
  const [amount, setAmount] = useState(deal.amount?.toString() || '')
  const [stageId, setStageId] = useState(deal.stage_id)
  const [contactId, setContactId] = useState(deal.contact_id || '')
  const [companyId, setCompanyId] = useState(deal.company_id || '')
  const [closeDate, setCloseDate] = useState(deal.close_date || '')
  const [description, setDescription] = useState(deal.description || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error: updateError } = await supabase
      .from('deals')
      .update({
        name,
        amount: amount ? parseFloat(amount) : null,
        stage_id: stageId,
        contact_id: contactId || null,
        company_id: companyId || null,
        close_date: closeDate || null,
        description: description || null
      })
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-gray-900">Edit Deal</h2>
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Deal Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="input"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact</label>
              <select value={contactId} onChange={(e) => setContactId(e.target.value)} className="input">
                <option value="">None</option>
                {contacts.map(c => (
                  <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Company</label>
              <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="input">
                <option value="">None</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Expected Close Date</label>
            <input
              type="date"
              value={closeDate}
              onChange={(e) => setCloseDate(e.target.value)}
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="input resize-none"
              placeholder="Add notes about this deal..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
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
