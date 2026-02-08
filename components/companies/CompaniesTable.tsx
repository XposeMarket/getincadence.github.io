'use client'

import { useState } from 'react'
import { Globe, MapPin, Building2, MoreHorizontal } from 'lucide-react'
import Link from 'next/link'

interface Company {
  id: string
  name: string
  website: string | null
  industry: string | null
  size: string | null
  city: string | null
  state: string | null
  country: string | null
  created_at: string
}

interface CompaniesTableProps {
  companies: Company[]
}

export default function CompaniesTable({ companies }: CompaniesTableProps) {
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([])

  const toggleSelect = (id: string) => {
    setSelectedCompanies(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedCompanies.length === companies.length) {
      setSelectedCompanies([])
    } else {
      setSelectedCompanies(companies.map(c => c.id))
    }
  }

  if (companies.length === 0) {
    return (
      <div className="card p-12 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Building2 size={24} className="text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No companies yet</h3>
        <p className="text-gray-500 mb-6">Get started by adding your first company</p>
      </div>
    )
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="w-12 px-4 py-3">
                <input
                  type="checkbox"
                  checked={selectedCompanies.length === companies.length}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                />
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Company
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Industry
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Size
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Location
              </th>
              <th className="w-12 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {companies.map((company) => (
              <tr 
                key={company.id} 
                className="hover:bg-gray-50 transition-colors group"
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedCompanies.includes(company.id)}
                    onChange={() => toggleSelect(company.id)}
                    className="h-4 w-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                  />
                </td>
                <td className="px-4 py-3">
                  <Link 
                    href={`/companies/${company.id}`}
                    className="flex items-center gap-3 group/link"
                  >
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cadence-blue to-cadence-teal flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                      {company.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 group-hover/link:text-primary-600 transition-colors">
                        {company.name}
                      </p>
                      {company.website && (
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                          <Globe size={12} />
                          {company.website}
                        </p>
                      )}
                    </div>
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {company.industry ? (
                    <span className="badge badge-gray">{company.industry}</span>
                  ) : (
                    <span className="text-sm text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {company.size ? (
                    <span className="text-sm text-gray-600">{company.size}</span>
                  ) : (
                    <span className="text-sm text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {company.city || company.country ? (
                    <span className="text-sm text-gray-600 flex items-center gap-1.5">
                      <MapPin size={14} className="text-gray-400" />
                      {[company.city, company.state, company.country].filter(Boolean).join(', ')}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                    <MoreHorizontal size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
