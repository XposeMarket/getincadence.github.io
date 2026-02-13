'use client'

import { useState } from 'react'
import Sidebar from '@/components/dashboard/Sidebar'
import Header from '@/components/dashboard/Header'
import { IndustryProvider } from '@/lib/contexts/IndustryContext'
import { UsageLimitsProvider } from '@/lib/contexts/UsageLimitsContext'
import { IndustryType } from '@/lib/industry-config'

interface DashboardShellProps {
  user: {
    id: string
    full_name: string
    email: string
    role: string
    orgs: {
      id: string
      name: string
      industry_type?: string
    }
  }
  children: React.ReactNode
}

export default function DashboardShell({ user, children }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const industryType = (user.orgs.industry_type as IndustryType) || 'default'

  return (
    <IndustryProvider industryType={industryType}>
    <UsageLimitsProvider>
      <div className="h-screen flex bg-gray-50 print:h-auto print:bg-white print:block">
        <div className="print:hidden">
          <Sidebar 
            user={user} 
            isOpen={sidebarOpen} 
            onClose={() => setSidebarOpen(false)} 
          />
        </div>
        <div className="flex-1 flex flex-col min-w-0 h-full print:block">
          <div className="print:hidden">
            <Header 
              user={user} 
              onMenuClick={() => setSidebarOpen(true)} 
            />
          </div>
          <main className="flex-1 h-full overflow-auto px-6 py-6 print:p-0 print:overflow-visible">
            {children}
          </main>
        </div>
      </div>
    </UsageLimitsProvider>
    </IndustryProvider>
  )
}
