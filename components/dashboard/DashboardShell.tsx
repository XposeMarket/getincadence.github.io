'use client'

import { useState } from 'react'
import Sidebar from '@/components/dashboard/Sidebar'
import Header from '@/components/dashboard/Header'

interface DashboardShellProps {
  user: {
    id: string
    full_name: string
    email: string
    role: string
    orgs: {
      id: string
      name: string
    }
  }
  children: React.ReactNode
}

export default function DashboardShell({ user, children }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="h-screen flex bg-gray-50 print:h-auto print:bg-white print:block">
      <div className="print:hidden">
        <Sidebar 
          user={user} 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)} 
        />
      </div>
      <div className="flex-1 flex flex-col min-w-0 print:block">
        <div className="print:hidden">
          <Header 
            user={user} 
            onMenuClick={() => setSidebarOpen(true)} 
          />
        </div>
        <main className="flex-1 overflow-auto p-3 sm:p-4 md:p-6 print:p-0 print:overflow-visible">
          {children}
        </main>
      </div>
    </div>
  )
}
