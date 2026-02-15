'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUserOrgId } from '@/lib/org-helpers'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
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
  Clock,
  Paperclip,
  Sparkles,
  Loader2,
  Globe,
  Linkedin,
  Twitter
} from 'lucide-react'
import { ContactAvatar, CompanyLogo } from '@/components/shared/Avatars'
import { extractDomain, getCompanyLogoUrl } from '@/lib/enrichment'
import { formatDistanceToNow } from 'date-fns'
import { useIndustry } from '@/lib/contexts/IndustryContext'
import ActivityTimeline from '@/components/shared/ActivityTimeline'
import CreateTaskModal from '@/components/tasks/CreateTaskModal'
import FilesList, { FileRecord } from '@/components/files/FilesList'
import { LogCallModal, LogEmailModal, LogNoteModal, CommunicationTimeline } from '@/components/communications'

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
  avatar_url: string | null
  enrichment_data: any | null
  enrichment_source: string | null
  enriched_at: string | null
  companies: {
    id: string; name: string; logo_url?: string; domain?: string;
    description?: string; category?: string;
    google_rating?: number; google_review_count?: number;
    google_place_id?: string; business_hours?: any;
    employee_count?: string; linkedin_url?: string; twitter_url?: string; facebook_url?: string;
    enrichment_source?: string; enriched_at?: string;
  } | null
}

interface Deal {
  id: string
  name: string
  value: number
  pipeline_stages: { name: string; color: string }[] | { name: string; color: string } | null
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
  users: { full_name: string }[] | { full_name: string } | null
}

// Helper to get first item from Supabase join that could be array or object
const getFirst = <T,>(data: T[] | T | null): T | null => {
  if (!data) return null
  return Array.isArray(data) ? data[0] || null : data
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
  const [relatedFiles, setRelatedFiles] = useState<FileRecord[]>([])
  const [filesLoading, setFilesLoading] = useState(true)
  // Communication modals
  const [showCallModal, setShowCallModal] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [commRefreshKey, setCommRefreshKey] = useState(0)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [enriching, setEnriching] = useState(false)
  const [enrichmentData, setEnrichmentData] = useState<any>(null)
  const router = useRouter()
  const supabase = createClient()
  const { config } = useIndustry()

  useEffect(() => {
    const initOrg = async () => {
      const id = await getCurrentUserOrgId()
      setOrgId(id)
      // Get current user info for comm permissions
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
        const { data: profile } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single()
        if (profile?.role === 'admin') setIsAdmin(true)
      }
    }
    initOrg()
  }, [])

  useEffect(() => {
    if (orgId) {
      loadContact()
      loadRelatedFiles()
    }
  }, [params.id, orgId])

  const loadRelatedFiles = async () => {
    setFilesLoading(true)
    try {
      const res = await fetch(`/api/files/related?contact_id=${params.id}`)
      if (res.ok) {
        const data = await res.json()
        setRelatedFiles(data.files || [])
      }
    } catch (err) {
      console.error('Failed to load related files:', err)
    }
    setFilesLoading(false)
  }

  const loadContact = async () => {
    if (!orgId) return

    const [contactRes, dealsRes, tasksRes, activitiesRes] = await Promise.all([
      supabase
        .from('contacts')
        .select('*, companies(*)')
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
    if (dealsRes.data) setDeals(dealsRes.data as Deal[])
    if (tasksRes.data) setTasks(tasksRes.data as Task[])
    if (activitiesRes.data) setActivities(activitiesRes.data as Activity[])
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

  const handleEnrich = async () => {
    if (!contact) return
    setEnriching(true)

    try {
      const res = await fetch('/api/enrichment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_id: contact.id,
          company_id: contact.company_id,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setEnrichmentData(data)
        loadContact() // Refresh to get updated data
      }
    } catch (err) {
      console.error('Enrichment failed:', err)
    }
    setEnriching(false)
  }

  const domain = extractDomain(contact?.email)
  const enrichmentEnabled = config.features.showEnrichment
  const canEnrich = enrichmentEnabled && contact && domain && !contact.enriched_at
  const isEnriched = contact?.enriched_at != null

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="md" />
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
  const fullAddress = [contact.address, contact.city, contact.state, contact.zip, contact.country].filter(Boolean).join(', ')
  const contactMapsUrl = fullAddress ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}` : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/contacts" className="btn btn-ghost p-2">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-4">
            <ContactAvatar
              firstName={contact.first_name}
              lastName={contact.last_name}
              email={contact.email}
              avatarUrl={contact.avatar_url}
              size="xl"
            />
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
          <div className="flex flex-wrap gap-3">
            {contact.phone && (
              <button onClick={() => setShowCallModal(true)} className="btn btn-secondary">
                <Phone size={16} className="mr-2" />
                Log Call
              </button>
            )}
            {contact.email && (
              <button onClick={() => setShowEmailModal(true)} className="btn btn-secondary">
                <Mail size={16} className="mr-2" />
                Log Email
              </button>
            )}
            <button onClick={() => setShowNoteModal(true)} className="btn btn-secondary">
              <MessageSquare size={16} className="mr-2" />
              Add Note
            </button>
            <button onClick={() => setShowTaskModal(true)} className="btn btn-secondary">
              <Plus size={16} className="mr-2" />
              Add Task
            </button>
          </div>

          {/* Communications timeline */}
          <div className="card">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Communications</h2>
            </div>
            <CommunicationTimeline
              leadId={params.id}
              currentUserId={currentUserId || undefined}
              isAdmin={isAdmin}
              refreshKey={commRefreshKey}
            />
          </div>

          {/* Legacy activity timeline */}
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
              {fullAddress && (
                <div className="flex items-center gap-3 text-sm">
                  <MapPin size={16} className="text-gray-400" />
                  <a href={contactMapsUrl!} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-primary-600">{fullAddress}</a>
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

          {/* Company / Enrichment */}
          {(contact.companies || (enrichmentEnabled && domain)) && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Company</h3>
                {canEnrich && (
                  <button
                    onClick={handleEnrich}
                    disabled={enriching}
                    className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                  >
                    {enriching ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    {enriching ? 'Enriching...' : 'Enrich'}
                  </button>
                )}
                {isEnriched && (
                  <span className="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full font-medium">Enriched</span>
                )}
              </div>
              <div className="space-y-3">
                {/* Company header with logo */}
                <div className="flex items-center gap-3">
                  <CompanyLogo
                    domain={domain || contact.companies?.domain}
                    logoUrl={contact.companies?.logo_url}
                    email={contact.email}
                    name={contact.companies?.name || domain}
                    size="lg"
                  />
                  <div>
                    {contact.companies ? (
                      <Link href={`/companies/${contact.companies.id}`} className="font-medium text-gray-900 hover:text-primary-600">
                        {contact.companies.name}
                      </Link>
                    ) : domain ? (
                      <p className="font-medium text-gray-900">{domain}</p>
                    ) : null}
                    {contact.companies?.description && (
                      <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{contact.companies.description}</p>
                    )}
                    {contact.companies?.category && (
                      <p className="text-xs text-gray-400 mt-0.5">{contact.companies.category}</p>
                    )}
                  </div>
                </div>
                {/* Google rating (from Places enrichment) */}
                {contact.companies?.google_rating && (
                  <div className="flex items-center gap-2 text-sm">
                    <div className="flex items-center gap-1 text-yellow-500">
                      {'★'.repeat(Math.round(contact.companies.google_rating))}
                      {'☆'.repeat(5 - Math.round(contact.companies.google_rating))}
                    </div>
                    <span className="text-xs text-gray-500">
                      {contact.companies.google_rating}/5
                      {contact.companies.google_review_count ? ` (${contact.companies.google_review_count} reviews)` : ''}
                    </span>
                  </div>
                )}
                {/* Links */}
                <div className="flex items-center gap-2 flex-wrap">
                  {(domain || contact.companies?.domain) && (
                    <a href={`https://${domain || contact.companies?.domain}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-primary-600 bg-gray-50 px-2 py-1 rounded-md">
                      <Globe size={12} /> {domain || contact.companies?.domain}
                    </a>
                  )}
                  {contact.companies?.linkedin_url && (
                    <a href={contact.companies.linkedin_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 bg-gray-50 px-2 py-1 rounded-md">
                      <Linkedin size={12} /> LinkedIn
                    </a>
                  )}
                  {contact.companies?.twitter_url && (
                    <a href={contact.companies.twitter_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-sky-500 bg-gray-50 px-2 py-1 rounded-md">
                      <Twitter size={12} /> Twitter
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Deals */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Deals</h3>
              <span className="text-sm text-gray-500">{deals.length}</span>
            </div>
            {deals.length > 0 ? (
              <div className="space-y-3">
                {deals.map(deal => {
                  const stage = getFirst(deal.pipeline_stages)
                  return (
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
                      {stage && (
                        <span
                          className="inline-flex items-center gap-1 mt-1 text-xs"
                          style={{ color: stage.color }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: stage.color }}
                          />
                          {stage.name}
                        </span>
                      )}
                    </Link>
                  )
                })}
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

          {/* Related Files */}
          <div className="card">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="font-semibold flex items-center gap-2">
                <Paperclip size={16} className="text-gray-400" />
                Files
                {relatedFiles.length > 0 && <span className="text-sm font-normal text-gray-500">{relatedFiles.length}</span>}
              </h3>
            </div>
            <FilesList
              files={relatedFiles}
              loading={filesLoading}
              entityType="contact"
              entityId={params.id}
              onRefresh={loadRelatedFiles}
              showSource
            />
          </div>
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

      {/* Communication Modals */}
      {showCallModal && (
        <LogCallModal
          leadId={params.id}
          phoneNumber={contact.phone}
          contactName={fullName}
          onClose={() => setShowCallModal(false)}
          onSaved={() => setCommRefreshKey((k) => k + 1)}
        />
      )}

      {showEmailModal && (
        <LogEmailModal
          leadId={params.id}
          defaultEmail={contact.email}
          contactName={fullName}
          onClose={() => setShowEmailModal(false)}
          onSaved={() => setCommRefreshKey((k) => k + 1)}
        />
      )}

      {showNoteModal && (
        <LogNoteModal
          leadId={params.id}
          onClose={() => setShowNoteModal(false)}
          onSaved={() => setCommRefreshKey((k) => k + 1)}
        />
      )}
    </div>
  )
}
