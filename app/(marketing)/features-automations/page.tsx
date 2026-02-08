'use client'

import Link from 'next/link'
import { 
  Zap, Play, Bell, CheckSquare, Mail, UserPlus, Clock, 
  AlertTriangle, Trophy, ArrowRight, Settings, Workflow, Check
} from 'lucide-react'

const automationExamples = [
  {
    title: 'Welcome new contact',
    badge: 'Contact',
    badgeColor: 'bg-blue-100 text-blue-700 border-blue-200',
    description: 'Automatically create follow-up tasks when new contacts are added.',
    steps: [
      { type: 'trigger', icon: UserPlus, text: 'New contact added' },
      { type: 'action', icon: Mail, text: 'Send welcome email' },
      { type: 'action', icon: CheckSquare, text: 'Create follow-up task' },
    ],
  },
  {
    title: 'Stale deal reminder',
    badge: 'Deals',
    badgeColor: 'bg-pink-100 text-pink-700 border-pink-200',
    description: 'Get notified when deals go quiet, so nothing slips through.',
    steps: [
      { type: 'trigger', icon: Clock, text: 'No activity for 7 days' },
      { type: 'action', icon: Bell, text: 'Notify deal owner' },
      { type: 'action', icon: CheckSquare, text: 'Create check-in task' },
    ],
  },
  {
    title: 'Deal won kickoff',
    badge: 'Pipeline',
    badgeColor: 'bg-green-100 text-green-700 border-green-200',
    description: 'Trigger onboarding workflows when deals close.',
    steps: [
      { type: 'trigger', icon: Trophy, text: 'Deal moved to "Closed Won"' },
      { type: 'action', icon: Bell, text: 'Notify the team' },
      { type: 'action', icon: CheckSquare, text: 'Create onboarding tasks' },
    ],
  },
  {
    title: 'High-value deal alert',
    badge: 'Deals',
    badgeColor: 'bg-pink-100 text-pink-700 border-pink-200',
    description: 'Flag important deals for extra attention.',
    steps: [
      { type: 'trigger', icon: Zap, text: 'Deal value > $10,000' },
      { type: 'action', icon: Bell, text: 'Notify sales manager' },
      { type: 'action', icon: CheckSquare, text: 'Schedule review call' },
    ],
  },
  {
    title: 'Overdue task escalation',
    badge: 'Tasks',
    badgeColor: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    description: 'Escalate tasks that fall behind.',
    steps: [
      { type: 'trigger', icon: AlertTriangle, text: 'Task overdue by 3 days' },
      { type: 'action', icon: Bell, text: 'Notify manager' },
      { type: 'action', icon: Settings, text: 'Mark as high priority' },
    ],
  },
  {
    title: 'New deal qualification',
    badge: 'Pipeline',
    badgeColor: 'bg-green-100 text-green-700 border-green-200',
    description: 'Ensure new deals get properly qualified.',
    steps: [
      { type: 'trigger', icon: Play, text: 'New deal created' },
      { type: 'action', icon: CheckSquare, text: 'Create qualification task' },
      { type: 'action', icon: Clock, text: 'Set due date (2 days)' },
    ],
  },
]

const benefits = [
  {
    icon: Zap,
    title: 'Simple rules, powerful results',
    description: 'No complex flowcharts. Define a trigger and actions in plain language.',
  },
  {
    icon: Clock,
    title: 'Time-based triggers',
    description: 'React to inactivity, upcoming dates, or elapsed time automatically.',
  },
  {
    icon: Workflow,
    title: 'Multi-step workflows',
    description: 'Chain multiple actions together—notify, create tasks, update fields.',
  },
  {
    icon: Bell,
    title: 'Stay informed',
    description: 'Get notified when important things happen, without checking constantly.',
  },
]

const comparisonFeatures = [
  { feature: 'Basic task creation on triggers', solo: true, team: true },
  { feature: 'Notification automations', solo: true, team: true },
  { feature: 'Time-based triggers', solo: false, team: true },
  { feature: 'Multi-step workflows', solo: false, team: true },
  { feature: 'Field update actions', solo: false, team: true },
  { feature: 'Email sending actions', solo: false, team: true },
  { feature: 'Custom conditions', solo: false, team: true },
  { feature: 'Automation templates', solo: false, team: true },
]

export default function AutomationsPage() {
  return (
    <>
      {/* Hero */}
      <section className="pt-14 pb-8 px-5">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2.5 px-3 py-1.5 border border-gray-200 rounded-full bg-white/75 text-gray-500 text-sm mb-4">
            <Zap size={14} className="text-primary-500" />
            Automations
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight">
            Automations that<br />feel human
          </h1>
          <p className="text-lg text-gray-500 mt-4 max-w-2xl mx-auto">
            Simple rules handle reminders, follow-ups, and notifications quietly in the background. 
            Set them once, and let the system keep things moving.
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

      {/* Benefits */}
      <section className="py-12 px-5">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-4 gap-4">
            {benefits.map((benefit, i) => (
              <div key={i} className="text-center p-5 bg-white/85 border border-gray-200 rounded-2xl shadow-sm">
                <div className="w-12 h-12 mx-auto rounded-xl bg-primary-50 border border-primary-100 flex items-center justify-center mb-3">
                  <benefit.icon size={24} className="text-primary-500" />
                </div>
                <h3 className="font-semibold text-gray-900">{benefit.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Examples */}
      <section className="py-16 px-5 bg-gray-50/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Example automations</h2>
          <p className="text-gray-500 text-center mb-10 max-w-2xl mx-auto">
            Here are some common automations teams set up. Mix and match triggers and actions to fit your workflow.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {automationExamples.map((auto, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">{auto.title}</h3>
                  <span className={`text-xs px-2.5 py-1 rounded-full border ${auto.badgeColor}`}>
                    {auto.badge}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mb-4">{auto.description}</p>
                
                <div className="space-y-2">
                  {auto.steps.map((step, j) => (
                    <div key={j} className="flex items-center gap-2.5 p-2.5 rounded-xl border border-gray-200 bg-gray-50">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        step.type === 'trigger' 
                          ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                          : 'bg-primary-50 text-primary-600 border border-primary-100'
                      }`}>
                        {step.type === 'trigger' ? 'When' : 'Then'}
                      </span>
                      <step.icon size={14} className="text-gray-400" />
                      <span className="text-sm text-gray-600">{step.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-5">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">How automations work</h2>
          
          <div className="relative">
            {/* Connection line */}
            <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-gray-200 -translate-y-1/2" />
            
            <div className="grid md:grid-cols-3 gap-8 relative">
              <div className="text-center relative">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-white border-2 border-gray-200 flex items-center justify-center shadow-md relative z-10">
                  <span className="text-2xl font-bold text-gray-400">1</span>
                </div>
                <h3 className="font-semibold text-gray-900 mt-4">Choose a trigger</h3>
                <p className="text-sm text-gray-500 mt-2">
                  Select what starts the automation: new record, stage change, time elapsed, or field update.
                </p>
              </div>
              
              <div className="text-center relative">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-white border-2 border-gray-200 flex items-center justify-center shadow-md relative z-10">
                  <span className="text-2xl font-bold text-gray-400">2</span>
                </div>
                <h3 className="font-semibold text-gray-900 mt-4">Add conditions</h3>
                <p className="text-sm text-gray-500 mt-2">
                  Optionally filter which records should trigger the automation based on field values.
                </p>
              </div>
              
              <div className="text-center relative">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-white border-2 border-gray-200 flex items-center justify-center shadow-md relative z-10">
                  <span className="text-2xl font-bold text-gray-400">3</span>
                </div>
                <h3 className="font-semibold text-gray-900 mt-4">Define actions</h3>
                <p className="text-sm text-gray-500 mt-2">
                  Choose what happens: send notification, create task, update field, or send email.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Plan Comparison */}
      <section className="py-16 px-5 bg-gray-50/50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Automation features by plan</h2>
          <p className="text-gray-500 text-center mb-8">
            Basic automations are free. Upgrade for advanced features.
          </p>
          
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900">Feature</th>
                  <th className="text-center py-4 px-4 text-sm font-semibold text-gray-900">Solo (Free)</th>
                  <th className="text-center py-4 px-4 text-sm font-semibold text-gray-900">Team+</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {comparisonFeatures.map((row, i) => (
                  <tr key={i}>
                    <td className="py-3 px-6 text-sm text-gray-700">{row.feature}</td>
                    <td className="py-3 px-4 text-center">
                      {row.solo ? (
                        <Check size={18} className="text-green-500 mx-auto" />
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {row.team ? (
                        <Check size={18} className="text-green-500 mx-auto" />
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="text-center mt-6">
            <Link href="/pricing" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              See full pricing details →
            </Link>
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
            <h3 className="text-2xl font-bold text-gray-900">Ready to automate your workflow?</h3>
            <p className="text-gray-500 mt-2">Start free and set up your first automation in minutes.</p>
            <div className="flex flex-wrap justify-center gap-3 mt-6">
              <Link
                href="/login"
                className="px-6 py-3 text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 rounded-xl transition-colors shadow-lg shadow-primary-500/25"
              >
                Start free
              </Link>
              <Link
                href="/pricing"
                className="px-6 py-3 text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-colors"
              >
                View pricing
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
