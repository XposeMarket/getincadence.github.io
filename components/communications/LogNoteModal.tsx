'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { logNote } from '@/lib/communications'

interface LogNoteModalProps {
  leadId?: string
  dealId?: string
  onClose: () => void
  onSaved: () => void
}

export default function LogNoteModal({
  leadId,
  dealId,
  onClose,
  onSaved,
}: LogNoteModalProps) {
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    if (!body.trim()) {
      setError('Please enter a note.')
      return
    }

    setSaving(true)
    setError(null)

    const result = await logNote({
      lead_id: leadId,
      deal_id: dealId,
      body: body.trim(),
    })

    if (!result) {
      setError('Failed to save note. Please try again.')
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
          <h2 className="text-lg font-semibold text-gray-900">Add Note</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your note..."
            rows={5}
            className="input resize-none"
            autoFocus
          />
          {error && (
            <p className="text-sm text-red-600 mt-2">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-200">
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !body.trim()}
            className="btn btn-primary"
          >
            {saving ? 'Saving...' : 'Save Note'}
          </button>
        </div>
      </div>
    </div>
  )
}
