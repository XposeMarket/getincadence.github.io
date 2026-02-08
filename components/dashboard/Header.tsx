'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Search, Bell, Plus, LogOut, ChevronDown, Users, Building2, Handshake, CheckSquare, Menu } from 'lucide-react'
import CreateContactModal from '@/components/contacts/CreateContactModal'
import CreateCompanyModal from '@/components/companies/CreateCompanyModal'
import CreateTaskModal from '@/components/tasks/CreateTaskModal'
import { DEMO_ORG_ID } from '@/lib/constants'
import { ActivityLogger } from '@/lib/activity-logger'

interface HeaderProps {
  user: {
    id: string
    full_name: string
    email: string
    role: string
    orgs: {
      id: string
      name: string
    }
  }
  onMenuClick?: () => void
}

export default function Header({ user, onMenuClick }: HeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showMobileSearch, setShowMobileSearch] = useState(false)
  const [activeModal, setActiveModal] = useState<'contact' | 'company' | 'deal' | 'task' | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const quickAddOptions = [
    { id: 'contact' as const, label: 'Contact', icon: Users, color: 'text-blue-600 bg-blue-100' },
    { id: 'company' as const, label: 'Company', icon: Building2, color: 'text-teal-600 bg-teal-100' },
    { id: 'deal' as const, label: 'Deal', icon: Handshake, color: 'text-pink-600 bg-pink-100' },
    { id: 'task' as const, label: 'Task', icon: CheckSquare, color: 'text-yellow-600 bg-yellow-100' },
  ]

  const handleQuickAdd = (type: 'contact' | 'company' | 'deal' | 'task') => {
    setShowQuickAdd(false)
    setActiveModal(type)
  }

  const handleModalClose = () => {
    setActiveModal(null)
  }

  const handleCreated = () => {
    setActiveModal(null)
    router.refresh()
  }

  return (
    <>
      <header className="h-14 sm:h-16 bg-white border-b border-gray-200 flex items-center justify-between px-3 sm:px-6">
        {/* Left side - Menu button (mobile) + Search */}
        <div className="flex items-center gap-2 sm:gap-4 flex-1">
          {/* Mobile menu button */}
          <button 
            onClick={onMenuClick}
            className="lg:hidden p-2 -ml-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Menu size={22} />
          </button>

          {/* Desktop search */}
          <div className="hidden sm:block flex-1 max-w-xl">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search contacts, deals, companies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg placeholder-gray-400 focus:bg-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
              />
            </div>
          </div>

          {/* Mobile search button */}
          <button 
            onClick={() => setShowMobileSearch(!showMobileSearch)}
            className="sm:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Search size={20} />
          </button>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-1 sm:gap-3">
          {/* Quick Add */}
          <div className="relative">
            <button 
              onClick={() => setShowQuickAdd(!showQuickAdd)}
              className="btn btn-primary gap-1 sm:gap-2 text-sm px-2.5 sm:px-4 py-2"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Quick Add</span>
              <ChevronDown size={16} className="hidden sm:inline" />
            </button>

            {showQuickAdd && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowQuickAdd(false)} />
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20 animate-fade-in">
                  {quickAddOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => handleQuickAdd(option.id)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${option.color}`}>
                        <option.icon size={16} />
                      </div>
                      {option.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Notifications */}
          <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <Bell size={20} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary-500 rounded-full" />
          </button>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-1 sm:gap-2 p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cadence-pink to-cadence-teal flex items-center justify-center text-white text-sm font-medium">
                {user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              <ChevronDown size={16} className="text-gray-500 hidden sm:block" />
            </button>

            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20 animate-fade-in">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <LogOut size={16} />
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Mobile search bar - expandable */}
      {showMobileSearch && (
        <div className="sm:hidden px-3 py-2 bg-white border-b border-gray-200">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg placeholder-gray-400 focus:bg-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
            />
          </div>
        </div>
      )}

      {activeModal === 'contact' && (
        <CreateContactModal onClose={handleModalClose} onCreated={handleCreated} />
      )}
      {activeModal === 'company' && (
        <CreateCompanyModal onClose={handleModalClose} onCreated={handleCreated} />
      )}
      {activeModal === 'deal' && (
        <QuickDealModal onClose={handleModalClose} onCreated={handleCreated} />
      )}
      {activeModal === 'task' && (
        <CreateTaskModal onClose={handleModalClose} onCreated={handleCreated} />
      )}
    </>
  )
}

function QuickDealModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('')
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const createDefaultPipeline = async () => {
    const { data: pipeline, error: pipelineError } = await supabase
      .from('pipelines')
      .insert({ name: 'Sales Pipeline', is_default: true, org_id: DEMO_ORG_ID })
      .select()
      .single()

    if (pipelineError || !pipeline) return null

    const defaultStages = [
      { name: 'Lead', position: 0, color: '#6B7280', win_probability: 10 },
      { name: 'Qualified', position: 1, color: '#3B82F6', win_probability: 25 },
      { name: 'Proposal', position: 2, color: '#F59E0B', win_probability: 50 },
      { name: 'Negotiation', position: 3, color: '#8B5CF6', win_probability: 75 },
      { name: 'Closed Won', position: 4, color: '#10B981', win_probability: 100 },
      { name: 'Closed Lost', position: 5, color: '#EF4444', win_probability: 0 },
    ]

    await supabase.from('pipeline_stages').insert(
      defaultStages.map(stage => ({ ...stage, pipeline_id: pipeline.id }))
    )

    return pipeline
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Get or create pipeline
    let { data: pipeline } = await supabase
      .from('pipelines')
      .select('id')
      .eq('is_default', true)
      .single()

    if (!pipeline) {
      const { data: anyPipeline } = await supabase
        .from('pipelines')
        .select('id')
        .limit(1)
        .single()
      
      if (!anyPipeline) {
        const newPipeline = await createDefaultPipeline()
        if (!newPipeline) {
          setError('Failed to create pipeline.')
          setLoading(false)
          return
        }
        pipeline = newPipeline
      } else {
        pipeline = anyPipeline
      }
    }

    // Get first stage
    const { data: stage } = await supabase
      .from('pipeline_stages')
      .select('id, name')
      .eq('pipeline_id', pipeline.id)
      .order('position', { ascending: true })
      .limit(1)
      .single()

    if (!stage) {
      setError('No pipeline stages found.')
      setLoading(false)
      return
    }

    const { data: newDeal, error: insertError } = await supabase
      .from('deals')
      .insert({
        name,
        amount: value ? parseFloat(value) : 0,
        pipeline_id: pipeline.id,
        stage_id: stage.id,
        org_id: DEMO_ORG_ID,
      })
      .select('id')
      .single()

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    // Log activity
    await ActivityLogger.dealCreated({
      id: newDeal.id,
      name,
      amount: value ? parseFloat(value) : undefined,
      stage_name: stage.name
    })

    onCreated()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-slide-up">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Quick Add Deal</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Deal Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Website Redesign Project"
              required
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Value</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
              <input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="0"
                min="0"
                step="0.01"
                className="input pl-7"
              />
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Creating...' : 'Create Deal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
