/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/tradovate/sync/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { tradovateAccounts } from '@/lib/db/schema'
import { syncAccount } from '@/lib/tradovate/sync'
import { eq } from 'drizzle-orm'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Find user's active account
    const account = await db.query.tradovateAccounts.findFirst({
      where: eq(tradovateAccounts.userId, session.user.id),
    })

    if (!account) {
      return NextResponse.json(
        { error: 'No Tradovate account connected. Go to Settings to connect.' },
        { status: 404 }
      )
    }

    const result = await syncAccount(account.id)

    return NextResponse.json({
      success: true,
      message: result.synced > 0
        ? `${result.synced} new trade${result.synced === 1 ? '' : 's'} synced!`
        : 'Already up to date — no new trades found.',
      ...result,
    })
  } catch (error: any) {
    console.error('[sync route] Error:', error.message)
    return NextResponse.json(
      { error: error.message || 'Sync failed' },
      { status: 500 }
    )
  }
}