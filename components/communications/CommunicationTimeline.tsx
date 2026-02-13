'use client'

import { useState, useEffect, useCallback } from 'react'
import { Phone, Mail, MessageSquare, FileText, Clock, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns'
import { getCommunications, softDeleteCommunication, restoreCommunication, formatDuration } from '@/lib/communications'
import type { Communication, CommunicationFilterType } from '@/types/communications'
import CommunicationActions from './CommunicationActions'
import CommunicationEditModal from './CommunicationEditModal'

interface CommunicationTimelineProps {
  leadId?: string
  dealId?: string
  currentUserId?: string
  isAdmin?: boolean
  refreshKey?: number // parent can increment to force refresh
}

export default function CommunicationTimeline({
  leadId,
  dealId,
  currentUserId,
  isAdmin = false,
  refreshKey = 0,
}: CommunicationTimelineProps) {
  const [communications, setCommunications] = useState<Communication[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<CommunicationFilterType>('all')
  const [editingComm, setEditingComm] = useState<Communication | null>(null)

  // Undo toast state
  const [undoToast, setUndoToast] = useState<{ commId: string; timeout: NodeJS.Timeout } | null>(null)

  const loadCommunications = useCallback(async () => {
    setLoading(true)
    const { data } = await getCommunications({
      leadId,
      dealId,
      type: filter === 'all' ? undefined : filter,
    })
    setCommunications(data)
    setLoading(false)
  }, [leadId, dealId, filter])

  useEffect(() => {
    loadCommunications()
  }, [loadCommunications, refreshKey])

  // Cleanup undo timeout on unmount
  useEffect(() => {
    return () => {
      if (undoToast?.timeout) clearTimeout(undoToast.timeout)
    }
  }, [undoToast])

  const handleDelete = async (commId: string) => {
    const success = await softDeleteCommunication(commId)
    if (!success) return

    // Optimistically remove from UI
    setCommunications((prev) => prev.filter((c) => c.id !== commId))

    // Clear any existing toast
    if (undoToast?.timeout) clearTimeout(undoToast.timeout)

    // Show undo toast for 5 seconds
    const timeout = setTimeout(() => {
      setUndoToast(null)
    }, 5000)

    setUndoToast({ commId, timeout })
  }

  const handleUndo = async () => {
    if (!undoToast) return
    if (undoToast.timeout) clearTimeout(undoToast.timeout)

    const success = await restoreCommunication(undoToast.commId)
    setUndoToast(null)

    if (success) {
      loadCommunications()
    }
  }

  const handleEditSaved = (updated: Communication) => {
    setCommunications((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    )
  }

  const canEditComm = (comm: Communication) => {
    return isAdmin || comm.created_by === currentUserId
  }

  // --- Icons ---
  const getIcon = (type: string) => {
    switch (type) {
      case 'call': return <Phone size={16} />
      case 'email': return <Mail size={16} />
      case 'sms': return <MessageSquare size={16} />
      case 'note': return <FileText size={16} />
      default: return <FileText size={16} />
    }
  }

  const getIconColors = (type: string) => {
    switch (type) {
      case 'call': return 'bg-green-100 text-green-600'
      case 'email': return 'bg-purple-100 text-purple-600'
      case 'sms': return 'bg-blue-100 text-blue-600'
      case 'note': return 'bg-amber-100 text-amber-600'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  const getLabel = (type: string) => {
    switch (type) {
      case 'call': return 'Call'
      case 'email': return 'Email'
      case 'sms': return 'SMS'
      case 'note': return 'Note'
      default: return 'Activity'
    }
  }

  const getDirectionIcon = (direction: string | null) => {
    if (direction === 'outbound') return <ArrowUpRight size={12} className="text-gray-400" />
    if (direction === 'inbound') return <ArrowDownLeft size={12} className="text-gray-400" />
    return null
  }

  const formatTimestamp = (dateStr: string) => {
    const date = new Date(dateStr)
    if (isToday(date)) return `Today at ${format(date, 'h:mm a')}`
    if (isYesterday(date)) return `Yesterday at ${format(date, 'h:mm a')}`
    return format(date, 'MMM d, yyyy \'at\' h:mm a')
  }

  // --- Filter tabs ---
  const filterOptions: { value: CommunicationFilterType; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'call', label: 'Calls' },
    { value: 'email', label: 'Emails' },
    { value: 'sms', label: 'SMS' },
    { value: 'note', label: 'Notes' },
  ]

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex items-center gap-1 px-4 py-3 border-b border-gray-100 overflow-x-auto">
        {filterOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
              filter === opt.value
                ? 'bg-primary-50 text-primary-700'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="p-6 text-center text-sm text-gray-400">Loading...</div>
      ) : communications.length === 0 ? (
        <div className="p-6 text-center text-sm text-gray-400">
          {filter === 'all' ? 'No communications yet' : `No ${filter}s logged`}
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {communications.map((comm) => {
            const creator = comm.creator
              ? (Array.isArray(comm.creator) ? comm.creator[0] : comm.creator)
              : null

            return (
              <div
                key={comm.id}
                className="px-4 py-3 hover:bg-gray-50/50 transition-colors group"
              >
                <div className="flex gap-3">
                  {/* Icon */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getIconColors(comm.communication_type)}`}>
                    {getIcon(comm.communication_type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Top line */}
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-gray-900">
                        {getLabel(comm.communication_type)}
                      </span>
                      {getDirectionIcon(comm.direction)}

                      {/* Recipient */}
                      {comm.recipient_contact && (
                        <span className="text-gray-500 truncate">
                          {comm.communication_type === 'email' ? 'to ' : ''}
                          {comm.recipient_contact}
                        </span>
                      )}

                      {/* Duration (calls) */}
                      {comm.communication_type === 'call' && comm.duration_seconds && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock size={12} />
                          {formatDuration(comm.duration_seconds)}
                        </span>
                      )}
                    </div>

                    {/* Subject */}
                    {comm.subject && (
                      <p className="text-sm text-gray-700 mt-0.5 font-medium">{comm.subject}</p>
                    )}

                    {/* Body/notes preview */}
                    {comm.body && (
                      <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
                        {comm.body}
                      </p>
                    )}

                    {/* Meta line */}
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-400">
                      <span>{formatTimestamp(comm.created_at)}</span>
                      {creator && (
                        <>
                          <span>·</span>
                          <span>{creator.full_name}</span>
                        </>
                      )}
                      {comm.updated_at && comm.updated_at !== comm.created_at && (
                        <>
                          <span>·</span>
                          <span className="italic">edited</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <CommunicationActions
                      canEdit={canEditComm(comm)}
                      hasHistory={(comm.edit_history || []).length > 0}
                      onEdit={() => setEditingComm(comm)}
                      onDelete={() => handleDelete(comm.id)}
                      onViewHistory={() => setEditingComm(comm)}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Undo toast */}
      {undoToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm rounded-lg px-4 py-3 flex items-center gap-3 shadow-lg">
          <span>Communication deleted</span>
          <button
            onClick={handleUndo}
            className="text-primary-300 hover:text-primary-200 font-medium"
          >
            Undo
          </button>
          <button
            onClick={() => {
              if (undoToast.timeout) clearTimeout(undoToast.timeout)
              setUndoToast(null)
            }}
            className="text-gray-400 hover:text-gray-300 ml-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Edit modal */}
      {editingComm && (
        <CommunicationEditModal
          communication={editingComm}
          onClose={() => setEditingComm(null)}
          onSaved={handleEditSaved}
        />
      )}
    </div>
  )
}
