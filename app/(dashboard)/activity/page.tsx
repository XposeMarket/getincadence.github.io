'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUserOrgId } from '@/lib/org-helpers'
import Link from 'next/link'
import {
  Users, Building2, Handshake, CheckSquare, MessageSquare,
  TrendingUp, Clock, Search, ArrowRight,
  RefreshCw, Calendar
} from 'lucide-react'
import { format, subDays, subMonths, isToday, isYesterday, startOfDay } from 'date-fns'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import { useIndustry } from '@/lib/contexts/IndustryContext'
import { useUsageLimits } from '@/lib/contexts/UsageLimitsContext'
import UpgradeCTA from '@/components/shared/UpgradeCTA'

interface Activity {
  id: string
  activity_type: string
  subject: string | null
  body: string | null
  created_at: string
  metadata: any
  contact_id: string | null
  company_id: string | null
  deal_id: string | null
  task_id: string | null
}

type FilterType = 'all' | 'contacts' | 'companies' | 'deals' | 'tasks'
type DateRange = 'today' | '7d' | '30d' | '90d' | 'all'

const activityConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  contact_created: { icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Contact created' },
  contact_updated: { icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Contact updated' },
  company_created: { icon: Building2, color: 'text-teal-600', bg: 'bg-teal-50', label: 'Company created' },
  company_updated: { icon: Building2, color: 'text-teal-600', bg: 'bg-teal-50', label: 'Company updated' },
  deal_created: { icon: Handshake, color: 'text-pink-600', bg: 'bg-pink-50', label: 'Deal created' },
  deal_stage_changed: { icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50', label: 'Stage changed' },
  stage_change: { icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50', label: 'Stage changed' },
  task_created: { icon: CheckSquare, color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Task created' },
  task_completed: { icon: CheckSquare, color: 'text-green-600', bg: 'bg-green-50', label: 'Task completed' },
  note_added: { icon: MessageSquare, color: 'text-gray-600', bg: 'bg-gray-50', label: 'Note added' },
  note: { icon: MessageSquare, color: 'text-gray-600', bg: 'bg-gray-50', label: 'Note added' },
}

const ITEMS_PER_PAGE = 50

export default function ActivityPage() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')
  const [dateRange, setDateRange] = useState<DateRange>('30d')
  const [searchQuery, setSearchQuery] = useState('')
  const [totalCount, setTotalCount] = useState(0)
  const [orgId, setOrgId] = useState<string | null>(null)

  const supabase = createClient()
  const { terminology } = useIndustry()
  const { isFreeTier, historyDays } = useUsageLimits()

  useEffect(() => {
    const init = async () => {
      const id = await getCurrentUserOrgId()
      setOrgId(id)
    }
    init()
  }, [])

  const getDateCutoff = useCallback((range: DateRange): string | null => {
    switch (range) {
      case 'today': return startOfDay(new Date()).toISOString()
      case '7d': return subDays(new Date(), 7).toISOString()
      case '30d': return subDays(new Date(), 30).toISOString()
      case '90d': return subMonths(new Date(), 3).toISOString()
      case 'all': return null
    }
  }, [])

  const buildQuery = useCallback((offset: number) => {
    if (!orgId) return null

    let query = supabase
      .from('activities')
      .select('*', { count: 'exact' })
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .range(offset, offset + ITEMS_PER_PAGE - 1)

    if (filter === 'contacts') {
      query = query.or('activity_type.eq.contact_created,activity_type.eq.contact_updated')
    } else if (filter === 'companies') {
      query = query.or('activity_type.eq.company_created,activity_type.eq.company_updated')
    } else if (filter === 'deals') {
      query = query.or('activity_type.eq.deal_created,activity_type.eq.deal_stage_changed,activity_type.eq.stage_change')
    } else if (filter === 'tasks') {
      query = query.or('activity_type.eq.task_created,activity_type.eq.task_completed')
    }

    const cutoff = getDateCutoff(dateRange)
    if (cutoff) {
      query = query.gte('created_at', cutoff)
    }

    if (isFreeTier && historyDays) {
      const freeCutoff = subDays(new Date(), historyDays).toISOString()
      query = query.gte('created_at', freeCutoff)
    }

    if (searchQuery.trim()) {
      query = query.or(`subject.ilike.%${searchQuery.trim()}%,body.ilike.%${searchQuery.trim()}%`)
    }

    return query
  }, [orgId, supabase, filter, dateRange, searchQuery, getDateCutoff, isFreeTier, historyDays])

  const loadActivities = useCallback(async () => {
    const query = buildQuery(0)
    if (!query) return

    setLoading(true)
    const { data, count, error } = await query

    if (!error && data) {
      setActivities(data)
      setTotalCount(count || 0)
      setHasMore(data.length >= ITEMS_PER_PAGE)
    }
    setLoading(false)
  }, [buildQuery])

  const loadMore = async () => {
    const query = buildQuery(activities.length)
    if (!query) return

    setLoadingMore(true)
    const { data, error } = await query

    if (!error && data) {
      setActivities(prev => [...prev, ...data])
      setHasMore(data.length >= ITEMS_PER_PAGE)
    }
    setLoadingMore(false)
  }

  useEffect(() => {
    if (orgId) loadActivities()
  }, [orgId, filter, dateRange]) // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search
  useEffect(() => {
    if (!orgId) return
    const timeout = setTimeout(() => { loadActivities() }, 300)
    return () => clearTimeout(timeout)
  }, [searchQuery]) // eslint-disable-line react-hooks/exhaustive-deps

  const getActivityLink = (activity: Activity) => {
    if (activity.deal_id) return `/deals/${activity.deal_id}`
    if (activity.contact_id) return `/contacts/${activity.contact_id}`
    if (activity.company_id) return `/companies/${activity.company_id}`
    if (activity.metadata?.entity_type === 'deal' && activity.metadata?.entity_id) return `/deals/${activity.metadata.entity_id}`
    if (activity.metadata?.entity_type === 'contact' && activity.metadata?.entity_id) return `/contacts/${activity.metadata.entity_id}`
    if (activity.metadata?.entity_type === 'company' && activity.metadata?.entity_id) return `/companies/${activity.metadata.entity_id}`
    return null
  }

  const getConfig = (type: string) => {
    return activityConfig[type] || { icon: MessageSquare, color: 'text-gray-600', bg: 'bg-gray-50', label: 'Activity' }
  }

  // Group activities by date
  const groupedActivities = activities.reduce<Record<string, Activity[]>>((groups, activity) => {
    const date = new Date(activity.created_at)
    let label: string
    if (isToday(date)) label = 'Today'
    else if (isYesterday(date)) label = 'Yesterday'
    else label = format(date, 'EEEE, MMMM d, yyyy')

    if (!groups[label]) groups[label] = []
    groups[label].push(activity)
    return groups
  }, {})

  const filterOptions: { value: FilterType; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'contacts', label: terminology.contacts },
    { value: 'companies', label: 'Companies' },
    { value: 'deals', label: terminology.deals },
    { value: 'tasks', label: terminology.tasks },
  ]

  const dateOptions: { value: DateRange; label: string }[] = [
    { value: 'today', label: 'Today' },
    { value: '7d', label: '7 days' },
    { value: '30d', label: '30 days' },
    { value: '90d', label: '90 days' },
    { value: 'all', label: 'All time' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Activity Log</h1>
        <p className="text-sm text-gray-500 mt-1">
          Complete history of actions across your workspace.
          {totalCount > 0 && !loading && <span className="ml-1">{totalCount.toLocaleString()} entries</span>}
        </p>
      </div>

      {/* Filters Bar */}
      <div className="card p-3">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search activities..."
              className="input pl-9 w-full"
            />
          </div>

          {/* Type Filter */}
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setFilter(option.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  filter === option.value
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Date Range */}
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
            {dateOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setDateRange(option.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  dateRange === option.value
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Activity List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      ) : activities.length === 0 ? (
        <div className="card p-12 text-center">
          <RefreshCw size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No activity found</h3>
          <p className="text-gray-500">
            {searchQuery ? 'Try adjusting your search or filters.' : 'Activity will appear here as you use Cadence.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedActivities).map(([dateLabel, dayActivities]) => (
            <div key={dateLabel}>
              {/* Date Header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-gray-400" />
                  <h3 className="text-sm font-semibold text-gray-600">{dateLabel}</h3>
                </div>
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">{dayActivities.length} events</span>
              </div>

              {/* Activities for this date */}
              <div className="card divide-y divide-gray-100">
                {dayActivities.map((activity) => {
                  const config = getConfig(activity.activity_type)
                  const Icon = config.icon
                  const link = getActivityLink(activity)

                  return (
                    <div key={activity.id} className="px-4 py-3 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${config.bg}`}>
                          <Icon size={14} className={config.color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{config.label}</span>
                            <span className="text-xs text-gray-300">&middot;</span>
                            <span className="text-xs text-gray-400">{format(new Date(activity.created_at), 'h:mm a')}</span>
                          </div>
                          <p className="text-sm text-gray-900 mt-0.5">{activity.subject}</p>
                          {activity.body && (
                            <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{activity.body}</p>
                          )}
                        </div>
                        {link && (
                          <Link href={link} className="text-gray-400 hover:text-primary-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0">
                            <ArrowRight size={14} />
                          </Link>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Load More */}
          {hasMore && (
            <div className="text-center py-4">
              <button onClick={loadMore} disabled={loadingMore} className="btn btn-secondary">
                {loadingMore ? (
                  <span className="flex items-center gap-2"><LoadingSpinner size="sm" /> Loading...</span>
                ) : 'Load More'}
              </button>
            </div>
          )}

          {isFreeTier && historyDays && (
            <UpgradeCTA resource="historyDays" variant="inline" />
          )}
        </div>
      )}
    </div>
  )
}
