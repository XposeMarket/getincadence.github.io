'use client'

import { useState } from 'react'
import { DollarSign, Calendar, User, Building2, GripVertical } from 'lucide-react'
import Link from 'next/link'

interface PipelineStage {
  id: string
  name: string
  color: string
  position: number
}

interface Deal {
  id: string
  name: string
  amount: number | null
  stage_id: string
  contact_id: string | null
  company_id: string | null
  close_date: string | null
  created_at: string
  contacts: { id: string; first_name: string; last_name: string } | null
  companies: { id: string; name: string } | null
}

interface PipelineKanbanProps {
  stages: PipelineStage[]
  deals: Deal[]
  onDealMove: (dealId: string, newStageId: string) => void
}

export default function PipelineKanban({ stages, deals, onDealMove }: PipelineKanbanProps) {
  const [draggedDeal, setDraggedDeal] = useState<string | null>(null)
  const [dragOverStage, setDragOverStage] = useState<string | null>(null)

  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    setDraggedDeal(dealId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault()
    setDragOverStage(stageId)
  }

  const handleDragLeave = () => {
    setDragOverStage(null)
  }

  const handleDrop = (e: React.DragEvent, stageId: string) => {
    e.preventDefault()
    if (draggedDeal) {
      onDealMove(draggedDeal, stageId)
    }
    setDraggedDeal(null)
    setDragOverStage(null)
  }

  const handleDragEnd = () => {
    setDraggedDeal(null)
    setDragOverStage(null)
  }

  const getDealsForStage = (stageId: string) => {
    return deals.filter(deal => deal.stage_id === stageId)
  }

  const getStageValue = (stageId: string) => {
    return getDealsForStage(stageId).reduce((sum, deal) => sum + (deal.amount || 0), 0)
  }

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
    return `$${value.toLocaleString()}`
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null
    const date = new Date(dateString)
    const now = new Date()
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return { text: `${Math.abs(diffDays)}d overdue`, className: 'text-red-600' }
    if (diffDays === 0) return { text: 'Due today', className: 'text-yellow-600' }
    if (diffDays <= 7) return { text: `${diffDays}d left`, className: 'text-yellow-600' }
    return { text: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), className: 'text-gray-500' }
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6">
      {stages.map((stage) => {
        const stageDeals = getDealsForStage(stage.id)
        const stageValue = getStageValue(stage.id)
        const isDragOver = dragOverStage === stage.id

        return (
          <div
            key={stage.id}
            className="flex-shrink-0 w-80"
            onDragOver={(e) => handleDragOver(e, stage.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, stage.id)}
          >
            {/* Stage header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: stage.color }}
                />
                <h3 className="font-medium text-gray-900">{stage.name}</h3>
                <span className="text-sm text-gray-500">({stageDeals.length})</span>
              </div>
              <span className="text-sm font-medium text-green-600">
                {formatCurrency(stageValue)}
              </span>
            </div>

            {/* Stage column */}
            <div
              className={`min-h-[200px] rounded-lg border-2 border-dashed transition-colors p-2 space-y-2 ${
                isDragOver
                  ? 'border-primary-400 bg-primary-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              {stageDeals.map((deal) => (
                <DealCard
                  key={deal.id}
                  deal={deal}
                  isDragging={draggedDeal === deal.id}
                  onDragStart={(e) => handleDragStart(e, deal.id)}
                  onDragEnd={handleDragEnd}
                  formatDate={formatDate}
                />
              ))}

              {stageDeals.length === 0 && !isDragOver && (
                <div className="flex items-center justify-center h-24 text-sm text-gray-400">
                  No deals
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

interface DealCardProps {
  deal: Deal
  isDragging: boolean
  onDragStart: (e: React.DragEvent) => void
  onDragEnd: () => void
  formatDate: (date: string | null) => { text: string; className: string } | null
}

function DealCard({ deal, isDragging, onDragStart, onDragEnd, formatDate }: DealCardProps) {
  const closeDate = formatDate(deal.close_date)
  const dealAmount = deal.amount || 0

  return (
    <Link href={`/deals/${deal.id}`}>
      <div
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        className={`bg-white rounded-lg border border-gray-200 p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${
          isDragging ? 'opacity-50' : ''
        }`}
      >
        <div className="flex items-start gap-2">
          <GripVertical size={16} className="text-gray-300 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-gray-900 truncate">{deal.name}</h4>
            
            {dealAmount > 0 && (
              <div className="flex items-center gap-1 mt-1 text-sm text-green-600">
                <DollarSign size={14} />
                <span>${dealAmount.toLocaleString()}</span>
              </div>
            )}

            <div className="flex items-center gap-3 mt-2 text-xs">
              {deal.companies && (
                <div className="flex items-center gap-1 text-gray-500">
                  <Building2 size={12} />
                  <span className="truncate max-w-[80px]">{deal.companies.name}</span>
                </div>
              )}
              {deal.contacts && (
                <div className="flex items-center gap-1 text-gray-500">
                  <User size={12} />
                  <span className="truncate max-w-[80px]">
                    {deal.contacts.first_name} {deal.contacts.last_name}
                  </span>
                </div>
              )}
            </div>

            {closeDate && (
              <div className="flex items-center gap-1 mt-2 text-xs">
                <Calendar size={12} className={closeDate.className} />
                <span className={closeDate.className}>{closeDate.text}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
