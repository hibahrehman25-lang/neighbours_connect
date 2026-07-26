'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getDistanceKm } from '@/lib/distance'
import dynamic from 'next/dynamic'

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false })

type Comment = {
  id: string
  user_id: string
  content: string
  created_at: string
  profiles?: { full_name: string } | null
}

type Post = {
  id: string
  content: string
  category: string
  latitude: number
  longitude: number
  created_at: string
  distance?: number
  ai_suggested_message?: string | null
  image_url?: string | null
  user_id: string
  profiles?: { full_name: string } | null
  likeCount: number
  isLiked: boolean
  commentsOpen: boolean
  comments: Comment[]
  newComment: string
}

type SearchResult = {
  id: string
  full_name: string
}

const CATEGORY_STYLES: Record<string, string> = {
  EMERGENCY: 'bg-gradient-to-r from-red-500 via-orange-500 to-red-600 text-white',
  HELP_REQUEST: 'bg-gradient-to-r from-green-500 via-blue-500 to-green-600 text-white',
  MARKETPLACE: 'bg-gradient-to-r from-blue-500 via-purple-500 to-blue-600 text-white',
  LOST_FOUND: 'bg-gradient-to-r from-yellow-500 via-orange-500 to-yellow-600 text-white',
  GENERAL: 'bg-gradient-to-r from-gray-500 via-gray-600 to-gray-700 text-white',
}

const CATEGORY_LABELS: Record<string, string> = {
  EMERGENCY: 'Emergency',
  HELP_REQUEST: 'Help needed',
  MARKETPLACE: 'Marketplace',
  LOST_FOUND: 'Lost & Found',
  GENERAL: 'General',
}

export default function FeedPage() {
  const router = useRouter()

  const [posts, setPosts] = useState<Post[]>([])
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('GENERAL')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(true)
  const [showMap, setShowMap] = useState(false)
  const [posting, setPosting] = useState(false)
  const [userLoc, setUserLoc] = useState<{ lat: number; lon: number } | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingCommentText, setEditingCommentText] = useState('')

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    init()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length > 0) {
        runSearch(searchQuery.trim())
      } else {
        setSearchResults([])
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const runSearch = async (query: string) => {
    setSearching(true)

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name')
      .ilike('full_name', `%${query}%`)
      .limit(10)

    if (error) {
      alert('SEARCH ERROR: ' + JSON.stringify(error))
      setSearching(false)
      return
    }

    setSearchResults((data || []).filter((p) => p.id !== currentUserId))
    setSearching(false)
  }

  const init = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    setCurrentUserId(user.id)

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('latitude, longitude, verification_status')
      .eq('id', user.id)
      .single()

    if (profileError) {
      alert('PROFILE ERROR: ' + JSON.stringify(profileError))
      return
    }

    if (!profile) {
      alert('No profile found for user id: ' + user.id)
      router.push('/login')
      return
    }

    setUserLoc({ lat: profile.latitude, lon: profile.longitude })
    await loadPosts(profile.latitude, profile.longitude, user.id)
  }

  const loadPosts = async (lat: number, lon: number, userId: string) => {
    setLoading(true)

   const { data, error } = await supabase
      .from('posts')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false })

    if (error) {
      alert('POSTS ERROR: ' + JSON.stringify(error))
      setLoading(false)
      return
    }

    if (!data) {
      setLoading(false)
      return
    }

    const nearby = data
      .map((p: any) => ({
        ...p,
        distance: getDistanceKm(lat, lon, p.latitude, p.longitude),
      }))
      .filter((p: any) => p.distance <= 1)
      .sort((a: any, b: any) => a.distance - b.distance)

    const postIds = nearby.map((p: any) => p.id)

    let likesData: any[] = []
    if (postIds.length > 0) {
      const { data: likes, error: likesError } = await supabase
        .from('likes')
        .select('post_id, user_id')
        .in('post_id', postIds)

      if (likesError) {
        alert('LIKES LOAD ERROR: ' + JSON.stringify(likesError))
      } else if (likes) {
        likesData = likes
      }
    }

    const postsWithMeta: Post[] = nearby.map((p: any) => {
      const postLikes = likesData.filter((l) => l.post_id === p.id)
      return {
        ...p,
        likeCount: postLikes.length,
        isLiked: postLikes.some((l) => l.user_id === userId),
        commentsOpen: false,
        comments: [],
        newComment: '',
      }
    })

    setPosts(postsWithMeta)
    setLoading(false)
  }

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!userLoc) {
      alert('Location not available yet.')
      return
    }

    if (!content.trim()) {
      alert('Please write something before posting.')
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

    let aiCategory = category
    let aiSuggestedMessage: string | null = null

    try {
      const res = await fetch('/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      const aiResult = await res.json()

      if (aiResult?.category) {
        aiCategory = aiResult.category
      }
      if (typeof aiResult?.suggested_message === 'string' && aiResult.suggested_message.trim()) {
        aiSuggestedMessage = aiResult.suggested_message.trim()
      }
    } catch {
      // AI is best-effort
    }

    const { error } = await supabase.from('posts').insert({
      user_id: user.id,
      content,
      category: aiCategory,
      ai_suggested_message: aiSuggestedMessage,
      image_url: imageUrl,
      latitude: userLoc.lat,
      longitude: userLoc.lon,
    })

    if (error) {
      alert('POST FAILED: ' + JSON.stringify(error))
      setPosting(false)
      return
    }

    setContent('')
    setCategory('GENERAL')
    setImageFile(null)
    setPosting(false)

    const {
      data: { user: refreshedUser },
    } = await supabase.auth.getUser()
    if (refreshedUser) {
      await loadPosts(userLoc.lat, userLoc.lon, refreshedUser.id)
    }
  }

  const toggleLike = async (postId: string) => {
    if (!currentUserId) return

    const post = posts.find((p) => p.id === postId)
    if (!post) return

    if (post.isLiked) {
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', currentUserId)

      if (error) {
        alert('UNLIKE ERROR: ' + JSON.stringify(error))
        return
      }

      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, isLiked: false, likeCount: p.likeCount - 1 } : p
        )
      )
    } else {
      const { error } = await supabase
        .from('likes')
        .insert({ post_id: postId, user_id: currentUserId })

      if (error) {
        alert('LIKE ERROR: ' + JSON.stringify(error))
        return
      }

      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, isLiked: true, likeCount: p.likeCount + 1 } : p
        )
      )
    }
  }

  const toggleComments = async (postId: string) => {
    const post = posts.find((p) => p.id === postId)
    if (!post) return

    if (!post.commentsOpen && post.comments.length === 0) {
      const { data, error } = await supabase
        .from('comments')
        .select('id, user_id, content, created_at, profiles(full_name)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })

      if (error) {
        alert('COMMENTS LOAD ERROR: ' + JSON.stringify(error))
        return
      }

      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, comments: normalizeComments(data || []), commentsOpen: true } : p
        )
      )
    } else {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, commentsOpen: !p.commentsOpen } : p
        )
      )
    }
  }

  const updateNewComment = (postId: string, text: string) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, newComment: text } : p))
    )
  }

  const submitComment = async (postId: string) => {
    if (!currentUserId) return

    const post = posts.find((p) => p.id === postId)
    if (!post || !post.newComment.trim()) return

    const { error } = await supabase.from('comments').insert({
      post_id: postId,
      user_id: currentUserId,
      content: post.newComment,
    })

    if (error) {
      alert('COMMENT ERROR: ' + JSON.stringify(error))
      return
    }

    const { data, error: reloadError } = await supabase
      .from('comments')
      .select('id, user_id, content, created_at, profiles(full_name)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })

    if (reloadError) {
      alert('COMMENT RELOAD ERROR: ' + JSON.stringify(reloadError))
      return
    }

    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, comments: normalizeComments(data || []), newComment: '' } : p
      )
    )
  }

  const startEditComment = (commentId: string, currentText: string) => {
    setEditingCommentId(commentId)
    setEditingCommentText(currentText)
  }

  const saveEditComment = async (postId: string, commentId: string) => {
    if (!editingCommentText.trim()) return

    const { error } = await supabase
      .from('comments')
      .update({ content: editingCommentText.trim() })
      .eq('id', commentId)

    if (error) {
      alert('EDIT COMMENT ERROR: ' + JSON.stringify(error))
      return
    }

    setEditingCommentId(null)
    setEditingCommentText('')

    const { data } = await supabase
      .from('comments')
      .select('id, user_id, content, created_at, profiles(full_name)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })

    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, comments: normalizeComments(data || []) } : p))
    )
  }

  const deleteComment = async (postId: string, commentId: string) => {
    const { error } = await supabase.from('comments').delete().eq('id', commentId)

    if (error) {
      alert('DELETE COMMENT ERROR: ' + JSON.stringify(error))
      return
    }

    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, comments: p.comments.filter((c) => c.id !== commentId) }
          : p
      )
    )
  }

  const deletePost = async (postId: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this post?')
    if (!confirmed) return

    const { error } = await supabase.from('posts').delete().eq('id', postId)

    if (error) {
      alert('DELETE ERROR: ' + JSON.stringify(error))
      return
    }

    setPosts((prev) => prev.filter((p) => p.id !== postId))
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

  const normalizeComments = (comments: any[]): Comment[] =>
    comments.map((comment: any) => ({
      ...comment,
      profiles: comment.profiles ? { full_name: String(comment.profiles.full_name ?? '') } : null,
    }))

  return (
    <div className="min-h-screen bg-[#F5EFE3] pb-20">
      <header className="bg-[#0F5C5C] sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-center relative">
          <img src="/1.svg" alt="TribeKnit" className="w-8 h-8 rounded-full object-cover absolute left-4" />
          <h1 className="text-lg font-semibold text-white">Feed</h1>
        </div>
        <div className="max-w-lg mx-auto px-4 pb-3 relative">
          <input
            type="text"
            placeholder="Search a neighbor to start a private chat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-full px-4 py-2 text-sm bg-white/95 focus:outline-none focus:ring-2 focus:ring-[#5DCAA5]"
          />

          {searchQuery.trim().length === 0 && (
            <p className="mt-2 px-1 text-[11px] text-gray-500">
              Find someone nearby and message them directly
            </p>
          )}

          {searchQuery.trim().length > 0 && (
            <div className="absolute left-4 right-4 mt-1 bg-white rounded-xl shadow-lg z-20 max-h-64 overflow-y-auto">
              {searching ? (
                <p className="text-center text-gray-400 text-xs py-4">Searching...</p>
              ) : searchResults.length === 0 ? (
                <p className="text-center text-gray-400 text-xs py-4">No neighbors found.</p>
              ) : (
                searchResults.map((result) => (
                  <div
                    key={result.id}
                    className="flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#0F5C5C] text-white text-xs font-medium flex items-center justify-center">
                        {initials(result.full_name)}
                      </div>
                      <p className="text-sm text-[#2D3436]">{result.full_name}</p>
                    </div>
                    <Link
                      href={`/messages/${result.id}?name=${encodeURIComponent(result.full_name)}`}
                      className="text-xs bg-[#D85A30] text-white px-3 py-1.5 rounded-full font-medium"
                    >
                      Message
                    </Link>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4">
        <form onSubmit={handlePost} className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <textarea
            placeholder="What's happening in your neighborhood?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F5C5C] resize-none"
          />
          <div className="mt-3">
            <label className="flex items-center gap-3 rounded-full bg-white border border-gray-200 pl-1 pr-4 py-1 cursor-pointer w-fit shadow-sm hover:shadow transition">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#EF9F27] to-[#D85A30] flex items-center justify-center text-white text-base flex-shrink-0">
                ⬆
              </div>
              <span className="text-sm font-medium text-[#2D3436] truncate max-w-[180px]">
                {imageFile ? imageFile.name : 'Add a photo (optional)'}
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                className="hidden"
              />
            </label>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1.5"
            >
              <option value="GENERAL">General</option>
              <option value="HELP_REQUEST">Help needed</option>
              <option value="MARKETPLACE">Marketplace</option>
              <option value="LOST_FOUND">Lost &amp; Found</option>
              <option value="EMERGENCY">Emergency</option>
            </select>
            <button
              type="submit"
              disabled={posting}
              className="ml-auto bg-[#D85A30] hover:opacity-90 text-white text-sm font-medium px-4 py-1.5 rounded-lg disabled:opacity-50"
            >
              {posting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </form>

        <div className="flex justify-end mb-3">
          <button
            onClick={() => setShowMap(!showMap)}
            className="flex items-center gap-1.5 text-xs bg-white/80 backdrop-blur-md border border-white/60 shadow-sm px-4 py-2 rounded-full font-medium text-[#0F5C5C] hover:bg-white transition"
          >
            <span>{showMap ? '☰' : '📍'}</span>
            {showMap ? 'List View' : 'Map View'}
          </button>
        </div>

        {showMap && userLoc && (
          <div className="mb-4 rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
            <MapView
              centerLat={userLoc.lat}
              centerLon={userLoc.lon}
              pins={posts.map((p) => ({
                id: p.id,
                lat: p.latitude,
                lon: p.longitude,
                label: p.content.slice(0, 40),
                color:
                  p.category === 'EMERGENCY'
                    ? '#D93E3E'
                    : p.category === 'LOST_FOUND'
                    ? '#EF9F27'
                    : p.category === 'MARKETPLACE'
                    ? '#3DA35D'
                    : '#0F5C5C',
              }))}
            />
          </div>
        )}

        {loading ? (
          <p className="text-center text-gray-400 text-sm">Loading...</p>
        ) : posts.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-10">
            No posts yet within 1km of your location.
          </p>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <div key={post.id} className="bg-white rounded-xl shadow-sm p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-[#0F5C5C] text-white text-xs font-medium flex items-center justify-center flex-shrink-0">
                    {initials(post.profiles?.full_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#2D3436] truncate">
                      {post.profiles?.full_name || 'Neighbor'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(post.created_at).toLocaleString('en-PK', { timeZone: 'Asia/Karachi', dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${CATEGORY_STYLES[post.category]}`}
                  >
                    {CATEGORY_LABELS[post.category]}
                  </span>
                </div>

                <p className="text-gray-800 text-sm">{post.content}</p>

                {post.image_url && (
                  <a href={post.image_url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={post.image_url}
                      alt="Post"
                      className="w-full max-h-64 object-contain bg-gray-50 rounded-lg mt-2"
                    />
                  </a>
                )}

                {post.ai_suggested_message && (
                  <div className="mt-2 bg-[#E6F1FB] rounded-lg px-3 py-2">
                    <p className="text-xs text-[#0C447C] font-medium mb-0.5">AI suggestion:</p>
                    <p className="text-xs text-[#0C447C]">{post.ai_suggested_message}</p>
                  </div>
                )}

                <div className="flex items-center gap-4 mt-2 pt-2 border-t border-gray-100 text-xs">
                  <button
                    onClick={() => toggleLike(post.id)}
                    className={post.isLiked ? 'text-[#D85A30] font-medium' : 'text-gray-500'}
                  >
                    {post.isLiked ? 'Liked' : 'Like'} ({post.likeCount})
                  </button>
                  <button
                    onClick={() => toggleComments(post.id)}
                    className="text-gray-500"
                  >
                    Comment ({post.comments.length})
                  </button>
                  {post.user_id !== currentUserId && (
                    <Link
                      href={`/messages/${post.user_id}?name=${encodeURIComponent(post.profiles?.full_name || 'Neighbor')}`}
                      className="text-gray-500"
                    >
                      Message
                    </Link>
                  )}
                  <span className="text-gray-400 ml-auto">
                    {post.distance !== undefined ? post.distance.toFixed(1) : '0'} km away
                  </span>
                </div>

                <div className="flex items-center gap-4 mt-2">
                  <button
                    type="button"
                    onClick={async () => {
                      const reason = window.prompt('Why are you reporting this post? (optional)')
                      if (reason === null) return
                      const { error } = await supabase.from('reports').insert({
                        post_id: post.id,
                        reporter_id: currentUserId,
                        reason: reason || 'Reported by user',
                      })
                      if (error) {
                        alert('REPORT ERROR: ' + JSON.stringify(error))
                      } else {
                        alert('Post reported. Thank you.')
                      }
                    }}
                    className="text-sm text-gray-400 hover:text-gray-600"
                    title="Report post"
                  >
                    🚩
                  </button>
                  {post.user_id === currentUserId && (
                    <button
                      type="button"
                      onClick={() => deletePost(post.id)}
                      className="text-sm text-red-400 hover:text-red-600"
                      title="Delete post"
                    >
                      🗑️
                    </button>
                  )}
                </div>

                {post.commentsOpen && (
                  <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                    {post.comments.map((c) => (
                      <div key={c.id} className="flex items-start gap-2 bg-gray-50 rounded-lg px-3 py-2">
                        <div className="w-6 h-6 rounded-full bg-[#0F5C5C] text-white text-[10px] font-medium flex items-center justify-center flex-shrink-0">
                          {initials(c.profiles?.full_name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-[#2D3436]">
                            {c.profiles?.full_name || 'Neighbor'}
                          </p>
                          {editingCommentId === c.id ? (
                            <div className="flex gap-1 mt-1">
                              <input
                                value={editingCommentText}
                                onChange={(e) => setEditingCommentText(e.target.value)}
                                className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#0F5C5C]"
                              />
                              <button
                                type="button"
                                onClick={() => saveEditComment(post.id, c.id)}
                                className="text-xs text-[#0F5C5C]"
                              >
                                ✓
                              </button>
                            </div>
                          ) : (
                            <p className="text-xs text-gray-600">{c.content}</p>
                          )}
                        </div>
                        {c.user_id === currentUserId && editingCommentId !== c.id && (
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => startEditComment(c.id, c.content)}
                              className="text-xs"
                              title="Edit"
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteComment(post.id, c.id)}
                              className="text-xs"
                              title="Delete"
                            >
                              🗑️
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Write a comment..."
                        value={post.newComment}
                        onChange={(e) => updateNewComment(post.id, e.target.value)}
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F5C5C]"
                      />
                      <button
                        onClick={() => submitComment(post.id)}
                        className="bg-[#0F5C5C] text-white text-xs px-3 py-1.5 rounded-lg"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                )}
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