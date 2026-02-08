'use client'

import Link from 'next/link'
import { Check } from 'lucide-react'
import { useState } from 'react'

interface Plan {
  id: string
  name: string
  badge: string
  price: number
  priceId: string // Stripe Price ID
  period: string
  users: string
  description: string
  features: string[]
  highlighted?: boolean
  note?: string
}

const plans: Plan[] = [
  {
    id: 'solo',
    name: 'Solo',
    badge: 'Free forever',
    price: 0,
    priceId: '', // No Stripe ID for free plan
    period: 'forever',
    users: '1 user',
    description: 'Perfect for solopreneurs and freelancers.',
    features: [
      'Deals, contacts, companies, tasks',
      'Planner (attention ladder)',
      'Basic automations',
      'Activity timeline',
      'Community support',
    ],
    note: 'No credit card required.',
  },
  {
    id: 'starter',
    name: 'Starter',
    badge: 'Small teams',
    price: 29,
    priceId: 'price_starter_monthly', // Replace with actual Stripe Price ID
    period: 'per month',
    users: 'Up to 3 users',
    description: 'Great for small teams just getting started.',
    features: [
      'Everything in Solo',
      'Up to 3 team members',
      'Basic automations',
      'Email support',
    ],
  },
  {
    id: 'team',
    name: 'Team',
    badge: 'Most popular',
    price: 59,
    priceId: 'price_team_monthly', // Replace with actual Stripe Price ID
    period: 'per month',
    users: 'Up to 8 users',
    description: 'Perfect for growing teams that need consistency.',
    features: [
      'Everything in Starter',
      'Full automations',
      'Templates (Agency / Recruiting / Generic)',
      'Reports & analytics',
      'Team collaboration',
      'Priority email support',
    ],
    highlighted: true,
  },
  {
    id: 'growth',
    name: 'Growth',
    badge: 'Scale up',
    price: 99,
    priceId: 'price_growth_monthly', // Replace with actual Stripe Price ID
    period: 'per month',
    users: 'Up to 12 users',
    description: 'For teams that want deeper visibility and control.',
    features: [
      'Everything in Team',
      'Advanced reporting',
      'Advanced permissions & roles',
      'Custom fields',
      'API access',
      'Early access to new features',
      'Dedicated support',
    ],
    note: '+$10/mo per additional user after 12.',
  },
]

const faqs = [
  {
    question: 'Can I switch plans later?',
    answer: 'Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we\'ll prorate any payments.',
  },
  {
    question: 'What happens when I hit the user limit?',
    answer: 'On the Growth plan, you can add additional users for $10/month each. On other plans, you\'ll need to upgrade to add more users.',
  },
  {
    question: 'Do you offer annual billing?',
    answer: 'Yes, we offer annual billing with a 20% discount. Contact us for details.',
  },
  {
    question: 'Is there a free trial for paid plans?',
    answer: 'Yes! All paid plans come with a 14-day free trial. No credit card required to start.',
  },
  {
    question: 'Can I cancel anytime?',
    answer: 'Absolutely. You can cancel your subscription at any time from your account settings. You\'ll retain access until the end of your billing period.',
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards (Visa, Mastercard, American Express) through our secure payment processor, Stripe.',
  },
]

export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly')
  const discount = billingPeriod === 'annual' ? 0.8 : 1 // 20% discount for annual

  return (
    <>
      {/* Hero */}
      <section className="pt-14 pb-8 px-5">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight">
            Simple pricing that stays simple
          </h1>
          <p className="text-lg text-gray-500 mt-4 max-w-2xl mx-auto">
            Start free. Upgrade when you're ready. No confusing add-ons or hidden fees.
          </p>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                billingPeriod === 'monthly'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('annual')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                billingPeriod === 'annual'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Annual
              <span className="ml-2 text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                Save 20%
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-8 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-2xl p-5 flex flex-col ${
                  plan.highlighted
                    ? 'bg-white border-2 border-primary-300 shadow-xl shadow-primary-500/10'
                    : 'bg-white/88 border border-gray-200 shadow-md'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary-500 text-white text-xs font-semibold rounded-full">
                    {plan.badge}
                  </div>
                )}

                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                  {!plan.highlighted && (
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full border border-gray-200">
                      {plan.badge}
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-gray-900">
                    ${plan.price === 0 ? 0 : Math.round(plan.price * discount)}
                  </span>
                  <span className="text-gray-500 text-sm">/{plan.period}</span>
                </div>
                <p className="text-sm text-gray-500 mt-0.5">{plan.users}</p>

                <p className="text-sm text-gray-600 mt-3">{plan.description}</p>

                <div className="space-y-2.5 mt-4 flex-1">
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
                      <span className="w-4 h-4 rounded-full bg-green-100 border border-green-200 flex items-center justify-center text-green-600 flex-shrink-0 mt-0.5">
                        <Check size={10} strokeWidth={3} />
                      </span>
                      {feature}
                    </div>
                  ))}
                </div>

                <Link
                  href={plan.price === 0 ? '/login' : `/api/checkout?plan=${plan.id}&period=${billingPeriod}`}
                  className={`block w-full text-center mt-5 px-4 py-2.5 text-sm font-semibold rounded-xl transition-colors ${
                    plan.highlighted
                      ? 'bg-primary-500 hover:bg-primary-600 text-white shadow-lg shadow-primary-500/25'
                      : 'bg-gray-900 hover:bg-gray-800 text-white'
                  }`}
                >
                  {plan.price === 0 ? 'Start free' : 'Start 14-day trial'}
                </Link>

                {plan.note && (
                  <p className="text-xs text-gray-400 text-center mt-2">{plan.note}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="py-16 px-5">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">Compare plans</h2>
          
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-md overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-900">Features</th>
                  <th className="text-center py-4 px-3 text-sm font-semibold text-gray-900">Solo</th>
                  <th className="text-center py-4 px-3 text-sm font-semibold text-gray-900">Starter</th>
                  <th className="text-center py-4 px-3 text-sm font-semibold text-gray-900">Team</th>
                  <th className="text-center py-4 px-3 text-sm font-semibold text-gray-900">Growth</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <CompareRow feature="Users" solo="1" starter="3" team="8" growth="12+" />
                <CompareRow feature="Contacts & Companies" solo="✓" starter="✓" team="✓" growth="✓" />
                <CompareRow feature="Deals & Pipeline" solo="✓" starter="✓" team="✓" growth="✓" />
                <CompareRow feature="Tasks & Planner" solo="✓" starter="✓" team="✓" growth="✓" />
                <CompareRow feature="Basic Automations" solo="✓" starter="✓" team="✓" growth="✓" />
                <CompareRow feature="Full Automations" solo="—" starter="—" team="✓" growth="✓" />
                <CompareRow feature="Templates" solo="—" starter="—" team="✓" growth="✓" />
                <CompareRow feature="Reports & Analytics" solo="Basic" starter="Basic" team="✓" growth="Advanced" />
                <CompareRow feature="Custom Fields" solo="—" starter="—" team="—" growth="✓" />
                <CompareRow feature="Advanced Permissions" solo="—" starter="—" team="—" growth="✓" />
                <CompareRow feature="API Access" solo="—" starter="—" team="—" growth="✓" />
                <CompareRow feature="Support" solo="Community" starter="Email" team="Priority" growth="Dedicated" />
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Enterprise CTA */}
      <section className="py-8 px-5">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-50 rounded-2xl border border-gray-200 p-8 text-center">
            <h3 className="text-xl font-bold text-gray-900">Need more?</h3>
            <p className="text-gray-500 mt-2 max-w-lg mx-auto">
              For larger teams or custom requirements, we offer enterprise plans with unlimited users, custom integrations, and dedicated support.
            </p>
            <Link
              href="/contact"
              className="inline-block mt-4 px-6 py-3 text-sm font-semibold text-white bg-gray-900 hover:bg-gray-800 rounded-xl transition-colors"
            >
              Contact sales
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-5">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">Pricing FAQ</h2>
          
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <details key={i} className="group bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                <summary className="flex items-center justify-between gap-4 p-5 cursor-pointer list-none">
                  <span className="font-semibold text-gray-900">{faq.question}</span>
                  <span className="w-7 h-7 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center text-gray-400 group-open:rotate-90 transition-transform flex-shrink-0">
                    ›
                  </span>
                </summary>
                <div className="px-5 pb-5">
                  <p className="text-sm text-gray-500">{faq.answer}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

function CompareRow({ feature, solo, starter, team, growth }: { feature: string; solo: string; starter: string; team: string; growth: string }) {
  return (
    <tr>
      <td className="py-3 px-4 text-sm text-gray-700">{feature}</td>
      <td className="py-3 px-3 text-center text-sm text-gray-500">{solo}</td>
      <td className="py-3 px-3 text-center text-sm text-gray-500">{starter}</td>
      <td className="py-3 px-3 text-center text-sm text-gray-500">{team}</td>
      <td className="py-3 px-3 text-center text-sm text-gray-500">{growth}</td>
    </tr>
  )
}
