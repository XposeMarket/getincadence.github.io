'use client'

import Link from 'next/link'
import { Mail } from 'lucide-react'

export default function VerifyEmailPage() {
  return (
    <div className="animate-fade-in text-center">
      <div className="mb-6 flex justify-center">
        <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
          <Mail size={32} className="text-primary-600" />
        </div>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h2>
      <p className="text-gray-600 mb-8 max-w-md mx-auto">
        We've sent you a confirmation link. Please check your email and click the link to verify your account.
      </p>

      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          Didn't receive the email? Check your spam folder or{' '}
          <button className="text-primary-600 hover:text-primary-500 font-medium">
            resend confirmation
          </button>
        </p>

        <Link 
          href="/login" 
          className="inline-block text-sm text-gray-600 hover:text-gray-900"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  )
}
