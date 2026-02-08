'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUserOrgId } from '@/lib/org-helpers'
import { Plus, Search, Filter, Calendar, CheckCircle2, Circle, Clock } from 'lucide-react'
import TasksList from '@/components/tasks/TasksList'
import CreateTaskModal from '@/components/tasks/CreateTaskModal'

interface Task {
  id: string
  title: string
  description: string | null
  status: 'pending' | 'in_progress' | 'completed' | 'open'
  priority: 'low' | 'medium' | 'high' | 'normal'
  due_date: string | null
  contact_id: string | null
  company_id: string | null
  deal_id: string | null
  assigned_to: string | null
  created_at: string
  contacts: { id: string; first_name: string; last_name: string }[] | { id: string; first_name: string; last_name: string } | null
  companies: { id: string; name: string }[] | { id: string; name: string } | null
  deals: { id: string; name: string }[] | { id: string; name: string } | null
  assigned_user: { id: string; full_name: string }[] | { id: string; full_name: string } | null
}

type FilterStatus = 'all' | 'pending' | 'in_progress' | 'completed'
type FilterPriority = 'all' | 'low' | 'medium' | 'high'

// Helper to get first item from Supabase join that could be array or object
const getFirst = <T,>(data: T[] | T | null | undefined): T | null => {
  if (!data) return null
  return Array.isArray(data) ? data[0] || null : data
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [filterPriority, setFilterPriority] = useState<FilterPriority>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [orgId, setOrgId] = useState<string | null>(null)
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
      loadTasks()
    }
  }, [orgId])

  const loadTasks = async () => {
    if (!orgId) {
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('tasks')
      .select(`
        *,
        contacts(id, first_name, last_name),
        companies(id, name),
        deals(id, name),
        assigned_user:assigned_to(id, full_name)
      `)
      .eq('org_id', orgId)
      .order('due_date', { ascending: true, nullsFirst: false })

    if (data) setTasks(data as Task[])
    setLoading(false)
  }

  const handleStatusChange = async (taskId: string, newStatus: Task['status']) => {
    setTasks(prev => prev.map(task =>
      task.id === taskId ? { ...task, status: newStatus } : task
    ))

    await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', taskId)
  }

  const handleTaskCreated = () => {
    setShowCreateModal(false)
    loadTasks()
  }

  const filteredTasks = tasks.filter(task => {
    if (filterStatus !== 'all' && task.status !== filterStatus) return false
    if (filterPriority !== 'all' && task.priority !== filterPriority) return false
    if (searchQuery) {
      const search = searchQuery.toLowerCase()
      const taskContact = getFirst(task.contacts)
      const taskCompany = getFirst(task.companies)
      const taskDeal = getFirst(task.deals)
      return (
        task.title.toLowerCase().includes(search) ||
        task.description?.toLowerCase().includes(search) ||
        taskContact?.first_name?.toLowerCase().includes(search) ||
        taskContact?.last_name?.toLowerCase().includes(search) ||
        taskCompany?.name?.toLowerCase().includes(search) ||
        taskDeal?.name?.toLowerCase().includes(search)
      )
    }
    return true
  })

  const pendingCount = tasks.filter(t => t.status === 'pending').length
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length
  const completedCount = tasks.filter(t => t.status === 'completed').length
  const overdueCount = tasks.filter(t => {
    if (!t.due_date || t.status === 'completed') return false
    return new Date(t.due_date) < new Date()
  }).length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {pendingCount} pending · {inProgressCount} in progress · {completedCount} completed
            {overdueCount > 0 && <span className="text-red-500"> · {overdueCount} overdue</span>}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary w-full sm:w-auto"
        >
          <Plus size={18} className="mr-2" />
          Add Task
        </button>
      </div>

      {/* Stats - Responsive grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <button
          onClick={() => setFilterStatus('all')}
          className={`card p-3 sm:p-4 text-left transition-colors ${
            filterStatus === 'all' ? 'ring-2 ring-primary-500' : 'hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 size={18} className="text-gray-600 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-lg sm:text-2xl font-bold text-gray-900">{tasks.length}</p>
              <p className="text-xs sm:text-sm text-gray-500 truncate">All Tasks</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setFilterStatus('pending')}
          className={`card p-3 sm:p-4 text-left transition-colors ${
            filterStatus === 'pending' ? 'ring-2 ring-primary-500' : 'hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-yellow-100 flex items-center justify-center flex-shrink-0">
              <Circle size={18} className="text-yellow-600 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-lg sm:text-2xl font-bold text-gray-900">{pendingCount}</p>
              <p className="text-xs sm:text-sm text-gray-500 truncate">Pending</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setFilterStatus('in_progress')}
          className={`card p-3 sm:p-4 text-left transition-colors ${
            filterStatus === 'in_progress' ? 'ring-2 ring-primary-500' : 'hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Clock size={18} className="text-blue-600 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-lg sm:text-2xl font-bold text-gray-900">{inProgressCount}</p>
              <p className="text-xs sm:text-sm text-gray-500 truncate">In Progress</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setFilterStatus('completed')}
          className={`card p-3 sm:p-4 text-left transition-colors ${
            filterStatus === 'completed' ? 'ring-2 ring-primary-500' : 'hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 size={18} className="text-green-600 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-lg sm:text-2xl font-bold text-gray-900">{completedCount}</p>
              <p className="text-xs sm:text-sm text-gray-500 truncate">Completed</p>
            </div>
          </div>
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10"
          />
        </div>

        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value as FilterPriority)}
          className="input sm:w-40"
        >
          <option value="all">All Priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Tasks List */}
      <TasksList
        tasks={filteredTasks}
        onStatusChange={handleStatusChange}
      />

      {/* Create Modal */}
      {showCreateModal && (
        <CreateTaskModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleTaskCreated}
        />
      )}
    </div>
  )
}
