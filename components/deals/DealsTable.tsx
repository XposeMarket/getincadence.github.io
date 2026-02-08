'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Building2, User, DollarSign } from 'lucide-react'

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

interface DealsTableProps {
  deals: Deal[]
  stages: PipelineStage[]
}

export default function DealsTable({ deals, stages }: DealsTableProps) {
  const getStage = (stageId: string) => stages.find(s => s.id === stageId)

  const formatCurrency = (value: number | null) => {
    if (!value) return '—'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (deals.length === 0) {
    return (
      <div className="card p-12 text-center">
        <DollarSign size={48} className="mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No deals yet</h3>
        <p className="text-gray-500">Create your first deal to start tracking your pipeline.</p>
      </div>
    )
  }

  return (
    <div className="card overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
              Deal
            </th>
            <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
              Value
            </th>
            <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
              Stage
            </th>
            <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
              Contact
            </th>
            <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
              Company
            </th>
            <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
              Close Date
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {deals.map((deal) => {
            const stage = getStage(deal.stage_id)
            return (
              <tr key={deal.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <Link href={`/deals/${deal.id}`} className="font-medium text-gray-900 hover:text-primary-600">
                    {deal.name}
                  </Link>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Created {formatDistanceToNow(new Date(deal.created_at), { addSuffix: true })}
                  </p>
                </td>
                <td className="px-6 py-4">
                  <span className="font-medium text-gray-900">
                    {formatCurrency(deal.amount)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {stage && (
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: `${stage.color}20`,
                        color: stage.color,
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: stage.color }}
                      />
                      {stage.name}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {deal.contacts ? (
                    <Link
                      href={`/contacts/${deal.contacts.id}`}
                      className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary-600"
                    >
                      <User size={14} />
                      {deal.contacts.first_name} {deal.contacts.last_name}
                    </Link>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {deal.companies ? (
                    <Link
                      href={`/companies/${deal.companies.id}`}
                      className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary-600"
                    >
                      <Building2 size={14} />
                      {deal.companies.name}
                    </Link>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {formatDate(deal.close_date)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
