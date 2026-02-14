'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { User, Building2, Users, CreditCard, Bell, Shield, Palette, Check, Loader2, AlertCircle, Lock, ArrowUpRight, Crown, X, Trash2, ShieldCheck, Eye, RefreshCw, CheckSquare as CheckSquareIcon, FileText, Copy, ExternalLink, Upload, ImageIcon } from 'lucide-react'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import { getPermissions, UserRole } from '@/lib/permissions'
import { VERTICALS, VERTICAL_CATEGORIES, VerticalId, getVertical, PROSPECTOR_MODES, type ProspectorConfig } from '@/lib/verticals'
import { TRADE_PROFILES } from '@/lib/radar/trade-profiles'
import { PHOTO_NICHE_PROFILES } from '@/lib/radar/photo-niches'

type SettingsTab = 'profile' | 'organization' | 'lead_form' | 'team' | 'billing' | 'notifications' | 'security' | 'appearance'
type AccentColor = '#E91E8C' | '#3B82F6' | '#10B981' | '#F59E0B' | '#8B5CF6'

interface SubscriptionInfo {
  plan: string
  planName: string
  status: string
  currentUserCount: number
  pendingInvites: number
  maxUsers: number
  remainingSeats: number
  extraSeats: number
  canAddUsers: boolean
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  isTrialing: boolean
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')
  const [userRole, setUserRole] = useState<UserRole>('member')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const checkRole = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single()
        if (profile?.role) {
          setUserRole(profile.role as UserRole)
        }
      }
      setLoading(false)
    }
    checkRole()
  }, [])

  const permissions = getPermissions(userRole)

  const allTabs = [
    { id: 'profile' as const, label: 'Profile', icon: User },
    { id: 'organization' as const, label: 'Organization', icon: Building2 },
    { id: 'lead_form' as const, label: 'Lead Form', icon: FileText, adminOnly: true },
    { id: 'team' as const, label: 'Team Members', icon: Users },
    { id: 'billing' as const, label: 'Billing', icon: CreditCard, adminOnly: true },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
    { id: 'security' as const, label: 'Security', icon: Shield },
    { id: 'appearance' as const, label: 'Appearance', icon: Palette },
  ]

  // Filter tabs based on permissions
  const tabs = allTabs.filter(tab => {
    if (tab.adminOnly && !permissions.canAccessBilling) return false
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your account and organization settings</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        {/* Sidebar - Horizontal scroll on mobile, vertical on desktop */}
        <div className="lg:w-56 flex-shrink-0">
          {/* Mobile: Horizontal scrolling tabs */}
          <nav className="flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0 -mx-3 px-3 lg:mx-0 lg:px-0 scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 lg:gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <tab.icon size={18} />
                <span className="hidden sm:inline lg:inline">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {activeTab === 'profile' && <ProfileSettings />}
          {activeTab === 'organization' && <OrganizationSettings canEdit={permissions.canEditOrganization} />}
          {activeTab === 'lead_form' && <LeadFormSettings />}
          {activeTab === 'team' && <TeamSettings />}
          {activeTab === 'billing' && <BillingSettings />}
          {activeTab === 'notifications' && <NotificationSettings />}
          {activeTab === 'security' && <SecuritySettings />}
          {activeTab === 'appearance' && <AppearanceSettings />}
        </div>
      </div>
    </div>
  )
}

function ProfileSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    title: '',
    phone: '',
  })
  const [initials, setInitials] = useState('U')
  const supabase = createClient()

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    setLoading(true)
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('users')
      .select('full_name, email, title, phone')
      .eq('id', user.id)
      .single()

    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        email: profile.email || user.email || '',
        title: profile.title || '',
        phone: profile.phone || '',
      })
      
      if (profile.full_name) {
        const parts = profile.full_name.split(' ')
        if (parts.length >= 2) {
          setInitials(parts[0][0] + parts[parts.length - 1][0])
        } else if (parts.length === 1) {
          setInitials(parts[0][0])
        }
      }
    } else {
      setFormData(prev => ({ ...prev, email: user.email || '' }))
    }

    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(false)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Not authenticated')
      setSaving(false)
      return
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({
        full_name: formData.full_name,
        title: formData.title,
        phone: formData.phone,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      setError(updateError.message)
    } else {
      setSuccess(true)
      if (formData.full_name) {
        const parts = formData.full_name.split(' ')
        if (parts.length >= 2) {
          setInitials(parts[0][0] + parts[parts.length - 1][0])
        } else if (parts.length === 1) {
          setInitials(parts[0][0])
        }
      }
      setTimeout(() => setSuccess(false), 3000)
    }

    setSaving(false)
  }

  if (loading) {
    return (
      <div className="card p-6">
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="md" />
        </div>
      </div>
    )
  }

  return (
    <div className="card p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Profile Settings</h2>
        <p className="text-sm text-gray-500">Update your personal information</p>
      </div>

      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
          <Check size={16} />
          Profile updated successfully!
        </div>
      )}

      <div className="flex items-center gap-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cadence-pink to-cadence-teal flex items-center justify-center text-white text-2xl font-semibold uppercase">
          {initials}
        </div>
        <div>
          <p className="text-sm text-gray-500 mb-2">Profile photo coming soon</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
        <input
          type="text"
          value={formData.full_name}
          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
          placeholder="John Smith"
          className="input"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
        <input
          type="email"
          value={formData.email}
          disabled
          className="input bg-gray-50 text-gray-500 cursor-not-allowed"
        />
        <p className="text-xs text-gray-400 mt-1">Email cannot be changed here. Contact support if needed.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Job Title</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="e.g., Sales Manager"
          className="input"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
        <input
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          placeholder="+1 (555) 123-4567"
          className="input"
        />
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="btn btn-primary">
          {saving ? (
            <>
              <Loader2 size={16} className="animate-spin mr-2" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </button>
      </div>
    </div>
  )
}

function OrganizationSettings({ canEdit = true }: { canEdit?: boolean }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    industry: '',
    size: '',
    website: '',
    phone: '',
    address: '',
  })
  const supabase = createClient()

  useEffect(() => {
    loadOrganization()
  }, [])

  const loadOrganization = async () => {
    setLoading(true)
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (!userProfile?.org_id) {
      setLoading(false)
      return
    }

    setOrgId(userProfile.org_id)

    const { data: org } = await supabase
      .from('orgs')
      .select('*')
      .eq('id', userProfile.org_id)
      .single()

    if (org) {
      setFormData({
        name: org.name || '',
        industry: org.industry || '',
        size: org.size || '',
        website: org.website || '',
        phone: org.phone || '',
        address: org.address || '',
      })
      setLogoUrl(org.logo_url || null)
    }

    setLoading(false)
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !orgId) return

    // Validate file
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Logo must be under 2MB')
      return
    }

    setUploadingLogo(true)
    setError(null)

    try {
      const fileExt = file.name.split('.').pop()
      const filePath = `logos/${orgId}/logo.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('org-assets')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('org-assets')
        .getPublicUrl(filePath)

      // Add cache-busting param
      const logoUrlWithCache = `${publicUrl}?t=${Date.now()}`

      const { error: updateError } = await supabase
        .from('orgs')
        .update({ logo_url: logoUrlWithCache })
        .eq('id', orgId)

      if (updateError) throw updateError

      setLogoUrl(logoUrlWithCache)
    } catch (err: any) {
      console.error('Logo upload error:', err)
      setError(err.message || 'Failed to upload logo')
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleRemoveLogo = async () => {
    if (!orgId) return
    setUploadingLogo(true)
    setError(null)

    try {
      const { error: updateError } = await supabase
        .from('orgs')
        .update({ logo_url: null })
        .eq('id', orgId)

      if (updateError) throw updateError
      setLogoUrl(null)
    } catch (err: any) {
      setError(err.message || 'Failed to remove logo')
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleSave = async () => {
    if (!orgId) return

    setSaving(true)
    setError(null)
    setSuccess(false)

    const { error: updateError } = await supabase
      .from('orgs')
      .update({
        name: formData.name,
        industry: formData.industry || null,
        size: formData.size || null,
        website: formData.website || null,
        phone: formData.phone || null,
        address: formData.address || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', orgId)

    if (updateError) {
      setError(updateError.message)
    } else {
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    }

    setSaving(false)
  }

  if (loading) {
    return (
      <div className="card p-6">
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="md" />
        </div>
      </div>
    )
  }

  // Industry options for display
  const industryOptions: Record<string, string> = {
    agency: 'Agency / Creative Services',
    consulting: 'Consulting / Professional Services',
    recruiting: 'Recruiting / Staffing',
    technology: 'Technology / Software',
    real_estate: 'Real Estate',
    healthcare: 'Healthcare',
    finance: 'Finance / Insurance',
    manufacturing: 'Manufacturing',
    retail: 'Retail / E-commerce',
    education: 'Education',
    nonprofit: 'Non-Profit',
    other: 'Other',
  }

  return (
    <div className="card p-6 space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Organization Settings</h2>
            <p className="text-sm text-gray-500">
              {canEdit ? 'Manage your organization details' : 'View your organization details'}
            </p>
          </div>
          {!canEdit && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
              <Eye size={16} className="text-amber-600" />
              <span className="text-sm text-amber-700 font-medium">View Only</span>
            </div>
          )}
        </div>
      </div>

      {error && canEdit && (
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
          <Check size={16} />
          Organization updated successfully!
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Organization Name {canEdit && '*'}</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => canEdit && setFormData({ ...formData, name: e.target.value })}
          placeholder="Acme Inc"
          disabled={!canEdit}
          className={`input ${!canEdit ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : ''}`}
        />
      </div>

      {/* Logo Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Organization Logo</label>
        <div className="flex items-center gap-4">
          {logoUrl ? (
            <div className="relative">
              <img
                src={logoUrl}
                alt="Organization logo"
                className="h-16 w-auto max-w-[200px] object-contain rounded-lg border border-gray-200 p-1"
              />
              {canEdit && (
                <button
                  onClick={handleRemoveLogo}
                  disabled={uploadingLogo}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                  title="Remove logo"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ) : (
            <div className="h-16 w-16 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
              <ImageIcon size={24} className="text-gray-400" />
            </div>
          )}
          {canEdit && (
            <div>
              <label className="btn btn-secondary text-sm cursor-pointer">
                {uploadingLogo ? (
                  <>
                    <Loader2 size={14} className="animate-spin mr-1.5" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload size={14} className="mr-1.5" />
                    {logoUrl ? 'Change Logo' : 'Upload Logo'}
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={uploadingLogo}
                  className="sr-only"
                />
              </label>
              <p className="text-xs text-gray-400 mt-1">PNG, JPG, or SVG. Max 2MB.</p>
            </div>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-2">Your logo appears on your public lead intake form.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Industry</label>
          {canEdit ? (
            <select
              value={formData.industry}
              onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
              className="input"
            >
              <option value="">Select industry...</option>
              <option value="agency">Agency / Creative Services</option>
              <option value="consulting">Consulting / Professional Services</option>
              <option value="recruiting">Recruiting / Staffing</option>
              <option value="technology">Technology / Software</option>
              <option value="real_estate">Real Estate</option>
              <option value="healthcare">Healthcare</option>
              <option value="finance">Finance / Insurance</option>
              <option value="manufacturing">Manufacturing</option>
              <option value="retail">Retail / E-commerce</option>
              <option value="education">Education</option>
              <option value="nonprofit">Non-Profit</option>
              <option value="other">Other</option>
            </select>
          ) : (
            <input
              type="text"
              value={industryOptions[formData.industry] || formData.industry || '—'}
              disabled
              className="input bg-gray-50 text-gray-600 cursor-not-allowed"
            />
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Company Size</label>
          {canEdit ? (
            <select
              value={formData.size}
              onChange={(e) => setFormData({ ...formData, size: e.target.value })}
              className="input"
            >
              <option value="">Select size...</option>
              <option value="1-10">1-10 employees</option>
              <option value="11-50">11-50 employees</option>
              <option value="51-200">51-200 employees</option>
              <option value="201-500">201-500 employees</option>
              <option value="500+">500+ employees</option>
            </select>
          ) : (
            <input
              type="text"
              value={formData.size ? `${formData.size} employees` : '—'}
              disabled
              className="input bg-gray-50 text-gray-600 cursor-not-allowed"
            />
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Website</label>
        <input
          type="url"
          value={formData.website}
          onChange={(e) => canEdit && setFormData({ ...formData, website: e.target.value })}
          placeholder={canEdit ? "https://yourcompany.com" : "—"}
          disabled={!canEdit}
          className={`input ${!canEdit ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : ''}`}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
        <input
          type="tel"
          value={formData.phone}
          onChange={(e) => canEdit && setFormData({ ...formData, phone: e.target.value })}
          placeholder={canEdit ? "+1 (555) 123-4567" : "—"}
          disabled={!canEdit}
          className={`input ${!canEdit ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : ''}`}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
        <input
          type="text"
          value={formData.address}
          onChange={(e) => canEdit && setFormData({ ...formData, address: e.target.value })}
          placeholder={canEdit ? "123 Main St, City, State" : "—"}
          disabled={!canEdit}
          className={`input ${!canEdit ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : ''}`}
        />
      </div>

      {canEdit && (
        <div className="flex justify-end">
          <button onClick={handleSave} disabled={saving || !formData.name} className="btn btn-primary">
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin mr-2" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      )}

      {!canEdit && (
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-600">
            <Lock size={14} className="inline mr-1.5" />
            Only administrators can edit organization settings. Contact your admin to make changes.
          </p>
        </div>
      )}

      {/* Industry Type Section */}
      {canEdit && <IndustryTypeSettings />}
      {canEdit && <ProspectorSettings />}
    </div>
  )
}

function IndustryTypeSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [currentIndustryType, setCurrentIndustryType] = useState<VerticalId>('default')
  const [selectedIndustryType, setSelectedIndustryType] = useState<VerticalId>('default')
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    loadIndustryType()
  }, [])

  const loadIndustryType = async () => {
    setLoading(true)
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (!userProfile?.org_id) {
      setLoading(false)
      return
    }

    setOrgId(userProfile.org_id)

    const { data: org } = await supabase
      .from('orgs')
      .select('industry_type')
      .eq('id', userProfile.org_id)
      .single()

    if (org?.industry_type) {
      setCurrentIndustryType(org.industry_type as VerticalId)
      setSelectedIndustryType(org.industry_type as VerticalId)
    }

    setLoading(false)
  }

  const handleResetPipeline = async () => {
    if (!orgId) return

    setResetting(true)
    setError(null)
    setSuccess(false)

    try {
      // Update org industry_type
      const { error: orgError } = await supabase
        .from('orgs')
        .update({ industry_type: selectedIndustryType })
        .eq('id', orgId)

      if (orgError) throw orgError

      // Get the default pipeline for this org
      const { data: pipeline } = await supabase
        .from('pipelines')
        .select('id')
        .eq('org_id', orgId)
        .eq('is_default', true)
        .single()

      if (!pipeline) {
        throw new Error('No default pipeline found')
      }

      // Delete existing stages (this will cascade to any related data)
      const { error: deleteError } = await supabase
        .from('pipeline_stages')
        .delete()
        .eq('pipeline_id', pipeline.id)

      if (deleteError) throw deleteError

      // Get the new stages from vertical config
      const industryConfig = getVertical(selectedIndustryType)
      
      // Insert new stages (pipeline_stages doesn't have org_id, only pipeline_id)
      const newStages = industryConfig.defaultPipelineStages.map(stage => ({
        ...stage,
        pipeline_id: pipeline.id,
      }))

      const { error: insertError } = await supabase
        .from('pipeline_stages')
        .insert(newStages)

      if (insertError) throw insertError

      // Update pipeline name based on industry
      await supabase
        .from('pipelines')
        .update({ name: industryConfig.terminology.pipeline })
        .eq('id', pipeline.id)

      setCurrentIndustryType(selectedIndustryType)
      setSuccess(true)
      setShowResetConfirm(false)
      
      // Refresh page to reload sidebar with new terminology
      setTimeout(() => {
        router.refresh()
        window.location.reload()
      }, 1500)

    } catch (err: any) {
      console.error('Reset pipeline error:', err)
      setError(err.message || 'Failed to reset pipeline')
    } finally {
      setResetting(false)
    }
  }

  if (loading) {
    return (
      <div className="border-t border-gray-200 pt-6 mt-6">
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner size="sm" />
        </div>
      </div>
    )
  }

  const industryConfig = getVertical(selectedIndustryType)

  return (
    <div className="border-t border-gray-200 pt-6 mt-6">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-gray-900">Industry Template</h3>
        <p className="text-sm text-gray-500 mt-1">
          Change your pipeline stages and terminology to match your industry
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
          <Check size={16} />
          Pipeline reset successfully! Reloading...
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Industry Type</label>
          <select
            value={selectedIndustryType}
            onChange={(e) => setSelectedIndustryType(e.target.value as VerticalId)}
            className="input max-w-xs"
            disabled={resetting}
          >
            {Object.entries(VERTICAL_CATEGORIES).map(([catId, cat]) => (
              <optgroup key={catId} label={cat.label}>
                {cat.verticals.map((vId) => (
                  <option key={vId} value={vId}>
                    {VERTICALS[vId].label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1.5">{industryConfig.description}</p>
        </div>

        {/* Preview stages */}
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm font-medium text-gray-700 mb-3">Pipeline stages for {industryConfig.label}:</p>
          <div className="flex flex-wrap gap-2">
            {industryConfig.defaultPipelineStages.map((stage, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium"
                style={{ 
                  backgroundColor: stage.color + '20',
                  color: stage.color,
                  border: `1px solid ${stage.color}40`
                }}
              >
                {stage.name}
                {stage.is_won && ' ✓'}
                {stage.is_lost && ' ✗'}
              </span>
            ))}
          </div>
        </div>

        {/* Task templates preview */}
        {industryConfig.defaultTaskTemplates && industryConfig.defaultTaskTemplates.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Suggested task templates:</p>
            <div className="space-y-1.5">
              {industryConfig.defaultTaskTemplates.map((task, index) => (
                <div key={index} className="flex items-start gap-2 text-xs">
                  <CheckSquareIcon size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-gray-700">{task.name}</span>
                    <span className="text-gray-500 ml-1">— {task.description}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Terminology preview */}
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Terminology:</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <div><span className="text-gray-500">Deals →</span> <span className="font-medium">{industryConfig.terminology.deals}</span></div>
            <div><span className="text-gray-500">Contacts →</span> <span className="font-medium">{industryConfig.terminology.contacts}</span></div>
            <div><span className="text-gray-500">Tasks →</span> <span className="font-medium">{industryConfig.terminology.tasks}</span></div>
            <div><span className="text-gray-500">Reports →</span> <span className="font-medium">{industryConfig.terminology.reports}</span></div>
            <div><span className="text-gray-500">Close Date →</span> <span className="font-medium">{industryConfig.terminology.closeDate}</span></div>
            <div><span className="text-gray-500">Amount →</span> <span className="font-medium">{industryConfig.terminology.dealAmount}</span></div>
          </div>
        </div>

        {selectedIndustryType !== currentIndustryType && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <AlertCircle size={14} className="inline mr-1.5" />
              <strong>Warning:</strong> Resetting your pipeline will delete all existing pipeline stages. Your deals will need to be reassigned to new stages. This action cannot be undone.
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => setShowResetConfirm(true)}
            disabled={resetting}
            className="btn btn-primary disabled:opacity-50"
          >
            <RefreshCw size={16} className="mr-2" />
            {selectedIndustryType === currentIndustryType ? 'Reset Pipeline Stages' : `Reset Pipeline to ${industryConfig.label}`}
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm Pipeline Reset</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to reset your pipeline to <strong>{industryConfig.label}</strong>? 
              This will:
            </p>
            <ul className="text-sm text-gray-600 list-disc list-inside mb-4 space-y-1">
              <li>Delete all existing pipeline stages</li>
              <li>Create new stages: {industryConfig.defaultPipelineStages.map(s => s.name).join(', ')}</li>
              <li>Update terminology throughout the app</li>
              <li>Existing deals will need to be reassigned to new stages</li>
            </ul>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="btn btn-secondary"
                disabled={resetting}
              >
                Cancel
              </button>
              <button
                onClick={handleResetPipeline}
                className="btn btn-primary bg-red-600 hover:bg-red-700"
                disabled={resetting}
              >
                {resetting ? (
                  <>
                    <Loader2 size={16} className="animate-spin mr-2" />
                    Resetting...
                  </>
                ) : (
                  'Yes, Reset Pipeline'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ProspectorSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [industryType, setIndustryType] = useState<string>('default')
  const [prospectorEnabled, setProspectorEnabled] = useState<boolean | null>(null)
  const [radarMode, setRadarMode] = useState<string>('residential_service')
  const [trade, setTrade] = useState<string | null>(null)
  const [defaultRadius, setDefaultRadius] = useState<number>(30)
  const [defaultSignals, setDefaultSignals] = useState<Record<string, boolean>>({})
  const [hasCustomConfig, setHasCustomConfig] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadProspectorSettings()
  }, [])

  const loadProspectorSettings = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data: userProfile } = await supabase
      .from('users')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (!userProfile?.org_id) { setLoading(false); return }
    setOrgId(userProfile.org_id)

    const { data: org } = await supabase
      .from('orgs')
      .select('industry_type, prospector_enabled, prospector_config')
      .eq('id', userProfile.org_id)
      .single()

    if (org) {
      setIndustryType(org.industry_type || 'default')
      setProspectorEnabled(org.prospector_enabled)

      if (org.prospector_config) {
        const config = org.prospector_config as ProspectorConfig
        setRadarMode(config.radar_mode || 'residential_service')
        setTrade(config.trade || null)
        setDefaultRadius(config.default_radius_miles || 30)
        setDefaultSignals(config.default_signals || {})
        setHasCustomConfig(true)
      } else {
        // Set defaults from the vertical's radar config
        const vertical = getVertical(org.industry_type || 'default')
        if (vertical.radar) {
          setRadarMode(vertical.radar.radarMode)
          setTrade(vertical.radar.defaultTrade)
          setDefaultRadius(vertical.radar.maxRadiusMiles)
          const signals: Record<string, boolean> = {}
          vertical.radar.signals.forEach(s => { signals[s.id] = s.defaultOn })
          setDefaultSignals(signals)
        }
      }
    }
    setLoading(false)
  }

  const handleSave = async () => {
    if (!orgId) return
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const prospectorConfig: ProspectorConfig = {
        radar_mode: radarMode,
        trade,
        default_radius_miles: defaultRadius,
        default_signals: defaultSignals,
      }

      const { error: updateError } = await supabase
        .from('orgs')
        .update({
          prospector_enabled: prospectorEnabled,
          prospector_config: prospectorConfig,
        })
        .eq('id', orgId)

      if (updateError) throw updateError

      setHasCustomConfig(true)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      console.error('Save prospector settings error:', err)
      setError(err.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  // Determine the effective enabled state
  const verticalDefault = getVertical(industryType).features.showProspector
  const isEnabled = prospectorEnabled !== null ? prospectorEnabled : verticalDefault

  // Get available trades/niches based on radar mode
  const tradeOptions = radarMode === 'residential_service'
    ? Object.values(TRADE_PROFILES).map(t => ({ id: t.id, label: t.label }))
    : radarMode === 'photographer'
    ? Object.values(PHOTO_NICHE_PROFILES).map(n => ({ id: n.id, label: n.label }))
    : []

  // Get signals for the selected radar mode
  const modeVertical = Object.values(VERTICALS).find(v => v.radar?.radarMode === radarMode)
  const availableSignals = modeVertical?.radar?.signals || []

  if (loading) {
    return (
      <div className="border-t border-gray-200 pt-6 mt-6">
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner size="sm" />
        </div>
      </div>
    )
  }

  return (
    <div className="border-t border-gray-200 pt-6 mt-6">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-gray-900">Prospector / Lead Finder</h3>
        <p className="text-sm text-gray-500 mt-1">
          Configure the Prospector map tool for finding new leads in your area
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
          <Check size={16} />
          Prospector settings saved!
        </div>
      )}

      <div className="space-y-4">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
          <div>
            <p className="text-sm font-medium text-gray-900">Enable Prospector</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {verticalDefault
                ? 'Enabled by default for your industry'
                : 'Not included by default for your industry — enable to access the lead finder map'
              }
            </p>
          </div>
          <button
            onClick={() => setProspectorEnabled(isEnabled ? false : true)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              isEnabled ? 'bg-primary-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                isEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {isEnabled && (
          <>
            {/* Prospecting Mode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Prospecting Mode</label>
              <select
                value={radarMode}
                onChange={(e) => {
                  setRadarMode(e.target.value)
                  setTrade(null)
                  // Reset signals to the new mode's defaults
                  const newModeVertical = Object.values(VERTICALS).find(v => v.radar?.radarMode === e.target.value)
                  if (newModeVertical?.radar) {
                    const signals: Record<string, boolean> = {}
                    newModeVertical.radar.signals.forEach(s => { signals[s.id] = s.defaultOn })
                    setDefaultSignals(signals)
                    setDefaultRadius(newModeVertical.radar.maxRadiusMiles)
                  }
                }}
                className="input max-w-sm"
              >
                {PROSPECTOR_MODES.map(mode => (
                  <option key={mode.id} value={mode.id}>{mode.label}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {PROSPECTOR_MODES.find(m => m.id === radarMode)?.description}
              </p>
            </div>

            {/* Trade/Niche Sub-selector */}
            {tradeOptions.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {radarMode === 'photographer' ? 'Photography Niche' : 'Trade Specialty'}
                </label>
                <select
                  value={trade || ''}
                  onChange={(e) => setTrade(e.target.value || null)}
                  className="input max-w-sm"
                >
                  <option value="">All / General</option>
                  {tradeOptions.map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Default Radius */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Default Search Radius: {defaultRadius} miles
              </label>
              <input
                type="range"
                min={5}
                max={radarMode === 'residential_service' ? 50 : 30}
                value={defaultRadius}
                onChange={(e) => setDefaultRadius(Number(e.target.value))}
                className="w-full max-w-sm"
              />
              <div className="flex justify-between text-xs text-gray-400 max-w-sm">
                <span>5 mi</span>
                <span>{radarMode === 'residential_service' ? '50' : '30'} mi</span>
              </div>
            </div>

            {/* Default Signals */}
            {availableSignals.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Default Signal Filters</label>
                <div className="space-y-2">
                  {availableSignals.map(signal => (
                    <label key={signal.id} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={defaultSignals[signal.id] ?? signal.defaultOn}
                        onChange={(e) => setDefaultSignals(prev => ({ ...prev, [signal.id]: e.target.checked }))}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: signal.color }}
                        />
                        <span className="text-sm text-gray-700">{signal.label}</span>
                        <span className="text-xs text-gray-400">— {signal.description}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn btn-primary"
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  'Save Prospector Settings'
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function LeadFormSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [slug, setSlug] = useState('')
  const [savedSlug, setSavedSlug] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadFormSettings()
  }, [])

  const loadFormSettings = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data: profile } = await supabase
      .from('users')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (!profile?.org_id) { setLoading(false); return }
    setOrgId(profile.org_id)

    const { data: org } = await supabase
      .from('orgs')
      .select('intake_form_slug')
      .eq('id', profile.org_id)
      .single()

    if (org?.intake_form_slug) {
      setSlug(org.intake_form_slug)
      setSavedSlug(org.intake_form_slug)
    }
    setLoading(false)
  }

  const handleSave = async () => {
    if (!orgId || !slug.trim()) return

    // Validate slug format
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
    const cleanSlug = slug.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

    if (!slugRegex.test(cleanSlug)) {
      setError('Slug can only contain lowercase letters, numbers, and hyphens')
      return
    }

    if (cleanSlug.length < 3) {
      setError('Slug must be at least 3 characters')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(false)

    const { error: updateError } = await supabase
      .from('orgs')
      .update({ intake_form_slug: cleanSlug })
      .eq('id', orgId)

    if (updateError) {
      if (updateError.message.includes('unique') || updateError.message.includes('duplicate')) {
        setError('This URL slug is already taken. Please choose another.')
      } else {
        setError(updateError.message)
      }
    } else {
      setSlug(cleanSlug)
      setSavedSlug(cleanSlug)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    }
    setSaving(false)
  }

  const handleDisable = async () => {
    if (!orgId) return
    setSaving(true)
    setError(null)

    const { error: updateError } = await supabase
      .from('orgs')
      .update({ intake_form_slug: null })
      .eq('id', orgId)

    if (updateError) {
      setError(updateError.message)
    } else {
      setSlug('')
      setSavedSlug(null)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    }
    setSaving(false)
  }

  const formUrl = savedSlug ? `${typeof window !== 'undefined' ? window.location.origin : ''}/f/${savedSlug}` : null

  const copyUrl = () => {
    if (formUrl) {
      navigator.clipboard.writeText(formUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) {
    return (
      <div className="card p-6">
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="md" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Main Settings Card */}
      <div className="card p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Lead Intake Form</h2>
          <p className="text-sm text-gray-500 mt-1">
            Create a public form where potential clients can submit inquiries directly to your CRM
          </p>
        </div>

        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
            <Check size={16} />
            Settings saved!
          </div>
        )}

        {/* Slug Configuration */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Form URL</label>
          <div className="flex gap-2">
            <div className="flex items-center bg-gray-100 border border-gray-300 rounded-l-lg px-3 text-sm text-gray-500 border-r-0 whitespace-nowrap">
              {typeof window !== 'undefined' ? window.location.origin : ''}/f/
            </div>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))}
              placeholder="your-business-name"
              className="input rounded-l-none flex-1"
              disabled={saving}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1.5">Lowercase letters, numbers, and hyphens only. Minimum 3 characters.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving || !slug.trim() || slug.trim().length < 3}
            className="btn btn-primary"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin mr-2" />
                Saving...
              </>
            ) : (
              savedSlug ? 'Update URL' : 'Enable Form'
            )}
          </button>
          {savedSlug && (
            <button
              onClick={handleDisable}
              disabled={saving}
              className="btn btn-secondary text-red-600 hover:text-red-700"
            >
              Disable Form
            </button>
          )}
        </div>
      </div>

      {/* Live Link Card */}
      {formUrl && (
        <div className="card p-6 space-y-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Your Form is Live</h3>
            <p className="text-sm text-gray-500">Share this link with potential clients</p>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={formUrl}
              readOnly
              className="input flex-1 font-mono text-sm bg-gray-50"
            />
            <button onClick={copyUrl} className="btn btn-secondary whitespace-nowrap">
              {copied ? (
                <><Check size={16} className="mr-1.5" /> Copied!</>
              ) : (
                <><Copy size={16} className="mr-1.5" /> Copy Link</>
              )}
            </button>
            <a
              href={formUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              title="Preview form"
            >
              <ExternalLink size={16} />
            </a>
          </div>
        </div>
      )}

      {/* How It Works Card */}
      <div className="card p-6 space-y-4">
        <h3 className="text-base font-semibold text-gray-900">How It Works</h3>
        <div className="space-y-3">
          {[
            {
              step: '1',
              title: 'Share your form link',
              desc: 'Add the link to your website, email signature, social media bio, or send it directly to potential clients.',
            },
            {
              step: '2',
              title: 'Clients submit inquiries',
              desc: 'They fill out their name, email, phone, budget, and a message describing their project.',
            },
            {
              step: '3',
              title: 'Records are created automatically',
              desc: 'Each submission creates a new contact, a deal in your first pipeline stage, and a follow-up task due within 24 hours.',
            },
            {
              step: '4',
              title: 'Follow up and close',
              desc: 'You get a high-priority task to follow up. Move the deal through your pipeline as the project progresses.',
            },
          ].map((item) => (
            <div key={item.step} className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                {item.step}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{item.title}</p>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Usage Tips Card */}
      <div className="card p-6 space-y-3">
        <h3 className="text-base font-semibold text-gray-900">Where to Share Your Form</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
            <span className="text-lg">🌐</span>
            <div>
              <p className="font-medium text-gray-900">Your Website</p>
              <p className="text-gray-500">Add a "Work With Me" or "Get a Quote" button linking to your form</p>
            </div>
          </div>
          <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
            <span className="text-lg">✉️</span>
            <div>
              <p className="font-medium text-gray-900">Email Signature</p>
              <p className="text-gray-500">Include the link in your email signature for passive lead capture</p>
            </div>
          </div>
          <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
            <span className="text-lg">📱</span>
            <div>
              <p className="font-medium text-gray-900">Social Media</p>
              <p className="text-gray-500">Add it to your Instagram bio, LinkedIn profile, or Twitter</p>
            </div>
          </div>
          <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
            <span className="text-lg">💬</span>
            <div>
              <p className="font-medium text-gray-900">Direct Messages</p>
              <p className="text-gray-500">Send the link directly when someone asks about your services</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface TeamMember {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'member'
  created_at: string
}

function TeamSettings() {
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  const [editRole, setEditRole] = useState<'admin' | 'member'>('member')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member')
  const [inviting, setInviting] = useState(false)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editError, setEditError] = useState<string | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null)
  const [isLimitError, setIsLimitError] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchData()
    getCurrentUser()
  }, [])

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setCurrentUserId(user.id)
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()
      if (profile) {
        setCurrentUserRole(profile.role)
      }
    }
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch team members
      const membersRes = await fetch('/api/team/members')
      if (membersRes.ok) {
        const data = await membersRes.json()
        setTeamMembers(data.members || [])
      }

      // Fetch subscription info
      const subRes = await fetch('/api/subscription')
      if (subRes.ok) {
        const subData = await subRes.json()
        setSubscription(subData)
      }
    } catch (err) {
      console.error('Failed to fetch data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviting(true)
    setError(null)
    setIsLimitError(false)

    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to create invitation')
        setIsLimitError(data.code === 'USER_LIMIT_REACHED')
        setInviting(false)
        return
      }

      setInviteUrl(data.inviteUrl)
      // Refresh subscription data to update counts
      const subRes = await fetch('/api/subscription')
      if (subRes.ok) {
        const subData = await subRes.json()
        setSubscription(subData)
      }
      setInviting(false)
    } catch (err) {
      console.error('Invite error:', err)
      setError('An unexpected error occurred')
      setInviting(false)
    }
  }

  const copyInviteUrl = () => {
    if (inviteUrl) {
      navigator.clipboard.writeText(inviteUrl)
      alert('Invite link copied to clipboard!')
    }
  }

  const resetModal = () => {
    setShowInviteModal(false)
    setInviteEmail('')
    setInviteRole('member')
    setInviteUrl(null)
    setError(null)
    setIsLimitError(false)
  }

  const openEditModal = (member: TeamMember) => {
    setSelectedMember(member)
    setEditRole(member.role)
    setEditError(null)
    setShowRemoveConfirm(false)
    setShowEditModal(true)
  }

  const closeEditModal = () => {
    setShowEditModal(false)
    setSelectedMember(null)
    setEditError(null)
    setShowRemoveConfirm(false)
  }

  const handleRoleChange = async () => {
    if (!selectedMember) return
    
    setSaving(true)
    setEditError(null)

    try {
      const res = await fetch('/api/team/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: selectedMember.id,
          role: editRole,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setEditError(data.error || 'Failed to update role')
        setSaving(false)
        return
      }

      // Refresh team members
      await fetchData()
      closeEditModal()
    } catch (err) {
      console.error('Update role error:', err)
      setEditError('An unexpected error occurred')
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveMember = async () => {
    if (!selectedMember) return
    
    setRemoving(true)
    setEditError(null)

    try {
      const res = await fetch(`/api/team/members?memberId=${selectedMember.id}`, {
        method: 'DELETE',
      })

      const data = await res.json()

      if (!res.ok) {
        setEditError(data.error || 'Failed to remove member')
        setRemoving(false)
        return
      }

      // Refresh team members and subscription data
      await fetchData()
      closeEditModal()
    } catch (err) {
      console.error('Remove member error:', err)
      setEditError('An unexpected error occurred')
    } finally {
      setRemoving(false)
    }
  }

  const canInvite = subscription?.canAddUsers ?? true
  const isAdmin = currentUserRole === 'admin'

  return (
    <>
      <div className="space-y-6">
        {/* Plan status banner */}
        {subscription && (
          <div className={`p-4 rounded-xl border ${
            subscription.plan === 'solo' 
              ? 'bg-amber-50 border-amber-200' 
              : 'bg-green-50 border-green-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  subscription.plan === 'solo' ? 'bg-amber-100' : 'bg-green-100'
                }`}>
                  <Crown size={20} className={subscription.plan === 'solo' ? 'text-amber-600' : 'text-green-600'} />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    {subscription.planName} Plan
                    {subscription.isTrialing && <span className="ml-2 text-xs badge badge-primary">Trial</span>}
                  </p>
                  <p className="text-sm text-gray-600">
                    {subscription.currentUserCount} of {subscription.maxUsers} users
                    {subscription.pendingInvites > 0 && (
                      <span className="text-gray-500"> ({subscription.pendingInvites} pending)</span>
                    )}
                  </p>
                </div>
              </div>
              {subscription.plan === 'solo' && (
                <button 
                  onClick={() => router.push('/pricing')}
                  className="btn btn-primary text-sm"
                >
                  Upgrade to add team members
                  <ArrowUpRight size={16} className="ml-1" />
                </button>
              )}
            </div>
            {subscription.remainingSeats > 0 && subscription.plan !== 'solo' && (
              <p className="text-sm text-gray-500 mt-2">
                You can add {subscription.remainingSeats} more team member{subscription.remainingSeats !== 1 ? 's' : ''}.
              </p>
            )}
            {subscription.remainingSeats === 0 && subscription.plan !== 'solo' && (
              <p className="text-sm text-amber-600 mt-2">
                You've reached your user limit. Upgrade your plan to add more team members.
              </p>
            )}
          </div>
        )}

        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Team Members</h2>
              <p className="text-sm text-gray-500">Manage who has access to your organization</p>
            </div>
            <button 
              className={`btn ${canInvite ? 'btn-primary' : 'btn-secondary opacity-50 cursor-not-allowed'}`}
              onClick={() => canInvite && setShowInviteModal(true)}
              disabled={!canInvite}
              title={!canInvite ? 'Upgrade your plan to invite more members' : ''}
            >
              {!canInvite && <Lock size={14} className="mr-1.5" />}
              Invite Member
            </button>
          </div>

          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left text-xs font-medium text-gray-500 uppercase py-3">Name</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase py-3">Role</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase py-3">Status</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-500">
                    <Loader2 size={24} className="animate-spin mx-auto mb-2" />
                    <p className="text-sm">Loading team members...</p>
                  </td>
                </tr>
              ) : teamMembers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-500">
                    <p className="text-sm">No team members found</p>
                  </td>
                </tr>
              ) : (
                teamMembers.map((member, i) => (
                  <tr key={member.id || i}>
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cadence-pink to-cadence-teal flex items-center justify-center text-white text-xs font-medium">
                          {member.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'U'}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{member.full_name || 'Unknown'}</p>
                          <p className="text-sm text-gray-500">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4">
                      <span className="badge badge-primary capitalize">{member.role}</span>
                    </td>
                    <td className="py-4">
                      <span className="badge badge-success">Active</span>
                    </td>
                    <td className="py-4 text-right">
                      {isAdmin && member.id !== currentUserId ? (
                        <button 
                          onClick={() => openEditModal(member)}
                          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                        >
                          Edit
                        </button>
                      ) : member.id === currentUserId ? (
                        <span className="text-sm text-gray-400">You</span>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            {!inviteUrl ? (
              <form onSubmit={handleInvite} className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Invite Team Member</h3>
                
                {error && (
                  <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                    <p>{error}</p>
                    {isLimitError && (
                      <button
                        type="button"
                        onClick={() => {
                          resetModal()
                          router.push('/pricing')
                        }}
                        className="mt-2 text-primary-600 hover:text-primary-700 font-medium underline"
                      >
                        Upgrade your plan →
                      </button>
                    )}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="colleague@company.com"
                      required
                      disabled={inviting}
                      className="input"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Role
                    </label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
                      disabled={inviting}
                      className="input"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                    <p className="mt-1.5 text-xs text-gray-500">
                      Admins can manage team members and settings
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={resetModal}
                    disabled={inviting}
                    className="btn btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviting}
                    className="btn btn-primary flex-1"
                  >
                    {inviting ? (
                      <>
                        <Loader2 size={16} className="animate-spin mr-2" />
                        Creating...
                      </>
                    ) : (
                      'Generate Invite Link'
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Invitation Created!</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Share this link with <span className="font-medium">{inviteEmail}</span>. The link expires in 7 days.
                </p>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Invitation Link
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inviteUrl}
                      readOnly
                      className="input flex-1 font-mono text-sm"
                    />
                    <button
                      onClick={copyInviteUrl}
                      className="btn btn-secondary whitespace-nowrap"
                    >
                      Copy Link
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={resetModal}
                    className="btn btn-primary"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {showEditModal && selectedMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Edit Team Member</h3>
              <button
                onClick={closeEditModal}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              {/* Member Info */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cadence-pink to-cadence-teal flex items-center justify-center text-white font-medium">
                  {selectedMember.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{selectedMember.full_name || 'Unknown'}</p>
                  <p className="text-sm text-gray-500">{selectedMember.email}</p>
                </div>
              </div>

              {editError && (
                <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                  <AlertCircle size={16} />
                  {editError}
                </div>
              )}

              {!showRemoveConfirm ? (
                <>
                  {/* Role Selection */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">Role</label>
                    <div className="space-y-2">
                      <label className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                        editRole === 'member' 
                          ? 'border-primary-500 bg-primary-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <input
                          type="radio"
                          name="role"
                          value="member"
                          checked={editRole === 'member'}
                          onChange={() => setEditRole('member')}
                          className="sr-only"
                        />
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          editRole === 'member' ? 'bg-primary-100' : 'bg-gray-100'
                        }`}>
                          <User size={20} className={editRole === 'member' ? 'text-primary-600' : 'text-gray-500'} />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">Member</p>
                          <p className="text-sm text-gray-500">Can view and manage CRM data</p>
                        </div>
                        {editRole === 'member' && <Check size={20} className="text-primary-600" />}
                      </label>

                      <label className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                        editRole === 'admin' 
                          ? 'border-primary-500 bg-primary-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <input
                          type="radio"
                          name="role"
                          value="admin"
                          checked={editRole === 'admin'}
                          onChange={() => setEditRole('admin')}
                          className="sr-only"
                        />
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          editRole === 'admin' ? 'bg-primary-100' : 'bg-gray-100'
                        }`}>
                          <ShieldCheck size={20} className={editRole === 'admin' ? 'text-primary-600' : 'text-gray-500'} />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">Admin</p>
                          <p className="text-sm text-gray-500">Can manage team members and settings</p>
                        </div>
                        {editRole === 'admin' && <Check size={20} className="text-primary-600" />}
                      </label>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setShowRemoveConfirm(true)}
                      className="text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
                    >
                      <Trash2 size={16} />
                      Remove from team
                    </button>

                    <div className="flex gap-2">
                      <button
                        onClick={closeEditModal}
                        className="btn btn-secondary"
                        disabled={saving}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleRoleChange}
                        disabled={saving || editRole === selectedMember.role}
                        className="btn btn-primary"
                      >
                        {saving ? (
                          <>
                            <Loader2 size={16} className="animate-spin mr-2" />
                            Saving...
                          </>
                        ) : (
                          'Save Changes'
                        )}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                /* Remove Confirmation */
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                    <Trash2 size={24} className="text-red-600" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Remove team member?</h4>
                  <p className="text-gray-600 mb-6">
                    Are you sure you want to remove <span className="font-medium">{selectedMember.full_name || selectedMember.email}</span> from your organization? They will lose access immediately.
                  </p>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowRemoveConfirm(false)}
                      className="btn btn-secondary flex-1"
                      disabled={removing}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleRemoveMember}
                      disabled={removing}
                      className="btn bg-red-600 hover:bg-red-700 text-white flex-1"
                    >
                      {removing ? (
                        <>
                          <Loader2 size={16} className="animate-spin mr-2" />
                          Removing...
                        </>
                      ) : (
                        'Yes, Remove'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function BillingSettings() {
  const [loading, setLoading] = useState(true)
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null)
  const [checkingOut, setCheckingOut] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetchSubscription()
  }, [])

  const fetchSubscription = async () => {
    try {
      const res = await fetch('/api/subscription')
      if (res.ok) {
        const data = await res.json()
        setSubscription(data)
      }
    } catch (err) {
      console.error('Failed to fetch subscription:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = async (plan: string, period: 'monthly' | 'annual' = 'monthly') => {
    setCheckingOut(true)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, period }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      console.error('Checkout error:', err)
    } finally {
      setCheckingOut(false)
    }
  }

  if (loading) {
    return (
      <div className="card p-6">
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="md" />
        </div>
      </div>
    )
  }

  const planPrices: Record<string, number> = {
    solo: 0,
    starter: 29,
    team: 59,
    growth: 99,
  }

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Current Plan</h2>
            <p className="text-sm text-gray-500">
              You are on the <span className="font-medium">{subscription?.planName || 'Solo'}</span> plan
              {subscription?.isTrialing && ' (trial)'}
            </p>
          </div>
          {subscription?.plan !== 'growth' && (
            <button 
              onClick={() => router.push('/pricing')}
              className="btn btn-primary"
              disabled={checkingOut}
            >
              Upgrade Plan
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-500">Users</p>
            <p className="text-2xl font-bold text-gray-900">
              {subscription?.currentUserCount || 1} / {subscription?.maxUsers || 1}
            </p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-500">Plan Price</p>
            <p className="text-2xl font-bold text-gray-900">
              ${planPrices[subscription?.plan || 'solo']}/mo
            </p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-500">Status</p>
            <p className="text-2xl font-bold text-gray-900 capitalize">
              {subscription?.status || 'Active'}
            </p>
          </div>
        </div>

        {subscription?.currentPeriodEnd && subscription.plan !== 'solo' && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              {subscription.cancelAtPeriodEnd ? (
                <>Your plan will be downgraded to Solo on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}</>
              ) : (
                <>Next billing date: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}</>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Quick upgrade options for free users */}
      {subscription?.plan === 'solo' && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Upgrade to add team members</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="border border-gray-200 rounded-xl p-4">
              <h4 className="font-semibold text-gray-900">Starter</h4>
              <p className="text-2xl font-bold mt-1">$29<span className="text-sm font-normal text-gray-500">/mo</span></p>
              <p className="text-sm text-gray-500 mt-1">Up to 3 users</p>
              <button 
                onClick={() => handleUpgrade('starter')}
                disabled={checkingOut}
                className="btn btn-secondary w-full mt-4"
              >
                {checkingOut ? <Loader2 size={16} className="animate-spin" /> : 'Start Trial'}
              </button>
            </div>
            <div className="border-2 border-primary-300 rounded-xl p-4 relative">
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-primary-500 text-white text-xs font-semibold rounded-full">
                Popular
              </span>
              <h4 className="font-semibold text-gray-900">Team</h4>
              <p className="text-2xl font-bold mt-1">$59<span className="text-sm font-normal text-gray-500">/mo</span></p>
              <p className="text-sm text-gray-500 mt-1">Up to 8 users</p>
              <button 
                onClick={() => handleUpgrade('team')}
                disabled={checkingOut}
                className="btn btn-primary w-full mt-4"
              >
                {checkingOut ? <Loader2 size={16} className="animate-spin" /> : 'Start Trial'}
              </button>
            </div>
            <div className="border border-gray-200 rounded-xl p-4">
              <h4 className="font-semibold text-gray-900">Growth</h4>
              <p className="text-2xl font-bold mt-1">$99<span className="text-sm font-normal text-gray-500">/mo</span></p>
              <p className="text-sm text-gray-500 mt-1">Up to 12+ users</p>
              <button 
                onClick={() => handleUpgrade('growth')}
                disabled={checkingOut}
                className="btn btn-secondary w-full mt-4"
              >
                {checkingOut ? <Loader2 size={16} className="animate-spin" /> : 'Start Trial'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Method</h2>
        {subscription?.plan === 'solo' ? (
          <p className="text-gray-500 text-sm">No payment method required for the free plan</p>
        ) : (
          <>
            <p className="text-gray-500 text-sm">Payment is managed through Stripe</p>
            <button className="btn btn-secondary mt-4">Manage Payment Method</button>
          </>
        )}
      </div>
    </div>
  )
}

function NotificationSettings() {
  return (
    <div className="card p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Notification Preferences</h2>
        <p className="text-sm text-gray-500">Choose how you want to be notified</p>
      </div>

      <div className="space-y-4">
        {[
          { label: 'Email notifications for new deals', description: 'Get notified when a new deal is created' },
          { label: 'Email notifications for task reminders', description: 'Receive reminders for upcoming tasks' },
          { label: 'Email notifications for mentions', description: 'Get notified when someone mentions you' },
          { label: 'Weekly activity digest', description: 'Receive a weekly summary of your activity' },
        ].map((item, i) => (
          <div key={i} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
            <div>
              <p className="font-medium text-gray-900">{item.label}</p>
              <p className="text-sm text-gray-500">{item.description}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
            </label>
          </div>
        ))}
      </div>
    </div>
  )
}

function SecuritySettings() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }

    setSaving(true)

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (updateError) {
      setError(updateError.message)
    } else {
      setSuccess(true)
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setSuccess(false), 3000)
    }

    setSaving(false)
  }

  return (
    <div className="space-y-6">
      <div className="card p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Change Password</h2>
          <p className="text-sm text-gray-500">Update your password regularly to keep your account secure</p>
        </div>

        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
            <Check size={16} />
            Password updated successfully!
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              className="input"
              required
              minLength={8}
            />
            <p className="text-xs text-gray-400 mt-1">Minimum 8 characters</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="input"
              required
            />
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Updating...
                </>
              ) : (
                'Update Password'
              )}
            </button>
          </div>
        </form>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Two-Factor Authentication</h2>
            <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
          </div>
          <span className="badge bg-yellow-100 text-yellow-700 border border-yellow-200">
            <Lock size={12} className="mr-1" />
            Coming Soon
          </span>
        </div>
      </div>
    </div>
  )
}

function AppearanceSettings() {
  const [accentColor, setAccentColor] = useState<AccentColor>('#E91E8C')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const savedColor = localStorage.getItem('cadence-accent') as AccentColor
    if (savedColor) setAccentColor(savedColor)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const root = document.documentElement
    const colorMap: Record<AccentColor, { h: number; s: number; l: number }> = {
      '#E91E8C': { h: 326, s: 84, l: 51 },
      '#3B82F6': { h: 217, s: 91, l: 60 },
      '#10B981': { h: 160, s: 84, l: 39 },
      '#F59E0B': { h: 38, s: 92, l: 50 },
      '#8B5CF6': { h: 258, s: 90, l: 66 },
    }

    const hsl = colorMap[accentColor]
    root.style.setProperty('--accent-color', accentColor)
    root.style.setProperty('--primary-500', accentColor)
    root.style.setProperty('--primary-600', `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l - 10}%)`)
    root.style.setProperty('--primary-400', `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l + 10}%)`)
    root.style.setProperty('--primary-100', `hsl(${hsl.h}, ${hsl.s}%, 95%)`)
    root.style.setProperty('--primary-50', `hsl(${hsl.h}, ${hsl.s}%, 97%)`)

    localStorage.setItem('cadence-accent', accentColor)
  }, [accentColor, mounted])

  const colors: { value: AccentColor; label: string }[] = [
    { value: '#E91E8C', label: 'Pink' },
    { value: '#3B82F6', label: 'Blue' },
    { value: '#10B981', label: 'Green' },
    { value: '#F59E0B', label: 'Orange' },
    { value: '#8B5CF6', label: 'Purple' },
  ]

  if (!mounted) {
    return (
      <div className="card p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Appearance</h2>
        <p className="text-sm text-gray-500">Customize how Cadence looks for you</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Accent Color</label>
        <div className="flex gap-3">
          {colors.map((c) => (
            <button
              key={c.value}
              onClick={() => setAccentColor(c.value)}
              className={`w-12 h-12 rounded-full border-2 transition-all flex items-center justify-center ${
                accentColor === c.value 
                  ? 'border-gray-900 scale-110' 
                  : 'border-transparent hover:scale-105'
              }`}
              style={{ backgroundColor: c.value }}
              title={c.label}
            >
              {accentColor === c.value && (
                <Check size={20} className="text-white" />
              )}
            </button>
          ))}
        </div>
        <p className="text-sm text-gray-500 mt-3">
          Selected: <span className="font-medium">{colors.find(c => c.value === accentColor)?.label}</span>
        </p>
      </div>
    </div>
  )
}


