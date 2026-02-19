// src/app/api/cron/sync/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { syncAllAccounts } from '@/lib/tradovate/sync'

export async function GET(req: NextRequest) {
  // Verify this is called by Vercel Cron, not a random person
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results = await syncAllAccounts()
  return NextResponse.json({ success: true, results, timestamp: new Date() })
}