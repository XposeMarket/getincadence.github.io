'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { 
  LayoutDashboard, Users, Building2, Handshake, CheckSquare, 
  Calendar, BarChart3, Zap, Bell, Search, Filter, ArrowRight,
  RefreshCw, MessageSquare, Clock, Target
} from 'lucide-react'

const features = [
  {
    icon: LayoutDashboard,
    title: 'Attention-First Dashboard',
    description: 'See stalled deals, overdue tasks, and upcoming priorities at a glance. No noise, just what needs your attention.',
  },
  {
    icon: Users,
    title: 'Contact Management',
    description: 'Store contact details, track interactions, and maintain relationship history. Quick search and smart filters.',
  },
  {
    icon: Building2,
    title: 'Company Profiles',
    description: 'Organize contacts by company. Track company-level deals and see the full picture of each relationship.',
  },
  {
    icon: Handshake,
    title: 'Deal Pipeline',
    description: 'Visual Kanban board for deals. Drag through stages, track values, and never lose sight of your pipeline.',
  },
  {
    icon: CheckSquare,
    title: 'Task Management',
    description: 'Create tasks linked to deals, contacts, or standalone. Due dates, priorities, and completion tracking built in.',
  },
  {
    icon: Calendar,
    title: 'Planner View',
    description: 'Your attention ladder—see everything organized by urgency: overdue, today, tomorrow, this week, and beyond.',
  },
  {
    icon: BarChart3,
    title: 'Reports & Analytics',
    description: 'Track pipeline performance, win rates, deal velocity, and team activity. Clear insights without the complexity.',
  },
  {
    icon: Zap,
    title: 'Automations',
    description: 'Simple rules that handle follow-ups, notifications, and task creation. Set once, run automatically.',
  },
]

const highlights = [
  {
    title: 'Fast capture, minimal friction',
    description: 'Quick Add for contacts, companies, deals, and tasks. Get information into the system without breaking your flow.',
    icon: RefreshCw,
  },
  {
    title: 'Everything connected',
    description: 'Notes, tasks, and activity live on the deal. Context travels with the relationship, not scattered across tools.',
    icon: MessageSquare,
  },
  {
    title: 'Clear ownership',
    description: 'Know who\'s responsible for what. Deal owners, task assignees, and activity logs keep everyone accountable.',
    icon: Target,
  },
  {
    title: 'Time-aware by default',
    description: 'Deals have close dates. Tasks have due dates. The system knows what\'s urgent without you doing extra work.',
    icon: Clock,
  },
]

export default function ProductPage() {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <>
      {/* Hero */}
      <section className="pt-14 pb-8 px-5">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2.5 px-3 py-1.5 border border-gray-200 rounded-full bg-white/75 text-gray-500 text-sm mb-4">
            <span className="w-2.5 h-2.5 rounded-full bg-primary-500" />
            Product Overview
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight">
            A CRM that stays calm
          </h1>
          <p className="text-lg text-gray-500 mt-4 max-w-2xl mx-auto">
            Cadence gives you the essentials—contacts, companies, deals, tasks—organized around attention, not endless features. 
            Start simple, customize when you're ready.
          </p>

          <div className="flex flex-wrap justify-center gap-3 mt-8">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 rounded-xl transition-all shadow-lg shadow-primary-500/25"
            >
              Start free
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-all"
            >
              View pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-16 px-5">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Everything you need</h2>
          <p className="text-gray-500 text-center mb-10 max-w-2xl mx-auto">
            Core CRM features designed for clarity and action. Nothing you don't need, everything you do.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((feature, i) => (
              <div key={i} className="bg-white/85 border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-11 h-11 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center mb-4">
                  <feature.icon size={22} className="text-primary-500" />
                </div>
                <h3 className="font-semibold text-gray-900">{feature.title}</h3>
                <p className="text-sm text-gray-500 mt-2">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Design Philosophy */}
      <section className="py-16 px-5 bg-gray-50/50">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
                Designed for how you actually work
              </h2>
              <p className="text-gray-500 mt-4">
                Most CRMs are built to track everything. Cadence is built to show you what matters. 
                The dashboard surfaces problems. The planner organizes your day. Automations handle the routine.
              </p>
              
              <div className="space-y-4 mt-8">
                {highlights.map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <item.icon size={20} className="text-primary-500" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{item.title}</h4>
                      <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-lg">
              <button
                onClick={() => setModalOpen(true)}
                className="w-full aspect-video bg-white rounded-xl overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
              >
                <Image
                  src="/dashboard/dashboard.png"
                  alt="Dashboard preview"
                  width={1920}
                  height={1080}
                  className="w-full h-full object-cover"
                />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Who It's For */}
      <section className="py-16 px-5">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Built for teams that manage relationships</h2>
          <p className="text-gray-500 mb-10">
            If your work involves follow-ups, deals, and consistent execution—Cadence fits.
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            {['Agencies', 'Recruiting', 'Consulting', 'Local Services', 'Sales Teams', 'Freelancers'].map((tag) => (
              <span key={tag} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-full shadow-sm">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-5">
        <div className="max-w-4xl mx-auto">
          <div 
            className="rounded-2xl p-8 border border-gray-200 shadow-lg text-center"
            style={{
              background: `
                radial-gradient(600px 300px at 50% 0%, rgba(226,27,132,.08), transparent 65%),
                white
              `
            }}
          >
            <h3 className="text-2xl font-bold text-gray-900">Ready to try Cadence?</h3>
            <p className="text-gray-500 mt-2">Start free. No credit card required.</p>
            <div className="flex flex-wrap justify-center gap-3 mt-6">
              <Link
                href="/login"
                className="px-6 py-3 text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 rounded-xl transition-colors shadow-lg shadow-primary-500/25"
              >
                Start free
              </Link>
              <Link
                href="/features-planner"
                className="px-6 py-3 text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-colors"
              >
                Learn about Planner
                <ArrowRight size={16} className="inline ml-2" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Image Modal */}
      {modalOpen && (
        <div
          onClick={() => setModalOpen(false)}
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
        >
          <button
            onClick={() => setModalOpen(false)}
            className="absolute top-4 right-4 w-10 h-10 rounded-lg bg-white/90 hover:bg-white flex items-center justify-center text-gray-600 hover:text-gray-900 transition-all shadow-lg"
            aria-label="Close modal"
          >
            ✕
          </button>
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-5xl aspect-[16/10] rounded-2xl overflow-hidden shadow-2xl"
          >
            <Image
              src="/dashboard/dashboard.png"
              alt="Full dashboard"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>
      )}
    </>
  )
}
