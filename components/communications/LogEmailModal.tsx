'use client'

import { useState } from 'react'
import { X, Mail, ExternalLink } from 'lucide-react'
import { logEmail, openEmailClient } from '@/lib/communications'

interface LogEmailModalProps {
  leadId?: string
  dealId?: string
  defaultEmail?: string | null
  contactName?: string
  onClose: () => void
  onSaved: () => void
}

export default function LogEmailModal({
  leadId,
  dealId,
  defaultEmail,
  contactName,
  onClose,
  onSaved,
}: LogEmailModalProps) {
  const [to, setTo] = useState(defaultEmail || '')
  const [subject, setSubject] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailOpened, setEmailOpened] = useState(false)

  const handleOpenEmailClient = () => {
    if (!to.trim()) {
      setError('Please enter a recipient email address.')
      return
    }
    setError(null)
    openEmailClient(to.trim(), subject, notes)
    setEmailOpened(true)
  }

  const handleSave = async () => {
    if (!to.trim()) {
      setError('Please enter a recipient email address.')
      return
    }

    setSaving(true)
    setError(null)

    const result = await logEmail({
      lead_id: leadId,
      deal_id: dealId,
      recipient_contact: to.trim(),
      subject: subject.trim(),
      body: notes.trim(),
    })

    if (!result) {
      setError('Failed to save email log. Please try again.')
      setSaving(false)
      return
    }

    setSaving(false)
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Log Email</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
              className="input"
            />
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject line"
              className="input"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes about this email (optional)"
              rows={3}
              className="input resize-none"
            />
          </div>

          {/* Open email client button */}
          <button
            onClick={handleOpenEmailClient}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <ExternalLink size={16} />
            Open Email Client
          </button>

          {emailOpened && (
            <p className="text-xs text-green-600 text-center">
              Email client opened — compose and send, then save the log below.
            </p>
          )}

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-200">
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary">
            {saving ? 'Saving...' : 'Save Log'}
          </button>
        </div>
      </div>
    </div>
  )
}
