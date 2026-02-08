'use client'

import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  User, 
  Building2, 
  Handshake,
  Calendar,
  AlertCircle
} from 'lucide-react'

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

interface TasksListProps {
  tasks: Task[]
  onStatusChange: (taskId: string, newStatus: Task['status']) => void
}

// Helper to get first item from Supabase join that could be array or object
const getFirst = <T,>(data: T[] | T | null | undefined): T | null => {
  if (!data) return null
  return Array.isArray(data) ? data[0] || null : data
}

export default function TasksList({ tasks, onStatusChange }: TasksListProps) {
  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700'
      case 'normal':
      case 'medium': return 'bg-yellow-100 text-yellow-700'
      case 'low': return 'bg-gray-100 text-gray-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 size={20} className="text-green-500" />
      case 'in_progress':
        return <Clock size={20} className="text-blue-500" />
      case 'pending':
      case 'open':
        return <Circle size={20} className="text-gray-400" />
      default:
        return <Circle size={20} className="text-gray-400" />
    }
  }

  const getNextStatus = (status: string): Task['status'] => {
    switch (status) {
      case 'pending':
      case 'open':
        return 'in_progress'
      case 'in_progress': return 'completed'
      case 'completed': return 'pending'
      default: return 'pending'
    }
  }

  const isOverdue = (task: Task) => {
    if (!task.due_date || task.status === 'completed') return false
    return new Date(task.due_date) < new Date()
  }

  const formatDueDate = (dateString: string | null) => {
    if (!dateString) return null
    const date = new Date(dateString)
    const now = new Date()
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return { text: `${Math.abs(diffDays)}d overdue`, className: 'text-red-600' }
    if (diffDays === 0) return { text: 'Due today', className: 'text-yellow-600' }
    if (diffDays === 1) return { text: 'Due tomorrow', className: 'text-yellow-600' }
    if (diffDays <= 7) return { text: `Due in ${diffDays}d`, className: 'text-gray-600' }
    return { 
      text: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), 
      className: 'text-gray-500' 
    }
  }

  if (tasks.length === 0) {
    return (
      <div className="card p-12 text-center">
        <CheckCircle2 size={48} className="mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
        <p className="text-gray-500">Create a task to start tracking your work.</p>
      </div>
    )
  }

  return (
    <div className="card divide-y divide-gray-200">
      {tasks.map((task) => {
        const dueDate = formatDueDate(task.due_date)
        const overdue = isOverdue(task)
        const nextStatus = getNextStatus(task.status)

        return (
          <div
            key={task.id}
            className={`p-4 hover:bg-gray-50 transition-colors ${
              task.status === 'completed' ? 'opacity-60' : ''
            }`}
          >
            <div className="flex items-start gap-4">
              {/* Status toggle */}
              <button
                onClick={() => onStatusChange(task.id, nextStatus)}
                className="mt-0.5 hover:scale-110 transition-transform"
                title={`Mark as ${nextStatus.replace('_', ' ')}`}
              >
                {getStatusIcon(task.status)}
              </button>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <h3 className={`font-medium ${
                    task.status === 'completed' ? 'text-gray-500 line-through' : 'text-gray-900'
                  }`}>
                    {task.title}
                  </h3>
                  <span className={`badge ${getPriorityStyles(task.priority)}`}>
                    {task.priority}
                  </span>
                  {overdue && (
                    <span className="flex items-center gap-1 text-xs text-red-600">
                      <AlertCircle size={12} />
                      Overdue
                    </span>
                  )}
                </div>

                {task.description && (
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                    {task.description}
                  </p>
                )}

                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  {dueDate && (
                    <div className={`flex items-center gap-1 ${dueDate.className}`}>
                      <Calendar size={12} />
                      {dueDate.text}
                    </div>
                  )}

                  {(() => {
                    const taskContact = getFirst(task.contacts)
                    return taskContact && (
                      <Link
                        href={`/contacts/${taskContact.id}`}
                        className="flex items-center gap-1 hover:text-primary-600"
                      >
                        <User size={12} />
                        {taskContact.first_name} {taskContact.last_name}
                      </Link>
                    )
                  })()}

                  {(() => {
                    const taskCompany = getFirst(task.companies)
                    return taskCompany && (
                      <Link
                        href={`/companies/${taskCompany.id}`}
                        className="flex items-center gap-1 hover:text-primary-600"
                      >
                        <Building2 size={12} />
                        {taskCompany.name}
                      </Link>
                    )
                  })()}

                  {(() => {
                    const taskDeal = getFirst(task.deals)
                    return taskDeal && (
                      <Link
                        href={`/deals/${taskDeal.id}`}
                        className="flex items-center gap-1 hover:text-primary-600"
                      >
                        <Handshake size={12} />
                        {taskDeal.name}
                      </Link>
                    )
                  })()}

                  {(() => {
                    const assignedUser = getFirst(task.assigned_user)
                    return assignedUser && (
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-4 rounded-full bg-gradient-to-br from-cadence-pink to-cadence-teal flex items-center justify-center text-white text-[8px] font-medium">
                          {assignedUser.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        {assignedUser.full_name}
                      </div>
                    )
                  })()}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
