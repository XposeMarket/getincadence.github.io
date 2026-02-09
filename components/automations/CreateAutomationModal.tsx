'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUserOrgId } from '@/lib/org-helpers'
import {
  X, Loader2, ChevronRight, ChevronLeft, Zap,
  UserPlus, Handshake, ArrowRightLeft
} from 'lucide-react'

// ============================================
// Types
// ============================================

interface PipelineStage {
  id: string
  name: string
  is_won?: boolean
  is_lost?: boolean
}

interface OrgMember {
  id: string
  full_name: string
}

interface Condition {
  field: string
  operator: string
  value: string
}

interface CreateAutomationModalProps {
  onClose: () => void
  onCreated: () => void
}

// ============================================
// Constants
// ============================================

const TRIGGERS = [
  {
    type: 'contact_created',
    label: 'Contact created',
    description: 'Runs when a new contact is added',
    icon: UserPlus,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    type: 'deal_created',
    label: 'Deal created',
    description: 'Runs when a new deal is added',
    icon: Handshake,
    color: 'text-pink-600',
    bg: 'bg-pink-50',
  },
  {
    type: 'deal_stage_changed',
    label: 'Deal stage changed',
    description: 'Runs when a deal moves to a specific stage',
    icon: ArrowRightLeft,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
  },
]

const CONDITION_FIELDS = [
  { value: 'stage_is', label: 'Stage is', applies: ['deal_stage_changed'] },
  { value: 'stage_is_not', label: 'Stage is not', applies: ['deal_stage_changed'] },
  { value: 'value_greater_than', label: 'Deal value greater than', applies: ['deal_created', 'deal_stage_changed'] },
  { value: 'value_less_than', label: 'Deal value less than', applies: ['deal_created', 'deal_stage_changed'] },
  { value: 'owner_is', label: 'Owner is', applies: ['contact_created', 'deal_created', 'deal_stage_changed'] },
  { value: 'priority_is', label: 'Priority is', applies: ['deal_created', 'deal_stage_changed'] },
]

const VARIABLE_CHIPS = [
  { token: '{{contactName}}', label: 'Contact Name' },
  { token: '{{dealName}}', label: 'Deal Name' },
  { token: '{{companyName}}', label: 'Company Name' },
  { token: '{{dealValue}}', label: 'Deal Value' },
  { token: '{{stageName}}', label: 'Stage Name' },
]

// ============================================
// Component
// ============================================

export default function CreateAutomationModal({ onClose, onCreated }: CreateAutomationModalProps) {
  // Step state
  const [step, setStep] = useState(1) // 1=Trigger, 2=Conditions, 3=Action

  // Trigger state
  const [triggerType, setTriggerType] = useState('')
  const [targetStage, setTargetStage] = useState('') // for deal_stage_changed

  // Conditions state
  const [conditions, setConditions] = useState<Condition[]>([])

  // Action state
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [taskDueDays, setTaskDueDays] = useState(1)
  const [taskPriority, setTaskPriority] = useState<'low' | 'normal' | 'high'>('normal')

  // Automation name
  const [automationName, setAutomationName] = useState('')

  // Data
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [members, setMembers] = useState<OrgMember[]>([])
  const [orgId, setOrgId] = useState<string | null>(null)

  // UI state
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const id = await getCurrentUserOrgId()
      setOrgId(id)
      if (!id) return

      const [stagesRes, membersRes] = await Promise.all([
        supabase
          .from('pipeline_stages')
          .select('id, name, is_won, is_lost')
          .eq('org_id', id)
          .order('position', { ascending: true }),
        supabase
          .from('users')
          .select('id, full_name')
          .eq('org_id', id)
          .order('full_name', { ascending: true }),
      ])

      if (stagesRes.data) setStages(stagesRes.data)
      if (membersRes.data) setMembers(membersRes.data)
    }
    init()
  }, [])

  // ============================================
  // Plain English summary (Refinement 2)
  // ============================================
  const summary = useMemo(() => {
    if (!triggerType) return ''

    const trigger = TRIGGERS.find(t => t.type === triggerType)
    let text = `When ${trigger?.label.toLowerCase() || triggerType}`

    // Stage target
    if (triggerType === 'deal_stage_changed' && targetStage) {
      const stage = stages.find(s => s.name === targetStage)
      text = `When a deal enters ${stage?.name || targetStage}`
    }

    // Conditions
    const condParts: string[] = []
    for (const c of conditions) {
      if (c.field === 'stage_is' && c.value) condParts.push(`stage is "${c.value}"`)
      else if (c.field === 'stage_is_not' && c.value) condParts.push(`stage is not "${c.value}"`)
      else if (c.field === 'value_greater_than' && c.value) condParts.push(`value is greater than $${Number(c.value).toLocaleString()}`)
      else if (c.field === 'value_less_than' && c.value) condParts.push(`value is less than $${Number(c.value).toLocaleString()}`)
      else if (c.field === 'owner_is' && c.value) {
        const member = members.find(m => m.id === c.value)
        condParts.push(`owner is ${member?.full_name || 'selected user'}`)
      }
      else if (c.field === 'priority_is' && c.value) condParts.push(`priority is ${c.value}`)
    }

    if (condParts.length > 0) {
      text += ` and ${condParts.join(' and ')}`
    }

    // Action
    if (taskTitle) {
      text += `, Cadence will create a task: "${taskTitle}"`
      if (taskDueDays > 0) text += ` (due in ${taskDueDays} day${taskDueDays !== 1 ? 's' : ''})`
    }

    return text + '.'
  }, [triggerType, targetStage, conditions, taskTitle, taskDueDays, stages, members])

  // ============================================
  // Condition helpers
  // ============================================
  const availableConditionFields = CONDITION_FIELDS.filter(f =>
    f.applies.includes(triggerType)
  )

  const addCondition = () => {
    if (conditions.length >= 3) return
    setConditions([...conditions, { field: '', operator: '', value: '' }])
  }

  const updateCondition = (index: number, updates: Partial<Condition>) => {
    setConditions(prev => prev.map((c, i) => i === index ? { ...c, ...updates } : c))
  }

  const removeCondition = (index: number) => {
    setConditions(prev => prev.filter((_, i) => i !== index))
  }

  // ============================================
  // Variable chip insertion
  // ============================================
  const insertVariable = (token: string, field: 'title' | 'description') => {
    if (field === 'title') setTaskTitle(prev => prev + token)
    else setTaskDescription(prev => prev + token)
  }

  // ============================================
  // Build trigger_config
  // ============================================
  const buildTriggerConfig = () => {
    const config: Record<string, any> = {}

    if (triggerType === 'deal_stage_changed' && targetStage) {
      const stage = stages.find(s => s.name === targetStage)
      if (stage?.is_won) config.is_won = true
      else if (stage?.is_lost) config.is_lost = true
      else config.to_stage_contains = targetStage.toLowerCase()
    }

    return config
  }

  // ============================================
  // Build conditions for DB
  // ============================================
  const buildConditions = () => {
    return conditions
      .filter(c => c.field && c.value)
      .map(c => ({
        field: c.field,
        value: c.field === 'value_greater_than' || c.field === 'value_less_than'
          ? Number(c.value)
          : c.value,
      }))
  }

  // ============================================
  // Submit
  // ============================================
  const handleSubmit = async () => {
    if (!taskTitle.trim()) {
      setError('Task title is required')
      return
    }
    if (!automationName.trim()) {
      setError('Automation name is required')
      return
    }

    setSaving(true)
    setError(null)

    const res = await fetch('/api/automations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: automationName.trim(),
        description: summary,
        trigger_type: triggerType,
        trigger_config: buildTriggerConfig(),
        conditions: buildConditions(),
        actions: [
          {
            type: 'create_task',
            config: {
              title_template: taskTitle.trim(),
              description_template: taskDescription.trim() || undefined,
              due_days: taskDueDays,
              priority: taskPriority,
            },
          },
        ],
      }),
    })

    if (res.ok) {
      onCreated()
    } else {
      const data = await res.json()
      if (data.upgrade) {
        setError('You\'ve reached the custom automation limit on the free plan. Upgrade to create more.')
      } else {
        setError(data.error || 'Failed to create automation')
      }
    }
    setSaving(false)
  }

  // ============================================
  // Navigation
  // ============================================
  const canGoNext = () => {
    if (step === 1) return !!triggerType
    if (step === 2) return true // conditions are optional
    if (step === 3) return !!taskTitle.trim() && !!automationName.trim()
    return false
  }

  // ============================================
  // Render
  // ============================================
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
          <div className="flex items-center gap-2">
            <Zap size={18} className="text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              {step === 1 ? 'Choose Trigger' : step === 2 ? 'Add Conditions' : 'Define Action'}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="px-6 pt-4 pb-2">
          <div className="flex items-center gap-2 mb-1">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                  s === step ? 'bg-primary-600 text-white' :
                  s < step ? 'bg-primary-100 text-primary-700' :
                  'bg-gray-100 text-gray-400'
                }`}>
                  {s}
                </div>
                {s < 3 && <div className={`w-8 h-0.5 ${s < step ? 'bg-primary-300' : 'bg-gray-200'}`} />}
              </div>
            ))}
            <span className="ml-2 text-xs text-gray-400">
              {step === 1 ? 'When...' : step === 2 ? 'If...' : 'Then...'}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          {/* ====== STEP 1: Trigger ====== */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">What should trigger this automation?</p>
              {TRIGGERS.map(t => (
                <button
                  key={t.type}
                  onClick={() => {
                    setTriggerType(t.type)
                    setTargetStage('')
                    setConditions([])
                  }}
                  className={`w-full flex items-start gap-3 p-3 rounded-lg border-2 transition-colors text-left ${
                    triggerType === t.type
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${t.bg}`}>
                    <t.icon size={18} className={t.color} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{t.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>
                  </div>
                </button>
              ))}

              {/* Stage picker for deal_stage_changed */}
              {triggerType === 'deal_stage_changed' && stages.length > 0 && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Which stage?
                  </label>
                  <select
                    value={targetStage}
                    onChange={e => setTargetStage(e.target.value)}
                    className="input w-full"
                  >
                    <option value="">Any stage change</option>
                    {stages.map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* ====== STEP 2: Conditions ====== */}
          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                Add optional filters. All conditions must match (AND logic). Max 3.
              </p>

              {conditions.map((condition, index) => (
                <div key={index} className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 space-y-2">
                    <select
                      value={condition.field}
                      onChange={e => updateCondition(index, { field: e.target.value, value: '' })}
                      className="input w-full text-sm"
                    >
                      <option value="">Select condition...</option>
                      {availableConditionFields.map(f => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>

                    {/* Value input based on field type */}
                    {(condition.field === 'stage_is' || condition.field === 'stage_is_not') && (
                      <select
                        value={condition.value}
                        onChange={e => updateCondition(index, { value: e.target.value })}
                        className="input w-full text-sm"
                      >
                        <option value="">Select stage...</option>
                        {stages.map(s => (
                          <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                      </select>
                    )}

                    {(condition.field === 'value_greater_than' || condition.field === 'value_less_than') && (
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                        <input
                          type="number"
                          value={condition.value}
                          onChange={e => updateCondition(index, { value: e.target.value })}
                          placeholder="0"
                          className="input w-full text-sm pl-7"
                        />
                      </div>
                    )}

                    {condition.field === 'owner_is' && (
                      <select
                        value={condition.value}
                        onChange={e => updateCondition(index, { value: e.target.value })}
                        className="input w-full text-sm"
                      >
                        <option value="">Select team member...</option>
                        {members.map(m => (
                          <option key={m.id} value={m.id}>{m.full_name}</option>
                        ))}
                      </select>
                    )}

                    {condition.field === 'priority_is' && (
                      <select
                        value={condition.value}
                        onChange={e => updateCondition(index, { value: e.target.value })}
                        className="input w-full text-sm"
                      >
                        <option value="">Select priority...</option>
                        <option value="low">Low</option>
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                      </select>
                    )}
                  </div>

                  <button
                    onClick={() => removeCondition(index)}
                    className="text-gray-400 hover:text-red-500 mt-2"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}

              {conditions.length < 3 && availableConditionFields.length > 0 && (
                <button
                  onClick={addCondition}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  + Add condition
                </button>
              )}

              {conditions.length === 0 && (
                <p className="text-xs text-gray-400 italic">
                  No conditions — this automation will run every time the trigger fires.
                </p>
              )}
            </div>
          )}

          {/* ====== STEP 3: Action + Name ====== */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Define the task Cadence will create when this automation fires.
              </p>

              {/* Automation name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Automation Name
                </label>
                <input
                  type="text"
                  value={automationName}
                  onChange={e => setAutomationName(e.target.value)}
                  placeholder="e.g. High-value follow-up"
                  className="input w-full"
                  maxLength={100}
                />
              </div>

              {/* Task title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Task Title
                </label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={e => setTaskTitle(e.target.value)}
                  placeholder="e.g. Follow up with {{contactName}}"
                  className="input w-full"
                  maxLength={200}
                />
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {VARIABLE_CHIPS.map(v => (
                    <button
                      key={v.token}
                      type="button"
                      onClick={() => insertVariable(v.token, 'title')}
                      className="text-[11px] px-2 py-0.5 rounded bg-gray-100 text-gray-600 hover:bg-primary-50 hover:text-primary-700 transition-colors font-mono"
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Task description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={taskDescription}
                  onChange={e => setTaskDescription(e.target.value)}
                  placeholder="Optional notes or checklist for the task"
                  className="input w-full min-h-[80px] resize-y"
                  maxLength={500}
                />
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {VARIABLE_CHIPS.map(v => (
                    <button
                      key={v.token}
                      type="button"
                      onClick={() => insertVariable(v.token, 'description')}
                      className="text-[11px] px-2 py-0.5 rounded bg-gray-100 text-gray-600 hover:bg-primary-50 hover:text-primary-700 transition-colors font-mono"
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Due days + priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due in (days)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={365}
                    value={taskDueDays}
                    onChange={e => setTaskDueDays(Math.max(0, parseInt(e.target.value) || 0))}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={taskPriority}
                    onChange={e => setTaskPriority(e.target.value as 'low' | 'normal' | 'high')}
                    className="input w-full"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ====== Summary preview (Refinement 2) ====== */}
          {summary && step >= 2 && (
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Preview</p>
              <p className="text-sm text-gray-700">{summary}</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-3 flex items-center justify-between rounded-b-xl">
          <div>
            {step > 1 && (
              <button
                onClick={() => { setStep(step - 1); setError(null) }}
                className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
              >
                <ChevronLeft size={16} />
                Back
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="btn btn-secondary text-sm">
              Cancel
            </button>
            {step < 3 ? (
              <button
                onClick={() => { setStep(step + 1); setError(null) }}
                disabled={!canGoNext()}
                className="btn btn-primary text-sm inline-flex items-center gap-1 disabled:opacity-50"
              >
                Next
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={saving || !canGoNext()}
                className="btn btn-primary text-sm inline-flex items-center gap-1 disabled:opacity-50"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                Create Automation
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
