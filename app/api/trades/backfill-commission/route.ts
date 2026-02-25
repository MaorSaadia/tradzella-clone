// app/api/trades/backfill-commission/route.ts
// POST to backfill fees on existing trades that have commission = 0
// Body: { totalFees: 193.36 }  ← paste from your Tradovate statement
// Fees are distributed proportionally by contract qty across all your trades

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { trades } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const totalFees: number = parseFloat(body.totalFees) || 0

  if (totalFees <= 0) {
    return NextResponse.json({ error: 'Provide totalFees > 0' }, { status: 400 })
  }

  // Fetch all trades for this user with no commission set
  const userTrades = await db
    .select({ id: trades.id, qty: trades.qty, commission: trades.commission })
    .from(trades)
    .where(eq(trades.userId, session.user.id))

  const toUpdate = userTrades.filter(t =>
    !t.commission || Number(t.commission) === 0
  )

  if (toUpdate.length === 0) {
    return NextResponse.json({ message: 'No trades need updating', updated: 0 })
  }

  // Distribute fees proportionally by qty
  const totalQty = toUpdate.reduce((s, t) => s + Number(t.qty), 0)

  let updated = 0
  for (const trade of toUpdate) {
    const commission = ((totalFees * Number(trade.qty)) / totalQty).toFixed(2)
    await db
      .update(trades)
      .set({ commission, updatedAt: new Date() })
      .where(eq(trades.id, trade.id))
    updated++
  }

  return NextResponse.json({
    success: true,
    updated,
    totalFees,
    message: `Updated ${updated} trades. Total fees $${totalFees} distributed across ${totalQty} contracts.`,
  })
}