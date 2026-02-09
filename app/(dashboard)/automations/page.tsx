'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUserOrgId } from '@/lib/org-helpers'
import {
  Zap, Play, Clock, CheckSquare, AlertCircle, Plus, Trash2,
  UserPlus, Handshake, TrendingUp, Trophy, XCircle,
  Calendar, ImageIcon, MessageSquare, Heart, Briefcase, FileText
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import AccessDenied from '@/components/shared/AccessDenied'
import { getPermissions, UserRole } from '@/lib/permissions'
import { useIndustry } from '@/lib/contexts/IndustryContext'
import { getPresetsForIndustry, getPresetById, type AutomationPreset } from '@/lib/automation-presets'
import CreateAutomationModal from '@/components/automations/CreateAutomationModal'

// ============================================
// Icon resolver — maps preset icon strings to components
// ============================================
const ICON_MAP: Record<string, any> = {
  UserPlus, Handshake, TrendingUp, Trophy, XCircle,
  Calendar, ImageIcon, MessageSquare, Heart, Briefcase, FileText, Zap
}

function resolveIcon(name: string) {
  return ICON_MAP[name] || Zap
}

// ============================================
// Trigger type → friendly label
// ============================================
const TRIGGER_LABELS: Record<string, string> = {
  contact_created: 'Contact created',
  deal_created: 'Deal created',
  deal_stage_changed: 'Deal stage changed',
}

function getTriggerLabel(triggerType: string, triggerConfig: Record<string, any>): string {
  if (triggerType === 'deal_stage_changed') {
    if (triggerConfig.is_won) return 'Deal → Won / Closed Won'
    if (triggerConfig.is_lost) return 'Deal → Lost / Closed Lost'
    if (triggerConfig.to_stage_contains) {
      const stage = triggerConfig.to_stage_contains as string
      return `Deal → ${stage.charAt(0).toUpperCase() + stage.slice(1)} stage`
    }
  }
  return TRIGGER_LABELS[triggerType] || triggerType
}

// ============================================
// Types
// ============================================

interface DBAutomation {
  id: string
  name: string
  description: string
  is_active: boolean
  trigger_type: string
  trigger_config: Record<string, any>
  actions: any[]
  execution_count: number
  last_executed_at: string | null
  created_by: string | null
}

interface AutomationLog {
  id: string
  automation_type: string
  trigger_entity_type: string
  trigger_entity_id: string
  status: string
  result: any
  created_at: string
}

// ============================================
// Page
// ============================================

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<DBAutomation[]>([])
  const [logs, setLogs] = useState<AutomationLog[]>([])
  const [loading, setLoading] = useState(true)
  const [checkingPermissions, setCheckingPermissions] = useState(true)
  const [userRole, setUserRole] = useState<UserRole>('member')
  const [orgId, setOrgId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [enablingPreset, setEnablingPreset] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { industryType } = useIndustry()
  const supabase = createClient()

  // ------ Init ------
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single()
        if (profile?.role) setUserRole(profile.role as UserRole)
      }
      setCheckingPermissions(false)
      const id = await getCurrentUserOrgId()
      setOrgId(id)
    }
    init()
  }, [])

  // ------ Load data ------
  const loadData = useCallback(async () => {
    if (!orgId) { setLoading(false); return }

    const [automationsRes, logsRes] = await Promise.all([
      supabase
        .from('automations')
        .select('id, name, description, is_active, trigger_type, trigger_config, actions, execution_count, last_executed_at, created_by')
        .eq('org_id', orgId)
        .order('created_at', { ascending: true }),
      supabase
        .from('automation_logs')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(50)
    ])

    if (automationsRes.data) setAutomations(automationsRes.data as DBAutomation[])
    if (logsRes.data) setLogs(logsRes.data)
    setLoading(false)
  }, [orgId])

  useEffect(() => { if (orgId) loadData() }, [orgId, loadData])

  // ------ Toggle handler ------
  const handleToggle = async (id: string, currentState: boolean) => {
    setTogglingId(id)
    // Optimistic update
    setAutomations(prev => prev.map(a => a.id === id ? { ...a, is_active: !currentState } : a))

    const res = await fetch(`/api/automations/${id}/toggle`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !currentState }),
    })

    if (!res.ok) {
      // Revert on failure
      setAutomations(prev => prev.map(a => a.id === id ? { ...a, is_active: currentState } : a))
    }
    setTogglingId(null)
  }

  // ------ Enable suggested preset ------
  const handleEnablePreset = async (presetId: string) => {
    setEnablingPreset(presetId)

    const res = await fetch('/api/automations/enable-preset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preset_id: presetId }),
    })

    if (res.ok) {
      await loadData()
    }
    setEnablingPreset(null)
  }

  // ------ Delete custom automation ------
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this automation? This cannot be undone.')) return
    setDeletingId(id)

    const res = await fetch(`/api/automations/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setAutomations(prev => prev.filter(a => a.id !== id))
    }
    setDeletingId(null)
  }

  // ------ Derived values ------
  const presetAutomations = automations.filter(a => a.created_by === null)
  const customAutomations = automations.filter(a => a.created_by !== null)
  const activeCount = automations.filter(a => a.is_active).length
  const totalRuns = automations.reduce((sum, a) => sum + (a.execution_count || 0), 0)
  const successfulRuns = logs.filter(l => l.status === 'success').length

  // Suggested presets: presets for this industry that are NOT in the automations table yet
  const existingPresetIds = automations
    .map(a => a.trigger_config?.preset_id)
    .filter(Boolean) as string[]
  const allPresetsForIndustry = getPresetsForIndustry(industryType)
  const suggestedPresets = allPresetsForIndustry.filter(
    p => !existingPresetIds.includes(p.preset_id)
  )

  // ------ Permissions ------
  const permissions = getPermissions(userRole)

  if (checkingPermissions) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!permissions.canAccessAutomations) {
    return (
      <AccessDenied
        title="Automations Access Restricted"
        message="Automations are only available to administrators. Contact your admin to request access."
        feature="Automations"
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Automations</h1>
          <p className="text-gray-500 mt-1">
            {activeCount} active · {totalRuns} total{totalRuns === 1 ? ' run' : ' runs'}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
        >
          <Plus size={16} />
          Create Automation
        </button>
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
              <p className="text-2xl font-bold text-gray-900">{totalRuns}</p>
              <p className="text-sm text-gray-500">Total Runs</p>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
          {/* Cadence Presets Section */}
          <div className="card">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Cadence Presets</h2>
              <p className="text-sm text-gray-500 mt-0.5">Built-in automations tailored to your workflow. Toggle on or off.</p>
            </div>

            {presetAutomations.length === 0 ? (
              <div className="py-12 text-center">
                <Zap size={48} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No presets enabled</h3>
                <p className="text-gray-500">Enable a suggested automation below to get started.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {presetAutomations.map((automation) => {
                  const presetId = automation.trigger_config?.preset_id
                  const preset = presetId ? getPresetById(presetId) : null
                  const IconComponent = preset ? resolveIcon(preset.display.icon) : Zap
                  const iconColor = preset?.display.color || 'text-primary-600'
                  const iconBg = preset?.display.bg_color || 'bg-primary-100'
                  const triggerLabel = getTriggerLabel(automation.trigger_type, automation.trigger_config)

                  return (
                    <div key={automation.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconBg}`}>
                          <IconComponent size={20} className={iconColor} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-gray-900">{automation.name}</h3>
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded">
                              Preset
                            </span>
                            <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                              automation.is_active
                                ? 'text-green-700 bg-green-50'
                                : 'text-gray-500 bg-gray-100'
                            }`}>
                              {automation.is_active ? 'Active' : 'Paused'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mt-0.5">{automation.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                            <span>
                              <span className="font-medium text-gray-500">Trigger:</span>{' '}
                              {triggerLabel}
                            </span>
                            {automation.execution_count > 0 && (
                              <span>
                                Ran {automation.execution_count} time{automation.execution_count !== 1 ? 's' : ''}
                              </span>
                            )}
                            {automation.last_executed_at && (
                              <span>
                                Last: {formatDistanceToNow(new Date(automation.last_executed_at), { addSuffix: true })}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Toggle switch */}
                        <button
                          onClick={() => handleToggle(automation.id, automation.is_active)}
                          disabled={togglingId === automation.id}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                            automation.is_active ? 'bg-primary-600' : 'bg-gray-300'
                          } ${togglingId === automation.id ? 'opacity-50' : ''}`}
                          aria-label={automation.is_active ? 'Disable automation' : 'Enable automation'}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              automation.is_active ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Your Automations Section (user-created) */}
          <div className="card">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-gray-900">Your Automations</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Custom automations you&apos;ve created.</p>
                </div>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
                >
                  <Plus size={14} />
                  New
                </button>
              </div>
            </div>

            {customAutomations.length === 0 ? (
              <div className="py-12 text-center">
                <Plus size={48} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No custom automations</h3>
                <p className="text-gray-500">Create your own WHEN → IF → THEN automations.</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                >
                  <Plus size={16} />
                  Create Your First Automation
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {customAutomations.map((automation) => {
                  const triggerLabel = getTriggerLabel(automation.trigger_type, automation.trigger_config)

                  return (
                    <div key={automation.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-violet-100">
                          <Zap size={20} className="text-violet-600" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-gray-900">{automation.name}</h3>
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded">
                              Custom
                            </span>
                            <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                              automation.is_active
                                ? 'text-green-700 bg-green-50'
                                : 'text-gray-500 bg-gray-100'
                            }`}>
                              {automation.is_active ? 'Active' : 'Paused'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mt-0.5">{automation.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                            <span>
                              <span className="font-medium text-gray-500">Trigger:</span>{' '}
                              {triggerLabel}
                            </span>
                            {automation.execution_count > 0 && (
                              <span>
                                Ran {automation.execution_count} time{automation.execution_count !== 1 ? 's' : ''}
                              </span>
                            )}
                            {automation.last_executed_at && (
                              <span>
                                Last: {formatDistanceToNow(new Date(automation.last_executed_at), { addSuffix: true })}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Toggle + Delete */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDelete(automation.id)}
                            disabled={deletingId === automation.id}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            aria-label="Delete automation"
                          >
                            <Trash2 size={16} />
                          </button>
                          <button
                            onClick={() => handleToggle(automation.id, automation.is_active)}
                            disabled={togglingId === automation.id}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                              automation.is_active ? 'bg-primary-600' : 'bg-gray-300'
                            } ${togglingId === automation.id ? 'opacity-50' : ''}`}
                            aria-label={automation.is_active ? 'Disable automation' : 'Enable automation'}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                automation.is_active ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Suggested Presets */}
          {suggestedPresets.length > 0 && (
            <div className="card">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">Suggested Automations</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Additional automations available for your {industryType === 'default' ? '' : industryType.replace('_', ' ') + ' '}workflow
                </p>
              </div>
              <div className="divide-y divide-gray-200">
                {suggestedPresets.map((preset) => {
                  const IconComponent = resolveIcon(preset.display.icon)
                  const triggerLabel = getTriggerLabel(preset.trigger_type, preset.trigger_config)

                  return (
                    <div key={preset.preset_id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${preset.display.bg_color} opacity-60`}>
                          <IconComponent size={20} className={preset.display.color} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-700">{preset.name}</h3>
                          <p className="text-sm text-gray-400 mt-0.5">{preset.description}</p>
                          <div className="text-xs text-gray-400 mt-1">
                            <span className="font-medium">Trigger:</span> {triggerLabel}
                          </div>
                        </div>

                        <button
                          onClick={() => handleEnablePreset(preset.preset_id)}
                          disabled={enablingPreset === preset.preset_id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {enablingPreset === preset.preset_id ? (
                            <LoadingSpinner size="sm" />
                          ) : (
                            <Plus size={14} />
                          )}
                          Enable
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Recent Runs */}
          <div className="card">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Recent Automation Runs</h2>
              <p className="text-sm text-gray-500 mt-0.5">History of automation executions</p>
            </div>

            {logs.length > 0 ? (
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
                          {log.automation_type}
                        </p>
                        {log.result?.title && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            Created: {log.result.title}
                          </p>
                        )}
                        {log.result?.tasksCreated && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {log.result.tasksCreated} task{log.result.tasksCreated !== 1 ? 's' : ''} created
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
        </>
      )}

      {/* Create Automation Modal */}
      {showCreateModal && (
        <CreateAutomationModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false)
            loadData()
          }}
        />
      )}
    </div>
  )
}
