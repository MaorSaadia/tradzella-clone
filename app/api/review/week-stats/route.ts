/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/review/week-stats/route.ts
// Returns tradeCount + netPnl for a given week (and optionally a prop firm account)
// Called right after Gemini finishes so the saved review card shows real numbers

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { trades } from '@/lib/db/schema'
import { eq, and, gte, lte } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const weekStart         = searchParams.get('weekStart')
  const weekEnd           = searchParams.get('weekEnd')
  const propFirmAccountId = searchParams.get('propFirmAccountId')

  if (!weekStart || !weekEnd) {
    return NextResponse.json({ error: 'weekStart and weekEnd required' }, { status: 400 })
  }

  const conditions = [
    eq(trades.userId, session.user.id),
    gte(trades.exitTime, new Date(weekStart)),
    lte(trades.exitTime, new Date(weekEnd)),
  ] as any[]

  if (propFirmAccountId) {
    conditions.push(eq(trades.propFirmAccountId, propFirmAccountId))
  }

  const weekTrades = await db
    .select({ pnl: trades.pnl })
    .from(trades)
    .where(and(...conditions))

  const tradeCount = weekTrades.length
  const netPnl     = weekTrades.reduce((sum, t) => sum + Number(t.pnl), 0)

  return NextResponse.json({ tradeCount, netPnl })
}