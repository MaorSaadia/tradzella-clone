/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/settings/gemini/route.ts
// Saves Gemini API key — stored in .env.local for simplicity
// (In production: encrypt and store in DB per user)

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'

// NOTE: This writes to .env.local in development.
// In production on Vercel, add GEMINI_API_KEY as an environment variable
// in your Vercel dashboard — no code needed.

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { apiKey } = await req.json()
    if (!apiKey?.startsWith('AIza')) {
      return NextResponse.json({ error: 'Invalid Gemini API key format' }, { status: 400 })
    }

    // In development: write to .env.local
    if (process.env.NODE_ENV === 'development') {
      const envPath = join(process.cwd(), '.env.local')
      let content = existsSync(envPath) ? readFileSync(envPath, 'utf-8') : ''

      if (content.includes('GEMINI_API_KEY=')) {
        content = content.replace(/GEMINI_API_KEY=.*\n?/, `GEMINI_API_KEY="${apiKey}"\n`)
      } else {
        content += `\nGEMINI_API_KEY="${apiKey}"\n`
      }

      writeFileSync(envPath, content)

      // Update process.env so it works immediately without restart
      process.env.GEMINI_API_KEY = apiKey
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  return NextResponse.json({
    hasKey: !!process.env.GEMINI_API_KEY,
  })
}