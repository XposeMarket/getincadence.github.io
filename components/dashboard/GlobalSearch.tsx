'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUserOrgId } from '@/lib/org-helpers'
import { useRouter } from 'next/navigation'
import {
  Search, Users, Building2, Handshake, CheckSquare,
  MessageSquare, ArrowRight, Loader2, Activity, Command, X
} from 'lucide-react'

interface SearchResult {
  id: string
  type: 'contact' | 'company' | 'deal' | 'task' | 'activity' | 'communication'
  title: string
  subtitle?: string
  link: string
}

const TYPE_CONFIG = {
  contact: { icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Contacts' },
  company: { icon: Building2, color: 'text-teal-600', bg: 'bg-teal-50', label: 'Companies' },
  deal: { icon: Handshake, color: 'text-pink-600', bg: 'bg-pink-50', label: 'Deals' },
  task: { icon: CheckSquare, color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Tasks' },
  activity: { icon: Activity, color: 'text-purple-600', bg: 'bg-purple-50', label: 'Activity' },
  communication: { icon: MessageSquare, color: 'text-green-600', bg: 'bg-green-50', label: 'Communications' },
}

interface GlobalSearchProps {
  className?: string
}

export default function GlobalSearch({ className }: GlobalSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [orgId, setOrgId] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()

  const showDropdown = isFocused && query.trim().length > 0

  // Init org_id
  useEffect(() => {
    getCurrentUserOrgId().then(setOrgId)
  }, [])

  // Cmd+K / Ctrl+K to focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Debounced search
  useEffect(() => {
    if (!query.trim() || !orgId) {
      setResults([])
      setSelectedIndex(-1)
      return
    }

    const timeout = setTimeout(() => {
      performSearch(query.trim())
    }, 200)

    return () => clearTimeout(timeout)
  }, [query, orgId]) // eslint-disable-line react-hooks/exhaustive-deps

  const performSearch = async (q: string) => {
    if (!orgId) return
    setLoading(true)

    const searchTerm = `%${q}%`
    const allResults: SearchResult[] = []

    const [contactsRes, companiesRes, dealsRes, tasksRes, activitiesRes, commsRes] = await Promise.all([
      supabase
        .from('contacts')
        .select('id, first_name, last_name, email, phone, company')
        .eq('org_id', orgId)
        .or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},email.ilike.${searchTerm},phone.ilike.${searchTerm},company.ilike.${searchTerm}`)
        .limit(4),

      supabase
        .from('companies')
        .select('id, name, website')
        .eq('org_id', orgId)
        .or(`name.ilike.${searchTerm},website.ilike.${searchTerm}`)
        .limit(3),

      supabase
        .from('deals')
        .select('id, name, amount')
        .eq('org_id', orgId)
        .ilike('name', searchTerm)
        .limit(3),

      supabase
        .from('tasks')
        .select('id, title, status, due_date')
        .eq('org_id', orgId)
        .ilike('title', searchTerm)
        .limit(3),

      supabase
        .from('activities')
        .select('id, subject, activity_type, deal_id, contact_id, company_id, metadata')
        .eq('org_id', orgId)
        .or(`subject.ilike.${searchTerm},body.ilike.${searchTerm}`)
        .order('created_at', { ascending: false })
        .limit(3),

      supabase
        .from('communications')
        .select('id, communication_type, subject, body, recipient_contact, deal_id, lead_id')
        .eq('org_id', orgId)
        .is('deleted_at', null)
        .or(`subject.ilike.${searchTerm},body.ilike.${searchTerm},recipient_contact.ilike.${searchTerm}`)
        .order('created_at', { ascending: false })
        .limit(3),
    ])

    // Map contacts
    ;(contactsRes.data || []).forEach((c: any) => {
      const name = `${c.first_name || ''} ${c.last_name || ''}`.trim()
      const parts: string[] = []
      if (c.email) parts.push(c.email)
      if (c.phone) parts.push(c.phone)
      if (c.company) parts.push(c.company)
      allResults.push({
        id: `contact-${c.id}`, type: 'contact',
        title: name || 'Unnamed Contact',
        subtitle: parts.join(' · '),
        link: `/contacts/${c.id}`,
      })
    })

    // Map companies
    ;(companiesRes.data || []).forEach((c: any) => {
      allResults.push({
        id: `company-${c.id}`, type: 'company',
        title: c.name,
        subtitle: c.website || undefined,
        link: `/companies/${c.id}`,
      })
    })

    // Map deals
    ;(dealsRes.data || []).forEach((d: any) => {
      allResults.push({
        id: `deal-${d.id}`, type: 'deal',
        title: d.name || 'Untitled Deal',
        subtitle: d.amount ? `$${d.amount.toLocaleString()}` : undefined,
        link: `/deals/${d.id}`,
      })
    })

    // Map tasks
    ;(tasksRes.data || []).forEach((t: any) => {
      allResults.push({
        id: `task-${t.id}`, type: 'task',
        title: t.title || 'Untitled Task',
        subtitle: t.status === 'completed' ? 'Completed' : t.due_date ? `Due ${new Date(t.due_date).toLocaleDateString()}` : 'Open',
        link: '/tasks',
      })
    })

    // Map activities
    ;(activitiesRes.data || []).forEach((a: any) => {
      const link = a.deal_id ? `/deals/${a.deal_id}` :
                   a.contact_id ? `/contacts/${a.contact_id}` :
                   a.company_id ? `/companies/${a.company_id}` :
                   a.metadata?.entity_type === 'deal' && a.metadata?.entity_id ? `/deals/${a.metadata.entity_id}` :
                   '/activity'
      allResults.push({
        id: `activity-${a.id}`, type: 'activity',
        title: a.subject || 'Activity',
        subtitle: a.activity_type?.replace(/_/g, ' '),
        link,
      })
    })

    // Map communications
    ;(commsRes.data || []).forEach((c: any) => {
      const typeLabel = c.communication_type === 'call' ? 'Call' :
                        c.communication_type === 'email' ? 'Email' :
                        c.communication_type === 'sms' ? 'SMS' : 'Note'
      const link = c.deal_id ? `/deals/${c.deal_id}` :
                   c.lead_id ? `/contacts/${c.lead_id}` :
                   '/activity'
      allResults.push({
        id: `comm-${c.id}`, type: 'communication',
        title: c.subject || c.body?.slice(0, 60) || `${typeLabel} log`,
        subtitle: [typeLabel, c.recipient_contact].filter(Boolean).join(' · '),
        link,
      })
    })

    setResults(allResults)
    setSelectedIndex(-1)
    setLoading(false)
  }

  const navigate = (link: string) => {
    setIsFocused(false)
    setQuery('')
    setResults([])
    router.push(link)
  }

  const clear = () => {
    setQuery('')
    setResults([])
    setSelectedIndex(-1)
    inputRef.current?.focus()
  }

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && selectedIndex >= 0 && results[selectedIndex]) {
      e.preventDefault()
      navigate(results[selectedIndex].link)
    } else if (e.key === 'Escape') {
      setIsFocused(false)
      inputRef.current?.blur()
    }
  }

  // Scroll selected into view
  useEffect(() => {
    if (dropdownRef.current && selectedIndex >= 0) {
      // Find the actual result item (skip group headers)
      const items = dropdownRef.current.querySelectorAll('[data-result-index]')
      const target = Array.from(items).find(el => el.getAttribute('data-result-index') === String(selectedIndex))
      if (target) target.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  // Group results by type
  const groupedResults = results.reduce<Record<string, SearchResult[]>>((acc, result) => {
    const label = TYPE_CONFIG[result.type].label
    if (!acc[label]) acc[label] = []
    acc[label].push(result)
    return acc
  }, {})

  let flatIndex = -1

  return (
    <div ref={containerRef} className={`relative ${className || ''}`}>
      {/* Search Input */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search contacts, deals, companies..."
          className="w-full pl-10 pr-20 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg placeholder-gray-400 focus:bg-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {loading && <Loader2 size={14} className="text-gray-400 animate-spin" />}
          {query && (
            <button onClick={clear} className="p-1 text-gray-400 hover:text-gray-600 rounded">
              <X size={14} />
            </button>
          )}
          {!query && (
            <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] text-gray-400 bg-gray-100 rounded border border-gray-200">
              <Command size={10} /> K
            </kbd>
          )}
        </div>
      </div>

      {/* Dropdown Results */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50 max-h-[70vh] overflow-y-auto"
        >
          {results.length === 0 && !loading ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-gray-500">No results for "<span className="font-medium">{query}</span>"</p>
              <p className="text-xs text-gray-400 mt-1">Try a different name, email, or phone number</p>
            </div>
          ) : results.length === 0 && loading ? (
            <div className="px-4 py-6 text-center">
              <Loader2 size={20} className="mx-auto text-gray-400 animate-spin" />
            </div>
          ) : (
            <>
              {Object.entries(groupedResults).map(([groupLabel, groupResults]) => (
                <div key={groupLabel}>
                  <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100">
                    <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{groupLabel}</span>
                  </div>
                  {groupResults.map((result) => {
                    flatIndex++
                    const idx = flatIndex
                    const isSelected = idx === selectedIndex
                    const config = TYPE_CONFIG[result.type]
                    const Icon = config.icon

                    return (
                      <button
                        key={result.id}
                        data-result-index={idx}
                        onClick={() => navigate(result.link)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                          isSelected ? 'bg-primary-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${config.bg}`}>
                          <Icon size={13} className={config.color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${isSelected ? 'text-primary-900' : 'text-gray-900'}`}>
                            {result.title}
                          </p>
                          {result.subtitle && (
                            <p className="text-xs text-gray-500 truncate">{result.subtitle}</p>
                          )}
                        </div>
                        <ArrowRight size={12} className={`flex-shrink-0 ${isSelected ? 'text-primary-400' : 'text-gray-300'}`} />
                      </button>
                    )
                  })}
                </div>
              ))}
              {/* Footer */}
              <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[10px] text-gray-400">{results.length} results</span>
                <div className="flex items-center gap-2 text-[10px] text-gray-400">
                  <span><kbd className="px-1 py-0.5 bg-white rounded border border-gray-200">↑↓</kbd> navigate</span>
                  <span><kbd className="px-1 py-0.5 bg-white rounded border border-gray-200">↵</kbd> open</span>
                  <span><kbd className="px-1 py-0.5 bg-white rounded border border-gray-200">esc</kbd> close</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
