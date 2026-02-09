'use client'

import { useState } from 'react'
import { Send, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'

interface IntakeFormProps {
  org: {
    id: string
    name: string
    logo_url: string | null
    industry_type: string | null
  }
  slug: string
}

const BUDGET_OPTIONS = [
  'Under $500',
  '$500 - $1,000',
  '$1,000 - $5,000',
  '$5,000 - $10,000',
  '$10,000+',
  'Not sure',
]

export default function IntakeForm({ org, slug }: IntakeFormProps) {
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
    budget: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/intake/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Something went wrong')
      }

      setSubmitted(true)
    } catch (err: any) {
      setError(err.message || 'Failed to submit. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Success state
  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          {/* Branding */}
          <div className="mb-8">
            {org.logo_url ? (
              <img
                src={org.logo_url}
                alt={org.name}
                className="h-12 mx-auto mb-4 object-contain"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-teal-500 flex items-center justify-center text-white text-xl font-bold mx-auto mb-4">
                {org.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} className="text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Thanks! We&apos;ll be in touch.
            </h2>
            <p className="text-gray-500 text-sm">
              Your inquiry has been submitted to {org.name}. We&apos;ll review it and get back to you shortly.
            </p>
          </div>

          <p className="text-xs text-gray-400 mt-6">
            Powered by <span className="font-medium text-gray-500">Cadence</span>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Branding Header */}
        <div className="text-center mb-6">
          {org.logo_url ? (
            <img
              src={org.logo_url}
              alt={org.name}
              className="h-12 mx-auto mb-3 object-contain"
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-teal-500 flex items-center justify-center text-white text-xl font-bold mx-auto mb-3">
              {org.name.charAt(0).toUpperCase()}
            </div>
          )}
          <h1 className="text-2xl font-bold text-gray-900">{org.name}</h1>
          <p className="text-gray-500 text-sm mt-1">
            Tell us about your project and we&apos;ll be in touch
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 space-y-5">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle size={16} className="flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Your full name"
              disabled={submitting}
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Email <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="you@example.com"
              disabled={submitting}
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Phone <span className="text-gray-400 text-xs font-normal">(optional)</span>
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              placeholder="+1 (555) 123-4567"
              disabled={submitting}
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>

          {/* Budget */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Budget <span className="text-red-400">*</span>
            </label>
            <select
              required
              value={formData.budget}
              onChange={(e) => updateField('budget', e.target.value)}
              disabled={submitting}
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
            >
              <option value="">Select your budget range...</option>
              {BUDGET_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Message <span className="text-red-400">*</span>
            </label>
            <textarea
              required
              value={formData.message}
              onChange={(e) => updateField('message', e.target.value)}
              placeholder="Tell us about your project, goals, timeline, or anything else we should know..."
              rows={4}
              disabled={submitting}
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-colors resize-none disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-medium py-2.5 px-4 text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send size={16} />
                Submit Inquiry
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="text-xs text-gray-400 text-center mt-6">
          Powered by <span className="font-medium text-gray-500">Cadence</span>
        </p>
      </div>
    </div>
  )
}
