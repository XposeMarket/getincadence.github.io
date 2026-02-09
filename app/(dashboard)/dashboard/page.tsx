'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUserOrgId } from '@/lib/org-helpers'
import Link from 'next/link'
import { 
  Users, Building2, Handshake, CheckSquare, MessageSquare, 
  ArrowRight, TrendingUp, RefreshCw, Clock, GripVertical, Edit2, Check,
  AlertTriangle, ExternalLink, Zap
} from 'lucide-react'
import { formatActivityTime } from '@/lib/date-utils'
import CreateTaskModal from '@/components/tasks/CreateTaskModal'
import { format } from 'date-fns'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
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

const activityIcons: Record<string, { icon: any; color: string; bg: string }> = {
  contact_created: { icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
  company_created: { icon: Building2, color: 'text-teal-600', bg: 'bg-teal-100' },
  deal_created: { icon: Handshake, color: 'text-pink-600', bg: 'bg-pink-100' },
  deal_stage_changed: { icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-100' },
  task_created: { icon: CheckSquare, color: 'text-yellow-600', bg: 'bg-yellow-100' },
  task_completed: { icon: CheckSquare, color: 'text-green-600', bg: 'bg-green-100' },
  note_added: { icon: MessageSquare, color: 'text-gray-600', bg: 'bg-gray-100' },
  stage_change: { icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-100' },
  note: { icon: MessageSquare, color: 'text-gray-600', bg: 'bg-gray-100' },
}

type FilterType = 'all' | 'contacts' | 'companies' | 'deals' | 'tasks'
type PanelId = 'activity' | 'tasks' | 'attention' | 'due'
type ColumnId = 'left' | 'right'

interface PanelConfig {
  id: PanelId
  column: ColumnId
  order: number
  height: number
}

interface LayoutConfig {
  leftColumnWidth: number
  panels: PanelConfig[]
}

const DEFAULT_LAYOUT: LayoutConfig = {
  leftColumnWidth: 60,
  panels: [
    { id: 'activity', column: 'left', order: 0, height: 700 },
    { id: 'tasks', column: 'right', order: 0, height: 280 },
    { id: 'attention', column: 'right', order: 1, height: 300 },
    { id: 'due', column: 'right', order: 2, height: 220 },
  ]
}

export default function DashboardPage() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')
  const [stats, setStats] = useState({ contacts: 0, companies: 0, deals: 0, tasks: 0, noActivity7: 0 })
  const [tasksList, setTasksList] = useState<any[]>([])
  const [stalledDealsList, setStalledDealsList] = useState<any[]>([])
  const [noActivity7List, setNoActivity7List] = useState<any[]>([])
  const [overdueTasksList, setOverdueTasksList] = useState<any[]>([])
  const [dueTodayTomorrowList, setDueTodayTomorrowList] = useState<any[]>([])
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [layout, setLayout] = useState<LayoutConfig>(DEFAULT_LAYOUT)
  const [orgId, setOrgId] = useState<string | null>(null)
  
  // Drag state - same pattern as kanban
  const [draggedPanel, setDraggedPanel] = useState<PanelId | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<ColumnId | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const { isFreeTier, historyDays } = useUsageLimits()

  useEffect(() => {
    const saved = localStorage.getItem('cadence-dashboard-layout-v3')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        const requiredPanelIds: PanelId[] = ['activity', 'tasks', 'attention', 'due']
        const hasAllPanels = parsed.panels && 
          Array.isArray(parsed.panels) &&
          requiredPanelIds.every((id: PanelId) => 
            parsed.panels.some((p: PanelConfig) => p.id === id && p.column && typeof p.height === 'number')
          )
        
        if (hasAllPanels && typeof parsed.leftColumnWidth === 'number') {
          setLayout(parsed)
        } else {
          localStorage.removeItem('cadence-dashboard-layout-v3')
        }
      } catch (e) {
        localStorage.removeItem('cadence-dashboard-layout-v3')
      }
    }
  }, [])

  const saveLayout = () => {
    localStorage.setItem('cadence-dashboard-layout-v3', JSON.stringify(layout))
  }

  // Initialize org_id first, then load data
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
  }, [filter, orgId])

  const loadData = async () => {
    if (!orgId) {
      setLoading(false)
      return
    }

    setLoading(true)

    let activityQuery = supabase
      .from('activities')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(50)

    // Free tier: limit activity history to 30 days
    if (isFreeTier && historyDays) {
      const cutoff = new Date(Date.now() - historyDays * 24 * 60 * 60 * 1000).toISOString()
      activityQuery = activityQuery.gte('created_at', cutoff)
    }

    if (filter === 'contacts') {
      activityQuery = activityQuery.or('activity_type.eq.contact_created,activity_type.eq.contact_updated')
    } else if (filter === 'companies') {
      activityQuery = activityQuery.or('activity_type.eq.company_created,activity_type.eq.company_updated')
    } else if (filter === 'deals') {
      activityQuery = activityQuery.or('activity_type.eq.deal_created,activity_type.eq.deal_stage_changed,activity_type.eq.stage_change')
    } else if (filter === 'tasks') {
      activityQuery = activityQuery.or('activity_type.eq.task_created,activity_type.eq.task_completed')
    }

    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const [activitiesRes, contactsRes, companiesRes, dealsRes, tasksCountRes, activities7Res, activities30Res, tasksListRes, overdueTasksRes, dueTodayTomorrowRes] = await Promise.all([
      activityQuery,
      supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
      supabase.from('companies').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
      supabase.from('deals').select('id, name, amount').eq('org_id', orgId),
      supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'open'),
      supabase.from('activities').select('deal_id').eq('org_id', orgId).gte('created_at', sevenDaysAgo),
      supabase.from('activities').select('deal_id').eq('org_id', orgId).gte('created_at', thirtyDaysAgo),
      supabase.from('tasks').select('id, title, due_date, status, metadata').eq('org_id', orgId).eq('status', 'open').order('due_date', { ascending: true }).limit(10),
      supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('org_id', orgId).lt('due_date', now.toISOString()).not('status', 'eq', 'completed'),
      supabase.from('tasks').select('id, title, due_date, metadata').eq('org_id', orgId).neq('status', 'completed').lte('due_date', format(tomorrow, 'yyyy-MM-dd')).gte('due_date', format(now, 'yyyy-MM-dd')).order('due_date', { ascending: true })
    ])

    if (activitiesRes.data) setActivities(activitiesRes.data)

    const deals = dealsRes.data || []
    const recent7DealIds = new Set((activities7Res.data || []).map((a: any) => a.deal_id).filter(Boolean))
    const recent30DealIds = new Set((activities30Res.data || []).map((a: any) => a.deal_id).filter(Boolean))

    const noActivityList = deals.filter((d: any) => !recent7DealIds.has(d.id)).slice(0, 5)
    const stalledList = deals.filter((d: any) => !recent30DealIds.has(d.id)).slice(0, 5)
    const overdueTasksListLocal = (tasksListRes.data || []).filter((t: any) => t.due_date && new Date(t.due_date) < now).slice(0, 5)

    setStats({
      contacts: contactsRes.count || 0,
      companies: companiesRes.count || 0,
      deals: deals.length || 0,
      tasks: tasksCountRes.count || 0,
      noActivity7: noActivityList.length,
    })

    setTasksList(tasksListRes.data || [])
    setNoActivity7List(noActivityList)
    setStalledDealsList(stalledList)
    setOverdueTasksList(overdueTasksListLocal)
    setDueTodayTomorrowList(dueTodayTomorrowRes.data || [])

    setLoading(false)
  }

  const getActivityIcon = (type: string) => {
    return activityIcons[type] || { icon: MessageSquare, color: 'text-gray-600', bg: 'bg-gray-100' }
  }

  const getActivityLink = (activity: Activity) => {
    if (activity.deal_id) return `/deals/${activity.deal_id}`
    if (activity.contact_id) return `/contacts/${activity.contact_id}`
    if (activity.company_id) return `/companies/${activity.company_id}`
    if (activity.metadata?.entity_type === 'deal' && activity.metadata?.entity_id) {
      return `/deals/${activity.metadata.entity_id}`
    }
    if (activity.metadata?.entity_type === 'contact' && activity.metadata?.entity_id) {
      return `/contacts/${activity.metadata.entity_id}`
    }
    if (activity.metadata?.entity_type === 'company' && activity.metadata?.entity_id) {
      return `/companies/${activity.metadata.entity_id}`
    }
    return null
  }

  const getPanelConfig = (panelId: PanelId): PanelConfig => {
    const config = layout.panels.find(p => p.id === panelId)
    if (!config) {
      return { id: panelId, column: 'right', order: 0, height: 300 }
    }
    return config
  }

  const getColumnPanels = (column: ColumnId) => {
    return layout.panels
      .filter(p => p.column === column)
      .sort((a, b) => a.order - b.order)
  }

  // Drag handlers - same pattern as kanban
  const handleDragStart = (e: React.DragEvent, panelId: PanelId) => {
    setDraggedPanel(panelId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragEnd = () => {
    setDraggedPanel(null)
    setDragOverColumn(null)
    setDragOverIndex(null)
  }

  const handleDragOverColumn = (e: React.DragEvent, column: ColumnId) => {
    e.preventDefault()
    setDragOverColumn(column)
  }

  const handleDragLeaveColumn = () => {
    setDragOverColumn(null)
    setDragOverIndex(null)
  }

  const handleDropOnColumn = (e: React.DragEvent, targetColumn: ColumnId, targetIndex: number) => {
    e.preventDefault()
    
    if (!draggedPanel) return

    setLayout(prev => {
      const newPanels = prev.panels.map(p => ({ ...p })) // Deep copy
      const draggedPanelConfig = newPanels.find(p => p.id === draggedPanel)!
      const sourceColumn = draggedPanelConfig.column
      
      // If moving within the same column
      if (sourceColumn === targetColumn) {
        const columnPanels = newPanels
          .filter(p => p.column === targetColumn)
          .sort((a, b) => a.order - b.order)
        
        const currentIndex = columnPanels.findIndex(p => p.id === draggedPanel)
        
        // Remove from current position and insert at new position
        columnPanels.splice(currentIndex, 1)
        const adjustedIndex = targetIndex > currentIndex ? targetIndex - 1 : targetIndex
        columnPanels.splice(adjustedIndex, 0, draggedPanelConfig)
        
        // Update orders
        columnPanels.forEach((p, idx) => {
          const panelInNewPanels = newPanels.find(np => np.id === p.id)!
          panelInNewPanels.order = idx
        })
      } else {
        // Moving to different column
        draggedPanelConfig.column = targetColumn
        
        // Reorder source column
        const sourcePanels = newPanels
          .filter(p => p.column === sourceColumn)
          .sort((a, b) => a.order - b.order)
        sourcePanels.forEach((p, idx) => {
          newPanels.find(np => np.id === p.id)!.order = idx
        })
        
        // Insert into target column at the right position
        const targetPanels = newPanels
          .filter(p => p.column === targetColumn && p.id !== draggedPanel)
          .sort((a, b) => a.order - b.order)
        targetPanels.splice(targetIndex, 0, draggedPanelConfig)
        targetPanels.forEach((p, idx) => {
          newPanels.find(np => np.id === p.id)!.order = idx
        })
      }
      
      return { ...prev, panels: newPanels }
    })

    setDraggedPanel(null)
    setDragOverColumn(null)
    setDragOverIndex(null)
  }

  const handleDragOverDropZone = (e: React.DragEvent, column: ColumnId, index: number) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverColumn(column)
    setDragOverIndex(index)
  }

  const updateColumnWidth = (newWidth: number) => {
    const clampedWidth = Math.max(30, Math.min(70, newWidth))
    setLayout(prev => ({ ...prev, leftColumnWidth: clampedWidth }))
  }

  const resetLayout = () => {
    setLayout(DEFAULT_LAYOUT)
    localStorage.removeItem('cadence-dashboard-layout-v3')
  }

  const filterOptions: { value: FilterType; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'contacts', label: 'Contacts' },
    { value: 'companies', label: 'Companies' },
    { value: 'deals', label: 'Deals' },
    { value: 'tasks', label: 'Tasks' },
  ]

  // Resize handle for panel heights
  const ResizeHandle = ({ panelId }: { panelId: PanelId }) => {
    if (!editMode) return null

    const handleMouseDown = (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      
      const startY = e.clientY
      const startHeight = getPanelConfig(panelId).height
      
      const handleMouseMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientY - startY
        const newHeight = Math.max(150, Math.min(800, startHeight + delta))
        setLayout(prev => ({
          ...prev,
          panels: prev.panels.map(p => p.id === panelId ? { ...p, height: newHeight } : p)
        }))
      }
      
      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
      
      document.body.style.cursor = 'ns-resize'
      document.body.style.userSelect = 'none'
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return (
      <div 
        className="absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize flex items-center justify-center bg-gradient-to-t from-primary-100 to-transparent hover:from-primary-200 transition-colors z-10"
        onMouseDown={handleMouseDown}
      >
        <div className="w-16 h-1 rounded-full bg-primary-400" />
      </div>
    )
  }

  // Column resize handle
  const ColumnResizeHandle = () => {
    if (!editMode) return <div className="w-4" />

    const handleMouseDown = (e: React.MouseEvent) => {
      if (!containerRef.current) return
      e.preventDefault()
      
      const containerRect = containerRef.current.getBoundingClientRect()
      const startX = e.clientX
      const startWidth = layout.leftColumnWidth
      
      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX
        const deltaPercent = (deltaX / containerRect.width) * 100
        updateColumnWidth(startWidth + deltaPercent)
      }
      
      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
      
      document.body.style.cursor = 'ew-resize'
      document.body.style.userSelect = 'none'
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return (
      <div 
        className="w-4 cursor-ew-resize flex items-center justify-center hover:bg-primary-100 transition-colors rounded mx-1"
        onMouseDown={handleMouseDown}
      >
        <div className="h-20 w-1 rounded-full bg-primary-300" />
      </div>
    )
  }

  // Drop zone between panels
  const DropZone = ({ column, index }: { column: ColumnId; index: number }) => {
    if (!editMode || !draggedPanel) return null
    
    const isActive = dragOverColumn === column && dragOverIndex === index
    
    return (
      <div
        className={`h-3 my-1 rounded transition-all ${
          isActive ? 'h-16 bg-primary-100 border-2 border-dashed border-primary-400' : ''
        }`}
        onDragOver={(e) => handleDragOverDropZone(e, column, index)}
        onDrop={(e) => handleDropOnColumn(e, column, index)}
      />
    )
  }

  const renderPanel = (panelId: PanelId, title: string, content: React.ReactNode, headerRight?: React.ReactNode) => {
    const config = getPanelConfig(panelId)
    const isDragging = draggedPanel === panelId
    
    return (
      <div
        draggable={editMode}
        onDragStart={(e) => handleDragStart(e, panelId)}
        onDragEnd={handleDragEnd}
        className={`relative transition-all ${isDragging ? 'opacity-50' : ''} ${
          editMode ? 'cursor-grab active:cursor-grabbing' : ''
        }`}
        style={{ height: config.height }}
      >
        <div className={`card h-full overflow-hidden ${editMode ? 'ring-2 ring-primary-200' : ''}`}>
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {editMode && <GripVertical size={16} className="text-gray-400" />}
              <h2 className="font-semibold text-gray-900">{title}</h2>
            </div>
            <div className="flex items-center gap-2">
              {headerRight}
            </div>
          </div>
          <div className="overflow-y-auto" style={{ height: config.height - 53 }}>
            {content}
          </div>
        </div>
        <ResizeHandle panelId={panelId} />
      </div>
    )
  }

  const renderActivityPanel = () => {
    return renderPanel(
      'activity',
      'Activity Feed',
      loading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="md" />
        </div>
      ) : activities.length > 0 ? (
        <div className="divide-y divide-gray-100">
          {activities.map((activity) => {
            const { icon: Icon, color, bg } = getActivityIcon(activity.activity_type)
            const link = getActivityLink(activity)

            return (
              <div key={activity.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${bg}`}>
                    <Icon size={14} className={color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{activity.subject}</p>
                    {activity.body && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{activity.body}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <Clock size={10} className="text-gray-400" />
                      <span className="text-xs text-gray-400">{formatActivityTime(activity.created_at)}</span>
                    </div>
                  </div>
                  {link && (
                    <Link href={link} className="text-gray-400 hover:text-primary-600 p-1">
                      <ArrowRight size={14} />
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
          {isFreeTier && historyDays && (
            <div className="px-4 py-3">
              <UpgradeCTA resource="historyDays" variant="inline" />
            </div>
          )}
        </div>
      ) : (
        <div className="py-12 text-center">
          <RefreshCw size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No activity yet</h3>
          <p className="text-gray-500">Start by creating contacts, companies, and deals.</p>
        </div>
      ),
      <div className="flex items-center gap-1">
        {filterOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setFilter(option.value)}
            className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
              filter === option.value
                ? 'bg-primary-100 text-primary-700'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    )
  }

  const renderTasksPanel = () => {
    return renderPanel(
      'tasks',
      'Tasks',
      tasksList.length === 0 ? (
        <div className="p-6 text-center">
          <p className="text-sm text-gray-500 mb-3">No open tasks</p>
          <button onClick={() => setShowCreateTaskModal(true)} className="btn btn-primary">
            Create Task
          </button>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {tasksList.slice(0, 5).map((t) => (
            <div key={t.id} className="px-4 py-3 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium text-gray-900">{t.title || 'Untitled Task'}</p>
                  {(t as any).metadata?.automated && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-700 bg-amber-50 px-1 py-0.5 rounded shrink-0">
                      <Zap size={9} />
                    </span>
                  )}
                </div>
                {t.due_date && (
                  <p className="text-xs text-gray-500 mt-0.5">Due {formatActivityTime(t.due_date)}</p>
                )}
              </div>
              <Link href="/tasks" className="text-gray-400 hover:text-primary-600 p-1">
                <ArrowRight size={14} />
              </Link>
            </div>
          ))}
        </div>
      ),
      <Link href="/tasks" className="text-sm text-primary-600 hover:underline">View all</Link>
    )
  }

  const renderAttentionPanel = () => {
    const totalAttentionItems = noActivity7List.length + overdueTasksList.length + stalledDealsList.length
    
    return renderPanel(
      'attention',
      'Needs Attention',
      <div className="p-4 space-y-4">
        {/* Overdue Tasks */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Clock size={14} className="text-red-500" />
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Overdue Tasks</h4>
            <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-medium">{overdueTasksList.length}</span>
          </div>
          {overdueTasksList.length === 0 ? (
            <p className="text-sm text-gray-400">No overdue tasks 🎉</p>
          ) : (
            <div className="space-y-1.5">
              {overdueTasksList.map((t: any) => (
                <Link 
                  key={t.id} 
                  href="/tasks"
                  className="flex items-center justify-between p-2 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{t.title || 'Untitled'}</p>
                    {t.due_date && (
                      <p className="text-xs text-red-600">Due {formatActivityTime(t.due_date)}</p>
                    )}
                  </div>
                  <ExternalLink size={14} className="text-gray-400 flex-shrink-0 ml-2" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Deals with no activity in 7 days */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} className="text-yellow-500" />
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Idle Deals (7 days)</h4>
            <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-medium">{noActivity7List.length}</span>
          </div>
          {noActivity7List.length === 0 ? (
            <p className="text-sm text-gray-400">All deals are active 🎉</p>
          ) : (
            <div className="space-y-1.5">
              {noActivity7List.map((d: any) => (
                <Link 
                  key={d.id} 
                  href={`/deals/${d.id}`}
                  className="flex items-center justify-between p-2 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{d.name || 'Untitled Deal'}</p>
                    {d.amount > 0 && (
                      <p className="text-xs text-gray-500">${d.amount.toLocaleString()}</p>
                    )}
                  </div>
                  <ExternalLink size={14} className="text-gray-400 flex-shrink-0 ml-2" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Stalled Deals (30+ days) */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} className="text-red-500" />
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Stalled Deals (30+ days)</h4>
            <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-medium">{stalledDealsList.length}</span>
          </div>
          {stalledDealsList.length === 0 ? (
            <p className="text-sm text-gray-400">No stalled deals 🎉</p>
          ) : (
            <div className="space-y-1.5">
              {stalledDealsList.map((d: any) => (
                <Link 
                  key={d.id} 
                  href={`/deals/${d.id}`}
                  className="flex items-center justify-between p-2 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{d.name || 'Untitled Deal'}</p>
                    {d.amount > 0 && (
                      <p className="text-xs text-gray-500">${d.amount.toLocaleString()}</p>
                    )}
                  </div>
                  <ExternalLink size={14} className="text-gray-400 flex-shrink-0 ml-2" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>,
      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full font-medium">{totalAttentionItems} items</span>
    )
  }

  const renderDuePanel = () => {
    const todayTasks = dueTodayTomorrowList.filter((t: any) => 
      format(new Date(t.due_date), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
    )
    const tomorrowTasks = dueTodayTomorrowList.filter((t: any) => 
      format(new Date(t.due_date), 'yyyy-MM-dd') !== format(new Date(), 'yyyy-MM-dd')
    )
    
    return renderPanel(
      'due',
      'Due Today/Tomorrow',
      <div className="p-4 space-y-4">
        {/* Due Today */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Clock size={14} className="text-red-500" />
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Due Today</h4>
            <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-medium">{todayTasks.length}</span>
          </div>
          {todayTasks.length === 0 ? (
            <p className="text-sm text-gray-400">Nothing due today 🎉</p>
          ) : (
            <div className="space-y-1.5">
              {todayTasks.map((t: any) => (
                <Link 
                  key={t.id} 
                  href="/tasks"
                  className="flex items-center justify-between p-2 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{t.title}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-medium">Today</span>
                    <ExternalLink size={14} className="text-gray-400" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Due Tomorrow */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Clock size={14} className="text-yellow-500" />
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Due Tomorrow</h4>
            <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-medium">{tomorrowTasks.length}</span>
          </div>
          {tomorrowTasks.length === 0 ? (
            <p className="text-sm text-gray-400">Nothing due tomorrow 🎉</p>
          ) : (
            <div className="space-y-1.5">
              {tomorrowTasks.map((t: any) => (
                <Link 
                  key={t.id} 
                  href="/tasks"
                  className="flex items-center justify-between p-2 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{t.title}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded font-medium">Tomorrow</span>
                    <ExternalLink size={14} className="text-gray-400" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>,
      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full font-medium">{dueTodayTomorrowList.length} tasks</span>
    )
  }

  const renderPanelById = (panelId: PanelId) => {
    switch (panelId) {
      case 'activity': return renderActivityPanel()
      case 'tasks': return renderTasksPanel()
      case 'attention': return renderAttentionPanel()
      case 'due': return renderDuePanel()
    }
  }

  const renderColumn = (column: ColumnId) => {
    const panels = getColumnPanels(column)
    const isDragOver = dragOverColumn === column
    
    return (
      <div
        className={`space-y-2 min-h-[200px] rounded-lg transition-colors ${
          editMode && isDragOver ? 'bg-primary-50' : ''
        }`}
        onDragOver={(e) => handleDragOverColumn(e, column)}
        onDragLeave={handleDragLeaveColumn}
        onDrop={(e) => {
          // Default drop at end if no specific index
          if (dragOverIndex === null) {
            handleDropOnColumn(e, column, panels.length)
          }
        }}
      >
        <DropZone column={column} index={0} />
        {panels.map((panel, index) => (
          <div key={panel.id}>
            {renderPanelById(panel.id)}
            <DropZone column={column} index={index + 1} />
          </div>
        ))}
        {panels.length === 0 && editMode && (
          <div className="h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400">
            Drop panel here
          </div>
        )}
      </div>
    )
  }

  // Simple mobile panel rendering (no drag/drop)
  const renderMobilePanels = () => {
    // Fixed order on mobile: tasks, due, attention, activity
    const mobileOrder: PanelId[] = ['tasks', 'due', 'attention', 'activity']
    return (
      <div className="space-y-4">
        {mobileOrder.map(panelId => (
          <div key={panelId} className="[&>div]:!h-auto [&>div>div]:!h-auto">
            {renderPanelById(panelId)}
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">Welcome back! Here's what's happening.</p>
          </div>
          {/* Hide customize button on mobile - drag doesn't work well on touch */}
          <div className="hidden lg:flex items-center gap-2">
            {editMode && (
              <button
                onClick={resetLayout}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <RefreshCw size={16} />
                Reset
              </button>
            )}
            <button
              onClick={() => {
                if (editMode) saveLayout()
                setEditMode(!editMode)
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                editMode
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
              }`}
            >
              {editMode ? (
                <>
                  <Check size={16} />
                  Save Layout
                </>
              ) : (
                <>
                  <Edit2 size={16} />
                  Customize Layout
                </>
              )}
            </button>
          </div>
        </div>

        {editMode && (
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
            <p className="text-sm text-primary-800">
              <strong>Edit Mode:</strong> Drag panels to reorder or move between columns. Drag the bottom edge of panels to resize. Drag the center divider to adjust column widths.
            </p>
          </div>
        )}

        {/* Stats - Responsive grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <Link href="/contacts" className="card p-3 sm:p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Users size={18} className="text-blue-600 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.contacts}</p>
                <p className="text-xs sm:text-sm text-gray-500 truncate">Contacts</p>
              </div>
            </div>
          </Link>
          <Link href="/companies" className="card p-3 sm:p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
                <Building2 size={18} className="text-teal-600 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.companies}</p>
                <p className="text-xs sm:text-sm text-gray-500 truncate">Companies</p>
              </div>
            </div>
          </Link>
          <Link href="/deals" className="card p-3 sm:p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-pink-100 flex items-center justify-center flex-shrink-0">
                <Handshake size={18} className="text-pink-600 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.deals}</p>
                <p className="text-xs sm:text-sm text-gray-500 truncate">Deals</p>
              </div>
            </div>
          </Link>
          <Link href="/tasks" className="card p-3 sm:p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-yellow-100 flex items-center justify-center flex-shrink-0">
                <CheckSquare size={18} className="text-yellow-600 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.tasks}</p>
                <p className="text-xs sm:text-sm text-gray-500 truncate">Open Tasks</p>
              </div>
            </div>
          </Link>
          <Link href="/deals" className="card p-3 sm:p-4 hover:shadow-md transition-shadow col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                <Clock size={18} className="text-orange-600 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.noActivity7}</p>
                <p className="text-xs sm:text-sm text-gray-500 truncate">No Activity - 7d</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Mobile: Single column layout */}
        <div className="lg:hidden">
          {renderMobilePanels()}
        </div>

        {/* Desktop: 2-Column Layout */}
        <div ref={containerRef} className="hidden lg:flex items-start">
          <div style={{ width: `${layout.leftColumnWidth}%` }}>
            {renderColumn('left')}
          </div>

          <ColumnResizeHandle />

          <div style={{ width: `${100 - layout.leftColumnWidth}%` }}>
            {renderColumn('right')}
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
