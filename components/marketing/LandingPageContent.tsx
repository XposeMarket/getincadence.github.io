'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect, useRef } from 'react'
import { Check, RefreshCw, LayoutDashboard, MessageSquare, Zap } from 'lucide-react'

const screenshots = [
  { key: 'dash', label: 'Dashboard', src: '/screenshots/dashboard.png' },
  { key: 'planner', label: 'Planner', src: '/screenshots/planner.png' },
  { key: 'deals', label: 'Deals', src: '/screenshots/deals.png' },
  { key: 'detail', label: 'Deal detail', src: '/screenshots/deal-detail.png' },
]

export default function LandingPageContent() {
  const [activeTab, setActiveTab] = useState('dash')
  const [imagesLoaded, setImagesLoaded] = useState(false)
  const autoRotateRef = useRef<NodeJS.Timeout | null>(null)
  const [autoRotate, setAutoRotate] = useState(true)

  // Auto-rotate screenshots
  useEffect(() => {
    if (!autoRotate) return
    
    autoRotateRef.current = setInterval(() => {
      setActiveTab((prev) => {
        const currentIndex = screenshots.findIndex(s => s.key === prev)
        const nextIndex = (currentIndex + 1) % screenshots.length
        return screenshots[nextIndex].key
      })
    }, 4200)

    return () => {
      if (autoRotateRef.current) clearInterval(autoRotateRef.current)
    }
  }, [autoRotate])

  const handleTabClick = (key: string) => {
    setActiveTab(key)
    setAutoRotate(false)
  }

  const handleDemoClick = () => {
    document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    let i = 0
    const interval = setInterval(() => {
      setActiveTab(screenshots[i].key)
      i++
      if (i >= screenshots.length) clearInterval(interval)
    }, 850)
    setAutoRotate(false)
  }

  return (
    <>
      {/* Hero Section */}
      <section className="pt-14 pb-8 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-7 items-center">
            {/* Left - Copy */}
            <div className="animate-fade-in">
              {/* Kicker */}
              <div className="inline-flex items-center gap-2.5 px-3 py-1.5 border border-gray-200 rounded-full bg-white/75 text-gray-500 text-sm mb-4">
                <span className="w-2.5 h-2.5 rounded-full bg-primary-500 shadow-[0_0_0_6px_rgba(226,27,132,0.12)]" />
                Calm CRM + Planner for teams that hate noise
              </div>

              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight tracking-tight">
                Know what matters.<br />
                Nothing falls through the cracks.
              </h1>

              <p className="mt-4 text-lg text-gray-500 max-w-xl">
                Cadence is a calm operating system for deals, tasks, and follow-ups. Stay in rhythm with an attention-first dashboard,
                a planner that prioritizes what's next, and simple automations that keep things moving.
              </p>

              <div className="flex flex-wrap gap-3 mt-6">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 rounded-xl transition-all shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30 hover:-translate-y-0.5"
                >
                  Start free
                </Link>
                <button
                  onClick={handleDemoClick}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
                >
                  View demo
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-4 mt-5 text-sm text-gray-500">
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-green-100 border border-green-200 flex items-center justify-center text-green-600 text-xs font-bold">✓</span>
                  No credit card required
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-green-100 border border-green-200 flex items-center justify-center text-green-600 text-xs font-bold">✓</span>
                  Set up in minutes
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-green-100 border border-green-200 flex items-center justify-center text-green-600 text-xs font-bold">✓</span>
                  Free for solo users
                </span>
              </div>
            </div>

            {/* Right - Product Preview */}
            <div id="demo" className="bg-white/78 border border-gray-200 rounded-2xl shadow-xl overflow-hidden animate-fade-in-delay">
              {/* Preview header */}
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-200 bg-gray-50/85">
                <div className="flex gap-2 flex-wrap">
                  {screenshots.map((shot) => (
                    <button
                      key={shot.key}
                      onClick={() => handleTabClick(shot.key)}
                      className={`px-3 py-2 text-sm rounded-full border transition-all ${
                        activeTab === shot.key
                          ? 'text-gray-900 bg-white border-gray-200 shadow-sm'
                          : 'text-gray-500 border-transparent hover:bg-white/50'
                      }`}
                    >
                      {shot.label}
                    </button>
                  ))}
                </div>
                <span className="px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-full bg-white/90">
                  Live preview
                </span>
              </div>

              {/* Screenshot area */}
              <div className="relative aspect-[16/10] bg-gradient-to-b from-gray-50/65 to-gray-50/25 p-3.5">
                {screenshots.map((shot) => (
                  <div
                    key={shot.key}
                    className={`absolute inset-3.5 rounded-xl border border-gray-200 overflow-hidden bg-white shadow-lg transition-all duration-300 ${
                      activeTab === shot.key
                        ? 'opacity-100 translate-y-0 scale-100'
                        : 'opacity-0 translate-y-2 scale-[0.99] pointer-events-none'
                    }`}
                  >
                    {/* Placeholder for screenshots - replace with actual images */}
                    <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center text-gray-400 text-sm">
                      <div className="text-center p-6">
                        <div className="w-16 h-16 mx-auto mb-3 rounded-xl bg-gray-200 flex items-center justify-center">
                          <LayoutDashboard size={32} className="text-gray-400" />
                        </div>
                        <p className="font-medium text-gray-500">{shot.label} Screenshot</p>
                        <p className="text-xs text-gray-400 mt-1">Add image at /public{shot.src}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Trust row */}
          <div className="mt-5 p-4 bg-white/65 border border-gray-200 rounded-2xl shadow-md flex flex-col md:flex-row items-center justify-between gap-4 animate-fade-in-delay-2">
            <p className="text-sm text-gray-500">
              Built for teams that want a clean, modern CRM without enterprise clutter.
            </p>
            <div className="flex flex-wrap gap-2">
              {['Agencies', 'Recruiting', 'Consulting', 'Local services', 'Sales ops'].map((tag) => (
                <span key={tag} className="px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-full bg-white/75">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Product Pillars */}
      <section id="product" className="py-16 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Built for how teams actually work</h2>
            <p className="text-gray-500 mt-2 max-w-2xl">
              Cadence stays calm by design: fewer screens, clearer defaults, and the right information at the right time.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mt-6">
            {/* Card 1 */}
            <div className="bg-white/85 border border-gray-200 rounded-2xl p-4 shadow-md">
              <div className="w-11 h-11 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center shadow-sm">
                <RefreshCw size={22} className="text-primary-500" />
              </div>
              <h3 className="font-semibold text-gray-900 mt-3">Attention, not noise</h3>
              <p className="text-sm text-gray-500 mt-1">
                Surface stalled deals, overdue tasks, and what's due soon—without turning your day into a feed.
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-white/85 border border-gray-200 rounded-2xl p-4 shadow-md">
              <div className="w-11 h-11 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center shadow-sm">
                <LayoutDashboard size={22} className="text-primary-500" />
              </div>
              <h3 className="font-semibold text-gray-900 mt-3">Momentum you can see</h3>
              <p className="text-sm text-gray-500 mt-1">
                Drag deals through stages. Track progress at a glance. Know what moved—and what didn't.
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-white/85 border border-gray-200 rounded-2xl p-4 shadow-md">
              <div className="w-11 h-11 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center shadow-sm">
                <MessageSquare size={22} className="text-primary-500" />
              </div>
              <h3 className="font-semibold text-gray-900 mt-3">Context stays connected</h3>
              <p className="text-sm text-gray-500 mt-1">
                Notes, tasks, and updates live together on the deal—so you never lose the thread.
              </p>
            </div>
          </div>

          {/* Feature split */}
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <div className="bg-white/85 border border-gray-200 rounded-2xl p-5 shadow-md">
              <h3 className="font-semibold text-gray-900">Clean defaults. Flexible later.</h3>
              <p className="text-sm text-gray-500 mt-1">
                Start simple. Customize pipelines, fields, and automations when you're ready.
              </p>
              <div className="space-y-2.5 mt-4">
                <FeatureBullet icon="✓" title="Fast capture" desc="Quick Add for contacts, companies, deals, and tasks." />
                <FeatureBullet icon="✓" title="Clear ownership" desc="Know who's responsible for next steps at all times." />
                <FeatureBullet icon="✓" title="Designed for calm" desc="Less clutter, better decisions, stronger follow-through." />
              </div>
            </div>

            <div className="bg-white/85 border border-gray-200 rounded-2xl p-5 shadow-md">
              <h3 className="font-semibold text-gray-900">A planner that respects your attention</h3>
              <p className="text-sm text-gray-500 mt-1">
                Deals and tasks, organized by urgency—so you always know what matters next.
              </p>
              <div className="space-y-2.5 mt-4">
                <FeatureBullet icon="⏱" title="Today / This week / Next" desc="Priority buckets instead of calendar chaos." />
                <FeatureBullet icon="↔" title="Reschedule in seconds" desc="Move items forward without losing context." />
                <FeatureBullet icon="◎" title="Same cards as your pipeline" desc="Consistency across views—no re-learning." />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Automations */}
      <section id="automations" className="py-16 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Automations that feel human</h2>
            <p className="text-gray-500 mt-2 max-w-2xl">
              Simple rules handle reminders and follow-ups quietly in the background—without turning your workspace into a maze.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mt-6">
            <AutomationCard
              title="Welcome new contact"
              badge="Contact"
              steps={[
                { tag: 'Trigger', text: 'New contact added' },
                { tag: 'Action', text: 'Send welcome email' },
                { tag: 'Action', text: 'Create follow-up task' },
              ]}
            />
            <AutomationCard
              title="Stale deal reminder"
              badge="Deals"
              steps={[
                { tag: 'Trigger', text: 'No activity for 7 days' },
                { tag: 'Action', text: 'Notify owner' },
                { tag: 'Action', text: 'Create follow-up task' },
              ]}
            />
            <AutomationCard
              title="Deal won kickoff"
              badge="Pipeline"
              steps={[
                { tag: 'Trigger', text: 'Stage moves to "Closed Won"' },
                { tag: 'Action', text: 'Notify the team' },
                { tag: 'Action', text: 'Create onboarding tasks' },
              ]}
            />
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section id="pricing-preview" className="py-16 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Simple pricing that stays simple</h2>
            <p className="text-gray-500 mt-2 max-w-2xl">
              Start free. Upgrade when you're ready. No confusing add-ons.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            {/* Free Plan */}
            <div className="bg-white/88 border border-gray-200 rounded-2xl p-4 shadow-md flex flex-col">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-gray-900">Solo</h3>
                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full border border-gray-200">Free</span>
              </div>
              <div className="text-3xl font-bold text-gray-900 tracking-tight">$0</div>
              <p className="text-sm text-gray-500">1 user</p>
              
              <div className="space-y-2 mt-3 flex-1">
                <PricingFeature text="All core features" />
                <PricingFeature text="Basic automations" />
                <PricingFeature text="Community support" />
              </div>

              <Link href="/login" className="block w-full text-center mt-4 px-4 py-2 text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 rounded-xl transition-colors">
                Start free
              </Link>
            </div>

            {/* Starter Plan */}
            <div className="bg-white/88 border border-gray-200 rounded-2xl p-4 shadow-md flex flex-col">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-gray-900">Starter</h3>
                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full border border-gray-200">Small teams</span>
              </div>
              <div className="text-3xl font-bold text-gray-900 tracking-tight">$29</div>
              <p className="text-sm text-gray-500">Up to 3 users</p>
              
              <div className="space-y-2 mt-3 flex-1">
                <PricingFeature text="Everything in Solo" />
                <PricingFeature text="Team collaboration" />
                <PricingFeature text="Email support" />
              </div>

              <Link href="/login" className="block w-full text-center mt-4 px-4 py-2 text-sm font-semibold text-white bg-gray-900 hover:bg-gray-800 rounded-xl transition-colors">
                Start trial
              </Link>
            </div>

            {/* Team Plan */}
            <div className="bg-white/88 border-2 border-primary-300 rounded-2xl p-4 shadow-xl shadow-primary-500/10 relative flex flex-col">
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-primary-500 text-white text-xs font-semibold rounded-full">
                Popular
              </div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-gray-900">Team</h3>
                <span className="text-xs px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full border border-primary-200">Best value</span>
              </div>
              <div className="text-3xl font-bold text-gray-900 tracking-tight">$59</div>
              <p className="text-sm text-gray-500">Up to 8 users</p>
              
              <div className="space-y-2 mt-3 flex-1">
                <PricingFeature text="Full automations" />
                <PricingFeature text="Templates" />
                <PricingFeature text="Priority support" />
              </div>

              <Link href="/login" className="block w-full text-center mt-4 px-4 py-2 text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 rounded-xl transition-colors shadow-lg shadow-primary-500/25">
                Start trial
              </Link>
            </div>

            {/* Growth Plan */}
            <div className="bg-white/88 border border-gray-200 rounded-2xl p-4 shadow-md flex flex-col">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-gray-900">Growth</h3>
                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full border border-gray-200">Scale</span>
              </div>
              <div className="text-3xl font-bold text-gray-900 tracking-tight">$99</div>
              <p className="text-sm text-gray-500">Up to 12 users</p>
              
              <div className="space-y-2 mt-3 flex-1">
                <PricingFeature text="Advanced reporting" />
                <PricingFeature text="Custom permissions" />
                <PricingFeature text="API access" />
              </div>

              <Link href="/login" className="block w-full text-center mt-4 px-4 py-2 text-sm font-semibold text-white bg-gray-900 hover:bg-gray-800 rounded-xl transition-colors">
                Start trial
              </Link>
              <p className="text-xs text-gray-400 text-center mt-2">+$10/user after 12</p>
            </div>
          </div>

          <div className="text-center mt-6">
            <Link href="/pricing" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              See full pricing details →
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Preview */}
      <section id="faq-preview" className="py-16 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">FAQ</h2>
            <p className="text-gray-500 mt-2">Short answers to the questions people ask before they commit.</p>
          </div>

          <div className="space-y-3 mt-6">
            <FAQItem 
              question="Is Cadence a CRM?"
              answer="Yes—Cadence covers the CRM essentials (contacts, companies, deals) but it's built to stay calm and action-oriented. The goal is consistent follow-through, not endless configuration."
            />
            <FAQItem 
              question="How is this different from Monday or Salesforce?"
              answer="Monday is board-first and can become scattered. Salesforce is powerful but heavy. Cadence is attention-first: you always know what needs action, where deals stand, and what's coming next."
            />
            <FAQItem 
              question="Can I customize pipelines and fields?"
              answer="Yes. Start with clean defaults, then customize pipeline stages, add custom fields, and build automations as your process matures."
            />
            <FAQItem 
              question="Do you offer a free plan?"
              answer="Yes! Solo users can use Cadence completely free forever. Start free with no credit card. Upgrade only when you need more users or advanced features."
            />
            <FAQItem 
              question="Who is Cadence best for?"
              answer="Teams that manage relationships and follow-ups: agencies, recruiting, consulting, local services, and sales ops. If your day depends on consistent execution, Cadence fits."
            />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 px-5">
        <div className="max-w-6xl mx-auto">
          <div 
            className="rounded-3xl p-6 md:p-8 border border-gray-200 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6"
            style={{
              background: `
                radial-gradient(900px 500px at 0% 0%, rgba(226,27,132,.12), transparent 65%),
                radial-gradient(800px 420px at 100% 0%, rgba(124,58,237,.12), transparent 60%),
                rgba(255,255,255,.6)
              `
            }}
          >
            <div>
              <h3 className="text-xl font-bold text-gray-900">Work with clarity. Move with cadence.</h3>
              <p className="text-gray-500 mt-1">Start free in minutes—then build your rhythm with pipelines, planner, and automations.</p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <Link
                href="/login"
                className="px-5 py-3 text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 rounded-xl transition-colors shadow-lg shadow-primary-500/25"
              >
                Start free
              </Link>
              <Link
                href="/product"
                className="px-5 py-3 text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-colors"
              >
                Explore product
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

// Helper Components
function FeatureBullet({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="flex gap-2.5 p-3 rounded-xl border border-gray-200 bg-white/75">
      <div className="w-7 h-7 rounded-lg bg-primary-50 border border-primary-100 flex items-center justify-center text-primary-500 text-sm font-bold flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className="font-medium text-sm text-gray-900">{title}</p>
        <p className="text-xs text-gray-500">{desc}</p>
      </div>
    </div>
  )
}

function AutomationCard({ title, badge, steps }: { title: string; badge: string; steps: { tag: string; text: string }[] }) {
  return (
    <div className="bg-white/85 border border-gray-200 rounded-2xl p-4 shadow-md">
      <div className="flex items-center justify-between mb-3">
        <span className="font-semibold text-gray-900">{title}</span>
        <span className="text-xs px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full border border-gray-200">{badge}</span>
      </div>
      <div className="space-y-2.5">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-xl border border-gray-200 bg-white">
            <span className="text-xs px-2.5 py-1 bg-primary-50 text-primary-600 rounded-full border border-primary-100 font-medium">
              {step.tag}
            </span>
            <span className="text-sm text-gray-500">{step.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function PricingFeature({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2.5 text-sm text-gray-600">
      <span className="w-5 h-5 rounded-full bg-green-100 border border-green-200 flex items-center justify-center text-green-600 text-xs font-bold flex-shrink-0 mt-0.5">✓</span>
      {text}
    </div>
  )
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="group bg-white/85 border border-gray-200 rounded-2xl shadow-md overflow-hidden">
      <summary className="flex items-center justify-between gap-4 p-4 cursor-pointer list-none">
        <span className="font-semibold text-gray-900">{question}</span>
        <span className="w-7 h-7 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center text-gray-400 group-open:rotate-90 transition-transform flex-shrink-0">
          ›
        </span>
      </summary>
      <div className="px-4 pb-4">
        <p className="text-sm text-gray-500">{answer}</p>
      </div>
    </details>
  )
}
