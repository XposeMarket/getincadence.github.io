'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Phone, Clock } from 'lucide-react'
import { logCall, formatDuration, durationToSeconds } from '@/lib/communications'

interface LogCallModalProps {
  leadId?: string
  dealId?: string
  phoneNumber?: string | null
  contactName?: string
  onClose: () => void
  onSaved: () => void
}

type MobileStep = 'pre-call' | 'post-call'

export default function LogCallModal({
  leadId,
  dealId,
  phoneNumber,
  contactName,
  onClose,
  onSaved,
}: LogCallModalProps) {
  const [durationMinutes, setDurationMinutes] = useState<number>(5)
  const [customDuration, setCustomDuration] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Mobile state
  const [isMobile, setIsMobile] = useState(false)
  const [mobileStep, setMobileStep] = useState<MobileStep>('pre-call')
  const callStartRef = useRef<number | null>(null)
  const [calculatedDuration, setCalculatedDuration] = useState<number>(0)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Page Visibility API — detect return from call
  useEffect(() => {
    if (!isMobile || mobileStep !== 'pre-call') return

    const handleVisibilityChange = () => {
      if (
        document.visibilityState === 'visible' &&
        callStartRef.current
      ) {
        const elapsed = Math.round((Date.now() - callStartRef.current) / 1000)
        // Only auto-advance if they were away for at least 5 seconds
        if (elapsed >= 5) {
          setCalculatedDuration(elapsed)
          setDurationMinutes(Math.round(elapsed / 60))
          setMobileStep('post-call')
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleVisibilityChange)
    }
  }, [isMobile, mobileStep])

  const handleCallNow = () => {
    if (!phoneNumber) return
    callStartRef.current = Date.now()
    window.location.href = `tel:${phoneNumber}`
  }

  const handleSkipToLog = () => {
    // Let mobile users skip calling and just log manually
    setMobileStep('post-call')
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    const finalDurationSeconds = showCustom && customDuration
      ? parseInt(customDuration) * 60
      : durationToSeconds(durationMinutes)

    const result = await logCall({
      lead_id: leadId,
      deal_id: dealId,
      duration_seconds: finalDurationSeconds,
      body: notes,
      recipient_contact: phoneNumber || undefined,
    })

    if (!result) {
      setError('Failed to save call log. Please try again.')
      setSaving(false)
      return
    }

    setSaving(false)
    onSaved()
    onClose()
  }

  const durationPresets = [2, 5, 10, 15, 30]

  // ---- Mobile Pre-Call Screen ----
  if (isMobile && mobileStep === 'pre-call') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Log Call</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>
          <div className="p-5 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto">
              <Phone size={28} />
            </div>
            <div>
              <p className="text-gray-600">Ready to call</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                {contactName || phoneNumber || 'Contact'}
              </p>
              {phoneNumber && contactName && (
                <p className="text-sm text-gray-500 mt-0.5">{phoneNumber}</p>
              )}
            </div>
            <button
              onClick={handleCallNow}
              disabled={!phoneNumber}
              className="btn btn-primary w-full py-3 text-base"
            >
              <Phone size={18} className="mr-2" />
              Call Now
            </button>
            <button
              onClick={handleSkipToLog}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Skip — just log a call
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ---- Desktop / Mobile Post-Call ----
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Log Call</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {/* Phone display */}
          {phoneNumber && (
            <div className="flex items-center gap-3 text-sm text-gray-600 bg-gray-50 rounded-lg px-4 py-2.5">
              <Phone size={16} className="text-gray-400" />
              <span>{contactName ? `${contactName} — ` : ''}{phoneNumber}</span>
            </div>
          )}

          {/* Calculated duration indicator (mobile post-call) */}
          {isMobile && mobileStep === 'post-call' && calculatedDuration > 0 && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-4 py-2.5">
              <Clock size={16} />
              <span>Estimated duration: {formatDuration(calculatedDuration)}</span>
            </div>
          )}

          {/* Duration selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Duration</label>
            {!showCustom ? (
              <div className="flex flex-wrap gap-2">
                {durationPresets.map((mins) => (
                  <button
                    key={mins}
                    onClick={() => setDurationMinutes(mins)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      durationMinutes === mins && !showCustom
                        ? 'bg-primary-50 border-primary-300 text-primary-700'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
                <button
                  onClick={() => setShowCustom(true)}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:border-gray-300"
                >
                  Custom
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="480"
                  value={customDuration}
                  onChange={(e) => setCustomDuration(e.target.value)}
                  placeholder="Minutes"
                  className="input w-32"
                  autoFocus
                />
                <span className="text-sm text-gray-500">minutes</span>
                <button
                  onClick={() => { setShowCustom(false); setCustomDuration('') }}
                  className="text-sm text-gray-400 hover:text-gray-600 ml-2"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What was discussed?"
              rows={3}
              className="input resize-none"
            />
          </div>

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
            {saving ? 'Saving...' : 'Save Call'}
          </button>
        </div>
      </div>
    </div>
  )
}
