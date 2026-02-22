/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/trades/import/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { trades } from '@/lib/db/schema'
import { z } from 'zod'

const tradeSchema = z.object({
  symbol: z.string(),
  side: z.enum(['long', 'short']),
  entryPrice: z.string(),
  exitPrice: z.string(),
  qty: z.number(),
  pnl: z.string(),
  entryTime: z.string(),
  exitTime: z.string(),
  tradovateTradeId: z.string(),
})

const importSchema = z.object({
  trades: z.array(tradeSchema).min(1).max(5000),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { trades: incoming } = importSchema.parse(body)

    let imported = 0
    let skipped = 0

    for (const trade of incoming) {
      try {
        const result = await db
          .insert(trades)
          .values({
            userId: session.user.id,
            tradovateTradeId: trade.tradovateTradeId,
            symbol: trade.symbol,
            side: trade.side,
            entryPrice: trade.entryPrice,
            exitPrice: trade.exitPrice,
            qty: trade.qty,
            pnl: trade.pnl,
            commission: '0',
            entryTime: new Date(trade.entryTime),
            exitTime: new Date(trade.exitTime),
            tags: [],
            notes: '',
          })
          .onConflictDoNothing() // skip if tradovateTradeId already exists

        if (result.rowCount && result.rowCount > 0) {
          imported++
        } else {
          skipped++
        }
      } catch {
        skipped++
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      total: incoming.length,
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    console.error('[import] Error:', error.message)
    return NextResponse.json({ error: 'Import failed' }, { status: 500 })
  }
}