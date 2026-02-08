'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUserOrgId } from '@/lib/org-helpers'
import Link from 'next/link'
import { 
  AlertTriangle, DollarSign, Building2, User, 
  Calendar, CheckSquare, Clock, Handshake, Loader2
} from 'lucide-react'
import { format, addDays, startOfDay, endOfWeek } from 'date-fns'

interface Deal {
  id: string
  name: string
  amount: number | null
  close_date: string
  stage_id: string
  contacts: { id: string; first_name: string; last_name: string }[] | { id: string; first_name: string; last_name: string } | null
  companies: { id: string; name: string }[] | { id: string; name: string } | null
  pipeline_stages: { id: string; name: string; color: string }[] | { id: string; name: string; color: string } | null
}

interface Task {
  id: string
  title: string
  due_date: string
  priority: string
  status: string
  contacts: { id: string; first_name: string; last_name: string }[] | { id: string; first_name: string; last_name: string } | null
  companies: { id: string; name: string }[] | { id: string; name: string } | null
  deals: { id: string; name: string }[] | { id: string; name: string } | null
}

interface AttentionLevel {
  label: string
  icon: React.ReactNode
  items: (Deal | Task)[]
  color: string
  bgColor: string
}

// Helper to get first item from Supabase join that could be array or object
const getFirst = <T,>(data: T[] | T | null | undefined): T | null => {
  if (!data) return null
  return Array.isArray(data) ? data[0] || null : data
}

export default function PlannerPage() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
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
      loadData()
    }
  }, [orgId])

  const loadData = async () => {
    if (!orgId) {
      setLoading(false)
      return
    }

    setLoading(true)
    const today = startOfDay(new Date())
    const endDate = addDays(today, 90)

    const [dealsRes, tasksRes] = await Promise.all([
      supabase
        .from('deals')
        .select('id, name, amount, close_date, stage_id, contacts(id, first_name, last_name), companies(id, name), pipeline_stages(id, name, color)')
        .eq('org_id', orgId)
        .not('close_date', 'is', null)
        .lte('close_date', format(endDate, 'yyyy-MM-dd'))
        .order('close_date', { ascending: true }),
      supabase
        .from('tasks')
        .select('id, title, due_date, priority, status, contacts(id, first_name, last_name), companies(id, name), deals(id, name)')
        .eq('org_id', orgId)
        .not('due_date', 'is', null)
        .neq('status', 'completed')
        .lte('due_date', format(endDate, 'yyyy-MM-dd'))
        .order('due_date', { ascending: true })
    ])

    if (dealsRes.data) setDeals(dealsRes.data as Deal[])
    if (tasksRes.data) setTasks(tasksRes.data as Task[])
    setLoading(false)
  }

  const today = startOfDay(new Date())
  const todayStr = format(today, 'yyyy-MM-dd')
  const tomorrowStr = format(addDays(today, 1), 'yyyy-MM-dd')
  const endOfThisWeek = endOfWeek(today)
  const endOfThisWeekStr = format(endOfThisWeek, 'yyyy-MM-dd')

  // Helper to compare date strings (YYYY-MM-DD format)
  const isBeforeToday = (dateStr: string) => dateStr < todayStr
  const isAfterTomorrow = (dateStr: string) => dateStr > tomorrowStr
  const isAfterThisWeek = (dateStr: string) => dateStr > endOfThisWeekStr

  // Categorize deals and tasks - using string comparison for accuracy
  const overdueDeals = deals.filter(d => isBeforeToday(d.close_date))
  const overdueTasks = tasks.filter(t => isBeforeToday(t.due_date))
  
  const todayDeals = deals.filter(d => d.close_date === todayStr)
  const todayTasks = tasks.filter(t => t.due_date === todayStr)
  
  const tomorrowDeals = deals.filter(d => d.close_date === tomorrowStr)
  const tomorrowTasks = tasks.filter(t => t.due_date === tomorrowStr)
  
  const laterThisWeekDeals = deals.filter(d => 
    isAfterTomorrow(d.close_date) && !isAfterThisWeek(d.close_date)
  )
  const laterThisWeekTasks = tasks.filter(t => 
    isAfterTomorrow(t.due_date) && !isAfterThisWeek(t.due_date)
  )
  
  const nextWeekDeals = deals.filter(d => isAfterThisWeek(d.close_date))
  const nextWeekTasks = tasks.filter(t => isAfterThisWeek(t.due_date))

  const attentionLevels: AttentionLevel[] = [
    {
      label: 'Overdue',
      icon: <AlertTriangle size={20} />,
      items: [...overdueDeals, ...overdueTasks],
      color: 'text-red-600',
      bgColor: 'bg-red-50 border-red-200'
    },
    {
      label: 'Today',
      icon: <Clock size={20} />,
      items: [...todayDeals, ...todayTasks],
      color: 'text-primary-600',
      bgColor: 'bg-primary-50 border-primary-200'
    },
    {
      label: 'Tomorrow',
      icon: <Calendar size={20} />,
      items: [...tomorrowDeals, ...tomorrowTasks],
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 border-blue-200'
    },
    {
      label: 'Later this week',
      icon: <Calendar size={20} />,
      items: [...laterThisWeekDeals, ...laterThisWeekTasks],
      color: 'text-amber-600',
      bgColor: 'bg-amber-50 border-amber-200'
    },
    {
      label: 'Next week & beyond',
      icon: <Calendar size={20} />,
      items: [...nextWeekDeals, ...nextWeekTasks],
      color: 'text-gray-600',
      bgColor: 'bg-gray-50 border-gray-200'
    },
  ].filter(level => level.items.length > 0)

  const hasItems = attentionLevels.length > 0

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Planner</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Your attention ladder—what matters most, right now
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-primary-500" size={32} />
        </div>
      ) : !hasItems ? (
        <div className="card p-12 text-center">
          <Clock size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">All clear!</h3>
          <p className="text-gray-500">
            No overdue items or upcoming tasks. Great work!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {attentionLevels.map((level, idx) => (
            <div key={idx} className={`card border ${level.bgColor}`}>
              {/* Header */}
              <div className={`px-4 py-3 border-b ${level.bgColor.includes('border-') ? level.bgColor.split(' ')[1] : 'border-gray-200'} flex items-center gap-3`}>
                <div className={level.color}>{level.icon}</div>
                <div className="flex-1">
                  <h2 className="font-semibold text-gray-900">
                    {level.label}
                  </h2>
                  <p className="text-xs text-gray-500">
                    {level.items.length} {level.items.length === 1 ? 'item' : 'items'}
                  </p>
                </div>
              </div>

              {/* Items */}
              <div className="p-4">
                <div className="space-y-3">
                  {level.items.map((item) => (
                    <div key={item.id}>
                      {'title' in item ? (
                        <TaskItemRow task={item} />
                      ) : (
                        <DealItemRow deal={item} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TaskItemRow({ task }: { task: Task }) {
  const priorityColors: Record<string, { bg: string; text: string }> = {
    high: { bg: 'bg-red-100', text: 'text-red-700' },
    normal: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
    low: { bg: 'bg-gray-100', text: 'text-gray-600' },
  }

  const colors = priorityColors[task.priority] || priorityColors.normal
  const taskDeal = getFirst(task.deals)
  const taskContact = getFirst(task.contacts)

  return (
    <Link href="/tasks">
      <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors cursor-pointer">
        <CheckSquare size={18} className="text-yellow-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900">{task.title}</h3>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${colors.bg} ${colors.text}`}>
              {task.priority}
            </span>
            {taskDeal && (
              <div className="flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                <Handshake size={12} />
                <span>{taskDeal.name}</span>
              </div>
            )}
            {taskContact && (
              <div className="flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                <User size={12} />
                <span>{taskContact.first_name}</span>
              </div>
            )}
          </div>
        </div>
        <div className="text-xs text-gray-500 flex-shrink-0">
          {format(new Date(task.due_date), 'MMM d')}
        </div>
      </div>
    </Link>
  )
}

function DealItemRow({ deal }: { deal: Deal }) {
  const stage = getFirst(deal.pipeline_stages)
  const dealCompany = getFirst(deal.companies)
  const stageColor = stage?.color || '#6B7280'
  const amount = deal.amount || 0

  return (
    <Link href={`/deals/${deal.id}`}>
      <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors cursor-pointer">
        <div 
          className="w-3 h-3 rounded-full flex-shrink-0" 
          style={{ backgroundColor: stageColor }}
        />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900">{deal.name}</h3>
          <div className="flex items-center gap-2 mt-1 flex-wrap text-xs">
            <span className="text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
              {stage?.name || 'No stage'}
            </span>
            {amount > 0 && (
              <div className="flex items-center gap-1 text-green-600 bg-green-100 px-2 py-0.5 rounded">
                <DollarSign size={12} />
                <span>{amount.toLocaleString()}</span>
              </div>
            )}
            {dealCompany && (
              <div className="flex items-center gap-1 text-gray-600 bg-gray-100 px-2 py-0.5 rounded truncate">
                <Building2 size={12} />
                <span className="truncate">{dealCompany.name}</span>
              </div>
            )}
          </div>
        </div>
        <div className="text-xs text-gray-500 flex-shrink-0">
          {format(new Date(deal.close_date), 'MMM d')}
        </div>
      </div>
    </Link>
  )
}
