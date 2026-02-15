'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUserOrgId } from '@/lib/org-helpers'
import Link from 'next/link'
import {
  Users, Building2, Handshake, CheckSquare,
  ArrowRight, TrendingUp, Clock, AlertTriangle,
  DollarSign, Zap, ChevronRight, Activity, CalendarClock
} from 'lucide-react'
import { formatActivityTime } from '@/lib/date-utils'
import CreateTaskModal from '@/components/tasks/CreateTaskModal'
import { format, formatDistanceToNow } from 'date-fns'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import { useUsageLimits } from '@/lib/contexts/UsageLimitsContext'
import { useIndustry } from '@/lib/contexts/IndustryContext'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FocusItem {
  id: string
  type: 'overdue_task' | 'due_today' | 'due_tomorrow' | 'idle_deal' | 'stalled_deal'
  title: string
  subtitle?: string
  link: string
  urgency: 'critical' | 'high' | 'medium' | 'low'
  dealAmount?: number
  dueDate?: string
  taskId?: string
}

interface PipelineStageCount {
  name: string
  color: string
  count: number
  totalValue: number
  position: number
}

interface RecentActivity {
  id: string
  activity_type: string
  subject: string | null
  created_at: string
  deal_id: string | null
  contact_id: string | null
  company_id: string | null
  metadata: any
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false)
  const [orgId, setOrgId] = useState<string | null>(null)

  // Stats
  const [stats, setStats] = useState({
    contacts: 0,
    companies: 0,
    deals: 0,
    openTasks: 0,
    pipelineValue: 0,
    noActivity7: 0,
  })

  // Upcoming tasks (next 7 days, not overdue/today/tomorrow)
  const [upcomingTasks, setUpcomingTasks] = useState<any[]>([])

  // Focus items (the hero)
  const [focusItems, setFocusItems] = useState<FocusItem[]>([])

  // Pipeline snapshot
  const [pipelineStages, setPipelineStages] = useState<PipelineStageCount[]>([])

  // Recent activity (compact)
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])

  const supabase = createClient()
  const { isFreeTier, historyDays } = useUsageLimits()
  const { terminology } = useIndustry()

  useEffect(() => {
    const init = async () => {
      const id = await getCurrentUserOrgId()
      setOrgId(id)

      // Get user name for greeting
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('full_name')
          .eq('id', user.id)
          .single()
        if (profile) setUserName(profile.full_name.split(' ')[0])
      }
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (orgId) loadData()
  }, [orgId]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    if (!orgId) return
    setLoading(true)

    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const dayAfterTomorrow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const [
      contactsRes,
      companiesRes,
      dealsRes,
      openTasksRes,
      overdueTasksRes,
      dueTodayTomorrowRes,
      activities7Res,
      activities30Res,
      recentActivityRes,
      upcomingTasksRes,
      pipelineRes,
    ] = await Promise.all([
      // Counts
      supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
      supabase.from('companies').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
      supabase.from('deals').select('id, name, amount').eq('org_id', orgId),
      supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'open'),

      // Overdue tasks
      supabase.from('tasks')
        .select('id, title, due_date, metadata')
        .eq('org_id', orgId)
        .neq('status', 'completed')
        .lt('due_date', now.toISOString())
        .order('due_date', { ascending: true })
        .limit(10),

      // Due today/tomorrow
      supabase.from('tasks')
        .select('id, title, due_date, metadata')
        .eq('org_id', orgId)
        .neq('status', 'completed')
        .gte('due_date', format(now, 'yyyy-MM-dd'))
        .lte('due_date', format(tomorrow, 'yyyy-MM-dd'))
        .order('due_date', { ascending: true }),

      // Activity within 7 days (for idle deal detection)
      supabase.from('activities').select('deal_id').eq('org_id', orgId).gte('created_at', sevenDaysAgo),

      // Activity within 30 days (for stalled deal detection)
      supabase.from('activities').select('deal_id').eq('org_id', orgId).gte('created_at', thirtyDaysAgo),

      // Recent activity (compact feed)
      supabase.from('activities')
        .select('id, activity_type, subject, created_at, deal_id, contact_id, company_id, metadata')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(12),

      // Upcoming tasks (day after tomorrow through 7 days out)
      supabase.from('tasks')
        .select('id, title, due_date, metadata')
        .eq('org_id', orgId)
        .neq('status', 'completed')
        .gt('due_date', format(tomorrow, 'yyyy-MM-dd'))
        .lte('due_date', format(sevenDaysFromNow, 'yyyy-MM-dd'))
        .order('due_date', { ascending: true })
        .limit(8),

      // Pipeline: get default pipeline first, then stages
      supabase.from('pipelines')
        .select('id')
        .eq('org_id', orgId)
        .eq('is_default', true)
        .single(),
    ])

    const deals = dealsRes.data || []
    const pipelineValue = deals.reduce((sum, d: any) => sum + (d.amount || 0), 0)

    // Calculate idle deals count for stat card
    const recent7DealIdsForStat = new Set((activities7Res.data || []).map((a: any) => a.deal_id).filter(Boolean))
    const noActivity7Count = deals.filter((d: any) => !recent7DealIdsForStat.has(d.id)).length

    setStats({
      contacts: contactsRes.count || 0,
      companies: companiesRes.count || 0,
      deals: deals.length,
      openTasks: openTasksRes.count || 0,
      pipelineValue,
      noActivity7: noActivity7Count,
    })

    setUpcomingTasks(upcomingTasksRes.data || [])

    // Build pipeline snapshot — fetch stages via pipeline_id, then count deals
    const pipelineId = pipelineRes.data?.id
    if (pipelineId) {
      const [stagesRes, dealsWithStageRes] = await Promise.all([
        supabase.from('pipeline_stages')
          .select('id, name, color, position')
          .eq('pipeline_id', pipelineId)
          .order('position'),
        supabase.from('deals')
          .select('stage_id, amount')
          .eq('org_id', orgId),
      ])

      if (stagesRes.data) {
        const dealsByStage = (dealsWithStageRes.data || []).reduce<Record<string, { count: number; value: number }>>((acc, d: any) => {
          if (!acc[d.stage_id]) acc[d.stage_id] = { count: 0, value: 0 }
          acc[d.stage_id].count++
          acc[d.stage_id].value += d.amount || 0
          return acc
        }, {})

        setPipelineStages(
          stagesRes.data.map((s: any) => ({
            name: s.name,
            color: s.color,
            count: dealsByStage[s.id]?.count || 0,
            totalValue: dealsByStage[s.id]?.value || 0,
            position: s.position,
          }))
        )
      }
    }

    // Build focus items — merged & sorted by urgency
    const items: FocusItem[] = []

    // Overdue tasks → critical
    ;(overdueTasksRes.data || []).forEach((t: any) => {
      items.push({
        id: `overdue-${t.id}`,
        type: 'overdue_task',
        title: t.title || 'Untitled Task',
        subtitle: t.due_date ? `Overdue by ${formatDistanceToNow(new Date(t.due_date))}` : 'Overdue',
        link: '/tasks',
        urgency: 'critical',
        dueDate: t.due_date,
        taskId: t.id,
      })
    })

    // Due today → high
    const todayStr = format(now, 'yyyy-MM-dd')
    ;(dueTodayTomorrowRes.data || []).forEach((t: any) => {
      const isToday = format(new Date(t.due_date), 'yyyy-MM-dd') === todayStr
      items.push({
        id: `due-${t.id}`,
        type: isToday ? 'due_today' : 'due_tomorrow',
        title: t.title || 'Untitled Task',
        subtitle: isToday ? 'Due today' : 'Due tomorrow',
        link: '/tasks',
        urgency: isToday ? 'high' : 'low',
        dueDate: t.due_date,
        taskId: t.id,
      })
    })

    // Idle deals (7 days) → medium
    const recent7DealIds = new Set((activities7Res.data || []).map((a: any) => a.deal_id).filter(Boolean))
    deals.filter((d: any) => !recent7DealIds.has(d.id)).slice(0, 5).forEach((d: any) => {
      items.push({
        id: `idle-${d.id}`,
        type: 'idle_deal',
        title: d.name || 'Untitled Deal',
        subtitle: 'No activity in 7 days',
        link: `/deals/${d.id}`,
        urgency: 'medium',
        dealAmount: d.amount,
      })
    })

    // Stalled deals (30 days) → medium (shown separately)
    const recent30DealIds = new Set((activities30Res.data || []).map((a: any) => a.deal_id).filter(Boolean))
    deals.filter((d: any) => !recent30DealIds.has(d.id)).slice(0, 5).forEach((d: any) => {
      // Don't duplicate — if already in idle, skip
      if (items.some(item => item.id === `idle-${d.id}`)) return
      items.push({
        id: `stalled-${d.id}`,
        type: 'stalled_deal',
        title: d.name || 'Untitled Deal',
        subtitle: 'No activity in 30+ days',
        link: `/deals/${d.id}`,
        urgency: 'medium',
        dealAmount: d.amount,
      })
    })

    // Sort: critical → high → medium → low
    const urgencyOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
    items.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency])

    setFocusItems(items)
    setRecentActivity(recentActivityRes.data || [])

    // Fire idle-deal automation check
    if (items.some(i => i.type === 'idle_deal')) {
      fetch('/api/automations/check-idle', { method: 'POST' }).catch(() => {})
    }

    setLoading(false)
  }

  const completeTask = async (taskId: string) => {
    await supabase.from('tasks').update({ status: 'completed' }).eq('id', taskId)
    setFocusItems(prev => prev.filter(item => item.taskId !== taskId))
    setStats(prev => ({ ...prev, openTasks: Math.max(0, prev.openTasks - 1) }))
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const getUrgencyStyles = (urgency: string) => {
    switch (urgency) {
      case 'critical': return { border: 'border-l-red-500', bg: 'bg-red-50/50', badge: 'bg-red-100 text-red-700', dot: 'bg-red-500' }
      case 'high': return { border: 'border-l-orange-400', bg: 'bg-orange-50/50', badge: 'bg-orange-100 text-orange-700', dot: 'bg-orange-400' }
      case 'medium': return { border: 'border-l-yellow-400', bg: 'bg-yellow-50/30', badge: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-400' }
      case 'low': return { border: 'border-l-gray-300', bg: '', badge: 'bg-gray-100 text-gray-600', dot: 'bg-gray-300' }
      default: return { border: 'border-l-gray-300', bg: '', badge: 'bg-gray-100 text-gray-600', dot: 'bg-gray-300' }
    }
  }

  const getFocusIcon = (type: FocusItem['type']) => {
    switch (type) {
      case 'overdue_task':
      case 'due_today':
      case 'due_tomorrow':
        return CheckSquare
      case 'idle_deal':
      case 'stalled_deal':
        return Handshake
    }
  }

  const getFocusLabel = (type: FocusItem['type']) => {
    switch (type) {
      case 'overdue_task': return 'Overdue'
      case 'due_today': return 'Due Today'
      case 'due_tomorrow': return 'Tomorrow'
      case 'idle_deal': return 'Idle 7d'
      case 'stalled_deal': return 'Stalled 30d+'
    }
  }

  // Summary counts for greeting
  const overdueTasks = focusItems.filter(i => i.type === 'overdue_task').length
  const dueTodayTasks = focusItems.filter(i => i.type === 'due_today').length
  const idleDeals = focusItems.filter(i => i.type === 'idle_deal' || i.type === 'stalled_deal').length

  const activityIcons: Record<string, { icon: any; color: string; bg: string }> = {
    contact_created: { icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    company_created: { icon: Building2, color: 'text-teal-600', bg: 'bg-teal-50' },
    deal_created: { icon: Handshake, color: 'text-pink-600', bg: 'bg-pink-50' },
    deal_stage_changed: { icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
    stage_change: { icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
    task_created: { icon: CheckSquare, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    task_completed: { icon: CheckSquare, color: 'text-green-600', bg: 'bg-green-50' },
  }

  const getActivityIcon = (type: string) => activityIcons[type] || { icon: Activity, color: 'text-gray-500', bg: 'bg-gray-50' }

  const getActivityLink = (a: RecentActivity) => {
    if (a.deal_id) return `/deals/${a.deal_id}`
    if (a.contact_id) return `/contacts/${a.contact_id}`
    if (a.company_id) return `/companies/${a.company_id}`
    if (a.metadata?.entity_type === 'deal' && a.metadata?.entity_id) return `/deals/${a.metadata.entity_id}`
    if (a.metadata?.entity_type === 'contact' && a.metadata?.entity_id) return `/contacts/${a.metadata.entity_id}`
    if (a.metadata?.entity_type === 'company' && a.metadata?.entity_id) return `/companies/${a.metadata.entity_id}`
    return null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const totalPipelineDeals = pipelineStages.reduce((sum, s) => sum + s.count, 0)

  return (
    <>
      <div className="space-y-6">
        {/* ── Greeting ─────────────────────────────────────────── */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {getGreeting()}{userName ? `, ${userName}` : ''}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {focusItems.length === 0 ? (
              "You're all caught up. Nothing needs attention right now."
            ) : (
              <>
                {overdueTasks > 0 && <span className="text-red-600 font-medium">{overdueTasks} overdue</span>}
                {overdueTasks > 0 && (dueTodayTasks > 0 || idleDeals > 0) && <span> · </span>}
                {dueTodayTasks > 0 && <span className="text-orange-600 font-medium">{dueTodayTasks} due today</span>}
                {dueTodayTasks > 0 && idleDeals > 0 && <span> · </span>}
                {idleDeals > 0 && <span className="text-yellow-600 font-medium">{idleDeals} {idleDeals === 1 ? 'deal' : 'deals'} need follow-up</span>}
              </>
            )}
          </p>
        </div>

        {/* ── Stat Cards ───────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Link href="/contacts" className="card p-4 hover:shadow-md transition-shadow group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.contacts}</p>
                <p className="text-xs text-gray-500 mt-0.5">{terminology.contacts}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                <Users size={18} className="text-blue-600" />
              </div>
            </div>
          </Link>
          <Link href="/companies" className="card p-4 hover:shadow-md transition-shadow group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.companies}</p>
                <p className="text-xs text-gray-500 mt-0.5">Companies</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center group-hover:bg-teal-100 transition-colors">
                <Building2 size={18} className="text-teal-600" />
              </div>
            </div>
          </Link>
          <Link href="/deals" className="card p-4 hover:shadow-md transition-shadow group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.deals}</p>
                <p className="text-xs text-gray-500 mt-0.5">{terminology.deals}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-pink-50 flex items-center justify-center group-hover:bg-pink-100 transition-colors">
                <Handshake size={18} className="text-pink-600" />
              </div>
            </div>
          </Link>
          <Link href="/tasks" className="card p-4 hover:shadow-md transition-shadow group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.openTasks}</p>
                <p className="text-xs text-gray-500 mt-0.5">Open {terminology.tasks}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-yellow-50 flex items-center justify-center group-hover:bg-yellow-100 transition-colors">
                <CheckSquare size={18} className="text-yellow-600" />
              </div>
            </div>
          </Link>
          <Link href="/deals" className="card p-4 hover:shadow-md transition-shadow group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  ${stats.pipelineValue >= 1000 ? `${(stats.pipelineValue / 1000).toFixed(stats.pipelineValue >= 10000 ? 0 : 1)}k` : stats.pipelineValue.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Pipeline Value</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center group-hover:bg-green-100 transition-colors">
                <DollarSign size={18} className="text-green-600" />
              </div>
            </div>
          </Link>
          <Link href="/deals" className="card p-4 hover:shadow-md transition-shadow group">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-2xl font-bold ${stats.noActivity7 > 0 ? 'text-orange-600' : 'text-gray-900'}`}>{stats.noActivity7}</p>
                <p className="text-xs text-gray-500 mt-0.5">Idle {terminology.deals}</p>
              </div>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                stats.noActivity7 > 0 ? 'bg-orange-50 group-hover:bg-orange-100' : 'bg-gray-50 group-hover:bg-gray-100'
              }`}>
                <Clock size={18} className={stats.noActivity7 > 0 ? 'text-orange-500' : 'text-gray-400'} />
              </div>
            </div>
          </Link>
        </div>

        {/* ── Main Content: Focus + Sidebar ─────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Today's Focus (2/3 width) ──────────────────────── */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} className="text-primary-500" />
                  <h2 className="font-semibold text-gray-900">Today's Focus</h2>
                  {focusItems.length > 0 && (
                    <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-medium">
                      {focusItems.length}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setShowCreateTaskModal(true)}
                  className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                >
                  + New Task
                </button>
              </div>

              {focusItems.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
                    <CheckSquare size={20} className="text-green-500" />
                  </div>
                  <h3 className="font-medium text-gray-900 mb-1">All clear</h3>
                  <p className="text-sm text-gray-500">No overdue tasks, no idle deals. You're on top of everything.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {focusItems.map((item) => {
                    const styles = getUrgencyStyles(item.urgency)
                    const Icon = getFocusIcon(item.type)
                    const label = getFocusLabel(item.type)
                    const isTask = item.type === 'overdue_task' || item.type === 'due_today' || item.type === 'due_tomorrow'

                    return (
                      <div
                        key={item.id}
                        className={`flex items-center gap-3 px-5 py-3 border-l-[3px] ${styles.border} ${styles.bg} transition-colors hover:bg-gray-50`}
                      >
                        {/* Urgency dot */}
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${styles.dot}`} />

                        {/* Icon */}
                        <div className="w-7 h-7 rounded-md bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                          <Icon size={13} className="text-gray-500" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                          <p className="text-xs text-gray-500">{item.subtitle}</p>
                        </div>

                        {/* Deal amount */}
                        {item.dealAmount != null && item.dealAmount > 0 && (
                          <span className="text-xs text-gray-400 font-medium flex-shrink-0">
                            ${item.dealAmount.toLocaleString()}
                          </span>
                        )}

                        {/* Badge */}
                        <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full flex-shrink-0 ${styles.badge}`}>
                          {label}
                        </span>

                        {/* Actions */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {isTask && item.taskId && (
                            <button
                              onClick={() => completeTask(item.taskId!)}
                              className="p-1.5 rounded-md text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                              title="Mark complete"
                            >
                              <CheckSquare size={14} />
                            </button>
                          )}
                          <Link
                            href={item.link}
                            className="p-1.5 rounded-md text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                          >
                            <ArrowRight size={14} />
                          </Link>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* ── Upcoming Tasks ──────────────────────────────────── */}
            <div className="card">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarClock size={16} className="text-accent-500" />
                  <h2 className="font-semibold text-gray-900">Coming Up</h2>
                  {upcomingTasks.length > 0 && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                      {upcomingTasks.length}
                    </span>
                  )}
                </div>
                <Link href="/tasks" className="text-xs text-primary-600 hover:text-primary-700 font-medium">
                  All {terminology.tasks}
                </Link>
              </div>

              {upcomingTasks.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-sm text-gray-500 mb-3">No {terminology.tasks.toLowerCase()} coming up in the next 7 days</p>
                  <button
                    onClick={() => setShowCreateTaskModal(true)}
                    className="btn btn-primary text-sm"
                  >
                    Create {terminology.task}
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {upcomingTasks.map((t: any) => {
                    const daysOut = Math.ceil((new Date(t.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                    return (
                      <div key={t.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                        <div className="w-7 h-7 rounded-md bg-gray-50 border border-gray-200 flex items-center justify-center flex-shrink-0">
                          <CheckSquare size={13} className="text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {t.title || 'Untitled Task'}
                          </p>
                          <p className="text-xs text-gray-400">
                            {format(new Date(t.due_date), 'EEE, MMM d')}
                          </p>
                        </div>
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          {daysOut}d
                        </span>
                        {t.metadata?.automated && (
                          <span className="inline-flex items-center text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded flex-shrink-0">
                            <Zap size={9} />
                          </span>
                        )}
                        <Link href="/tasks" className="p-1.5 rounded-md text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors flex-shrink-0">
                          <ArrowRight size={14} />
                        </Link>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Right Sidebar (1/3 width) ──────────────────────── */}
          <div className="space-y-6">

            {/* Pipeline Snapshot */}
            <div className="card">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 text-sm">Pipeline</h2>
                <Link href="/deals" className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
                  View <ChevronRight size={12} />
                </Link>
              </div>

              {pipelineStages.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-sm text-gray-400">No pipeline stages yet</p>
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {/* Stacked bar */}
                  {totalPipelineDeals > 0 && (
                    <div className="flex h-3 rounded-full overflow-hidden bg-gray-100">
                      {pipelineStages.filter(s => s.count > 0).map((stage) => (
                        <div
                          key={stage.name}
                          style={{
                            width: `${(stage.count / totalPipelineDeals) * 100}%`,
                            backgroundColor: stage.color,
                          }}
                          className="transition-all"
                          title={`${stage.name}: ${stage.count} deals`}
                        />
                      ))}
                    </div>
                  )}

                  {/* Stage list — show all stages, not just ones with deals */}
                  <div className="space-y-1.5">
                    {pipelineStages.map((stage) => (
                      <div key={stage.name} className="flex items-center justify-between py-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: stage.color }} />
                          <span className={`text-xs truncate ${stage.count > 0 ? 'text-gray-700' : 'text-gray-400'}`}>{stage.name}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-xs font-medium ${stage.count > 0 ? 'text-gray-900' : 'text-gray-300'}`}>{stage.count}</span>
                          {stage.totalValue > 0 && (
                            <span className="text-[10px] text-gray-400">${stage.totalValue >= 1000 ? `${(stage.totalValue / 1000).toFixed(0)}k` : stage.totalValue}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total */}
                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500">Total</span>
                    <span className="text-xs font-bold text-gray-900">
                      {totalPipelineDeals} {totalPipelineDeals === 1 ? terminology.deal.toLowerCase() : terminology.deals.toLowerCase()}
                      {stats.pipelineValue > 0 && (
                        <span className="text-gray-400 font-normal ml-1">(${stats.pipelineValue.toLocaleString()})</span>
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Recent Activity (compact) */}
            <div className="card">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 text-sm">Recent Activity</h2>
                <Link href="/activity" className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
                  View all <ChevronRight size={12} />
                </Link>
              </div>

              {recentActivity.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-sm text-gray-400">No activity yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {recentActivity.map((a) => {
                    const config = getActivityIcon(a.activity_type)
                    const Icon = config.icon
                    const link = getActivityLink(a)

                    return (
                      <div key={a.id} className="px-4 py-2.5 hover:bg-gray-50/50 transition-colors">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${config.bg}`}>
                            <Icon size={12} className={config.color} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-800 truncate">{a.subject}</p>
                          </div>
                          <span className="text-[10px] text-gray-400 flex-shrink-0 whitespace-nowrap">
                            {formatActivityTime(a.created_at)}
                          </span>
                          {link && (
                            <Link href={link} className="text-gray-300 hover:text-primary-500 flex-shrink-0">
                              <ArrowRight size={12} />
                            </Link>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showCreateTaskModal && (
        <CreateTaskModal
          onClose={() => setShowCreateTaskModal(false)}
          onCreated={() => {
            setShowCreateTaskModal(false)
            loadData()
          }}
        />
      )}
    </>
  )
}
