'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUserOrgId } from '@/lib/org-helpers'
import { Zap, Play, Pause, Clock, CheckSquare, UserPlus, Handshake, TrendingUp, Trophy, XCircle, AlertCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface AutomationLog {
  id: string
  automation_type: string
  trigger_entity_type: string
  trigger_entity_id: string
  status: string
  result: any
  created_at: string
}

interface AutomationRule {
  id: string
  name: string
  description: string
  trigger: string
  actions: string[]
  isActive: boolean
  icon: any
  color: string
  bgColor: string
}

// These are the built-in automations
const BUILT_IN_AUTOMATIONS: AutomationRule[] = [
  {
    id: 'contact_first_touch',
    name: 'First Touch Task',
    description: 'When a contact is created, create a "Reach out" task',
    trigger: 'Contact created',
    actions: ['Create follow-up task (due tomorrow)'],
    isActive: true,
    icon: UserPlus,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100'
  },
  {
    id: 'deal_qualify',
    name: 'Qualify New Deal',
    description: 'When a deal is created, create a qualifying task',
    trigger: 'Deal created',
    actions: ['Create "Qualify deal" task (due tomorrow)'],
    isActive: true,
    icon: Handshake,
    color: 'text-pink-600',
    bgColor: 'bg-pink-100'
  },
  {
    id: 'deal_proposal_followup',
    name: 'Proposal Follow-up',
    description: 'When a deal moves to Proposal stage, create follow-up task',
    trigger: 'Deal → Proposal stage',
    actions: ['Create "Follow up on proposal" task (due in 2 days)'],
    isActive: true,
    icon: TrendingUp,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100'
  },
  {
    id: 'deal_negotiation_followup',
    name: 'Negotiation Follow-up',
    description: 'When a deal moves to Negotiation stage, create follow-up task',
    trigger: 'Deal → Negotiation stage',
    actions: ['Create "Resolve blockers" task (due in 2 days)'],
    isActive: true,
    icon: TrendingUp,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100'
  },
  {
    id: 'deal_won_onboarding',
    name: 'Deal Won Onboarding',
    description: 'When a deal is won, create onboarding tasks',
    trigger: 'Deal → Closed Won',
    actions: [
      'Create "Send welcome email" task',
      'Create "Confirm billing" task',
      'Create "Collect requirements" task',
      'Create "Schedule kickoff call" task',
      'Create "Project setup" task'
    ],
    isActive: true,
    icon: Trophy,
    color: 'text-green-600',
    bgColor: 'bg-green-100'
  },
  {
    id: 'deal_lost_reason',
    name: 'Deal Lost Reason',
    description: 'When a deal is lost, prompt for reason and optionally create revisit task',
    trigger: 'Deal → Closed Lost',
    actions: ['Prompt for loss reason', 'Optionally create "Revisit" task (60 days)'],
    isActive: true,
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100'
  }
]

// Map automation types to friendly names
const AUTOMATION_TYPE_NAMES: Record<string, string> = {
  'contact_created_first_touch': 'First Touch Task',
  'deal_created_qualify': 'Qualify New Deal',
  'deal_stage_proposal': 'Proposal Follow-up',
  'deal_stage_negotiation': 'Negotiation Follow-up',
  'deal_won_onboarding': 'Deal Won Onboarding',
  'deal_lost_revisit': 'Deal Lost Revisit'
}

export default function AutomationsPage() {
  const [logs, setLogs] = useState<AutomationLog[]>([])
  const [loading, setLoading] = useState(true)
  const [automations] = useState<AutomationRule[]>(BUILT_IN_AUTOMATIONS)
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
      loadLogs()
    }
  }, [orgId])

  const loadLogs = async () => {
    if (!orgId) {
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('automation_logs')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (data) {
      setLogs(data)
    }
    setLoading(false)
  }

  const activeCount = automations.filter(a => a.isActive).length
  const totalRuns = logs.length
  const successfulRuns = logs.filter(l => l.status === 'success').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Automations</h1>
          <p className="text-gray-500 mt-1">
            {activeCount} active automations · {totalRuns} total runs
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
              <Zap size={20} className="text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{automations.length}</p>
              <p className="text-sm text-gray-500">Total Automations</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Play size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
              <p className="text-sm text-gray-500">Active</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <CheckSquare size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{successfulRuns}</p>
              <p className="text-sm text-gray-500">Successful Runs</p>
            </div>
          </div>
        </div>
      </div>

      {/* Automations List */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Active Automations</h2>
          <p className="text-sm text-gray-500 mt-0.5">These automations run automatically when triggered</p>
        </div>
        <div className="divide-y divide-gray-200">
          {automations.map((automation) => (
            <div key={automation.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${automation.bgColor}`}>
                  <automation.icon size={20} className={automation.color} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900">{automation.name}</h3>
                    <span className="badge badge-success">Active</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{automation.description}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                    <span className="font-medium">Trigger:</span>
                    <span>{automation.trigger}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {automation.actions.map((action, i) => (
                      <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        {action}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${automation.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Runs */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Recent Automation Runs</h2>
          <p className="text-sm text-gray-500 mt-0.5">History of automation executions</p>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          </div>
        ) : logs.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {logs.map((log) => (
              <div key={log.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    log.status === 'success' ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {log.status === 'success' ? (
                      <CheckSquare size={14} className="text-green-600" />
                    ) : (
                      <AlertCircle size={14} className="text-red-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {AUTOMATION_TYPE_NAMES[log.automation_type] || log.automation_type}
                    </p>
                    {log.result?.title && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        Created: {log.result.title}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Clock size={12} />
                    <span>{formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <Clock size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No automation runs yet</h3>
            <p className="text-gray-500">Automations will appear here when they run.</p>
            <p className="text-sm text-gray-400 mt-2">Try creating a contact or deal to see automations in action!</p>
          </div>
        )}
      </div>
    </div>
  )
}
