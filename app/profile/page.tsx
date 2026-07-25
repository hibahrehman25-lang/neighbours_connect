'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

type Profile = {
  full_name: string
  address_area: string
  email: string
  verification_status: string
}

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    init()
  }, [])

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, address_area, email, verification_status')
      .eq('id', user.id)
      .single()

    if (error) {
      alert('PROFILE ERROR: ' + JSON.stringify(error))
      setLoading(false)
      return
    }

    setProfile(data)
    setLoading(false)
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    await supabase.auth.signOut()
    router.push('/login')
  }

  const initials = profile?.full_name
    ? profile.full_name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?'

  const isVerified = profile?.verification_status === 'verified'

  return (
    <div className="min-h-screen bg-[#F5EFE3] pb-20">
      <header className="bg-[#0F5C5C] sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-center relative">
        <img src="/1.svg" alt="TribeKnit" className="w-8 h-8 rounded-full object-cover absolute left-4" />
          <h1 className="text-lg font-semibold text-white">Profile</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-8">
        {loading ? (
          <p className="text-center text-gray-400 text-sm">Loading...</p>
        ) : profile ? (
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
            <div className="w-20 h-20 rounded-full bg-[#0F5C5C] text-white text-2xl font-bold flex items-center justify-center mx-auto mb-4">
              {initials}
            </div>

            <h2 className="text-xl font-semibold text-[#2D3436]">
              {profile.full_name}
            </h2>
            <p className="text-sm text-gray-500 mt-1">{profile.address_area}</p>
            <p className="text-sm text-gray-400 mt-1">{profile.email}</p>

            <div className="mt-4">
              {isVerified ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium bg-[#EAF3DE] text-[#27500A] px-3 py-1 rounded-full">
                  Verified resident
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-medium bg-[#FAEEDA] text-[#633806] px-3 py-1 rounded-full">
                  Verification pending
                </span>
              )}
            </div>

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="mt-8 w-full bg-[#D85A30] hover:opacity-90 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-50"
            >
              {loggingOut ? 'Logging out...' : 'Log out'}
            </button>
          </div>
        ) : (
          <p className="text-center text-gray-400 text-sm">
            Profile not found.
          </p>
        )}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t z-20">
        <div className="max-w-lg mx-auto px-6 py-2 flex items-center justify-between">
          <Link href="/feed" className="flex flex-col items-center gap-0.5 text-[#0F5C5C]">
            <span className="text-lg">🏠</span>
            <span className="text-[10px] font-medium">Feed</span>
          </Link>
          <Link href="/marketplace" className="flex flex-col items-center gap-0.5 text-gray-400">
            <span className="text-lg">🛍️</span>
            <span className="text-[10px] font-medium">Market</span>
          </Link>
          <Link
            href="/sos"
            className="flex flex-col items-center justify-center w-12 h-12 rounded-full bg-[#D85A30] text-white -mt-4 shadow-md"
          >
            <span className="text-[10px] font-semibold">SOS</span>
          </Link>
          <Link href="/profile" className="flex flex-col items-center gap-0.5 text-gray-400">
            <span className="text-lg">👤</span>
            <span className="text-[10px] font-medium">Profile</span>
          </Link>
        </div>
      </nav>
    </div>
  )
}
