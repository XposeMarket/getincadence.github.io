'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUserOrgId } from '@/lib/org-helpers'
import { Plus, Search, LayoutGrid, List, Zap } from 'lucide-react'
import PipelineKanban from '@/components/deals/PipelineKanban'
import DealsTable from '@/components/deals/DealsTable'
import CreateDealModal from '@/components/deals/CreateDealModal'
import DealLostReasonModal from '@/components/deals/DealLostReasonModal'
import { ActivityLogger } from '@/lib/activity-logger'
import { onDealStageChanged } from '@/lib/automation-engine'

interface PipelineStage {
  id: string
  name: string
  color: string
  position: number
  is_won?: boolean
  is_lost?: boolean
}

interface Deal {
  id: string
  name: string
  amount: number
  stage_id: string
  contact_id: string | null
  company_id: string | null
  owner_id: string | null
  close_date: string | null
  created_at: string
  contacts: { id: string; first_name: string; last_name: string } | null
  companies: { id: string; name: string } | null
}

interface Pipeline {
  id: string
  name: string
  is_default: boolean
}

interface AutomationToast {
  message: string
  visible: boolean
}

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [selectedPipeline, setSelectedPipeline] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban')
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [lostDealModal, setLostDealModal] = useState<{
    dealId: string
    dealName: string
    contactId?: string
    companyId?: string
  } | null>(null)
  const [automationToast, setAutomationToast] = useState<AutomationToast>({ message: '', visible: false })
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
      loadPipelines()
    }
  }, [orgId])

  useEffect(() => {
    if (selectedPipeline && orgId) {
      loadStagesAndDeals()
    }
  }, [selectedPipeline, orgId])

  const showAutomationToast = (message: string) => {
    setAutomationToast({ message, visible: true })
    setTimeout(() => {
      setAutomationToast({ message: '', visible: false })
    }, 3000)
  }

  const createDefaultPipeline = async () => {
    if (!orgId) return null

    const { data: pipeline, error: pipelineError } = await supabase
      .from('pipelines')
      .insert({ name: 'Sales Pipeline', is_default: true, org_id: orgId })
      .select()
      .single()

    if (pipelineError || !pipeline) {
      console.error('Failed to create pipeline:', pipelineError)
      return null
    }

    const defaultStages = [
      { name: 'Lead', position: 0, color: '#6B7280', win_probability: 10 },
      { name: 'Qualified', position: 1, color: '#3B82F6', win_probability: 25 },
      { name: 'Proposal', position: 2, color: '#F59E0B', win_probability: 50 },
      { name: 'Negotiation', position: 3, color: '#8B5CF6', win_probability: 75 },
      { name: 'Closed Won', position: 4, color: '#10B981', win_probability: 100, is_won: true },
      { name: 'Closed Lost', position: 5, color: '#EF4444', win_probability: 0, is_lost: true },
    ]

    await supabase.from('pipeline_stages').insert(
      defaultStages.map(stage => ({ ...stage, pipeline_id: pipeline.id }))
    )

    return pipeline
  }

  const loadPipelines = async () => {
    if (!orgId) {
      setLoading(false)
      return
    }

    let { data } = await supabase
      .from('pipelines')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: true })

    if (!data || data.length === 0) {
      const newPipeline = await createDefaultPipeline()
      if (newPipeline) {
        data = [newPipeline]
      }
    }

    if (data && data.length > 0) {
      setPipelines(data)
      const defaultPipeline = data.find(p => p.is_default) || data[0]
      setSelectedPipeline(defaultPipeline.id)
    }
    setLoading(false)
  }

  const loadStagesAndDeals = async () => {
    if (!selectedPipeline || !orgId) return

    const [stagesRes, dealsRes] = await Promise.all([
      supabase
        .from('pipeline_stages')
        .select('*')
        .eq('pipeline_id', selectedPipeline)
        .order('position', { ascending: true }),
      supabase
        .from('deals')
        .select(`
          *,
          contacts(id, first_name, last_name),
          companies(id, name)
        `)
        .eq('org_id', orgId)
        .eq('pipeline_id', selectedPipeline)
        .order('created_at', { ascending: false })
    ])

    if (!stagesRes.data || stagesRes.data.length === 0) {
      console.log('No stages found for pipeline, creating default stages...')
      const defaultStages = [
        { name: 'Lead', position: 0, color: '#6B7280' },
        { name: 'Qualified', position: 1, color: '#3B82F6' },
        { name: 'Proposal', position: 2, color: '#F59E0B' },
        { name: 'Negotiation', position: 3, color: '#8B5CF6' },
        { name: 'Closed Won', position: 4, color: '#10B981', is_won: true },
        { name: 'Closed Lost', position: 5, color: '#EF4444', is_lost: true },
      ]

      const { data: newStages, error: stagesError } = await supabase
        .from('pipeline_stages')
        .insert(
          defaultStages.map(stage => ({ ...stage, pipeline_id: selectedPipeline }))
        )
        .select()

      if (stagesError) {
        console.error('Failed to create stages:', stagesError)
      }

      if (newStages) {
        setStages(newStages)
      }
    } else {
      setStages(stagesRes.data)
    }

    if (dealsRes.data) setDeals(dealsRes.data)
  }

  const handleDealMove = async (dealId: string, newStageId: string) => {
    const deal = deals.find(d => d.id === dealId)
    const oldStage = stages.find(s => s.id === deal?.stage_id)
    const newStage = stages.find(s => s.id === newStageId)
    
    if (!deal || !oldStage || !newStage || oldStage.id === newStage.id) return

    setDeals(prev => prev.map(d => 
      d.id === dealId ? { ...d, stage_id: newStageId } : d
    ))

    const { error } = await supabase
      .from('deals')
      .update({ stage_id: newStageId })
      .eq('id', dealId)

    if (error) {
      loadStagesAndDeals()
      return
    }

    await ActivityLogger.dealStageChanged({
      id: dealId,
      name: deal.name,
      old_stage: oldStage.name,
      new_stage: newStage.name
    })

    const isLost = newStage.name.toLowerCase().includes('lost') || newStage.is_lost
    if (isLost) {
      setLostDealModal({
        dealId: deal.id,
        dealName: deal.name,
        contactId: deal.contact_id || undefined,
        companyId: deal.company_id || undefined
      })
      return
    }

    const automationResult = await onDealStageChanged({
      dealId: deal.id,
      dealName: deal.name,
      dealAmount: deal.amount,
      oldStageName: oldStage.name,
      newStageName: newStage.name,
      contactId: deal.contact_id || undefined,
      contactName: deal.contacts ? `${deal.contacts.first_name} ${deal.contacts.last_name}` : undefined,
      companyId: deal.company_id || undefined,
      companyName: deal.companies?.name
    })

    if (automationResult.isWon) {
      showAutomationToast(`🎉 Deal won! Created ${automationResult.tasksCreated} onboarding tasks`)
    } else if (automationResult.tasksCreated > 0) {
      const stageName = newStage.name
      showAutomationToast(`⚡ Created follow-up task for ${stageName} stage`)
    }
  }

  const handleDealCreated = () => {
    setShowCreateModal(false)
    loadStagesAndDeals()
  }

  const handleLostReasonSaved = () => {
    setLostDealModal(null)
    loadStagesAndDeals()
  }

  const filteredDeals = deals.filter(deal => {
    if (!searchQuery) return true
    const search = searchQuery.toLowerCase()
    return (
      deal.name.toLowerCase().includes(search) ||
      deal.contacts?.first_name?.toLowerCase().includes(search) ||
      deal.contacts?.last_name?.toLowerCase().includes(search) ||
      deal.companies?.name?.toLowerCase().includes(search)
    )
  })

  const totalValue = filteredDeals.reduce((sum, deal) => sum + (deal.amount || 0), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Automation Toast */}
      {automationToast.visible && (
        <div className="fixed top-4 right-4 z-50 animate-slide-up">
          <div className="bg-primary-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
            <Zap size={18} />
            <span className="text-sm">{automationToast.message}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Deals</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {filteredDeals.length} deals · ${totalValue.toLocaleString()} total value
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary w-full sm:w-auto"
          disabled={stages.length === 0}
        >
          <Plus size={18} className="mr-2" />
          Add Deal
        </button>
      </div>

      {/* Filters & View Toggle */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {pipelines.length > 1 && (
          <select
            value={selectedPipeline || ''}
            onChange={(e) => setSelectedPipeline(e.target.value)}
            className="input sm:w-48"
          >
            {pipelines.map(pipeline => (
              <option key={pipeline.id} value={pipeline.id}>
                {pipeline.name}
              </option>
            ))}
          </select>
        )}

        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search deals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10"
          />
        </div>

        <div className="flex items-center bg-gray-100 rounded-lg p-1 self-end sm:self-auto">
          <button
            onClick={() => setViewMode('kanban')}
            className={`p-2 rounded-md transition-colors ${
              viewMode === 'kanban' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <LayoutGrid size={18} />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`p-2 rounded-md transition-colors ${
              viewMode === 'table' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <List size={18} />
          </button>
        </div>
      </div>

      {/* Content */}
      {stages.length === 0 ? (
        <div className="card p-8 sm:p-12 text-center">
          <p className="text-gray-500 mb-4">Setting up your pipeline stages...</p>
          <button 
            onClick={() => loadStagesAndDeals()}
            className="btn btn-secondary"
          >
            Retry
          </button>
        </div>
      ) : viewMode === 'kanban' ? (
        <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
          <PipelineKanban
            stages={stages}
            deals={filteredDeals}
            onDealMove={handleDealMove}
          />
        </div>
      ) : (
        <div className="table-responsive">
          <DealsTable
            deals={filteredDeals}
            stages={stages}
          />
        </div>
      )}

      {showCreateModal && stages.length > 0 && (
        <CreateDealModal
          pipelineId={selectedPipeline!}
          stages={stages}
          onClose={() => setShowCreateModal(false)}
          onCreated={handleDealCreated}
        />
      )}

      {lostDealModal && (
        <DealLostReasonModal
          dealId={lostDealModal.dealId}
          dealName={lostDealModal.dealName}
          contactId={lostDealModal.contactId}
          companyId={lostDealModal.companyId}
          onClose={() => setLostDealModal(null)}
          onSaved={handleLostReasonSaved}
        />
      )}
    </div>
  )
}
