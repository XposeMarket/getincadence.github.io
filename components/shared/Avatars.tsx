'use client'

import { useState } from 'react'
import { getCompanyLogoUrl, getLogoFromWebsite } from '@/lib/enrichment'

interface CompanyLogoProps {
  domain?: string | null
  website?: string | null
  email?: string | null
  logoUrl?: string | null
  name?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap = {
  xs: 'w-5 h-5 text-[8px]',
  sm: 'w-7 h-7 text-[10px]',
  md: 'w-9 h-9 text-xs',
  lg: 'w-12 h-12 text-sm',
}

export function CompanyLogo({ domain, website, email, logoUrl, name, size = 'md', className = '' }: CompanyLogoProps) {
  const [imgError, setImgError] = useState(false)

  const url = logoUrl || getLogoFromWebsite(website) || getCompanyLogoUrl(email || domain)
  const initials = name ? name.slice(0, 2).toUpperCase() : '?'
  const sizeClass = sizeMap[size]

  if (!url || imgError) {
    return (
      <div className={`${sizeClass} rounded-md bg-gray-100 flex items-center justify-center text-gray-500 font-medium flex-shrink-0 ${className}`}>
        {initials}
      </div>
    )
  }

  return (
    <img
      src={url}
      alt={name || 'Company logo'}
      onError={() => setImgError(true)}
      className={`${sizeClass} rounded-md object-contain bg-white border border-gray-100 flex-shrink-0 ${className}`}
    />
  )
}

interface ContactAvatarProps {
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  avatarUrl?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const avatarSizeMap = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
}

export function ContactAvatar({ firstName, lastName, email, avatarUrl, size = 'md', className = '' }: ContactAvatarProps) {
  const [imgError, setImgError] = useState(false)

  const initials = `${(firstName || '?')[0]}${(lastName || '')[0] || ''}`.toUpperCase()

  // If there's a direct avatar URL, use it
  if (avatarUrl && !imgError) {
    return (
      <img
        src={avatarUrl}
        alt={`${firstName} ${lastName}`}
        onError={() => setImgError(true)}
        className={`${avatarSizeMap[size]} rounded-full object-cover flex-shrink-0 ${className}`}
      />
    )
  }

  // Default gradient initials
  return (
    <div className={`${avatarSizeMap[size]} rounded-full bg-gradient-to-br from-cadence-pink to-cadence-teal flex items-center justify-center text-white font-medium flex-shrink-0 ${className}`}>
      {initials}
    </div>
  )
}
