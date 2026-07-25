'use client'
export const dynamic = 'force-dynamic'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ConfirmPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'idle' | 'verifying' | 'error'>('idle')
  const [error, setError] = useState('')

  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  const handleConfirm = async () => {
    if (!tokenHash || !type) {
      setError('This link is invalid. Please try signing up or logging in again.')
      setStatus('error')
      return
    }

    setStatus('verifying')

    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as any,
    })

    if (verifyError || !data.session) {
      setError('Verification failed. The link may have expired — please try again.')
      setStatus('error')
      return
    }

    const session = data.session
    const raw = localStorage.getItem('signupData')

    if (raw) {
      const parsed = JSON.parse(raw)

      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', session.user.id)
        .maybeSingle()

      if (!existing) {
        await supabase.from('profiles').insert({
          id: session.user.id,
          full_name: parsed.fullName,
          phone: parsed.phone,
          address_area: parsed.area,
          email: parsed.email,
          latitude: parsed.latitude,
          longitude: parsed.longitude,
          verification_status: 'pending',
        })
      }

      localStorage.removeItem('signupData')

      setTimeout(async () => {
        await supabase
          .from('profiles')
          .update({ verification_status: 'verified' })
          .eq('id', session.user.id)

        router.push('/feed')
      }, 5000)
    } else {
      router.push('/feed')
    }
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5EFE3] px-4">
        <div className="text-center">
          <p className="text-red-600 font-medium mb-4">{error}</p>
          <a href="/login" className="text-[#0F5C5C] underline">Go to login</a>
        </div>
      </div>
    )
  }

  if (status === 'verifying') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5EFE3]">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 border-4 border-[#0F5C5C] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-[#0F5C5C] font-medium">Verifying...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5EFE3] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm p-8 text-center">
        <h1 className="text-lg font-semibold text-[#2D3436] mb-2">Confirm your email</h1>
        <p className="text-gray-500 text-sm mb-6">
          Click the button below to verify your email address.
        </p>
        <button
          onClick={handleConfirm}
          className="w-full bg-[#D85A30] hover:opacity-90 text-white font-medium py-2.5 rounded-lg transition"
        >
          Confirm
        </button>
      </div>
    </div>
  )
}