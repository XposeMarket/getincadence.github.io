'use client'

import Link from 'next/link'

const faqs = [
  {
    category: 'General',
    questions: [
      {
        question: 'Is Cadence a CRM?',
        answer: 'Yes—Cadence covers the CRM essentials (contacts, companies, deals) but it\'s built to stay calm and action-oriented. The goal is consistent follow-through, not endless configuration.',
      },
      {
        question: 'How is this different from Monday or Salesforce?',
        answer: 'Monday is board-first and can become scattered. Salesforce is powerful but heavy. Cadence is attention-first: you always know what needs action, where deals stand, and what\'s coming next.',
      },
      {
        question: 'Who is Cadence best for?',
        answer: 'Teams that manage relationships and follow-ups: agencies, recruiting, consulting, local services, and sales ops. If your day depends on consistent execution, Cadence fits.',
      },
      {
        question: 'Can I import data from another CRM?',
        answer: 'Yes! You can import contacts, companies, and deals via CSV. We also offer migration assistance for teams moving from other platforms.',
      },
    ],
  },
  {
    category: 'Features',
    questions: [
      {
        question: 'Can I customize pipelines and fields?',
        answer: 'Yes. Start with clean defaults, then customize pipeline stages, add custom fields, and build automations as your process matures.',
      },
      {
        question: 'What is the Planner?',
        answer: 'The Planner is our attention-first view that organizes deals and tasks by urgency—overdue, today, tomorrow, this week, and later. It helps you always know what matters next without calendar chaos.',
      },
      {
        question: 'What automations are available?',
        answer: 'You can create rules triggered by events (new contact, deal stage change, time elapsed) that perform actions like sending notifications, creating tasks, or updating fields. Basic automations are free; full automations require Team plan or higher.',
      },
      {
        question: 'Is there a mobile app?',
        answer: 'Cadence is fully responsive and works great on mobile browsers. A dedicated mobile app is on our roadmap.',
      },
    ],
  },
  {
    category: 'Pricing & Plans',
    questions: [
      {
        question: 'Do you offer a free plan?',
        answer: 'Yes! Solo users can use Cadence completely free forever. Start free with no credit card required. Upgrade only when you need more users or advanced features.',
      },
      {
        question: 'What\'s included in the free plan?',
        answer: 'The Solo plan includes full access to contacts, companies, deals, tasks, the Planner view, basic automations, and community support—for 1 user, forever.',
      },
      {
        question: 'Can I add more users than my plan includes?',
        answer: 'On the Growth plan ($99/mo for 12 users), you can add additional users for $10/month each. To add users beyond the Team plan limit, you\'ll need to upgrade to Growth.',
      },
      {
        question: 'Is there a free trial for paid plans?',
        answer: 'Yes, all paid plans come with a 14-day free trial. No credit card required to start.',
      },
      {
        question: 'Can I cancel anytime?',
        answer: 'Absolutely. You can cancel your subscription at any time from your account settings. You\'ll retain access until the end of your billing period.',
      },
      {
        question: 'Do you offer annual billing?',
        answer: 'Yes, we offer annual billing with a 20% discount. Contact us for details.',
      },
    ],
  },
  {
    category: 'Security & Data',
    questions: [
      {
        question: 'Is my data secure?',
        answer: 'Yes. We use industry-standard encryption for data in transit and at rest. Your data is hosted on secure, SOC 2 compliant infrastructure.',
      },
      {
        question: 'Can I export my data?',
        answer: 'Yes, you can export all your data (contacts, companies, deals, tasks) at any time via CSV export.',
      },
      {
        question: 'Where is my data stored?',
        answer: 'Your data is stored in secure cloud infrastructure. We can discuss specific data residency requirements for enterprise customers.',
      },
    ],
  },
  {
    category: 'Support',
    questions: [
      {
        question: 'What support is available?',
        answer: 'Solo plan includes community support. Team plan includes priority email support. Growth plan includes dedicated support with faster response times.',
      },
      {
        question: 'Do you offer onboarding help?',
        answer: 'Yes! We offer self-serve documentation, video tutorials, and for Team and Growth plans, we can schedule onboarding calls to help you get started.',
      },
      {
        question: 'How do I contact support?',
        answer: 'You can reach us via email at support@cadencecrm.com or through the in-app help widget.',
      },
    ],
  },
]

export default function FAQPage() {
  return (
    <>
      {/* Hero */}
      <section className="pt-14 pb-8 px-5">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight">
            Frequently Asked Questions
          </h1>
          <p className="text-lg text-gray-500 mt-4 max-w-2xl mx-auto">
            Everything you need to know about Cadence. Can't find an answer? Reach out to our support team.
          </p>
        </div>
      </section>

      {/* FAQ Sections */}
      <section className="py-8 px-5">
        <div className="max-w-3xl mx-auto space-y-12">
          {faqs.map((section, sectionIndex) => (
            <div key={sectionIndex}>
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                {section.category}
              </h2>
              <div className="space-y-3">
                {section.questions.map((faq, faqIndex) => (
                  <details 
                    key={faqIndex} 
                    className="group bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm"
                  >
                    <summary className="flex items-center justify-between gap-4 p-5 cursor-pointer list-none">
                      <span className="font-semibold text-gray-900">{faq.question}</span>
                      <span className="w-7 h-7 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center text-gray-400 group-open:rotate-90 transition-transform flex-shrink-0">
                        ›
                      </span>
                    </summary>
                    <div className="px-5 pb-5">
                      <p className="text-gray-600">{faq.answer}</p>
                    </div>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Still have questions */}
      <section className="py-16 px-5">
        <div className="max-w-3xl mx-auto">
          <div className="bg-gray-50 rounded-2xl border border-gray-200 p-8 text-center">
            <h3 className="text-xl font-bold text-gray-900">Still have questions?</h3>
            <p className="text-gray-500 mt-2">
              Can't find the answer you're looking for? Our support team is here to help.
            </p>
            <div className="flex flex-wrap justify-center gap-3 mt-6">
              <Link
                href="/contact"
                className="px-6 py-3 text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 rounded-xl transition-colors"
              >
                Contact support
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
