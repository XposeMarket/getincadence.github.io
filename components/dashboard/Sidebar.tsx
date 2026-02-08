'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  Handshake, 
  CheckSquare,
  Settings,
  Zap,
  BarChart3,
  CalendarDays,
  X
} from 'lucide-react'
import clsx from 'clsx'

interface SidebarProps {
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
  isOpen?: boolean
  onClose?: () => void
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Planner', href: '/planner', icon: CalendarDays },
  { name: 'Contacts', href: '/contacts', icon: Users },
  { name: 'Companies', href: '/companies', icon: Building2 },
  { name: 'Deals', href: '/deals', icon: Handshake },
  { name: 'Tasks', href: '/tasks', icon: CheckSquare },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
]

const secondaryNav = [
  { name: 'Automations', href: '/automations', icon: Zap },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export default function Sidebar({ user, isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname()

  const handleLinkClick = () => {
    // Close mobile sidebar when a link is clicked
    if (onClose) onClose()
  }

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-white/10">
        <Link href="/dashboard" className="flex items-center gap-3" onClick={handleLinkClick}>
          <Image src="/logo.png" alt="Cadence" width={32} height={32} className="rounded-lg" />
          <span className="text-xl font-semibold text-white">Cadence</span>
        </Link>
        {/* Mobile close button */}
        {onClose && (
          <button 
            onClick={onClose}
            className="lg:hidden p-2 text-gray-400 hover:text-white rounded-lg"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Org name */}
      <div className="px-5 py-4 border-b border-white/10">
        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Workspace</p>
        <p className="text-sm font-medium text-white truncate">{user.orgs.name}</p>
      </div>

      {/* Primary navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={handleLinkClick}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-white/10 text-white'
                  : 'text-gray-300 hover:bg-white/5 hover:text-white'
              )}
            >
              <item.icon size={20} />
              {item.name}
            </Link>
          )
        })}

        <div className="pt-6 pb-2">
          <p className="px-3 text-xs text-gray-500 uppercase tracking-wider">Settings</p>
        </div>

        {secondaryNav.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={handleLinkClick}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-white/10 text-white'
                  : 'text-gray-300 hover:bg-white/5 hover:text-white'
              )}
            >
              <item.icon size={20} />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* User section */}
      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cadence-pink to-cadence-teal flex items-center justify-center text-white text-sm font-medium">
            {user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user.full_name}</p>
            <p className="text-xs text-gray-400 truncate">{user.email}</p>
          </div>
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop sidebar - hidden on mobile */}
      <aside className="hidden lg:flex w-64 bg-cadence-navy flex-col flex-shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar - slide-in drawer */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />
          {/* Drawer */}
          <aside className="lg:hidden fixed inset-y-0 left-0 w-72 bg-cadence-navy flex flex-col z-50 animate-slide-in-left">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  )
}
