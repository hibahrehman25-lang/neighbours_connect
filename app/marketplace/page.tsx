'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getDistanceKm } from '@/lib/distance'

type Item = {
  id: string
  title: string
  description: string
  type: string
  price: string
  latitude: number
  longitude: number
  created_at: string
  distance?: number
  image_url?: string | null
  user_id: string
  profiles?: { full_name: string; verification_status?: string | null } | null
}

const TYPE_STYLES: Record<string, string> = {
  RENT: 'bg-[#E6F1FB] text-[#0C447C]',
  BORROW: 'bg-[#EEEDFE] text-[#3C3489]',
  SELL: 'bg-[#EAF3DE] text-[#27500A]',
  SERVICE: 'bg-[#FAEEDA] text-[#633806]',
}

const TYPE_LABELS: Record<string, string> = {
  RENT: 'Rent',
  BORROW: 'Borrow',
  SELL: 'Sell',
  SERVICE: 'Service',
}

export default function MarketplacePage() {
  const router = useRouter()
  const [items, setItems] = useState<Item[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState('SELL')
  const [price, setPrice] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [userLoc, setUserLoc] = useState<{ lat: number; lon: number } | null>(null)
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [maxDistanceFilter, setMaxDistanceFilter] = useState('1')
  const [minPriceFilter, setMinPriceFilter] = useState('')
  const [maxPriceFilter, setMaxPriceFilter] = useState('')
  const [verifiedOnly, setVerifiedOnly] = useState(false)

  useEffect(() => {
    init()
  }, [])

  const init = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('latitude, longitude')
      .eq('id', user.id)
      .single()

    if (profileError) {
      alert('PROFILE ERROR: ' + JSON.stringify(profileError))
      return
    }

    if (!profile) {
      router.push('/login')
      return
    }

    setUserLoc({ lat: profile.latitude, lon: profile.longitude })

    await loadItems(profile.latitude, profile.longitude)
  }

  const loadItems = async (lat: number, lon: number) => {
    setLoading(true)

    const { data, error } = await supabase
      .from('marketplace_items')
      .select('*, profiles(full_name, verification_status)')
      .order('created_at', { ascending: false })

    if (error) {
      alert('ITEMS ERROR: ' + JSON.stringify(error))
      setLoading(false)
      return
    }

    if (data) {
      const nearby = data
        .map((i: any) => ({
          ...i,
          distance: getDistanceKm(lat, lon, i.latitude, i.longitude),
        }))
        .filter((i: any) => i.distance <= 1)
        .sort((a: any, b: any) => a.distance - b.distance)

      setItems(nearby)
    }

    setLoading(false)
  }

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!userLoc) {
      alert('Location not available yet.')
      return
    }

    if (!title.trim() || !price.trim()) {
      alert('Title and price are required.')
      return
    }

    setPosting(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    let imageUrl: string | null = null

    if (imageFile) {
      const fileName = `${user.id}-${Date.now()}-${imageFile.name}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(fileName, imageFile)

      if (uploadError) {
        alert('IMAGE UPLOAD ERROR: ' + JSON.stringify(uploadError))
        setPosting(false)
        return
      }

      const { data: urlData } = supabase.storage
        .from('post-images')
        .getPublicUrl(uploadData.path)

      imageUrl = urlData.publicUrl
    }

    const { error } = await supabase.from('marketplace_items').insert({
      user_id: user.id,
      title: title.trim(),
      description: description.trim(),
      type,
      price: price.trim(),
      image_url: imageUrl,
      latitude: userLoc.lat,
      longitude: userLoc.lon,
    })

    if (error) {
      alert('POST FAILED: ' + JSON.stringify(error))
      setPosting(false)
      return
    }

    setTitle('')
    setDescription('')
    setPrice('')
    setType('SELL')
    setImageFile(null)
    setPosting(false)

    await loadItems(userLoc.lat, userLoc.lon)
  }

  const initials = (name?: string) =>
    name
      ? name
          .split(' ')
          .map((w) => w[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)
      : '?'

  const parsePriceValue = (rawPrice: string) => {
    if (!rawPrice) return null
    if (rawPrice.toLowerCase().includes('free')) return 0

    const match = rawPrice.replace(/,/g, '').match(/\d+(\.\d+)?/)
    return match ? Number(match[0]) : null
  }

  const filteredItems = items.filter((item) => {
    if (typeFilter !== 'ALL' && item.type !== typeFilter) return false

    const maxDistance = Number(maxDistanceFilter)
    if (!Number.isNaN(maxDistance) && item.distance !== undefined && item.distance > maxDistance) {
      return false
    }

    if (verifiedOnly && item.profiles?.verification_status !== 'verified') return false

    const priceValue = parsePriceValue(item.price)
    const minPrice = minPriceFilter === '' ? null : Number(minPriceFilter)
    const maxPrice = maxPriceFilter === '' ? null : Number(maxPriceFilter)

    if (minPrice !== null && !Number.isNaN(minPrice)) {
      if (priceValue === null || priceValue < minPrice) return false
    }

    if (maxPrice !== null && !Number.isNaN(maxPrice)) {
      if (priceValue === null || priceValue > maxPrice) return false
    }

    return true
  })

  return (
    <div className="min-h-screen bg-[#F5EFE3] pb-20">
      <header className="bg-[#0F5C5C] sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-center relative">
          <img src="/1.svg" alt="TribeKnit" className="w-8 h-8 rounded-full object-cover absolute left-4" />
          <h1 className="text-lg font-semibold text-white">Marketplace</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4">
        <form onSubmit={handlePost} className="bg-white rounded-xl shadow-sm p-4 mb-6 space-y-3">
          <p className="text-sm font-medium text-[#2D3436]">Post an item</p>
          <input
            type="text"
            placeholder="Item name (e.g. Bicycle, Sofa, Plumber)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F5C5C]"
          />
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F5C5C] resize-none"
          />

          <label className="flex items-center gap-3 rounded-full bg-white border border-gray-200 pl-1 pr-4 py-1 cursor-pointer w-fit shadow-sm hover:shadow transition">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#EF9F27] to-[#D85A30] flex items-center justify-center text-white text-base flex-shrink-0">
              ⬆
            </div>
            <span className="text-sm font-medium text-[#2D3436] truncate max-w-[180px]">
              {imageFile ? imageFile.name : 'Upload photo'}
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              className="hidden"
            />
          </label>

          <div className="flex items-center gap-2">
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1.5"
            >
              <option value="SELL">Sell</option>
              <option value="RENT">Rent</option>
              <option value="BORROW">Borrow</option>
              <option value="SERVICE">Service</option>
            </select>
            <input
              type="text"
              placeholder="Price (Rs 500, Free, etc.)"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F5C5C]"
            />
          </div>
          <button
            type="submit"
            disabled={posting}
            className="w-full bg-[#D85A30] hover:opacity-90 text-white text-sm font-medium py-2 rounded-lg disabled:opacity-50"
          >
            {posting ? 'Posting...' : 'Post item'}
          </button>
        </form>

        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-[#2D3436]">Marketplace filters</p>
              <p className="text-[11px] text-gray-500">Quickly narrow down useful nearby listings</p>
            </div>
            <p className="text-[11px] text-gray-500">{filteredItems.length} shown</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="ALL">All types</option>
              <option value="SELL">Sell</option>
              <option value="RENT">Rent</option>
              <option value="BORROW">Borrow</option>
              <option value="SERVICE">Service</option>
            </select>

            <select
              value={maxDistanceFilter}
              onChange={(e) => setMaxDistanceFilter(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="1">Within 1 km</option>
              <option value="0.75">Within 750 m</option>
              <option value="0.5">Within 500 m</option>
            </select>

            <input
              type="number"
              inputMode="numeric"
              placeholder="Min price"
              value={minPriceFilter}
              onChange={(e) => setMinPriceFilter(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
            />
            <input
              type="number"
              inputMode="numeric"
              placeholder="Max price"
              value={maxPriceFilter}
              onChange={(e) => setMaxPriceFilter(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
            />
          </div>

          <label className="mt-3 flex items-center gap-2 text-sm text-[#2D3436]">
            <input
              type="checkbox"
              checked={verifiedOnly}
              onChange={(e) => setVerifiedOnly(e.target.checked)}
              className="h-4 w-4 accent-[#0F5C5C]"
            />
            Verified users only
          </label>
        </div>

        {loading ? (
          <p className="text-center text-gray-400 text-sm">Loading...</p>
        ) : filteredItems.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-10">
            {items.length === 0
              ? 'No items yet within 1km of your location.'
              : 'No items match your current filters.'}
          </p>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item) => (
              <div key={item.id} className="bg-white rounded-xl shadow-sm p-4">
               {item.image_url && (
                  <a href={item.image_url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-full max-h-64 object-contain bg-gray-50 rounded-lg mb-3"
                    />
                  </a>
                )} 
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      TYPE_STYLES[item.type] || TYPE_STYLES.SELL
                    }`}
                  >
                    {TYPE_LABELS[item.type] || item.type}
                  </span>
                  <span className="text-xs text-gray-400">
                    {item.distance !== undefined ? `${item.distance.toFixed(1)} km away` : ''}
                  </span>
                </div>
                <p className="text-gray-800 text-sm font-medium">{item.title}</p>
                {item.description && (
                  <p className="text-gray-500 text-xs mt-1">{item.description}</p>
                )}
                <p className="text-[#0F5C5C] text-sm font-semibold mt-2">{item.price}</p>

                <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#0F5C5C] text-white text-[10px] font-medium flex items-center justify-center">
                      {initials(item.profiles?.full_name)}
                    </div>
                    <p className="text-xs text-gray-500">
                      {item.profiles?.full_name || 'Neighbor'}
                      {item.profiles?.verification_status === 'verified' && (
                        <span className="ml-2 text-[10px] font-medium text-[#0F5C5C]">Verified</span>
                      )}
                    </p>
                  </div>
                  <Link
                    href={`/messages/${item.user_id}?name=${encodeURIComponent(item.profiles?.full_name || 'Neighbor')}`}
                    className="text-xs bg-[#D85A30] text-white px-3 py-1 rounded-full font-medium"
                  >
                    Message
                  </Link>
                </div>
              </div>
            ))}
          </div>
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
