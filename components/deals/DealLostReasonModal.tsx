'use client'

import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { createRevisitTaskForLostDeal } from '@/lib/automation-engine'

interface DealLostReasonModalProps {
  dealId: string
  dealName: string
  contactId?: string
  companyId?: string
  onClose: () => void
  onSaved: () => void
}

const LOSS_REASONS = [
  { value: 'price', label: 'Price too high' },
  { value: 'timing', label: 'Bad timing' },
  { value: 'competitor', label: 'Went with competitor' },
  { value: 'not_a_fit', label: 'Not a fit' },
  { value: 'no_response', label: 'No response / Ghosted' },
  { value: 'budget', label: 'Budget cut / No budget' },
  { value: 'other', label: 'Other' },
]

export default function DealLostReasonModal({
  dealId,
  dealName,
  contactId,
  companyId,
  onClose,
  onSaved
}: DealLostReasonModalProps) {
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [createReminder, setCreateReminder] = useState(true)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!reason) return
    
    setLoading(true)

    // Update deal metadata with close reason
    const { error } = await supabase
      .from('deals')
      .update({
        metadata: {
          close_reason: reason,
          close_notes: notes || null,
          closed_at: new Date().toISOString()
        }
      })
      .eq('id', dealId)

    if (error) {
      console.error('Failed to save close reason:', error)
      setLoading(false)
      return
    }

    // Create revisit task if requested
    if (createReminder) {
      await createRevisitTaskForLostDeal({
        dealId,
        dealName,
        contactId,
        companyId
      })
    }

    onSaved()
  }

  const selectedReasonLabel = LOSS_REASONS.find(r => r.value === reason)?.label

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-slide-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Deal Lost</h2>
            <p className="text-sm text-gray-500 mt-0.5">{dealName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Why did this deal close? *
            </label>
            <div className="space-y-2">
              {LOSS_REASONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                    reason === option.value
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={option.value}
                    checked={reason === option.value}
                    onChange={(e) => setReason(e.target.value)}
                    className="sr-only"
                  />
                  <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${
                    reason === option.value
                      ? 'border-primary-500'
                      : 'border-gray-300'
                  }`}>
                    {reason === option.value && (
                      <div className="w-2 h-2 rounded-full bg-primary-500" />
                    )}
                  </div>
                  <span className="text-sm text-gray-900">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {reason === 'other' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Please explain *
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What happened?"
                rows={3}
                required
                className="input resize-none"
              />
            </div>
          )}

          {reason && reason !== 'other' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Additional notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional context..."
                rows={2}
                className="input resize-none"
              />
            </div>
          )}

          <label className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 cursor-pointer">
            <input
              type="checkbox"
              checked={createReminder}
              onChange={(e) => setCreateReminder(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <div>
              <span className="text-sm font-medium text-gray-900">Set reminder to revisit in 60 days</span>
              <p className="text-xs text-gray-500">We'll create a task to follow up later</p>
            </div>
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Skip
            </button>
            <button 
              type="submit" 
              disabled={!reason || (reason === 'other' && !notes) || loading} 
              className="btn btn-primary"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                'Save & Close'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
