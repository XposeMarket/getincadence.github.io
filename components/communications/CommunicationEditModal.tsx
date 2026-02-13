'use client'

import { useState } from 'react'
import { X, History } from 'lucide-react'
import { updateCommunication, formatDuration } from '@/lib/communications'
import type { Communication, UpdateCommunicationData } from '@/types/communications'
import { formatDistanceToNow } from 'date-fns'

interface CommunicationEditModalProps {
  communication: Communication
  onClose: () => void
  onSaved: (updated: Communication) => void
}

export default function CommunicationEditModal({
  communication,
  onClose,
  onSaved,
}: CommunicationEditModalProps) {
  const [body, setBody] = useState(communication.body || '')
  const [subject, setSubject] = useState(communication.subject || '')
  const [recipientContact, setRecipientContact] = useState(communication.recipient_contact || '')
  const [durationMinutes, setDurationMinutes] = useState(
    communication.duration_seconds ? Math.round(communication.duration_seconds / 60) : 0
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)

  const isCall = communication.communication_type === 'call'
  const isEmail = communication.communication_type === 'email'
  const isSMS = communication.communication_type === 'sms'
  const isNote = communication.communication_type === 'note'

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    const updates: UpdateCommunicationData = {}

    if (body !== (communication.body || '')) updates.body = body
    if (subject !== (communication.subject || '')) updates.subject = subject
    if (recipientContact !== (communication.recipient_contact || '')) {
      updates.recipient_contact = recipientContact
    }
    if (isCall && durationMinutes * 60 !== communication.duration_seconds) {
      updates.duration_seconds = durationMinutes * 60
    }

    const result = await updateCommunication(communication.id, updates, communication)

    if (!result) {
      setError('Failed to update. Please try again.')
      setSaving(false)
      return
    }

    setSaving(false)
    onSaved(result)
    onClose()
  }

  const editHistory = communication.edit_history || []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-gray-900">
            Edit {communication.communication_type.charAt(0).toUpperCase() + communication.communication_type.slice(1)}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Recipient (email/sms) */}
          {(isEmail || isSMS) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {isEmail ? 'To' : 'Phone'}
              </label>
              <input
                type={isEmail ? 'email' : 'tel'}
                value={recipientContact}
                onChange={(e) => setRecipientContact(e.target.value)}
                className="input"
              />
            </div>
          )}

          {/* Subject (email/call) */}
          {(isEmail || isCall) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="input"
              />
            </div>
          )}

          {/* Duration (call) */}
          {isCall && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
              <input
                type="number"
                min="1"
                max="480"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 0)}
                className="input w-32"
              />
            </div>
          )}

          {/* Notes/Body */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isNote ? 'Note' : 'Notes'}
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              className="input resize-none"
            />
          </div>

          {/* Edit history toggle */}
          {editHistory.length > 0 && (
            <div>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
              >
                <History size={14} />
                {showHistory ? 'Hide' : 'Show'} edit history ({editHistory.length})
              </button>

              {showHistory && (
                <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                  {editHistory.map((entry, i) => (
                    <div key={i} className="text-xs bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-700">
                          {entry.edited_by_name}
                        </span>
                        <span className="text-gray-400">
                          {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        {Object.entries(entry.changes).map(([field, change]) => (
                          <p key={field} className="text-gray-500">
                            <span className="font-medium">{field}:</span>{' '}
                            <span className="line-through text-red-400">
                              {field === 'duration_seconds'
                                ? formatDuration(change.old as number)
                                : String(change.old || '(empty)')}
                            </span>
                            {' → '}
                            <span className="text-green-600">
                              {field === 'duration_seconds'
                                ? formatDuration(change.new as number)
                                : String(change.new || '(empty)')}
                            </span>
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-200 sticky bottom-0 bg-white">
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
