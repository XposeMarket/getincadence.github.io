'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUserOrgId } from '@/lib/org-helpers'
import { 
  BarChart3, TrendingUp, TrendingDown, DollarSign, Users, Handshake, 
  CheckSquare, Calendar, ArrowUpRight, ArrowDownRight, Loader2, 
  AlertTriangle, Clock, User, ExternalLink, Printer, X, FileText
} from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow, subDays, format } from 'date-fns'

type TimeRange = '7d' | '30d' | '90d' | 'all'

interface Deal {
  id: string
  name: string
  amount: number
  stage_id: string
  owner_id: string | null
  contact_id: string | null
  company_id: string | null
  created_at: string
  updated_at: string
  close_date: string | null
  metadata?: { close_reason?: string; close_notes?: string; closed_at?: string } | null
  pipeline_stages?: { name: string; color: string; is_won?: boolean; is_lost?: boolean }[] | { name: string; color: string; is_won?: boolean; is_lost?: boolean }
  contacts?: { first_name: string; last_name: string }[] | { first_name: string; last_name: string }
  companies?: { name: string }[] | { name: string }
}

const LOSS_REASON_LABELS: Record<string, string> = {
  price: 'Price too high',
  timing: 'Bad timing',
  competitor: 'Went with competitor',
  not_a_fit: 'Not a fit',
  no_response: 'No response / Ghosted',
  budget: 'Budget cut / No budget',
  other: 'Other',
}

interface Task {
  id: string
  title: string
  status: string
  priority: string
  due_date: string | null
  created_at: string
  assigned_to: string | null
  deals?: { id: string; name: string }[] | { id: string; name: string }
  contacts?: { first_name: string; last_name: string }[] | { first_name: string; last_name: string }
}

interface PipelineStage {
  id: string
  name: string
  color: string
  position: number
  is_won?: boolean
  is_lost?: boolean
}

interface Pipeline {
  id: string
  name: string
}

interface UserProfile {
  id: string
  full_name: string
}

interface Activity {
  id: string
  deal_id: string | null
  created_at: string
}

// Helper to get first item from Supabase join that could be array or object
const getFirst = <T,>(data: T[] | T | null | undefined): T | null => {
  if (!data) return null
  return Array.isArray(data) ? data[0] || null : data
}

// ========== PRINT CONFIGURATION ==========
type SectionKey = 
  | 'stats' | 'pipeline' | 'dealsByOwner' | 'idleDeals3to7' | 'idleDeals7plus'
  | 'overdueTasks' | 'incompleteTasks' | 'topDeals' | 'winMetrics'
  | 'dealsLost' | 'stageTimings' | 'funnel' | 'velocity' | 'forecast'

interface ReportSection {
  key: SectionKey
  label: string
  description: string
}

const REPORT_SECTIONS: ReportSection[] = [
  { key: 'stats', label: 'KPI Summary', description: 'Revenue, contacts, deals won, tasks completed' },
  { key: 'pipeline', label: 'Pipeline Overview', description: 'Deal count and value by stage' },
  { key: 'dealsByOwner', label: 'Deals by Owner', description: 'Deal distribution across team' },
  { key: 'winMetrics', label: 'Win Rate & Metrics', description: 'Win rate, avg deal size, sales cycle' },
  { key: 'funnel', label: 'Conversion Funnel', description: 'Stage-to-stage progression' },
  { key: 'velocity', label: 'Sales Velocity', description: 'Revenue throughput per day' },
  { key: 'forecast', label: 'Forecast Pipeline', description: 'Weighted revenue projection' },
  { key: 'dealsLost', label: 'Deals Lost', description: 'Loss reasons and recent losses' },
  { key: 'stageTimings', label: 'Avg Time in Stage', description: 'How long deals stay per stage' },
  { key: 'topDeals', label: 'Top Open Deals', description: 'Highest value open deals' },
  { key: 'idleDeals3to7', label: 'Idle Deals (3-7 Days)', description: 'Deals with no recent activity' },
  { key: 'idleDeals7plus', label: 'Idle Deals (7+ Days)', description: 'Stale deals needing attention' },
  { key: 'overdueTasks', label: 'Overdue Tasks', description: 'Tasks past their due date' },
  { key: 'incompleteTasks', label: 'Incomplete Tasks', description: 'All pending tasks' },
]

interface PrintPreset {
  name: string
  description: string
  icon: typeof FileText
  sections: SectionKey[]
}

const PRINT_PRESETS: PrintPreset[] = [
  {
    name: 'Executive Summary',
    description: 'High-level KPIs and revenue outlook',
    icon: BarChart3,
    sections: ['stats', 'winMetrics', 'pipeline', 'forecast', 'funnel'],
  },
  {
    name: 'Pipeline Health',
    description: 'Where deals are and where they stall',
    icon: TrendingUp,
    sections: ['pipeline', 'funnel', 'stageTimings', 'velocity', 'idleDeals3to7', 'idleDeals7plus'],
  },
  {
    name: 'Full Report',
    description: 'Every section included',
    icon: FileText,
    sections: REPORT_SECTIONS.map(s => s.key),
  },
]

export default function ReportsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d')
  const [loading, setLoading] = useState(true)
  const [orgId, setOrgId] = useState<string | null>(null)
  
  // Stats
  const [stats, setStats] = useState({
    totalRevenue: 0,
    newContacts: 0,
    dealsWon: 0,
    tasksCompleted: 0,
    prevRevenue: 0,
    prevContacts: 0,
    prevDealsWon: 0,
    prevTasksCompleted: 0,
  })
  
  // Pipeline data
  const [pipelineData, setPipelineData] = useState<{ stage: string; count: number; value: number; color: string }[]>([])
  
  // Top deals
  const [topDeals, setTopDeals] = useState<(Deal & { ownerName?: string })[]>([])
  
  // Deals by owner
  const [dealsByOwner, setDealsByOwner] = useState<{ owner: string; ownerId: string | null; count: number; value: number }[]>([])
  
  // Idle deals
  const [idleDeals3to7, setIdleDeals3to7] = useState<Deal[]>([])
  const [idleDeals7Plus, setIdleDeals7Plus] = useState<Deal[]>([])
  
  // Incomplete tasks
  const [incompleteTasks, setIncompleteTasks] = useState<Task[]>([])
  const [overdueTasks, setOverdueTasks] = useState<Task[]>([])
  
  // Win rate and averages
  const [winRate, setWinRate] = useState(0)
  const [avgDealSize, setAvgDealSize] = useState(0)
  const [avgSalesCycle, setAvgSalesCycle] = useState(0)
  
  // Deals lost
  const [lostDealsCount, setLostDealsCount] = useState(0)
  const [lostDealsValue, setLostDealsValue] = useState(0)
  const [lossReasonBreakdown, setLossReasonBreakdown] = useState<{ reason: string; label: string; count: number; percentage: number }[]>([])
  const [recentLostDeals, setRecentLostDeals] = useState<(Deal & { lossReason?: string })[]>([])
  
  // Avg time in stage
  const [stageTimings, setStageTimings] = useState<{ stage: string; avgDays: number; color: string; dealCount: number }[]>([])
  
  // Conversion funnel
  const [funnelData, setFunnelData] = useState<{ stage: string; count: number; color: string; conversionRate: number; dropOff: number }[]>([])
  
  // Sales velocity
  const [salesVelocity, setSalesVelocity] = useState(0)
  
  // Forecast pipeline
  const [forecastData, setForecastData] = useState<{ stage: string; count: number; rawValue: number; weightedValue: number; color: string; weight: number }[]>([])
  const [totalForecast, setTotalForecast] = useState(0)
  
  // Print modal
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [selectedSections, setSelectedSections] = useState<Set<SectionKey>>(new Set(REPORT_SECTIONS.map(s => s.key)))
  const [activePreset, setActivePreset] = useState<string>('Full Report')
  
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const id = await getCurrentUserOrgId()
      setOrgId(id)
    }
    init()
  }, [])

  useEffect(() => {
    if (orgId) {
      loadReportsData()
    }
  }, [orgId, timeRange])

  const getDateRange = () => {
    const now = new Date()
    let startDate: Date
    let prevStartDate: Date
    let prevEndDate: Date
    
    switch (timeRange) {
      case '7d':
        startDate = subDays(now, 7)
        prevStartDate = subDays(now, 14)
        prevEndDate = subDays(now, 7)
        break
      case '30d':
        startDate = subDays(now, 30)
        prevStartDate = subDays(now, 60)
        prevEndDate = subDays(now, 30)
        break
      case '90d':
        startDate = subDays(now, 90)
        prevStartDate = subDays(now, 180)
        prevEndDate = subDays(now, 90)
        break
      case 'all':
      default:
        startDate = new Date('2000-01-01')
        prevStartDate = new Date('2000-01-01')
        prevEndDate = new Date('2000-01-01')
        break
    }
    
    return { startDate, prevStartDate, prevEndDate, now }
  }

  const loadReportsData = async () => {
    if (!orgId) return
    setLoading(true)

    const { startDate, prevStartDate, prevEndDate, now } = getDateRange()

    try {
      // First, get the pipelines for this org to then get stages
      const { data: pipelines } = await supabase
        .from('pipelines')
        .select('id')
        .eq('org_id', orgId)

      const pipelineIds = pipelines?.map(p => p.id) || []

      // Fetch all data in parallel
      const [
        contactsRes,
        prevContactsRes,
        dealsRes,
        tasksRes,
        prevTasksRes,
        stagesRes,
        activitiesRes,
        allTasksRes,
        usersRes
      ] = await Promise.all([
        // Current period contacts
        supabase
          .from('contacts')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', orgId)
          .gte('created_at', startDate.toISOString()),
        // Previous period contacts
        supabase
          .from('contacts')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', orgId)
          .gte('created_at', prevStartDate.toISOString())
          .lt('created_at', prevEndDate.toISOString()),
        // All deals with related data
        supabase
          .from('deals')
          .select(`
            id, name, amount, stage_id, owner_id, contact_id, company_id, 
            pipeline_id, created_at, updated_at, close_date, metadata,
            pipeline_stages(name, color, is_won, is_lost),
            contacts(first_name, last_name),
            companies(name)
          `)
          .eq('org_id', orgId),
        // Current period completed tasks
        supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', orgId)
          .eq('status', 'completed')
          .gte('completed_at', startDate.toISOString()),
        // Previous period completed tasks
        supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', orgId)
          .eq('status', 'completed')
          .gte('completed_at', prevStartDate.toISOString())
          .lt('completed_at', prevEndDate.toISOString()),
        // Pipeline stages - get via pipeline_id
        pipelineIds.length > 0 
          ? supabase
              .from('pipeline_stages')
              .select('id, name, color, position, is_won, is_lost, pipeline_id')
              .in('pipeline_id', pipelineIds)
              .order('position', { ascending: true })
          : Promise.resolve({ data: [] }),
        // Activities for idle deals detection
        supabase
          .from('activities')
          .select('id, deal_id, created_at')
          .eq('org_id', orgId)
          .not('deal_id', 'is', null),
        // All incomplete tasks
        supabase
          .from('tasks')
          .select(`
            id, title, status, priority, due_date, created_at, assigned_to,
            deals(id, name),
            contacts(first_name, last_name)
          `)
          .eq('org_id', orgId)
          .neq('status', 'completed')
          .order('due_date', { ascending: true, nullsFirst: false }),
        // Users for owner mapping
        supabase
          .from('users')
          .select('id, full_name')
          .eq('org_id', orgId)
      ])

      const deals = (dealsRes.data || []) as Deal[]
      const stages = (stagesRes.data || []) as PipelineStage[]
      const activities = (activitiesRes.data || []) as Activity[]
      const allTasks = (allTasksRes.data || []) as Task[]
      const users = (usersRes.data || []) as UserProfile[]

      // Create a map of user IDs to names
      const userMap = new Map<string, string>()
      users.forEach(u => userMap.set(u.id, u.full_name))

      // Calculate stats - deals with is_won stage
      const wonDeals = deals.filter(d => {
        const stage = getFirst(d.pipeline_stages)
        return stage?.is_won
      })
      const currentPeriodWonDeals = wonDeals.filter(d => new Date(d.updated_at) >= startDate)
      const prevPeriodWonDeals = wonDeals.filter(d => {
        const date = new Date(d.updated_at)
        return date >= prevStartDate && date < prevEndDate
      })

      const totalRevenue = currentPeriodWonDeals.reduce((sum, d) => sum + (d.amount || 0), 0)
      const prevRevenue = prevPeriodWonDeals.reduce((sum, d) => sum + (d.amount || 0), 0)

      setStats({
        totalRevenue,
        newContacts: contactsRes.count || 0,
        dealsWon: currentPeriodWonDeals.length,
        tasksCompleted: tasksRes.count || 0,
        prevRevenue,
        prevContacts: prevContactsRes.count || 0,
        prevDealsWon: prevPeriodWonDeals.length,
        prevTasksCompleted: prevTasksRes.count || 0,
      })

      // Pipeline overview - count deals by stage
      const pipelineStats = stages.map(stage => {
        const stageDeals = deals.filter(d => d.stage_id === stage.id)
        return {
          stage: stage.name,
          count: stageDeals.length,
          value: stageDeals.reduce((sum, d) => sum + (d.amount || 0), 0),
          color: stage.color
        }
      })
      setPipelineData(pipelineStats)

      // Top deals (by value, excluding closed)
      const openDeals = deals
        .filter(d => {
          const stage = getFirst(d.pipeline_stages)
          return !stage?.is_won && !stage?.is_lost
        })
        .map(d => ({
          ...d,
          ownerName: d.owner_id ? userMap.get(d.owner_id) : undefined
        }))
        .sort((a, b) => (b.amount || 0) - (a.amount || 0))
        .slice(0, 5)
      setTopDeals(openDeals)

      // Deals by owner
      const ownerMapStats = new Map<string, { count: number; value: number; name: string }>()
      deals.forEach(deal => {
        const ownerId = deal.owner_id || 'unassigned'
        const ownerName = deal.owner_id ? (userMap.get(deal.owner_id) || 'Unknown') : 'Unassigned'
        const existing = ownerMapStats.get(ownerId) || { count: 0, value: 0, name: ownerName }
        existing.count++
        existing.value += deal.amount || 0
        ownerMapStats.set(ownerId, existing)
      })
      
      const ownerStats = Array.from(ownerMapStats.entries())
        .map(([ownerId, data]) => ({
          ownerId: ownerId === 'unassigned' ? null : ownerId,
          owner: data.name,
          count: data.count,
          value: data.value
        }))
        .sort((a, b) => b.value - a.value)
      setDealsByOwner(ownerStats)

      // Idle deals - find deals with no recent activity
      const dealLastActivity = new Map<string, Date>()
      activities.forEach(activity => {
        if (activity.deal_id) {
          const existing = dealLastActivity.get(activity.deal_id)
          const activityDate = new Date(activity.created_at)
          if (!existing || activityDate > existing) {
            dealLastActivity.set(activity.deal_id, activityDate)
          }
        }
      })

      const threeDaysAgo = subDays(now, 3)
      const sevenDaysAgo = subDays(now, 7)

      const openDealsForIdle = deals.filter(d => {
        const stage = getFirst(d.pipeline_stages)
        return !stage?.is_won && !stage?.is_lost
      })
      
      const idle3to7 = openDealsForIdle.filter(deal => {
        const lastActivity = dealLastActivity.get(deal.id)
        const dealCreated = new Date(deal.created_at)
        const referenceDate = lastActivity || dealCreated
        return referenceDate < threeDaysAgo && referenceDate >= sevenDaysAgo
      })
      
      const idle7Plus = openDealsForIdle.filter(deal => {
        const lastActivity = dealLastActivity.get(deal.id)
        const dealCreated = new Date(deal.created_at)
        const referenceDate = lastActivity || dealCreated
        return referenceDate < sevenDaysAgo
      })

      setIdleDeals3to7(idle3to7)
      setIdleDeals7Plus(idle7Plus)

      // Incomplete and overdue tasks
      const incomplete = allTasks.filter(t => t.status !== 'completed')
      const overdue = incomplete.filter(t => t.due_date && new Date(t.due_date) < now)
      
      setIncompleteTasks(incomplete.slice(0, 10))
      setOverdueTasks(overdue)

      // Win rate calculation
      const closedDeals = deals.filter(d => {
        const stage = getFirst(d.pipeline_stages)
        return stage?.is_won || stage?.is_lost
      })
      const wonDealsCount = deals.filter(d => {
        const stage = getFirst(d.pipeline_stages)
        return stage?.is_won
      }).length
      const winRateCalc = closedDeals.length > 0 ? (wonDealsCount / closedDeals.length) * 100 : 0
      setWinRate(Math.round(winRateCalc))

      // Average deal size
      const wonDealsForAvg = deals.filter(d => {
        const stage = getFirst(d.pipeline_stages)
        return stage?.is_won
      })
      const avgSize = wonDealsForAvg.length > 0
        ? wonDealsForAvg.reduce((sum, d) => sum + (d.amount || 0), 0) / wonDealsForAvg.length
        : 0
      setAvgDealSize(Math.round(avgSize))

      // Average sales cycle (days from created to won)
      const wonDealsWithDates = wonDealsForAvg.filter(d => d.created_at && d.updated_at)
      if (wonDealsWithDates.length > 0) {
        const totalDays = wonDealsWithDates.reduce((sum, d) => {
          const created = new Date(d.created_at)
          const closed = new Date(d.updated_at)
          const days = Math.ceil((closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
          return sum + days
        }, 0)
        setAvgSalesCycle(Math.round(totalDays / wonDealsWithDates.length))
      } else {
        setAvgSalesCycle(0)
      }

      // ========== DEALS LOST ==========
      const lostDeals = deals.filter(d => {
        const stage = getFirst(d.pipeline_stages)
        return stage?.is_lost
      })
      setLostDealsCount(lostDeals.length)
      setLostDealsValue(lostDeals.reduce((sum, d) => sum + (d.amount || 0), 0))

      // Loss reason breakdown
      const reasonCounts = new Map<string, number>()
      lostDeals.forEach(d => {
        const meta = d.metadata as any
        const reason = meta?.close_reason || 'unknown'
        reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1)
      })
      const reasonBreakdown = Array.from(reasonCounts.entries())
        .map(([reason, count]) => ({
          reason,
          label: LOSS_REASON_LABELS[reason] || (reason === 'unknown' ? 'No reason given' : reason),
          count,
          percentage: lostDeals.length > 0 ? Math.round((count / lostDeals.length) * 100) : 0
        }))
        .sort((a, b) => b.count - a.count)
      setLossReasonBreakdown(reasonBreakdown)

      // Recent lost deals (most recent 5)
      const recentLost = lostDeals
        .map(d => ({
          ...d,
          lossReason: (d.metadata as any)?.close_reason
        }))
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 5)
      setRecentLostDeals(recentLost)

      // ========== AVG TIME IN STAGE ==========
      // For closed deals (won or lost), calculate how long they spent in their final stage
      // We use all deals and their current stage + time since last update as an approximation
      // For more accurate tracking, we look at deals per stage and average time
      const stageTimeMap = new Map<string, { totalDays: number; count: number }>()
      
      // Group all closed deals by the stages they passed through
      // Since we don't have a stage_history table, we approximate using:
      // - Total deal lifecycle / number of stages = avg per stage (for closed deals)
      // - Current open deals: time in current stage = now - updated_at
      const closedDealsForTiming = deals.filter(d => {
        const stage = getFirst(d.pipeline_stages)
        return stage?.is_won || stage?.is_lost
      })

      // Calculate avg days per stage for closed deals
      if (closedDealsForTiming.length > 0 && stages.length > 0) {
        // For each stage, find deals currently in that stage (open deals)
        // and estimate timing from closed deals
        const activeStages = stages.filter(s => !s.is_won && !s.is_lost)
        
        activeStages.forEach(stage => {
          // Open deals currently in this stage - how long they've been there
          const dealsInStage = deals.filter(d => d.stage_id === stage.id)
          let totalDays = 0
          let count = 0

          dealsInStage.forEach(d => {
            const enteredStage = new Date(d.updated_at)
            const now = new Date()
            const days = Math.max(1, Math.ceil((now.getTime() - enteredStage.getTime()) / (1000 * 60 * 60 * 24)))
            totalDays += days
            count++
          })

          // Also estimate from closed deals: total cycle / active stages count
          closedDealsForTiming.forEach(d => {
            const created = new Date(d.created_at)
            const closed = new Date(d.updated_at)
            const totalCycleDays = Math.max(1, Math.ceil((closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)))
            const avgPerStage = totalCycleDays / Math.max(activeStages.length, 1)
            totalDays += avgPerStage
            count++
          })

          if (count > 0) {
            stageTimeMap.set(stage.id, { totalDays, count })
          }
        })
      }

      const timings = stages
        .filter(s => !s.is_won && !s.is_lost)
        .map(stage => {
          const data = stageTimeMap.get(stage.id)
          return {
            stage: stage.name,
            avgDays: data ? Math.round(data.totalDays / data.count) : 0,
            color: stage.color,
            dealCount: data?.count || 0
          }
        })
      setStageTimings(timings)

      // ========== CONVERSION FUNNEL ==========
      // For each active stage (sorted by position), count how many deals ever reached it
      // Since we don't have stage history, we approximate:
      // - Deals in stage N or beyond = they passed through stages 1..N-1
      const activeStagesForFunnel = stages
        .filter(s => !s.is_won && !s.is_lost)
        .sort((a, b) => a.position - b.position)
      
      const wonStage = stages.find(s => s.is_won)
      const lostStage = stages.find(s => s.is_lost)

      if (activeStagesForFunnel.length > 0) {
        // First pass: count deals that reached each stage
        const stageCounts: number[] = activeStagesForFunnel.map((stage, index) => {
          const laterStagePositions = activeStagesForFunnel
            .filter((_, i) => i >= index)
            .map(s => s.id)
          
          const dealsReachedStage = deals.filter(d => {
            if (laterStagePositions.includes(d.stage_id)) return true
            const dealStage = getFirst(d.pipeline_stages)
            if (dealStage?.is_won || dealStage?.is_lost) return true
            return false
          }).length

          return index === 0 ? deals.length : dealsReachedStage
        })

        // Second pass: build funnel with conversion rates
        const funnel = activeStagesForFunnel.map((stage, index) => {
          const count = stageCounts[index]
          const prevCount = index === 0 ? deals.length : stageCounts[index - 1]
          const conversionRate = index === 0 ? 100 : (prevCount > 0 ? Math.round((count / prevCount) * 100) : 0)
          const dropOff = index === 0 ? 0 : (prevCount > 0 ? Math.round(((prevCount - count) / prevCount) * 100) : 0)

          return {
            stage: stage.name,
            count,
            color: stage.color,
            conversionRate,
            dropOff
          }
        })

        setFunnelData(funnel)
      }

      // ========== SALES VELOCITY ==========
      // Formula: (# of deals × avg deal value × win rate %) / avg sales cycle (days)
      // Result = $ per day flowing through pipeline
      const numDeals = closedDeals.length
      const avgDealVal = wonDealsForAvg.length > 0
        ? wonDealsForAvg.reduce((sum, d) => sum + (d.amount || 0), 0) / wonDealsForAvg.length
        : 0
      const winRateDecimal = closedDeals.length > 0 ? wonDealsCount / closedDeals.length : 0
      const cycleLength = wonDealsWithDates.length > 0
        ? wonDealsWithDates.reduce((sum, d) => {
            const created = new Date(d.created_at)
            const closed = new Date(d.updated_at)
            return sum + Math.max(1, Math.ceil((closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)))
          }, 0) / wonDealsWithDates.length
        : 1
      
      const velocity = (numDeals * avgDealVal * winRateDecimal) / Math.max(cycleLength, 1)
      setSalesVelocity(Math.round(velocity))

      // ========== FORECAST PIPELINE ==========
      // Weight open deals by stage position (earlier = lower weight, later = higher)
      const openDealsForForecast = deals.filter(d => {
        const stage = getFirst(d.pipeline_stages)
        return !stage?.is_won && !stage?.is_lost
      })

      if (activeStagesForFunnel.length > 0) {
        const forecast = activeStagesForFunnel.map((stage, index) => {
          const stageDeals = openDealsForForecast.filter(d => d.stage_id === stage.id)
          const rawValue = stageDeals.reduce((sum, d) => sum + (d.amount || 0), 0)
          // Weight increases by stage position: first stage ~20%, last stage ~90%
          const weight = Math.round(20 + ((index / Math.max(activeStagesForFunnel.length - 1, 1)) * 70))
          const weightedValue = Math.round(rawValue * (weight / 100))

          return {
            stage: stage.name,
            count: stageDeals.length,
            rawValue,
            weightedValue,
            color: stage.color,
            weight
          }
        })

        setForecastData(forecast)
        setTotalForecast(forecast.reduce((sum, f) => sum + f.weightedValue, 0))
      }

    } catch (error) {
      console.error('Failed to load reports data:', error)
    }

    setLoading(false)
  }

  const calculateChange = (current: number, previous: number): { value: string; trend: 'up' | 'down' | 'neutral' } => {
    if (previous === 0) {
      if (current > 0) return { value: '+100%', trend: 'up' }
      return { value: '—', trend: 'neutral' }
    }
    const change = ((current - previous) / previous) * 100
    const formatted = change >= 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`
    return { value: formatted, trend: change >= 0 ? 'up' : 'down' }
  }

  const statCards = [
    { 
      label: 'Total Revenue', 
      ...calculateChange(stats.totalRevenue, stats.prevRevenue),
      value: `$${stats.totalRevenue.toLocaleString()}`, 
      icon: DollarSign,
      color: 'bg-green-100 text-green-600'
    },
    { 
      label: 'New Contacts', 
      ...calculateChange(stats.newContacts, stats.prevContacts),
      value: stats.newContacts.toString(),
      icon: Users,
      color: 'bg-blue-100 text-blue-600'
    },
    { 
      label: 'Deals Won', 
      ...calculateChange(stats.dealsWon, stats.prevDealsWon),
      value: stats.dealsWon.toString(), 
      icon: Handshake,
      color: 'bg-pink-100 text-pink-600'
    },
    { 
      label: 'Tasks Completed', 
      ...calculateChange(stats.tasksCompleted, stats.prevTasksCompleted),
      value: stats.tasksCompleted.toString(), 
      icon: CheckSquare,
      color: 'bg-yellow-100 text-yellow-600'
    },
  ]

  // ========== PRINT HELPERS ==========
  const toggleSection = (key: SectionKey) => {
    setSelectedSections(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
    setActivePreset('')
  }

  const toggleAll = (selectAll: boolean) => {
    if (selectAll) {
      setSelectedSections(new Set(REPORT_SECTIONS.map(s => s.key)))
      setActivePreset('Full Report')
    } else {
      setSelectedSections(new Set())
      setActivePreset('')
    }
  }

  const applyPreset = (preset: PrintPreset) => {
    setSelectedSections(new Set(preset.sections))
    setActivePreset(preset.name)
  }

  const handlePrint = () => {
    // Hide sections not selected
    const allSectionElements = document.querySelectorAll('[data-report-section]')
    const hiddenElements: HTMLElement[] = []
    
    allSectionElements.forEach((el) => {
      const key = el.getAttribute('data-report-section') as SectionKey
      if (!selectedSections.has(key)) {
        const htmlEl = el as HTMLElement
        htmlEl.style.display = 'none'
        hiddenElements.push(htmlEl)
      }
    })

    // Close the modal before printing
    setShowPrintModal(false)

    // Small delay to let modal close, then print
    setTimeout(() => {
      window.print()
      
      // Restore hidden elements after print
      hiddenElements.forEach(el => {
        el.style.display = ''
      })
    }, 200)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-primary-500" size={32} />
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 print:space-y-2">
      {/* Print Header - only shows in print */}
      <div className="hidden print:block print:mb-4">
        <h1 className="text-xl font-bold text-gray-900">Sales Report</h1>
        <p className="text-sm text-gray-500">
          {timeRange === '7d' ? 'Last 7 Days' : timeRange === '30d' ? 'Last 30 Days' : timeRange === '90d' ? 'Last 90 Days' : 'All Time'}
          {' • '}Generated {new Date().toLocaleDateString()}
        </p>
      </div>

      {/* Header - hidden in print */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track your sales performance and metrics</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Time Range Selector */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 overflow-x-auto scrollbar-hide">
            {(['7d', '30d', '90d', 'all'] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                  timeRange === range
                    ? 'bg-white shadow-sm text-gray-900'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : range === '90d' ? '90 Days' : 'All Time'}
              </button>
            ))}
          </div>
          {/* Print / Export Button */}
          <button
            onClick={() => setShowPrintModal(true)}
            className="btn btn-secondary gap-2 print:hidden"
          >
            <Printer size={16} />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Stats - Responsive grid */}
      <div data-report-section="stats" className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="card p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
                <stat.icon size={18} className="sm:w-5 sm:h-5" />
              </div>
              {stat.trend !== 'neutral' && (
                <div className={`flex items-center gap-0.5 text-xs sm:text-sm font-medium ${
                  stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stat.trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  <span className="hidden sm:inline">{stat.value}</span>
                </div>
              )}
            </div>
            <p className="text-lg sm:text-2xl font-bold text-gray-900 mt-2 sm:mt-3">{stat.value}</p>
            <p className="text-xs sm:text-sm text-gray-500 truncate">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Pipeline & Deals by Owner - Responsive grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Pipeline Overview */}
        <div data-report-section="pipeline" className="card p-4 sm:p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Pipeline Overview</h2>
          {pipelineData.length === 0 ? (
            <p className="text-gray-500 text-sm">No pipeline data available. Create some deals to see stats here.</p>
          ) : (
            <div className="space-y-3">
              {pipelineData.map((stage) => {
                const maxValue = Math.max(...pipelineData.map(s => s.value), 1)
                const width = (stage.value / maxValue) * 100
                return (
                  <div key={stage.stage}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: stage.color }} />
                        <span className="text-gray-700 truncate">{stage.stage}</span>
                        <span className="text-gray-400 flex-shrink-0">({stage.count})</span>
                      </div>
                      <span className="font-medium text-gray-900 flex-shrink-0 ml-2">${stage.value.toLocaleString()}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${width}%`, backgroundColor: stage.color }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Deals by Owner */}
        <div data-report-section="dealsByOwner" className="card p-4 sm:p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Deals by Owner</h2>
          {dealsByOwner.length === 0 ? (
            <p className="text-gray-500 text-sm">No deals yet. Create deals to see assignment stats.</p>
          ) : (
            <div className="space-y-3">
              {dealsByOwner.map((item) => {
                const maxValue = Math.max(...dealsByOwner.map(o => o.value), 1)
                const width = (item.value / maxValue) * 100
                return (
                  <div key={item.ownerId || 'unassigned'}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                          <User size={12} className="text-primary-600" />
                        </div>
                        <span className="text-gray-700 truncate">{item.owner}</span>
                        <span className="text-gray-400 flex-shrink-0">({item.count})</span>
                      </div>
                      <span className="font-medium text-gray-900 flex-shrink-0 ml-2">${item.value.toLocaleString()}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500 bg-primary-500"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Idle Deals Section - Responsive grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Idle 3-7 Days */}
        <div data-report-section="idleDeals3to7" className="card p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={18} className="text-yellow-500" />
            <h2 className="font-semibold text-gray-900">Idle Deals (3-7 Days)</h2>
            <span className="badge bg-yellow-100 text-yellow-700">{idleDeals3to7.length}</span>
          </div>
          {idleDeals3to7.length === 0 ? (
            <p className="text-gray-500 text-sm">No idle deals in this range 🎉</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {idleDeals3to7.map(deal => {
                const stage = getFirst(deal.pipeline_stages)
                return (
                  <Link 
                    key={deal.id} 
                    href={`/deals/${deal.id}`}
                    className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate">{deal.name}</p>
                      <p className="text-sm text-gray-500 truncate">
                        {stage?.name} • ${(deal.amount || 0).toLocaleString()}
                      </p>
                    </div>
                    <ExternalLink size={16} className="text-gray-400 flex-shrink-0 ml-2" />
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Idle 7+ Days */}
        <div data-report-section="idleDeals7plus" className="card p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={18} className="text-red-500" />
            <h2 className="font-semibold text-gray-900">Idle Deals (7+ Days)</h2>
            <span className="badge bg-red-100 text-red-700">{idleDeals7Plus.length}</span>
          </div>
          {idleDeals7Plus.length === 0 ? (
            <p className="text-gray-500 text-sm">No idle deals in this range 🎉</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {idleDeals7Plus.map(deal => {
                const stage = getFirst(deal.pipeline_stages)
                return (
                  <Link 
                    key={deal.id} 
                    href={`/deals/${deal.id}`}
                    className="flex items-center justify-between p-3 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate">{deal.name}</p>
                      <p className="text-sm text-gray-500 truncate">
                        {stage?.name} • ${(deal.amount || 0).toLocaleString()}
                      </p>
                    </div>
                    <ExternalLink size={16} className="text-gray-400 flex-shrink-0 ml-2" />
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Incomplete Tasks Section - Responsive grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Overdue Tasks */}
        <div data-report-section="overdueTasks" className="card p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={18} className="text-red-500" />
            <h2 className="font-semibold text-gray-900">Overdue Tasks</h2>
            <span className="badge bg-red-100 text-red-700">{overdueTasks.length}</span>
          </div>
          {overdueTasks.length === 0 ? (
            <p className="text-gray-500 text-sm">No overdue tasks 🎉</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {overdueTasks.slice(0, 10).map(task => (
                <Link 
                  key={task.id} 
                  href="/tasks"
                  className="flex items-center justify-between p-3 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate">{task.title}</p>
                    <p className="text-sm text-gray-500 truncate">
                      {task.due_date && `Due ${formatDistanceToNow(new Date(task.due_date), { addSuffix: true })}`}
                    </p>
                  </div>
                  <span className={`badge flex-shrink-0 ml-2 ${
                    task.priority === 'high' ? 'bg-red-100 text-red-700' :
                    task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {task.priority}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* All Incomplete Tasks */}
        <div data-report-section="incompleteTasks" className="card p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckSquare size={18} className="text-yellow-500" />
            <h2 className="font-semibold text-gray-900">Incomplete Tasks</h2>
            <span className="badge bg-yellow-100 text-yellow-700">{incompleteTasks.length}</span>
          </div>
          {incompleteTasks.length === 0 ? (
            <p className="text-gray-500 text-sm">All tasks completed 🎉</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {incompleteTasks.map(task => {
                const taskDeal = getFirst(task.deals)
                return (
                  <Link 
                    key={task.id} 
                    href="/tasks"
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate">{task.title}</p>
                      <p className="text-sm text-gray-500 truncate">
                        {task.due_date ? `Due ${format(new Date(task.due_date), 'MMM d')}` : 'No due date'}
                        {taskDeal && ` • ${taskDeal.name}`}
                      </p>
                    </div>
                    <span className={`badge flex-shrink-0 ml-2 ${
                      task.priority === 'high' ? 'bg-red-100 text-red-700' :
                      task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {task.priority}
                    </span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Top Deals - Responsive table */}
      <div data-report-section="topDeals" className="card">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Top Open Deals</h2>
        </div>
        {topDeals.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No open deals yet. Create your first deal to see it here.
          </div>
        ) : (
          <>
            {/* Mobile: Card layout */}
            <div className="sm:hidden divide-y divide-gray-200">
              {topDeals.map((deal) => {
                const dealContact = getFirst(deal.contacts)
                const dealCompany = getFirst(deal.companies)
                const stage = getFirst(deal.pipeline_stages)
                return (
                  <Link 
                    key={deal.id} 
                    href={`/deals/${deal.id}`}
                    className="block p-4 hover:bg-gray-50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-primary-600">{deal.name}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          {dealContact ? `${dealContact.first_name} ${dealContact.last_name}` : ''}
                          {dealContact && dealCompany ? ' • ' : ''}
                          {dealCompany?.name || ''}
                        </p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span 
                            className="badge text-xs"
                            style={{ 
                              backgroundColor: `${stage?.color}20`,
                              color: stage?.color
                            }}
                          >
                            {stage?.name || 'Unknown'}
                          </span>
                          {deal.ownerName && (
                            <span className="text-xs text-gray-500">{deal.ownerName}</span>
                          )}
                        </div>
                      </div>
                      <p className="font-semibold text-gray-900">${(deal.amount || 0).toLocaleString()}</p>
                    </div>
                  </Link>
                )
              })}
            </div>
            
            {/* Desktop: Table layout */}
            <div className="hidden sm:block table-responsive">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Deal</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Contact/Company</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Value</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Stage</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Owner</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {topDeals.map((deal) => {
                    const dealContact = getFirst(deal.contacts)
                    const dealCompany = getFirst(deal.companies)
                    const stage = getFirst(deal.pipeline_stages)
                    return (
                      <tr key={deal.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <Link href={`/deals/${deal.id}`} className="font-medium text-primary-600 hover:underline">
                            {deal.name}
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {dealContact ? `${dealContact.first_name} ${dealContact.last_name}` : ''}
                          {dealContact && dealCompany ? ' • ' : ''}
                          {dealCompany?.name || ''}
                          {!dealContact && !dealCompany && <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900">
                          ${(deal.amount || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <span 
                            className="badge"
                            style={{ 
                              backgroundColor: `${stage?.color}20`,
                              color: stage?.color
                            }}
                          >
                            {stage?.name || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {deal.ownerName || <span className="text-gray-400">Unassigned</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Win Rate & Metrics - Responsive grid */}
      <div data-report-section="winMetrics" className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <div className="card p-4 sm:p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Win Rate</h3>
          <div className="flex items-end gap-2">
            <span className="text-3xl sm:text-4xl font-bold text-gray-900">{winRate}%</span>
          </div>
          <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full" style={{ width: `${winRate}%` }} />
          </div>
          <p className="text-xs text-gray-500 mt-2">Based on all closed deals</p>
        </div>

        <div className="card p-4 sm:p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Average Deal Size</h3>
          <div className="flex items-end gap-2">
            <span className="text-3xl sm:text-4xl font-bold text-gray-900">${avgDealSize.toLocaleString()}</span>
          </div>
          <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: '72%' }} />
          </div>
          <p className="text-xs text-gray-500 mt-2">Based on won deals</p>
        </div>

        <div className="card p-4 sm:p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Avg. Sales Cycle</h3>
          <div className="flex items-end gap-2">
            <span className="text-3xl sm:text-4xl font-bold text-gray-900">{avgSalesCycle}</span>
            <span className="text-base sm:text-lg text-gray-500 mb-1">days</span>
          </div>
          <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${Math.min(avgSalesCycle * 2, 100)}%` }} />
          </div>
          <p className="text-xs text-gray-500 mt-2">From created to won</p>
        </div>
      </div>

      {/* ========== DEALS LOST SECTION ========== */}
      <div data-report-section="dealsLost" className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Loss Reason Breakdown */}
        <div className="card p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                <TrendingDown size={16} className="text-red-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Deals Lost</h2>
                <p className="text-xs text-gray-500">{lostDealsCount} deals • ${lostDealsValue.toLocaleString()} lost</p>
              </div>
            </div>
          </div>
          {lossReasonBreakdown.length === 0 ? (
            <p className="text-gray-500 text-sm">No lost deals yet — keep winning! 🎉</p>
          ) : (
            <div className="space-y-3">
              {lossReasonBreakdown.map((item) => {
                const colors: Record<string, string> = {
                  price: '#EF4444',
                  competitor: '#F97316',
                  timing: '#EAB308',
                  budget: '#EC4899',
                  not_a_fit: '#8B5CF6',
                  no_response: '#6B7280',
                  other: '#94A3B8',
                  unknown: '#CBD5E1'
                }
                const color = colors[item.reason] || '#94A3B8'
                return (
                  <div key={item.reason}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-gray-700 truncate">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        <span className="text-gray-400 text-xs">{item.percentage}%</span>
                        <span className="font-medium text-gray-900">{item.count}</span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${item.percentage}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent Lost Deals */}
        <div className="card p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="font-semibold text-gray-900">Recently Lost</h2>
            {recentLostDeals.length > 0 && (
              <span className="badge bg-red-100 text-red-700">{recentLostDeals.length}</span>
            )}
          </div>
          {recentLostDeals.length === 0 ? (
            <p className="text-gray-500 text-sm">No recently lost deals.</p>
          ) : (
            <div className="space-y-2">
              {recentLostDeals.map(deal => {
                const dealContact = getFirst(deal.contacts)
                const dealCompany = getFirst(deal.companies)
                const reasonLabel = deal.lossReason 
                  ? (LOSS_REASON_LABELS[deal.lossReason] || deal.lossReason)
                  : 'No reason given'
                return (
                  <Link 
                    key={deal.id} 
                    href={`/deals/${deal.id}`}
                    className="flex items-center justify-between p-3 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate">{deal.name}</p>
                      <p className="text-sm text-gray-500 truncate">
                        {reasonLabel}
                        {dealContact && ` • ${dealContact.first_name} ${dealContact.last_name}`}
                        {dealCompany && ` • ${dealCompany.name}`}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Lost {formatDistanceToNow(new Date(deal.updated_at), { addSuffix: true })}
                      </p>
                    </div>
                    <span className="font-medium text-red-600 flex-shrink-0 ml-2">
                      -${(deal.amount || 0).toLocaleString()}
                    </span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ========== AVG TIME IN STAGE SECTION ========== */}
      <div data-report-section="stageTimings" className="card p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
            <Clock size={16} className="text-indigo-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Avg. Time in Stage</h2>
            <p className="text-xs text-gray-500">How long deals stay in each pipeline stage</p>
          </div>
        </div>
        {stageTimings.length === 0 ? (
          <p className="text-gray-500 text-sm mt-4">No stage data yet. Add deals to your pipeline to see timing insights.</p>
        ) : (
          <div className="mt-4">
            {/* Stage timing bars */}
            <div className="space-y-4">
              {stageTimings.map((stage) => {
                const maxDays = Math.max(...stageTimings.map(s => s.avgDays), 1)
                const width = (stage.avgDays / maxDays) * 100
                return (
                  <div key={stage.stage}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: stage.color }} />
                        <span className="text-gray-700 font-medium truncate">{stage.stage}</span>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                        <span className="text-xs text-gray-400">{stage.dealCount} deals</span>
                        <span className="font-semibold text-gray-900">
                          {stage.avgDays} {stage.avgDays === 1 ? 'day' : 'days'}
                        </span>
                      </div>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700 relative"
                        style={{ width: `${Math.max(width, 3)}%`, backgroundColor: stage.color }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
            
            {/* Summary insight */}
            {stageTimings.length > 1 && (() => {
              const slowest = stageTimings.reduce((a, b) => a.avgDays > b.avgDays ? a : b)
              const fastest = stageTimings.reduce((a, b) => a.avgDays < b.avgDays ? a : b)
              const totalAvg = stageTimings.reduce((sum, s) => sum + s.avgDays, 0)
              return (
                <div className="mt-4 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                  <p className="text-sm text-indigo-800">
                    <span className="font-medium">💡 Insight:</span>{' '}
                    Deals spend the most time in <span className="font-semibold">{slowest.stage}</span> ({slowest.avgDays} days) 
                    and move fastest through <span className="font-semibold">{fastest.stage}</span> ({fastest.avgDays} days). 
                    Total pipeline time averages <span className="font-semibold">{totalAvg} days</span>.
                  </p>
                </div>
              )
            })()}
          </div>
        )}
      </div>

      {/* ========== CONVERSION FUNNEL (Step-Ladder) ========== */}
      <div data-report-section="funnel" className="card p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
            <BarChart3 size={16} className="text-teal-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Conversion Funnel</h2>
            <p className="text-xs text-gray-500">Where do deals stop moving?</p>
          </div>
        </div>
        {funnelData.length === 0 ? (
          <p className="text-gray-500 text-sm mt-4">No pipeline data yet. Add deals to see your conversion funnel.</p>
        ) : (() => {
          const totalDeals = funnelData[0]?.count || 0
          const hasEnoughData = totalDeals >= 10
          return (
            <div className="mt-4">
              {/* Step-ladder funnel visualization */}
              <div className="space-y-0">
                {funnelData.map((stage, index) => {
                  const maxCount = Math.max(...funnelData.map(s => s.count), 1)
                  const widthPercent = Math.max((stage.count / maxCount) * 100, 15)
                  const isLastStage = index === funnelData.length - 1
                  
                  return (
                    <div key={stage.stage}>
                      {/* Stage bar */}
                      <div 
                        className="mx-auto transition-all duration-500"
                        style={{ width: `${widthPercent}%` }}
                      >
                        <div 
                          className="h-10 rounded-md flex items-center justify-between px-3 text-white"
                          style={{ backgroundColor: stage.color }}
                        >
                          <span className="text-sm font-medium truncate">{stage.stage}</span>
                          <span className="text-sm font-bold">{stage.count}</span>
                        </div>
                      </div>
                      
                      {/* Arrow connector with conversion rate (only shown with enough data) */}
                      {!isLastStage && (
                        <div className="flex flex-col items-center py-1">
                          <div className="text-gray-400">↓</div>
                          {hasEnoughData && index < funnelData.length - 1 && funnelData[index + 1] && (
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              funnelData[index + 1].conversionRate >= 70 ? 'bg-green-100 text-green-700' :
                              funnelData[index + 1].conversionRate >= 40 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {funnelData[index + 1].conversionRate}%
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Insight or guidance based on data volume */}
              {!hasEnoughData ? (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600">
                    {funnelData.filter(s => s.count > 0).length > 1 ? (
                      <>You have deals in <span className="font-medium">{funnelData.filter(s => s.count > 0).length} stages</span>. Conversion rates will appear once you have 10+ deals.</>
                    ) : (
                      <>Add more deals to unlock conversion insights.</>  
                    )}
                  </p>
                </div>
              ) : funnelData.length > 2 && (() => {
                const stagesWithDrops = funnelData.filter((_, i) => i > 0 && funnelData[i].conversionRate < 100)
                if (stagesWithDrops.length > 0) {
                  const weakest = stagesWithDrops.reduce((a, b) => a.conversionRate < b.conversionRate ? a : b)
                  return (
                    <div className="mt-4 p-3 bg-teal-50 rounded-lg border border-teal-100">
                      <p className="text-sm text-teal-800">
                        <span className="font-medium">💡</span>{' '}
                        Deals stall most at <span className="font-semibold">{weakest.stage}</span> ({weakest.conversionRate}% make it through). 
                        Focus here to improve pipeline flow.
                      </p>
                    </div>
                  )
                }
                return null
              })()}
            </div>
          )
        })()}
      </div>

      {/* ========== SALES VELOCITY + FORECAST ========== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Sales Velocity */}
        <div data-report-section="velocity" className="card p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
              <TrendingUp size={16} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Sales Velocity</h2>
              <p className="text-xs text-gray-500">Is your pipeline producing revenue?</p>
            </div>
          </div>
          
          {stats.dealsWon === 0 ? (
            /* Coaching mode - no closed deals yet */
            <div className="text-center py-6">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                <TrendingUp size={24} className="text-gray-400" />
              </div>
              <p className="text-gray-900 font-medium">Sales velocity can't be calculated yet</p>
              <p className="text-sm text-gray-500 mt-1">Close at least one deal to unlock this metric.</p>
              <p className="text-xs text-gray-400 mt-4">
                Velocity increases when you close deals faster or at higher value.
              </p>
            </div>
          ) : (
            /* Active mode - has closed deals */
            <>
              <div className="text-center py-4">
                <p className="text-4xl sm:text-5xl font-bold text-gray-900">
                  ${salesVelocity.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500 mt-1">per day</p>
              </div>
              
              {/* Key drivers (no formula shown) */}
              <div className="mt-4 flex items-center justify-center gap-4 text-sm text-gray-500">
                <span>{stats.dealsWon} won</span>
                <span className="text-gray-300">·</span>
                <span>${avgDealSize.toLocaleString()} avg</span>
                <span className="text-gray-300">·</span>
                <span>{avgSalesCycle}d cycle</span>
              </div>
              
              {/* Contextual insight */}
              <div className="mt-4 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                <p className="text-sm text-emerald-800 text-center">
                  {salesVelocity < 100 ? (
                    <>Focus on closing deals faster or increasing deal size to boost velocity.</>
                  ) : salesVelocity < 500 ? (
                    <>Your pipeline is generating steady revenue. Keep momentum going.</>
                  ) : (
                    <>Strong velocity! Your pipeline is producing consistent revenue.</>
                  )}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Forecast Pipeline */}
        <div data-report-section="forecast" className="card p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <DollarSign size={16} className="text-amber-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Forecast Pipeline</h2>
                <p className="text-xs text-gray-500">What's likely to close?</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">${totalForecast.toLocaleString()}</p>
              <p className="text-xs text-gray-500">Expected revenue <span className="text-gray-400">(estimate)</span></p>
            </div>
          </div>
          {forecastData.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-gray-500 text-sm">No open deals to forecast.</p>
              <p className="text-xs text-gray-400 mt-1">Add deals to your pipeline to see revenue projections.</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {forecastData.map((stage) => {
                  const maxValue = Math.max(...forecastData.map(s => s.rawValue), 1)
                  const rawWidth = (stage.rawValue / maxValue) * 100
                  const weightedWidth = (stage.weightedValue / maxValue) * 100
                  return (
                    <div key={stage.stage}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: stage.color }} />
                          <span className="text-gray-700 truncate">{stage.stage}</span>
                          <span className="text-gray-400 text-xs">({stage.count})</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          <span className="font-medium text-gray-900">${stage.weightedValue.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden relative">
                        {/* Raw value (light) */}
                        <div
                          className="h-full rounded-full absolute top-0 left-0 opacity-25"
                          style={{ width: `${rawWidth}%`, backgroundColor: stage.color }}
                        />
                        {/* Weighted value (solid) */}
                        <div
                          className="h-full rounded-full relative transition-all duration-500"
                          style={{ width: `${weightedWidth}%`, backgroundColor: stage.color }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
              
              {/* Estimated weights disclaimer */}
              <p className="text-xs text-gray-400 mt-3 text-center">
                Based on estimated stage probabilities. Upgrade to customize weights.
              </p>
            </>
          )}
        </div>
      </div>

      {/* ========== PRINT/EXPORT MODAL ========== */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowPrintModal(false)}
          />
          
          {/* Modal */}
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Export Report</h2>
                <p className="text-sm text-gray-500">Choose which sections to include</p>
              </div>
              <button 
                onClick={() => setShowPrintModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            {/* Presets */}
            <div className="px-6 py-3 border-b border-gray-100">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Quick Presets</p>
              <div className="grid grid-cols-3 gap-2">
                {PRINT_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => applyPreset(preset)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-center transition-all ${
                      activePreset === preset.name
                        ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <preset.icon size={18} className={activePreset === preset.name ? 'text-primary-600' : 'text-gray-500'} />
                    <span className={`text-xs font-medium ${activePreset === preset.name ? 'text-primary-700' : 'text-gray-700'}`}>
                      {preset.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Section Checkboxes */}
            <div className="flex-1 overflow-y-auto px-6 py-3">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Sections</p>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => toggleAll(true)}
                    className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Select all
                  </button>
                  <span className="text-gray-300">|</span>
                  <button 
                    onClick={() => toggleAll(false)}
                    className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                {REPORT_SECTIONS.map((section) => (
                  <label 
                    key={section.key}
                    className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
                      selectedSections.has(section.key) ? 'bg-gray-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedSections.has(section.key)}
                      onChange={() => toggleSection(section.key)}
                      className="w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${selectedSections.has(section.key) ? 'text-gray-900' : 'text-gray-500'}`}>
                        {section.label}
                      </p>
                      <p className="text-xs text-gray-400">{section.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {selectedSections.size} of {REPORT_SECTIONS.length} sections
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePrint}
                  disabled={selectedSections.size === 0}
                  className="btn btn-primary gap-2 disabled:opacity-50"
                >
                  <Printer size={16} />
                  Print / Save PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
