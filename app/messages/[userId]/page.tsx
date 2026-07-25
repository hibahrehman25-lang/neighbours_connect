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
    <div className="min-h-screen bg-gradient-to-b from-[#F5EFE3] to-[#EDE4D3] flex flex-col">
      <header className="bg-gradient-to-r from-[#0F5C5C] via-[#1A7A6E] to-[#0F5C5C] sticky top-0 z-10 shadow-md">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="text-white text-lg">←</button>
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-medium">
            {otherUserName.slice(0, 1).toUpperCase()}
          </div>
          <h1 className="text-base font-semibold text-white">{otherUserName}</h1>
        </div>
      </header>

      <div className="flex-1 max-w-lg w-full mx-auto px-4 py-4 overflow-y-auto">
        {loading ? (
          <p className="text-center text-gray-400 text-sm">Loading...</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-10">
            No messages yet. Say hello!
          </p>
        ) : (
          <div className="space-y-2">
            {messages.map((msg) => {
              const isMine = msg.sender_id === currentUserId
              return (
                <div
                  key={msg.id}
                  className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                      isMine
                        ? 'bg-gradient-to-br from-[#D85A30] to-[#B84322] text-white'
                        : 'bg-white text-[#2D3436] border border-gray-100'
                    }`}
                  >
                    {msg.content}
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
        className="bg-white border-t px-4 py-3 flex gap-2 max-w-lg w-full mx-auto"
      >
        <input
          type="text"
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="flex-1 border border-gray-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F5C5C]"
        />
        <button
          type="submit"
          disabled={sending}
          className="bg-[#D85A30] text-white px-4 py-2 rounded-full text-sm font-medium disabled:opacity-50"
        >
          Send
        </button>
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