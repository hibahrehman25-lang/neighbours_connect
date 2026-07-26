import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null

const SYSTEM_PROMPT = `You are Mohallah Assistant for a Pakistani neighborhood app. Given a post's text,
classify it into exactly one category: EMERGENCY, HELP_REQUEST, MARKETPLACE, or GENERAL.
Then, if the category is HELP_REQUEST or MARKETPLACE, write one short polite message
(max 2 sentences, natural Urdu-English mix as Pakistanis speak) that the requester
could send to a neighbor. Return strict JSON only with keys: category, suggested_message, confidence.`

const VALID_CATEGORIES = ['EMERGENCY', 'HELP_REQUEST', 'MARKETPLACE', 'GENERAL'] as const

type Category = (typeof VALID_CATEGORIES)[number]

function fallbackClassify(text: string) {
  const normalized = text.toLowerCase()

  if (/(urgent|emergency|accident|injured|hurt|medical|fire|police|robbery|attack|blood|danger|help now)/i.test(normalized)) {
    return {
      category: 'EMERGENCY' as Category,
      suggested_message: 'I can help right away. Please share your location and what happened.',
      confidence: 0.8,
    }
  }

  if (/(need|help|please|can someone|looking for|borrow|missing|lost|find|urgent)/i.test(normalized)) {
    return {
      category: 'HELP_REQUEST' as Category,
      suggested_message: 'I can help with this. Please share a few more details so a neighbor can assist.',
      confidence: 0.75,
    }
  }

  if (/(sell|buy|for sale|available|price|exchange|donate|give away|free|offer)/i.test(normalized)) {
    return {
      category: 'MARKETPLACE' as Category,
      suggested_message: 'This looks like a useful neighborhood item. Please share the price and location.',
      confidence: 0.74,
    }
  }

  return {
    category: 'GENERAL' as Category,
    suggested_message: null,
    confidence: 0.55,
  }
}

function normalizeCategory(value: unknown): Category {
  if (typeof value === 'string') {
    const upper = value.toUpperCase()
    if (VALID_CATEGORIES.includes(upper as Category)) {
      return upper as Category
    }
  }

  return 'GENERAL'
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const content = typeof body?.content === 'string' ? body.content.trim() : ''

    if (!content) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 })
    }

    const fallback = fallbackClassify(content)

    if (!apiKey || !genAI) {
      return NextResponse.json(fallback)
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    const result = await model.generateContent(
      `${SYSTEM_PROMPT}\n\nPost text: "${content.slice(0, 800)}"`,
      {
        temperature: 0.2,
        topP: 0.8,
        maxOutputTokens: 180,
        responseMimeType: 'application/json',
      }
    )

    const rawText = result.response.text().trim()
    const cleaned = rawText.replace(/```json|```/g, '').trim()

    let parsed: any = null
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      return NextResponse.json(fallback)
    }

    const category = normalizeCategory(parsed.category)
    const suggested_message =
      typeof parsed.suggested_message === 'string' && parsed.suggested_message.trim()
        ? parsed.suggested_message.trim()
        : null
    const confidence =
      typeof parsed.confidence === 'number'
        ? Math.max(0, Math.min(1, parsed.confidence))
        : fallback.confidence

    return NextResponse.json({
      category,
      suggested_message,
      confidence,
    })
  } catch (err: any) {
    return NextResponse.json(
      {
        error: err.message || 'Gemini request failed',
        category: 'GENERAL',
        suggested_message: null,
        confidence: 0.4,
      },
      { status: 500 }
    )
  }
}