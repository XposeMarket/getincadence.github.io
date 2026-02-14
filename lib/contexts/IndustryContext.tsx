'use client'

import { createContext, useContext, ReactNode } from 'react'
import { getVertical, getTerminology, getFeatures, VerticalId, VerticalDefinition, Terminology, FeatureFlags } from '@/lib/verticals'

interface IndustryContextType {
  industryType: VerticalId | string
  config: VerticalDefinition
  terminology: Terminology
  features: FeatureFlags
}

const IndustryContext = createContext<IndustryContextType | null>(null)

interface IndustryProviderProps {
  industryType: VerticalId | string
  children: ReactNode
}

export function IndustryProvider({ industryType, children }: IndustryProviderProps) {
  const config = getVertical(industryType)
  const terminology = getTerminology(industryType)
  const features = getFeatures(industryType)

  return (
    <IndustryContext.Provider value={{ industryType, config, terminology, features }}>
      {children}
    </IndustryContext.Provider>
  )
}

/**
 * Hook to access industry config and terminology
 * Must be used within an IndustryProvider
 */
export function useIndustry() {
  const context = useContext(IndustryContext)
  
  if (!context) {
    // Return default industry config if provider not found
    const defaultConfig = getVertical('default')
    return {
      industryType: 'default' as VerticalId,
      config: defaultConfig,
      terminology: getTerminology('default'),
      features: getFeatures('default'),
    }
  }
  
  return context
}
