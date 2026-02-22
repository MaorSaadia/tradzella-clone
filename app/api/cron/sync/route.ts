/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/cron/sync/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { syncAllAccounts } from '@/lib/tradovate/sync'

export async function GET(req: NextRequest) {
  // Verify this is called by Vercel Cron — not a random visitor
  const authHeader = req.headers.get('authorization')

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const results = await syncAllAccounts()

    const totalSynced = results
      .filter((r): r is typeof results[number] & { synced: number } => r.success && 'synced' in r)
      .reduce((sum, r) => sum + r.synced, 0)

    console.log(`[cron] Completed. Total new trades synced: ${totalSynced}`)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      totalSynced,
      results,
    })
  } catch (error: any) {
    console.error('[cron] Fatal error:', error.message)
    return NextResponse.json(
      { error: error.message || 'Cron sync failed' },
      { status: 500 }
    )
  }
}