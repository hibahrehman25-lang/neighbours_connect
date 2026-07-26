'use client'

import { Suspense, useEffect, useState, useRef } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Message = {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  created_at: string
}

function ChatContent() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const otherUserId = params.userId as string
  const otherUserName = searchParams.get('name') || 'Neighbor'

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

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

    await loadMessages(user.id)

    const channel = supabase
      .channel(`chat-${user.id}-${otherUserId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload.new as Message
          const isRelevant =
            (msg.sender_id === user.id && msg.receiver_id === otherUserId) ||
            (msg.sender_id === otherUserId && msg.receiver_id === user.id)

          if (isRelevant) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === msg.id)) return prev
              return [...prev, msg]
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const loadMessages = async (userId: string) => {
    setLoading(true)

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`
      )
      .order('created_at', { ascending: true })

    if (error) {
      alert('MESSAGES LOAD ERROR: ' + JSON.stringify(error))
      setLoading(false)
      return
    }

    setMessages(data || [])
    setLoading(false)
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUserId || !newMessage.trim()) return

    setSending(true)

    const { error } = await supabase.from('messages').insert({
      sender_id: currentUserId,
      receiver_id: otherUserId,
      content: newMessage.trim(),
    })

    if (error) {
      alert('SEND ERROR: ' + JSON.stringify(error))
      setSending(false)
      return
    }

    setNewMessage('')
    setSending(false)
  }

  return (
    <div className="min-h-screen bg-[#F5EFE3] flex flex-col">
      <header className="bg-gradient-to-r from-[#0F5C5C] via-[#1A7A6E] to-[#0F5C5C] sticky top-0 z-10 shadow-md">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="text-white text-lg">←</button>
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-medium">
            {otherUserName.slice(0, 1).toUpperCase()}
          </div>
          <h1 className="text-base font-semibold text-white">{otherUserName}</h1>
        </div>
      </header>

      <div className="flex-1 max-w-lg w-full mx-auto px-3 py-3 overflow-y-auto bg-[radial-gradient(circle_at_top_left,_rgba(15,92,92,0.04)_0,_transparent_35%),linear-gradient(135deg,_rgba(255,255,255,0.55)_0%,_rgba(245,239,227,0.75)_100%)]">
        {loading ? (
          <p className="text-center text-gray-400 text-sm py-10">Loading...</p>
        ) : messages.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white/70 px-4 py-6 text-center text-gray-500 text-sm shadow-sm">
            No messages yet. Say hello!
          </div>
        ) : (
          <div className="space-y-1.5">
            {messages.map((msg, index) => {
              const isMine = msg.sender_id === currentUserId
              const prevMsg = messages[index - 1]
              const sameSender = prevMsg?.sender_id === msg.sender_id
              return (
                <div
                  key={msg.id}
                  className={`flex ${isMine ? 'justify-end' : 'justify-start'} ${sameSender ? 'mt-1' : 'mt-2.5'}`}
                >
                  <div
                    className={`relative max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${
                      isMine
                        ? 'bg-gradient-to-br from-[#D85A30] to-[#B84322] text-white'
                        : 'bg-white text-[#2D3436] border border-gray-100'
                    }`}
                  >
                    <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                    {isMine && (
                      <span className="ml-2 inline-block align-text-bottom text-[10px] opacity-80">
                        ✓
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <form
        onSubmit={handleSend}
        className="sticky bottom-0 bg-transparent px-3 py-3 max-w-lg w-full mx-auto"
      >
        <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white/95 px-2 py-2 shadow-sm">
          <input
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1 bg-transparent px-3 py-2 text-sm text-[#2D3436] placeholder:text-gray-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={sending}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0F5C5C] text-white shadow-sm disabled:opacity-50"
            aria-label="Send message"
          >
            <span className="text-base">➤</span>
          </button>
        </div>
      </form>
    </div>
  )
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F5EFE3]" />}>
      <ChatContent />
    </Suspense>
  )
}