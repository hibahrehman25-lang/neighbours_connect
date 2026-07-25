import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!)

const SYSTEM_PROMPT = `You are Mohallah Assistant for a Pakistani neighborhood app. Given a post's text,
classify it into exactly one category: EMERGENCY, HELP_REQUEST, MARKETPLACE, or GENERAL.
Then, if category is HELP_REQUEST or MARKETPLACE, write one short polite message
(max 2 sentences, natural Urdu-English mix as Pakistanis speak) that the requester
could send to a neighbor. Return ONLY valid JSON, no markdown, no backticks:
{"category": "...", "suggested_message": "..." or null}`

export async function POST(req: NextRequest) {
  try {
    const { content } = await req.json()

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'content is required' }, { status: 400 })
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' })

    const result = await model.generateContent(
      `${SYSTEM_PROMPT}\n\nPost text: "${content}"`
    )

    const rawText = result.response.text().trim()

    const cleaned = rawText.replace(/```json|```/g, '').trim()

    let parsed
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      parsed = { category: 'GENERAL', suggested_message: null }
    }

    return NextResponse.json(parsed)
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Gemini request failed' },
      { status: 500 }
    )
  }
}