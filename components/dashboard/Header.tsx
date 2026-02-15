'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Search, Bell, Plus, LogOut, ChevronDown, Users, Building2, Handshake, CheckSquare, Menu, Calendar, Clock, Activity } from 'lucide-react'
import GlobalSearch from '@/components/dashboard/GlobalSearch'
import CreateContactModal from '@/components/contacts/CreateContactModal'
import CreateCompanyModal from '@/components/companies/CreateCompanyModal'
import CreateTaskModal from '@/components/tasks/CreateTaskModal'
import { DEMO_ORG_ID } from '@/lib/constants'
import { ActivityLogger } from '@/lib/activity-logger'
import { formatDistanceToNow } from 'date-fns'
import { useIndustry } from '@/lib/contexts/IndustryContext'

interface Notification {
  id: string
  type: 'task_assigned' | 'task_due' | 'deal_activity'
  title: string
  description: string
  created_at: string
  link?: string
}

interface HeaderProps {
  user: {
    id: string
    full_name: string
    email: string
    role: string
    orgs: {
      id: string
      name: string
    }
  }
  onMenuClick?: () => void
}

export default function Header({ user, onMenuClick }: HeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])

  const [activeModal, setActiveModal] = useState<'contact' | 'company' | 'deal' | 'task' | null>(null)
  const router = useRouter()
  const supabase = createClient()

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      const notifs: Notification[] = []
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      const nextWeek = new Date(today)
      nextWeek.setDate(nextWeek.getDate() + 7)

      // 1. Tasks assigned to user
      const { data: assignedTasks } = await supabase
        .from('tasks')
        .select('id, title, created_at')
        .eq('assigned_to', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5)

      if (assignedTasks) {
        assignedTasks.forEach(task => {
          notifs.push({
            id: `task-assigned-${task.id}`,
            type: 'task_assigned',
            title: 'Task assigned to you',
            description: task.title,
            created_at: task.created_at,
            link: '/tasks'
          })
        })
      }

      // 2. Tasks due today or upcoming (within 7 days)
      const { data: dueTasks } = await supabase
        .from('tasks')
        .select('id, title, due_date')
        .eq('assigned_to', user.id)
        .neq('status', 'completed')
        .gte('due_date', today.toISOString())
        .lte('due_date', nextWeek.toISOString())
        .order('due_date', { ascending: true })
        .limit(5)

      if (dueTasks) {
        dueTasks.forEach(task => {
          const dueDate = new Date(task.due_date)
          const isToday = dueDate >= today && dueDate < tomorrow
          notifs.push({
            id: `task-due-${task.id}`,
            type: 'task_due',
            title: isToday ? '⚠️ Task due today' : 'Upcoming task',
            description: task.title,
            created_at: task.due_date,
            link: '/tasks'
          })
        })
      }

      // 3. Recent activity on deals where user is owner
      const { data: dealActivities } = await supabase
        .from('activities')
        .select(`
          id,
          type,
          subject,
          description,
          created_at,
          deal_id,
          deals!inner (
            id,
            name,
            owner_id
          )
        `)
        .eq('deals.owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (dealActivities) {
        dealActivities.forEach((activity: any) => {
          const deal = Array.isArray(activity.deals) ? activity.deals[0] : activity.deals
          if (deal) {
            notifs.push({
              id: `activity-${activity.id}`,
              type: 'deal_activity',
              title: `Activity on ${deal.name}`,
              description: activity.subject || activity.type,
              created_at: activity.created_at,
              link: `/deals/${deal.id}`
            })
          }
        })
      }

      // Sort by created_at descending and limit
      notifs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setNotifications(notifs.slice(0, 10))
    }

    fetchNotifications()
  }, [user.id, supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const { terminology, config } = useIndustry()
  const showCompanies = config.features.showCompanies

  const quickAddOptions = [
    { id: 'contact' as const, label: terminology.contact, icon: Users, color: 'text-blue-600 bg-blue-100' },
    ...(showCompanies ? [{ id: 'company' as const, label: 'Company', icon: Building2, color: 'text-teal-600 bg-teal-100' }] : []),
    { id: 'deal' as const, label: terminology.deal, icon: Handshake, color: 'text-pink-600 bg-pink-100' },
    { id: 'task' as const, label: terminology.task, icon: CheckSquare, color: 'text-yellow-600 bg-yellow-100' },
  ]

  const handleQuickAdd = (type: 'contact' | 'company' | 'deal' | 'task') => {
    setShowQuickAdd(false)
    setActiveModal(type)
  }

  const handleModalClose = () => {
    setActiveModal(null)
  }

  const handleCreated = () => {
    setActiveModal(null)
    router.refresh()
  }

  return (
    <>
      <header className="h-14 sm:h-16 bg-white border-b border-gray-200 flex items-center justify-between px-3 sm:px-6">
        {/* Left side - Menu button (mobile) + Search */}
        <div className="flex items-center gap-2 sm:gap-4 flex-1">
          {/* Mobile menu button */}
          <button 
            onClick={onMenuClick}
            className="lg:hidden p-2 -ml-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Menu size={22} />
          </button>

          {/* Search */}
          <div className="hidden sm:block flex-1 max-w-xl">
            <GlobalSearch />
          </div>

          {/* Mobile search button */}
          <button 
            onClick={() => {
              // Focus the search input on mobile by dispatching Cmd+K
              window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))
            }}
            className="sm:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Search size={20} />
          </button>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-1 sm:gap-3">
          {/* Quick Add */}
          <div className="relative">
            <button 
              onClick={() => setShowQuickAdd(!showQuickAdd)}
              className="btn btn-primary gap-1 sm:gap-2 text-sm px-2.5 sm:px-4 py-2"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Quick Add</span>
              <ChevronDown size={16} className="hidden sm:inline" />
            </button>

            {showQuickAdd && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowQuickAdd(false)} />
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20 animate-fade-in">
                  {quickAddOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => handleQuickAdd(option.id)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${option.color}`}>
                        <option.icon size={16} />
                      </div>
                      {option.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Notifications */}
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Bell size={20} />
              {notifications.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary-500 rounded-full" />
              )}
            </button>

            {showNotifications && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowNotifications(false)} />
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-20 animate-fade-in max-h-[70vh] overflow-hidden flex flex-col">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Notifications</h3>
                    {notifications.length > 0 && (
                      <span className="text-xs text-gray-500">{notifications.length} new</span>
                    )}
                  </div>
                  
                  <div className="overflow-y-auto flex-1">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center">
                        <Bell size={32} className="mx-auto text-gray-300 mb-2" />
                        <p className="text-sm text-gray-500">No notifications</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {notifications.map((notif) => (
                          <button
                            key={notif.id}
                            onClick={() => {
                              setShowNotifications(false)
                              if (notif.link) router.push(notif.link)
                            }}
                            className="w-full px-4 py-3 hover:bg-gray-50 transition-colors text-left flex gap-3"
                          >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                              notif.type === 'task_assigned' ? 'bg-blue-100 text-blue-600' :
                              notif.type === 'task_due' ? 'bg-yellow-100 text-yellow-600' :
                              'bg-purple-100 text-purple-600'
                            }`}>
                              {notif.type === 'task_assigned' && <CheckSquare size={14} />}
                              {notif.type === 'task_due' && <Clock size={14} />}
                              {notif.type === 'deal_activity' && <Activity size={14} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">{notif.title}</p>
                              <p className="text-sm text-gray-500 truncate">{notif.description}</p>
                              <p className="text-xs text-gray-400 mt-1">
                                {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-1 sm:gap-2 p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cadence-pink to-cadence-teal flex items-center justify-center text-white text-sm font-medium">
                {user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              <ChevronDown size={16} className="text-gray-500 hidden sm:block" />
            </button>

            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20 animate-fade-in">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <LogOut size={16} />
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {activeModal === 'contact' && (
        <CreateContactModal onClose={handleModalClose} onCreated={handleCreated} />
      )}
      {activeModal === 'company' && (
        <CreateCompanyModal onClose={handleModalClose} onCreated={handleCreated} />
      )}
      {activeModal === 'deal' && (
        <QuickDealModal onClose={handleModalClose} onCreated={handleCreated} />
      )}
      {activeModal === 'task' && (
        <CreateTaskModal onClose={handleModalClose} onCreated={handleCreated} />
      )}
    </>
  )
}

function QuickDealModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('')
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()
  const { terminology } = useIndustry()

  const createDefaultPipeline = async () => {
    const { data: pipeline, error: pipelineError } = await supabase
      .from('pipelines')
      .insert({ name: 'Sales Pipeline', is_default: true, org_id: DEMO_ORG_ID })
      .select()
      .single()

    if (pipelineError || !pipeline) return null

    const defaultStages = [
      { name: 'Lead', position: 0, color: '#6B7280', win_probability: 10 },
      { name: 'Qualified', position: 1, color: '#3B82F6', win_probability: 25 },
      { name: 'Proposal', position: 2, color: '#F59E0B', win_probability: 50 },
      { name: 'Negotiation', position: 3, color: '#8B5CF6', win_probability: 75 },
      { name: 'Closed Won', position: 4, color: '#10B981', win_probability: 100 },
      { name: 'Closed Lost', position: 5, color: '#EF4444', win_probability: 0 },
    ]

    await supabase.from('pipeline_stages').insert(
      defaultStages.map(stage => ({ ...stage, pipeline_id: pipeline.id }))
    )

    return pipeline
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Get or create pipeline
    let { data: pipeline } = await supabase
      .from('pipelines')
      .select('id')
      .eq('is_default', true)
      .single()

    if (!pipeline) {
      const { data: anyPipeline } = await supabase
        .from('pipelines')
        .select('id')
        .limit(1)
        .single()
      
      if (!anyPipeline) {
        const newPipeline = await createDefaultPipeline()
        if (!newPipeline) {
          setError('Failed to create pipeline.')
          setLoading(false)
          return
        }
        pipeline = newPipeline
      } else {
        pipeline = anyPipeline
      }
    }

    // Get first stage
    if (!pipeline) {
      setError('Failed to find or create pipeline.')
      setLoading(false)
      return
    }

    const { data: stage } = await supabase
      .from('pipeline_stages')
      .select('id, name')
      .eq('pipeline_id', pipeline.id)
      .order('position', { ascending: true })
      .limit(1)
      .single()

    if (!stage) {
      setError('No pipeline stages found.')
      setLoading(false)
      return
    }

    const { data: newDeal, error: insertError } = await supabase
      .from('deals')
      .insert({
        name,
        amount: value ? parseFloat(value) : 0,
        pipeline_id: pipeline.id,
        stage_id: stage.id,
        org_id: DEMO_ORG_ID,
      })
      .select('id')
      .single()

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    // Log activity
    await ActivityLogger.dealCreated({
      id: newDeal.id,
      name,
      amount: value ? parseFloat(value) : undefined,
      stage_name: stage.name
    })

    onCreated()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-slide-up">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Quick Add {terminology.deal}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">✕</button>
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
              placeholder="e.g., Website Redesign Project"
              required
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Value</label>
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
              />
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Creating...' : `Create ${terminology.deal}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
