'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getDistanceKm } from '@/lib/distance'
import dynamic from 'next/dynamic'
import Link from 'next/link'
const MapView = dynamic(() => import('@/components/MapView'), { ssr: false })

type SosAlert = {
  id: string
  user_id: string
  latitude: number
  longitude: number
  status: string
  created_at: string
  ai_guidance?: string | null
  distance?: number
}

export default function SosPage() {
  const router = useRouter()
  const [userLoc, setUserLoc] = useState<{ lat: number; lon: number } | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [nearbyAlerts, setNearbyAlerts] = useState<SosAlert[]>([])
  const [description, setDescription] = useState('')

  useEffect(() => {
    init()
  }, [])

 const init = async () => {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    setCurrentUserId(user.id)

    const { data: profile } = await supabase
      .from('profiles')
      .select('latitude, longitude')
      .eq('id', user.id)
      .single()

    if (!profile) return
    setCurrentUserId(user.id)
    setUserLoc({ lat: profile.latitude, lon: profile.longitude })

    await loadNearbyAlerts(profile.latitude, profile.longitude)

    const channel = supabase
      .channel('sos-alerts-channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sos_alerts' },
        (payload) => {
          const alert = payload.new as SosAlert
          const distance = getDistanceKm(
            profile.latitude,
            profile.longitude,
            alert.latitude,
            alert.longitude
          )

          if (distance <= 1) {
            setNearbyAlerts((prev) => [{ ...alert, distance }, ...prev])
            playAlertSound()
            showBrowserNotification()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const loadNearbyAlerts = async (lat: number, lon: number) => {
    const { data } = await supabase
      .from('sos_alerts')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (data) {
      const nearby = data
        .map((a) => ({
          ...a,
          distance: getDistanceKm(lat, lon, a.latitude, a.longitude),
        }))
        .filter((a) => a.distance <= 1)

      setNearbyAlerts(nearby)
    }
  }

  const sosZones = userLoc
    ? [
        {
          id: 'active-sos-zone',
          label: 'Active SOS area',
          count: nearbyAlerts.length,
          radius: 500,
          color: '#D93E3E',
          fillOpacity: 0.12,
        },
        {
          id: 'quiet-sos-zone',
          label: 'Quiet / safe area',
          count: Math.max(0, 1 - nearbyAlerts.length),
          radius: 1000,
          color: '#8E8E8E',
          fillOpacity: 0.04,
        },
      ]
    : []

 const playAlertSound = () => {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()

    for (let i = 0; i < 3; i++) {
      const oscillator = audioCtx.createOscillator()
      const gainNode = audioCtx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioCtx.destination)

      oscillator.type = 'square'
      oscillator.frequency.setValueAtTime(1000, audioCtx.currentTime + i * 0.6)
      gainNode.gain.setValueAtTime(0.8, audioCtx.currentTime + i * 0.6)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + i * 0.6 + 0.5)

      oscillator.start(audioCtx.currentTime + i * 0.6)
      oscillator.stop(audioCtx.currentTime + i * 0.6 + 0.5)
    }
  }

  const showBrowserNotification = async () => {
    if (!('Notification' in window)) return

    if (Notification.permission === 'granted') {
      new Notification('TribeKnit - SOS Alert', {
        body: 'Someone nearby needs help.',
      })
    } else if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        new Notification('TribeKnit - SOS Alert', {
          body: 'Someone nearby needs help.',
        })
      }
    }
  }

  const handleSos = async () => {
    if (!userLoc) return

    setSending(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let aiGuidance: string | null = null

    try {
      const res = await fetch('/api/sos-guidance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      })
      const aiResult = await res.json()
      if (Array.isArray(aiResult?.instructions)) {
        aiGuidance = JSON.stringify(aiResult.instructions)
      }
    } catch {
      // AI is best-effort
    }

    const insertPayload = {
      user_id: user.id,
      latitude: userLoc.lat,
      longitude: userLoc.lon,
      status: 'active',
      ...(aiGuidance ? { ai_guidance: aiGuidance } : {}),
    }

    const { error } = await supabase.from('sos_alerts').insert(insertPayload)

    if (error) {
      const fallback = await supabase.from('sos_alerts').insert({
        user_id: user.id,
        latitude: userLoc.lat,
        longitude: userLoc.lon,
        status: 'active',
      })

      if (fallback.error) {
        alert('SOS FAILED: ' + JSON.stringify(fallback.error))
        setSending(false)
        return
      }
    }

    setSending(false)
    setSent(true)
    setDescription('')

    setTimeout(() => setSent(false), 4000)
  }
  // Function to delete an alert
const deleteAlert = async (alertId: string) => {
    const { error } = await supabase
      .from('sos_alerts')
      .update({ status: 'cancelled' })
      .eq('id', alertId)

    if (error) {
      alert('DELETE ALERT ERROR: ' + JSON.stringify(error))
      return
    }

    setNearbyAlerts((prev) => prev.filter((a) => a.id !== alertId))
  }
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  return (
    <div className="min-h-screen bg-[#F5EFE3] pb-20">
      <header className="bg-[#0F5C5C] sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-center relative">
         <img src="/1.svg" alt="TribeKnit" className="w-8 h-8 rounded-full object-cover absolute left-4" /> 
          <h1 className="text-lg font-semibold text-white">SOS Emergency</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 text-center">
        {userLoc && (
          <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-left">
                <p className="text-sm font-semibold text-[#2D3436]">Live SOS map</p>
                <p className="text-[11px] text-gray-500">Nearby alerts and neighborhood zones</p>
              </div>
            </div>
            <MapView
              centerLat={userLoc.lat}
              centerLon={userLoc.lon}
              showRadius={true}
              zones={sosZones.map((zone) => ({
                id: zone.id,
                lat: userLoc.lat,
                lon: userLoc.lon,
                radius: zone.radius,
                color: zone.color,
                fillOpacity: zone.fillOpacity,
              }))}
              pins={nearbyAlerts.map((a) => ({
                id: a.id,
                lat: a.latitude,
                lon: a.longitude,
                label: 'Emergency alert',
                color: '#D93E3E',
              }))}
            />
            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-[#2D3436]">
              {sosZones.map((zone) => (
                <div key={zone.id} className="rounded-lg border border-gray-200 bg-[#FAFAF7] px-3 py-2 text-left">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: zone.color }} />
                    <span className="font-medium">{zone.label}</span>
                  </div>
                  <p className="text-gray-500 mt-1">{zone.count} nearby</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What's happening? (optional — e.g. fire, break-in, medical)"
          className="w-full mt-4 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-[#0F5C5C] focus:outline-none"
          rows={3}
        />

        <button
          onClick={handleSos}
          disabled={sending || !userLoc}
          className="mt-4 w-40 h-40 rounded-full bg-[#D85A30] hover:opacity-90 text-white text-2xl font-bold shadow-lg mx-auto flex items-center justify-center disabled:opacity-50 transition"
        >
          {sending ? '...' : 'SOS'}
        </button>

        {sent && (
          <div className="mt-4 bg-[#FCEBEB] text-[#791F1F] rounded-lg px-4 py-2 text-sm">
            Alert sent. Nearby neighbors are being notified.
          </div>
        )}

        <div className="mt-10 text-left">
          <h2 className="text-sm font-semibold text-[#2D3436] mb-3">
            Nearby active alerts ({nearbyAlerts.length})
          </h2>

          {nearbyAlerts.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-6">
              No active alerts within 1km of your location.
            </p>
          ) : (
            <div className="space-y-3">
             {nearbyAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="bg-white rounded-xl shadow-sm p-4 border border-[#FCEBEB]"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium bg-gradient-to-r from-red-500 via-orange-500 to-red-600 text-white px-2 py-0.5 rounded-full">
                      Emergency
                    </span>
                    <span className="text-xs text-gray-400">
                      {alert.distance!.toFixed(1)} km away
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-gray-600 text-xs">
                      {new Date(alert.created_at).toLocaleTimeString('en-PK', { timeZone: 'Asia/Karachi' })}
                    </p>
                    {alert.user_id === currentUserId && (
                      <button
                        type="button"
                        onClick={() => deleteAlert(alert.id)}
                        className="text-sm"
                        title="Cancel this alert"
                      >
                        🗑️
                      </button>
                    )}
                  </div>

                  {alert.ai_guidance && (
                    <div className="mt-3 rounded-lg border border-[#F4D9C6] bg-[#FFF8F2] p-3">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#D85A30]">
                        AI Safety Guidance
                      </div>
                      <ul className="space-y-1 text-sm text-gray-700">
                        {(() => {
                          try {
                            const parsed = JSON.parse(alert.ai_guidance || '[]')
                            return Array.isArray(parsed)
                              ? parsed.map((instruction: string, index: number) => (
                                  <li key={`${alert.id}-${index}`} className="flex gap-2">
                                    <span className="text-[#D85A30]">•</span>
                                    <span>{instruction}</span>
                                  </li>
                                ))
                              : null
                          } catch {
                            return null
                          }
                        })()}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
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
