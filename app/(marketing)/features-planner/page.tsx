'use client'

import Link from 'next/link'
import { 
  Clock, AlertTriangle, Calendar, CalendarDays, ArrowRight,
  CheckSquare, Handshake, MoveRight, LayoutList
} from 'lucide-react'

const timeframes = [
  {
    icon: AlertTriangle,
    label: 'Overdue',
    color: 'text-red-500',
    bgColor: 'bg-red-50 border-red-200',
    description: 'Items that needed attention yesterday. These surface first.',
  },
  {
    icon: Clock,
    label: 'Today',
    color: 'text-primary-500',
    bgColor: 'bg-primary-50 border-primary-200',
    description: 'What needs your attention right now.',
  },
  {
    icon: Calendar,
    label: 'Tomorrow',
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 border-blue-200',
    description: 'Get ahead on what\'s coming.',
  },
  {
    icon: CalendarDays,
    label: 'This Week',
    color: 'text-amber-500',
    bgColor: 'bg-amber-50 border-amber-200',
    description: 'Plan your week without calendar chaos.',
  },
  {
    icon: MoveRight,
    label: 'Later',
    color: 'text-gray-500',
    bgColor: 'bg-gray-50 border-gray-200',
    description: 'Everything else, visible but not urgent.',
  },
]

const benefits = [
  {
    title: 'Deals and tasks, unified',
    description: 'See closing deals and pending tasks in one view. No switching between pages to understand your day.',
  },
  {
    title: 'Urgency, not dates',
    description: 'Organized by when things need attention, not arbitrary calendar slots. Overdue rises to the top automatically.',
  },
  {
    title: 'Same cards everywhere',
    description: 'The same deal and task cards you see in pipeline and list views. Consistent experience, no re-learning.',
  },
  {
    title: 'Quick rescheduling',
    description: 'Drag items between time buckets or update due dates inline. Move things forward without friction.',
  },
]

export default function PlannerPage() {
  return (
    <>
      {/* Hero */}
      <section className="pt-14 pb-8 px-5">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2.5 px-3 py-1.5 border border-gray-200 rounded-full bg-white/75 text-gray-500 text-sm mb-4">
            <Clock size={14} />
            The Attention Ladder
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight">
            A planner that respects<br />your attention
          </h1>
          <p className="text-lg text-gray-500 mt-4 max-w-2xl mx-auto">
            Stop managing calendars. Start managing attention. The Planner shows deals and tasks organized by urgency—so you always know what matters next.
          </p>

          <div className="flex flex-wrap justify-center gap-3 mt-8">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 rounded-xl transition-all shadow-lg shadow-primary-500/25"
            >
              Try the Planner
            </Link>
            <Link
              href="/product"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-all"
            >
              See all features
            </Link>
          </div>
        </div>
      </section>

      {/* Time Buckets */}
      <section className="py-16 px-5">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Priority buckets, not calendar chaos</h2>
          <p className="text-gray-500 text-center mb-10 max-w-2xl mx-auto">
            Everything organized by when it needs your attention. Overdue first, then today, tomorrow, and beyond.
          </p>

          <div className="space-y-4">
            {timeframes.map((tf, i) => (
              <div 
                key={i} 
                className={`flex items-center gap-4 p-5 rounded-2xl border ${tf.bgColor} transition-shadow hover:shadow-md`}
              >
                <div className={`w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center shadow-sm`}>
                  <tf.icon size={24} className={tf.color} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{tf.label}</h3>
                  <p className="text-sm text-gray-500">{tf.description}</p>
                </div>
                <div className="text-gray-400">
                  <ArrowRight size={20} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Visual Preview */}
      <section className="py-16 px-5 bg-gray-50/50">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
                See everything that needs attention
              </h2>
              <p className="text-gray-500 mt-4">
                The Planner combines deals closing soon with tasks due—giving you a unified view of what needs your focus.
              </p>
              
              <div className="space-y-4 mt-8">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-pink-100 border border-pink-200 flex items-center justify-center flex-shrink-0">
                    <Handshake size={16} className="text-pink-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Deals with close dates</h4>
                    <p className="text-sm text-gray-500">Deals approaching their expected close show up automatically.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-yellow-100 border border-yellow-200 flex items-center justify-center flex-shrink-0">
                    <CheckSquare size={16} className="text-yellow-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Tasks with due dates</h4>
                    <p className="text-sm text-gray-500">Open tasks sorted by urgency. Complete them right from the planner.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
                    <LayoutList size={16} className="text-gray-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Clean, scannable layout</h4>
                    <p className="text-sm text-gray-500">Each item shows key info at a glance—value, stage, priority, contact.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Placeholder for screenshot */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-lg">
              <div className="space-y-3">
                {/* Mock planner items */}
                <div className="p-3 rounded-xl bg-red-50 border border-red-200">
                  <div className="flex items-center gap-3">
                    <AlertTriangle size={16} className="text-red-500" />
                    <span className="text-sm font-medium text-gray-900">Overdue</span>
                    <span className="text-xs text-gray-500 ml-auto">3 items</span>
                  </div>
                </div>
                <div className="ml-4 p-3 rounded-lg border border-gray-200 bg-white">
                  <div className="flex items-center gap-2">
                    <CheckSquare size={14} className="text-yellow-500" />
                    <span className="text-sm text-gray-700">Follow up with Sarah</span>
                    <span className="text-xs text-red-500 ml-auto">2 days ago</span>
                  </div>
                </div>
                
                <div className="p-3 rounded-xl bg-primary-50 border border-primary-200">
                  <div className="flex items-center gap-3">
                    <Clock size={16} className="text-primary-500" />
                    <span className="text-sm font-medium text-gray-900">Today</span>
                    <span className="text-xs text-gray-500 ml-auto">5 items</span>
                  </div>
                </div>
                <div className="ml-4 space-y-2">
                  <div className="p-3 rounded-lg border border-gray-200 bg-white">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                      <span className="text-sm text-gray-700">Acme Corp - Proposal</span>
                      <span className="text-xs text-green-600 ml-auto">$15,000</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border border-gray-200 bg-white">
                    <div className="flex items-center gap-2">
                      <CheckSquare size={14} className="text-yellow-500" />
                      <span className="text-sm text-gray-700">Send contract to John</span>
                      <span className="text-xs text-red-100 bg-red-500 px-1.5 py-0.5 rounded ml-auto">high</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                  <div className="flex items-center gap-3">
                    <Calendar size={16} className="text-blue-500" />
                    <span className="text-sm font-medium text-gray-900">Tomorrow</span>
                    <span className="text-xs text-gray-500 ml-auto">2 items</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 px-5">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">Why teams love the Planner</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {benefits.map((benefit, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900">{benefit.title}</h3>
                <p className="text-sm text-gray-500 mt-2">{benefit.description}</p>
              </div>
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
            <h3 className="text-2xl font-bold text-gray-900">Ready to take control of your attention?</h3>
            <p className="text-gray-500 mt-2">Start using the Planner free today.</p>
            <div className="flex flex-wrap justify-center gap-3 mt-6">
              <Link
                href="/login"
                className="px-6 py-3 text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 rounded-xl transition-colors shadow-lg shadow-primary-500/25"
              >
                Start free
              </Link>
              <Link
                href="/features-automations"
                className="px-6 py-3 text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-colors"
              >
                Learn about Automations
                <ArrowRight size={16} className="inline ml-2" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
