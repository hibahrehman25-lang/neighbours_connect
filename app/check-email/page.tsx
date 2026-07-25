'use client'

import { useSearchParams } from 'next/navigation'

export default function CheckEmailPage() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''

  return (
    <div className="min-h-screen bg-[#F5EFE3] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-[#0F5C5C] mx-auto mb-3" />
          <h1 className="text-xl font-semibold text-[#2D3436]">TribeKnit</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
          <h2 className="text-lg font-semibold text-[#2D3436] mb-2">Check your email</h2>
          <p className="text-gray-500 text-sm mb-4">
            We sent a confirmation link to{' '}
            <span className="font-medium text-[#2D3436]">{email}</span>
          </p>
          <p className="text-gray-500 text-sm">
            Open your inbox and click the confirmation button to activate your account.
          </p>
        </div>
      </div>
    </div>
  )
}