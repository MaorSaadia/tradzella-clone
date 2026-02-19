/* eslint-disable @typescript-eslint/no-unused-vars */
// /app/api/tradovate/sync/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { syncAccount } from '@/lib/tradovate/sync'
import { db } from '@/lib/db'
import { tradovateAccounts } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Find user's account
  const account = await db.query.tradovateAccounts.findFirst({
    where: eq(tradovateAccounts.userId, session.user.id),
  })
  if (!account) {
    return NextResponse.json({ error: 'No Tradovate account connected' }, { status: 404 })
  }

  const result = await syncAccount(account.id)
  return NextResponse.json(result)
}