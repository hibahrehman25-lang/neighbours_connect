import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null

const SYSTEM_PROMPT = `You are a safety assistant for a neighborhood emergency app in Pakistan.
Given a short description of an emergency situation, respond with exactly
3 short, practical, immediate safety instructions (max 10 words each) that
the person reporting AND their nearby neighbors should follow right now.
Prioritize life safety over property. Use plain, calm English.
If the description is empty or unclear, give 3 general emergency-safety
instructions instead. Return ONLY valid JSON, no markdown, no backticks:
{"instructions": ["...", "...", "..."]}`

const FALLBACK_INSTRUCTIONS = [
  'Stay calm and move to a safe location',
  'Alert nearby neighbors if possible',
  'Contact emergency services if needed',
]

function normalizeInstructions(value: unknown) {
  if (Array.isArray(value)) {
    const items = value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 3)

    if (items.length > 0) {
      return items
    }
  }

  return FALLBACK_INSTRUCTIONS
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const description = typeof body?.description === 'string' ? body.description.trim() : ''

    if (!apiKey || !genAI) {
      return NextResponse.json({ instructions: FALLBACK_INSTRUCTIONS })
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('timeout')), 8000)
    })

    const result = await Promise.race([
      model.generateContent(
        `${SYSTEM_PROMPT}\n\nDescription: "${description.slice(0, 800)}"`,
        {
          temperature: 0.2,
          topP: 0.8,
          maxOutputTokens: 180,
          responseMimeType: 'application/json',
        }
      ),
      timeoutPromise,
    ])

    const rawText = result.response.text().trim()
    const cleaned = rawText.replace(/```json|```/g, '').trim()

    let parsed: any = null
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({ instructions: FALLBACK_INSTRUCTIONS })
    }

    return NextResponse.json({ instructions: normalizeInstructions(parsed.instructions) })
  } catch {
    return NextResponse.json({ instructions: FALLBACK_INSTRUCTIONS })
  }
}
