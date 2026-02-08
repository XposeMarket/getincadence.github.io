'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { User, Building2, Users, CreditCard, Bell, Shield, Palette, Check, Loader2, AlertCircle, Lock, ArrowUpRight, Crown } from 'lucide-react'

type SettingsTab = 'profile' | 'organization' | 'team' | 'billing' | 'notifications' | 'security' | 'appearance'
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

  const tabs = [
    { id: 'profile' as const, label: 'Profile', icon: User },
    { id: 'organization' as const, label: 'Organization', icon: Building2 },
    { id: 'team' as const, label: 'Team Members', icon: Users },
    { id: 'billing' as const, label: 'Billing', icon: CreditCard },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
    { id: 'security' as const, label: 'Security', icon: Shield },
    { id: 'appearance' as const, label: 'Appearance', icon: Palette },
  ]

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
          {activeTab === 'organization' && <OrganizationSettings />}
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
          <Loader2 className="animate-spin text-primary-500" size={32} />
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

function OrganizationSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [orgId, setOrgId] = useState<string | null>(null)
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
    }

    setLoading(false)
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
          <Loader2 className="animate-spin text-primary-500" size={32} />
        </div>
      </div>
    )
  }

  return (
    <div className="card p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Organization Settings</h2>
        <p className="text-sm text-gray-500">Manage your organization details</p>
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
          Organization updated successfully!
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Organization Name *</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Acme Inc"
          className="input"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Industry</label>
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
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Company Size</label>
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
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Website</label>
        <input
          type="url"
          value={formData.website}
          onChange={(e) => setFormData({ ...formData, website: e.target.value })}
          placeholder="https://yourcompany.com"
          className="input"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
        <input
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          placeholder="+1 (555) 123-4567"
          className="input"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
        <input
          type="text"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          placeholder="123 Main St, City, State"
          className="input"
        />
      </div>

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
    </div>
  )
}

function TeamSettings() {
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member')
  const [inviting, setInviting] = useState(false)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null)
  const [isLimitError, setIsLimitError] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetchData()
  }, [])

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

  const canInvite = subscription?.canAddUsers ?? true

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
                      <button className="text-sm text-gray-500 hover:text-gray-700">Edit</button>
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
          <Loader2 className="animate-spin text-primary-500" size={32} />
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


