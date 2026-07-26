'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function SignupPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [area, setArea] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [document, setDocument] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const useFallbackLocation = () => ({ latitude: 31.5204, longitude: 74.3587 })

    const continueSignup = async (latitude: number, longitude: number) => {
      localStorage.setItem(
        'signupData',
        JSON.stringify({
          fullName,
          phone,
          area,
          email,
          latitude,
          longitude,
          mode: 'signup',
        })
      )

      try {
        const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/auth/confirm` : undefined

        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: redirectTo
            ? {
                emailRedirectTo: redirectTo,
                data: {
                  full_name: fullName,
                  phone,
                  area,
                },
              }
            : undefined,
        })

        setLoading(false)

        if (signUpError) {
          const message = signUpError.message?.toLowerCase() || ''
          if (message.includes('already registered') || message.includes('already exists')) {
            setError('This email is already registered. Please log in instead.')
          } else {
            setError('Something went wrong. Please check your details and try again.')
          }
          return
        }

        router.push(`/check-email?email=${encodeURIComponent(email)}`)
      } catch (error: any) {
        setLoading(false)
        const message = error?.message?.toLowerCase() || ''
        if (message.includes('already registered') || message.includes('already exists')) {
          setError('This email is already registered. Please log in instead.')
        } else {
          setError('Something went wrong. Please check your details and try again.')
        }
      }
    }

    if (!navigator.geolocation) {
      await continueSignup(useFallbackLocation().latitude, useFallbackLocation().longitude)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        await continueSignup(position.coords.latitude, position.coords.longitude)
      },
      async () => {
        const fallback = useFallbackLocation()
        await continueSignup(fallback.latitude, fallback.longitude)
      },
      { timeout: 7000 }
    )
  }

  return (
    <div className="min-h-screen bg-[#F5EFE3] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-[#0F5C5C] mx-auto mb-3" />
          <h1 className="text-xl font-semibold text-[#2D3436]">TribeKnit</h1>
          <p className="text-xs text-[#0F5C5C] tracking-wide mt-1">CONNECTING COMMUNITIES</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-8">
          <h2 className="text-lg font-semibold text-[#2D3436] mb-1">Create your account</h2>
          <p className="text-gray-500 text-sm mb-6">Join your neighborhood community</p>

          <form onSubmit={handleSignup} className="space-y-4">
            <input
              type="text"
              placeholder="Full name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F5C5C]"
            />
            <input
              type="tel"
              placeholder="Phone number"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F5C5C]"
            />
            <input
              type="text"
              placeholder="Area / neighborhood name"
              required
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F5C5C]"
            />
            <input
              type="email"
              placeholder="Email address"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F5C5C]"
            />
            <input
              type="password"
              placeholder="Password (at least 6 characters)"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F5C5C]"
            />
           <div>
              <label className="text-sm text-gray-600 block mb-2">
                Verification document (bill or ID — any image for demo)
              </label>
              <label className="flex items-center gap-3 rounded-full bg-white border border-gray-200 pl-1 pr-4 py-1 cursor-pointer w-fit shadow-sm hover:shadow transition">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#EF9F27] to-[#D85A30] flex items-center justify-center text-white text-base flex-shrink-0">
                  ⬆
                </div>
                <span className="text-sm font-medium text-[#2D3436] truncate max-w-[180px]">
                  {document ? document.name : 'Upload document'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setDocument(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#D85A30] hover:opacity-90 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-50"
            >
              {loading ? 'Getting your location...' : 'Sign up'}
            </button>
          </form>

          <p className="text-sm text-gray-500 mt-5 text-center">
            Already have an account?{' '}
            <a href="/login" className="text-[#0F5C5C] font-medium">Log in</a>
          </p>
        </div>
      </div>
    </div>
  )
}
