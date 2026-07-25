'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function SplashPage() {
  const router = useRouter()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const showTimer = setTimeout(() => setVisible(true), 50)

    const redirectTimer = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      router.push(session ? '/feed' : '/login')
    }, 1800)

    return () => {
      clearTimeout(showTimer)
      clearTimeout(redirectTimer)
    }
  }, [router])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white">
      <img
        src="/1.svg"
        alt="TribeKnit Logo"
        className={`w-48 h-48 sm:w-56 sm:h-56 object-contain transition-opacity duration-700 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  )
}