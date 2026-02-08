'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUserOrgId } from '@/lib/org-helpers'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, Globe, Phone, MapPin, Edit2, Trash2, Plus,
  Users, Handshake, CheckSquare, MessageSquare, Clock, Building2
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import ActivityTimeline from '@/components/shared/ActivityTimeline'
import CreateTaskModal from '@/components/tasks/CreateTaskModal'

interface Company {
  id: string
  name: string
  website: string | null
  phone: string | null
  industry: string | null
  size: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  country: string | null
  notes: string | null
  created_at: string
}

interface Contact {
  id: string
  first_name: string
  last_name: string
  email: string | null
  title: string | null
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
}

interface Activity {
  id: string
  type: string
  content: string
  created_at: string
  users: { full_name: string } | null
}

export default function CompanyDetailPage({ params }: { params: { id: string } }) {
  const [company, setCompany] = useState<Company | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
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
      loadCompany()
    }
  }, [params.id, orgId])

  const loadCompany = async () => {
    if (!orgId) return
    
    const [companyRes, contactsRes, dealsRes, tasksRes, activitiesRes] = await Promise.all([
      supabase.from('companies').select('*').eq('id', params.id).eq('org_id', orgId).single(),
      supabase.from('contacts').select('id, first_name, last_name, email, title').eq('company_id', params.id),
      supabase.from('deals').select('id, name, value, pipeline_stages(name, color)').eq('company_id', params.id),
      supabase.from('tasks').select('id, title, status, due_date').eq('company_id', params.id).neq('status', 'completed'),
      supabase.from('activities').select('id, type, content, created_at, users(full_name)').eq('company_id', params.id).order('created_at', { ascending: false }).limit(20)
    ])
    if (companyRes.data) setCompany(companyRes.data)
    if (contactsRes.data) setContacts(contactsRes.data)
    if (dealsRes.data) setDeals(dealsRes.data)
    if (tasksRes.data) setTasks(tasksRes.data)
    if (activitiesRes.data) setActivities(activitiesRes.data)
    setLoading(false)
  }

  const handleDelete = async () => {
    if (!confirm('Delete this company?')) return
    await supabase.from('companies').delete().eq('id', params.id)
    router.push('/companies')
  }

  const handleAddNote = async () => {
    if (!newNote.trim()) return
    setSavingNote(true)
    await supabase.from('activities').insert({ company_id: params.id, type: 'note', content: newNote })
    setNewNote('')
    setSavingNote(false)
    loadCompany()
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div></div>

  if (!company) return <div className="text-center py-12"><h2 className="text-xl font-semibold text-gray-900">Company not found</h2><Link href="/companies" className="text-primary-600 mt-2 inline-block">Back to companies</Link></div>

  const location = [company.city, company.state, company.country].filter(Boolean).join(', ')
  const totalDealValue = deals.reduce((sum, d) => sum + (d.value || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/companies" className="btn btn-ghost p-2"><ArrowLeft size={20} /></Link>
        <div className="flex-1">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-cadence-blue to-cadence-teal flex items-center justify-center text-white"><Building2 size={28} /></div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                {company.industry && <span>{company.industry}</span>}
                {company.size && <span>· {company.size}</span>}
              </div>
            </div>
          </div>
        </div>
        <button className="btn btn-secondary"><Edit2 size={16} className="mr-2" />Edit</button>
        <button onClick={handleDelete} className="btn btn-ghost text-red-600 hover:bg-red-50"><Trash2 size={16} /></button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center"><Users size={20} className="text-blue-600" /></div><div><p className="text-2xl font-bold">{contacts.length}</p><p className="text-sm text-gray-500">Contacts</p></div></div></div>
        <div className="card p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center"><Handshake size={20} className="text-pink-600" /></div><div><p className="text-2xl font-bold">{deals.length}</p><p className="text-sm text-gray-500">Deals</p></div></div></div>
        <div className="card p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center"><span className="text-green-600 font-bold">$</span></div><div><p className="text-2xl font-bold">${totalDealValue.toLocaleString()}</p><p className="text-sm text-gray-500">Total Value</p></div></div></div>
        <div className="card p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center"><CheckSquare size={20} className="text-yellow-600" /></div><div><p className="text-2xl font-bold">{tasks.length}</p><p className="text-sm text-gray-500">Open Tasks</p></div></div></div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="flex gap-3">
            {company.website && <a href={company.website.startsWith('http') ? company.website : `https://${company.website}`} target="_blank" className="btn btn-secondary"><Globe size={16} className="mr-2" />Website</a>}
            {company.phone && <a href={`tel:${company.phone}`} className="btn btn-secondary"><Phone size={16} className="mr-2" />Call</a>}
            <button onClick={() => setShowTaskModal(true)} className="btn btn-secondary"><Plus size={16} className="mr-2" />Add Task</button>
          </div>

          <div className="card p-4">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center"><MessageSquare size={16} className="text-gray-600" /></div>
              <div className="flex-1">
                <textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Add a note..." rows={2} className="input resize-none" />
                {newNote.trim() && <div className="mt-2 flex justify-end"><button onClick={handleAddNote} disabled={savingNote} className="btn btn-primary">{savingNote ? 'Saving...' : 'Add Note'}</button></div>}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="px-6 py-4 border-b border-gray-200"><h2 className="font-semibold">Activity</h2></div>
            <ActivityTimeline activities={activities} />
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="font-semibold mb-4">Company Info</h3>
            <div className="space-y-3 text-sm">
              {company.website && <div className="flex items-center gap-3"><Globe size={16} className="text-gray-400" /><a href={company.website.startsWith('http') ? company.website : `https://${company.website}`} target="_blank" className="text-gray-600 hover:text-primary-600">{company.website}</a></div>}
              {company.phone && <div className="flex items-center gap-3"><Phone size={16} className="text-gray-400" /><span className="text-gray-600">{company.phone}</span></div>}
              {location && <div className="flex items-center gap-3"><MapPin size={16} className="text-gray-400" /><span className="text-gray-600">{location}</span></div>}
              <div className="flex items-center gap-3"><Clock size={16} className="text-gray-400" /><span className="text-gray-500">Added {formatDistanceToNow(new Date(company.created_at), { addSuffix: true })}</span></div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4"><h3 className="font-semibold">Contacts</h3><span className="text-sm text-gray-500">{contacts.length}</span></div>
            {contacts.length > 0 ? (
              <div className="space-y-2">
                {contacts.map(c => (
                  <Link key={c.id} href={`/contacts/${c.id}`} className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                    <p className="font-medium text-gray-900">{c.first_name} {c.last_name}</p>
                    {c.title && <p className="text-xs text-gray-500">{c.title}</p>}
                  </Link>
                ))}
              </div>
            ) : <p className="text-sm text-gray-500">No contacts yet</p>}
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4"><h3 className="font-semibold">Deals</h3><span className="text-sm text-gray-500">{deals.length}</span></div>
            {deals.length > 0 ? (
              <div className="space-y-2">
                {deals.map(d => (
                  <Link key={d.id} href={`/deals/${d.id}`} className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                    <div className="flex justify-between"><span className="font-medium">{d.name}</span><span className="text-sm">${d.value.toLocaleString()}</span></div>
                    {d.pipeline_stages && <span className="text-xs" style={{ color: d.pipeline_stages.color }}>{d.pipeline_stages.name}</span>}
                  </Link>
                ))}
              </div>
            ) : <p className="text-sm text-gray-500">No deals yet</p>}
          </div>
        </div>
      </div>

      {showTaskModal && <CreateTaskModal onClose={() => setShowTaskModal(false)} onCreated={() => { setShowTaskModal(false); loadCompany() }} prefillCompanyId={params.id} />}
    </div>
  )
}
