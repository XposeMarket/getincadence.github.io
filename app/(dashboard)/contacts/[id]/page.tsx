'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUserOrgId } from '@/lib/org-helpers'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  Building2, 
  MapPin,
  Edit2,
  Trash2,
  Plus,
  Handshake,
  CheckSquare,
  MessageSquare,
  Clock
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import ActivityTimeline from '@/components/shared/ActivityTimeline'
import CreateTaskModal from '@/components/tasks/CreateTaskModal'

interface Contact {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  title: string | null
  company_id: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  country: string | null
  notes: string | null
  created_at: string
  companies: { id: string; name: string } | null
}

interface Deal {
  id: string
  name: string
  value: number
  pipeline_stages: { name: string; color: string }
}

interface Task {
  id: string
  title: string
  status: string
  due_date: string | null
  priority: string
}

interface Activity {
  id: string
  type: string
  content: string
  created_at: string
  users: { full_name: string } | null
}

export default function ContactDetailPage({ params }: { params: { id: string } }) {
  const [contact, setContact] = useState<Contact | null>(null)
  const [deals, setDeals] = useState<Deal[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)
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
      loadContact()
    }
  }, [params.id, orgId])

  const loadContact = async () => {
    if (!orgId) return

    const [contactRes, dealsRes, tasksRes, activitiesRes] = await Promise.all([
      supabase
        .from('contacts')
        .select('*, companies(id, name)')
        .eq('id', params.id)
        .eq('org_id', orgId)
        .single(),
      supabase
        .from('deals')
        .select('id, name, value, pipeline_stages(name, color)')
        .eq('contact_id', params.id),
      supabase
        .from('tasks')
        .select('id, title, status, due_date, priority')
        .eq('contact_id', params.id)
        .neq('status', 'completed')
        .order('due_date', { ascending: true }),
      supabase
        .from('activities')
        .select('id, type, content, created_at, users(full_name)')
        .eq('contact_id', params.id)
        .order('created_at', { ascending: false })
        .limit(20)
    ])

    if (contactRes.data) setContact(contactRes.data)
    if (dealsRes.data) setDeals(dealsRes.data)
    if (tasksRes.data) setTasks(tasksRes.data)
    if (activitiesRes.data) setActivities(activitiesRes.data)
    setLoading(false)
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this contact? This action cannot be undone.')) return

    await supabase.from('contacts').delete().eq('id', params.id)
    router.push('/contacts')
  }

  const handleAddNote = async () => {
    if (!newNote.trim()) return
    setSavingNote(true)

    await supabase.from('activities').insert({
      contact_id: params.id,
      type: 'note',
      content: newNote,
    })

    setNewNote('')
    setSavingNote(false)
    loadContact()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (!contact) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Contact not found</h2>
        <Link href="/contacts" className="text-primary-600 hover:text-primary-700 mt-2 inline-block">
          Back to contacts
        </Link>
      </div>
    )
  }

  const fullName = `${contact.first_name} ${contact.last_name}`
  const initials = `${contact.first_name[0]}${contact.last_name[0]}`.toUpperCase()
  const location = [contact.city, contact.state, contact.country].filter(Boolean).join(', ')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/contacts" className="btn btn-ghost p-2">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cadence-pink to-cadence-teal flex items-center justify-center text-white text-xl font-semibold">
              {initials}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{fullName}</h1>
              {contact.title && (
                <p className="text-gray-500">{contact.title}</p>
              )}
              {contact.companies && (
                <Link href={`/companies/${contact.companies.id}`} className="text-primary-600 hover:text-primary-700 text-sm">
                  {contact.companies.name}
                </Link>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-secondary">
            <Edit2 size={16} className="mr-2" />
            Edit
          </button>
          <button onClick={handleDelete} className="btn btn-ghost text-red-600 hover:bg-red-50">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main content */}
        <div className="col-span-2 space-y-6">
          {/* Quick actions */}
          <div className="flex gap-3">
            {contact.email && (
              <a href={`mailto:${contact.email}`} className="btn btn-secondary">
                <Mail size={16} className="mr-2" />
                Email
              </a>
            )}
            {contact.phone && (
              <a href={`tel:${contact.phone}`} className="btn btn-secondary">
                <Phone size={16} className="mr-2" />
                Call
              </a>
            )}
            <button onClick={() => setShowTaskModal(true)} className="btn btn-secondary">
              <Plus size={16} className="mr-2" />
              Add Task
            </button>
          </div>

          {/* Add note */}
          <div className="card p-4">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600">
                <MessageSquare size={16} />
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
                    <button
                      onClick={handleAddNote}
                      disabled={savingNote}
                      className="btn btn-primary"
                    >
                      {savingNote ? 'Saving...' : 'Add Note'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Activity timeline */}
          <div className="card">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Activity</h2>
            </div>
            <ActivityTimeline activities={activities} />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Contact info */}
          <div className="card p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Contact Info</h3>
            <div className="space-y-3">
              {contact.email && (
                <div className="flex items-center gap-3 text-sm">
                  <Mail size={16} className="text-gray-400" />
                  <a href={`mailto:${contact.email}`} className="text-gray-600 hover:text-primary-600">
                    {contact.email}
                  </a>
                </div>
              )}
              {contact.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone size={16} className="text-gray-400" />
                  <a href={`tel:${contact.phone}`} className="text-gray-600 hover:text-primary-600">
                    {contact.phone}
                  </a>
                </div>
              )}
              {contact.companies && (
                <div className="flex items-center gap-3 text-sm">
                  <Building2 size={16} className="text-gray-400" />
                  <Link href={`/companies/${contact.companies.id}`} className="text-gray-600 hover:text-primary-600">
                    {contact.companies.name}
                  </Link>
                </div>
              )}
              {location && (
                <div className="flex items-center gap-3 text-sm">
                  <MapPin size={16} className="text-gray-400" />
                  <span className="text-gray-600">{location}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-sm">
                <Clock size={16} className="text-gray-400" />
                <span className="text-gray-500">
                  Added {formatDistanceToNow(new Date(contact.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>

          {/* Deals */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Deals</h3>
              <span className="text-sm text-gray-500">{deals.length}</span>
            </div>
            {deals.length > 0 ? (
              <div className="space-y-3">
                {deals.map(deal => (
                  <Link
                    key={deal.id}
                    href={`/deals/${deal.id}`}
                    className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">{deal.name}</span>
                      <span className="text-sm font-medium text-gray-600">
                        ${deal.value.toLocaleString()}
                      </span>
                    </div>
                    {deal.pipeline_stages && (
                      <span
                        className="inline-flex items-center gap-1 mt-1 text-xs"
                        style={{ color: deal.pipeline_stages.color }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: deal.pipeline_stages.color }}
                        />
                        {deal.pipeline_stages.name}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No deals yet</p>
            )}
          </div>

          {/* Tasks */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Open Tasks</h3>
              <span className="text-sm text-gray-500">{tasks.length}</span>
            </div>
            {tasks.length > 0 ? (
              <div className="space-y-2">
                {tasks.map(task => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"
                  >
                    <CheckSquare size={16} className="text-gray-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                      {task.due_date && (
                        <p className="text-xs text-gray-500">
                          Due {new Date(task.due_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No open tasks</p>
            )}
          </div>

          {/* Notes */}
          {contact.notes && (
            <div className="card p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Notes</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{contact.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Task Modal */}
      {showTaskModal && (
        <CreateTaskModal
          onClose={() => setShowTaskModal(false)}
          onCreated={() => {
            setShowTaskModal(false)
            loadContact()
          }}
          prefillContactId={params.id}
        />
      )}
    </div>
  )
}
