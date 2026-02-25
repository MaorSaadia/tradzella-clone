/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/trades/import/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { trades } from '@/lib/db/schema'
import { and, eq, isNull } from 'drizzle-orm'
import { z } from 'zod'

const tradeSchema = z.object({
  symbol: z.string(),
  side: z.enum(['long', 'short']),
  entryPrice: z.string(),
  exitPrice: z.string(),
  qty: z.number(),
  pnl: z.string(),
  commission: z.string().optional(),
  entryTime: z.string(),
  exitTime: z.string(),
  tradovateTradeId: z.string(),
  propFirmAccountId: z.string().uuid().nullable().optional(),
})

const importSchema = z.object({
  trades: z.array(tradeSchema).min(1).max(5000),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { trades: incoming } = importSchema.parse(body)

    let imported = 0, skipped = 0, linked = 0

    for (const trade of incoming) {
      try {
        const result = await db.insert(trades).values({
          userId: session.user.id,
          tradovateTradeId: trade.tradovateTradeId,
          symbol: trade.symbol,
          side: trade.side,
          entryPrice: trade.entryPrice,
          exitPrice: trade.exitPrice,
          qty: trade.qty,
          pnl: trade.pnl,
          commission: trade.commission ?? '0',
          entryTime: new Date(trade.entryTime),
          exitTime: new Date(trade.exitTime),
          propFirmAccountId: trade.propFirmAccountId ?? null,
          tags: [],
          notes: '',
        }).onConflictDoNothing()

        if (result.rowCount && result.rowCount > 0) {
          imported++
          continue
        }

        // Already exists: if client sent a prop account, link existing unlinked trade.
        if (trade.propFirmAccountId) {
          const linkResult = await db
            .update(trades)
            .set({ propFirmAccountId: trade.propFirmAccountId, updatedAt: new Date() })
            .where(and(
              eq(trades.userId, session.user.id),
              eq(trades.tradovateTradeId, trade.tradovateTradeId),
              isNull(trades.propFirmAccountId),
            ))
          if (linkResult.rowCount && linkResult.rowCount > 0) {
            linked++
            continue
          }
        }

        skipped++
      } catch { skipped++ }
    }

    return NextResponse.json({ success: true, imported, linked, skipped, total: incoming.length })
  } catch (error: any) {
    if (error.name === 'ZodError') return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    return NextResponse.json({ error: 'Import failed' }, { status: 500 })
  }
}
