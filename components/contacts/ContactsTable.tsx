'use client'

import { useState } from 'react'
import { Mail, Phone, Building2, MoreHorizontal, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { CompanyLogo, ContactAvatar } from '@/components/shared/Avatars'

interface Contact {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  title: string | null
  companies: { id: string; name: string }[] | { id: string; name: string } | null
  owner: { id: string; full_name: string }[] | { id: string; full_name: string } | null
  created_at: string
}

interface ContactsTableProps {
  contacts: Contact[]
}

// Helper to get first item from Supabase join that could be array or object
const getFirst = <T,>(data: T[] | T | null | undefined): T | null => {
  if (!data) return null
  return Array.isArray(data) ? data[0] || null : data
}

export default function ContactsTable({ contacts }: ContactsTableProps) {
  const [selectedContacts, setSelectedContacts] = useState<string[]>([])

  const toggleSelect = (id: string) => {
    setSelectedContacts(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedContacts.length === contacts.length) {
      setSelectedContacts([])
    } else {
      setSelectedContacts(contacts.map(c => c.id))
    }
  }

  if (contacts.length === 0) {
    return (
      <div className="card p-12 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Mail size={24} className="text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No contacts yet</h3>
        <p className="text-gray-500 mb-6">Get started by adding your first contact</p>
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
                  checked={selectedContacts.length === contacts.length}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                />
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Name
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Email
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Phone
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Company
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Owner
              </th>
              <th className="w-12 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {contacts.map((contact) => (
              <tr 
                key={contact.id} 
                className="hover:bg-gray-50 transition-colors group"
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedContacts.includes(contact.id)}
                    onChange={() => toggleSelect(contact.id)}
                    className="h-4 w-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                  />
                </td>
                <td className="px-4 py-3">
                  <Link 
                    href={`/contacts/${contact.id}`}
                    className="flex items-center gap-3 group/link"
                  >
                    <ContactAvatar
                      firstName={contact.first_name}
                      lastName={contact.last_name}
                      email={contact.email}
                      size="md"
                    />
                    <div>
                      <p className="font-medium text-gray-900 group-hover/link:text-primary-600 transition-colors">
                        {contact.first_name} {contact.last_name}
                      </p>
                      {contact.title && (
                        <p className="text-sm text-gray-500">{contact.title}</p>
                      )}
                    </div>
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {contact.email ? (
                    <a 
                      href={`mailto:${contact.email}`}
                      className="text-sm text-gray-600 hover:text-primary-600 transition-colors flex items-center gap-1.5"
                    >
                      <Mail size={14} />
                      {contact.email}
                    </a>
                  ) : (
                    <span className="text-sm text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {contact.phone ? (
                    <a 
                      href={`tel:${contact.phone}`}
                      className="text-sm text-gray-600 hover:text-primary-600 transition-colors flex items-center gap-1.5"
                    >
                      <Phone size={14} />
                      {contact.phone}
                    </a>
                  ) : (
                    <span className="text-sm text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {(() => {
                    const company = getFirst(contact.companies)
                    return company ? (
                      <Link 
                        href={`/companies/${company.id}`}
                        className="text-sm text-gray-600 hover:text-primary-600 transition-colors flex items-center gap-1.5"
                      >
                        <CompanyLogo name={company.name} email={contact.email} size="xs" />
                        {company.name}
                      </Link>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )
                  })()}
                </td>
                <td className="px-4 py-3">
                  {(() => {
                    const owner = getFirst(contact.owner)
                    return owner ? (
                      <span className="text-sm text-gray-600">{owner.full_name}</span>
                    ) : (
                      <span className="text-sm text-gray-400">Unassigned</span>
                    )
                  })()}
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
