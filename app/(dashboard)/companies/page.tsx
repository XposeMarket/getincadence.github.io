'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUserOrgId } from '@/lib/org-helpers'
import { Plus, Search, Filter } from 'lucide-react'
import CompaniesTable from '@/components/companies/CompaniesTable'
import CreateCompanyModal from '@/components/companies/CreateCompanyModal'

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
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
      loadCompanies()
    }
  }, [orgId])

  const loadCompanies = async () => {
    if (!orgId) {
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('companies')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    if (data) setCompanies(data)
    setLoading(false)
  }

  const filteredCompanies = companies.filter(company => {
    if (!searchQuery) return true
    const search = searchQuery.toLowerCase()
    return (
      company.name?.toLowerCase().includes(search) ||
      company.industry?.toLowerCase().includes(search) ||
      company.website?.toLowerCase().includes(search)
    )
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Companies</h1>
          <p className="text-sm text-gray-500 mt-0.5">{companies.length} total companies</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn btn-primary w-full sm:w-auto">
          <Plus size={18} className="mr-2" />
          Add Company
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search companies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10"
          />
        </div>
        <button className="btn btn-secondary">
          <Filter size={16} className="mr-2" />
          Filter
        </button>
      </div>

      {/* Table */}
      <div className="table-responsive">
        <CompaniesTable companies={filteredCompanies} />
      </div>

      {showCreateModal && (
        <CreateCompanyModal 
          onClose={() => setShowCreateModal(false)} 
          onCreated={() => {
            setShowCreateModal(false)
            loadCompanies()
          }} 
        />
      )}
    </div>
  )
}
