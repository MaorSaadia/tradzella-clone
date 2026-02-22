/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/propfirms/accounts/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { propFirmAccounts, trades } from '@/lib/db/schema'
import {  inArray } from 'drizzle-orm'
import { z } from 'zod'

const accountSchema = z.object({
  firmId: z.string().uuid(),
  accountLabel: z.string().min(1),
  accountSize: z.number().positive(),
  stage: z.enum(['evaluation', 'phase2', 'funded']).default('evaluation'),
  profitTarget: z.number().nullable().optional(),
  maxDrawdown: z.number().nullable().optional(),
  dailyLossLimit: z.number().nullable().optional(),
  minTradingDays: z.number().nullable().optional(),
  maxTradingDays: z.number().nullable().optional(),
  isTrailingDrawdown: z.boolean().default(false),
  consistencyRule: z.boolean().default(false),
  newsTrading: z.boolean().default(true),
  weekendHolding: z.boolean().default(false),
  notes: z.string().optional(),
  linkedTradeIds: z.array(z.string()).optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { linkedTradeIds, ...data } = accountSchema.parse(body)

    // Create account
    const [account] = await db.insert(propFirmAccounts).values({
      userId: session.user.id,
      propFirmId: data.firmId,
      accountLabel: data.accountLabel,
      accountSize: String(data.accountSize),
      stage: data.stage,
      profitTarget: data.profitTarget != null ? String(data.profitTarget) : null,
      maxDrawdown: data.maxDrawdown != null ? String(data.maxDrawdown) : null,
      dailyLossLimit: data.dailyLossLimit != null ? String(data.dailyLossLimit) : null,
      minTradingDays: data.minTradingDays ?? null,
      maxTradingDays: data.maxTradingDays ?? null,
      isTrailingDrawdown: data.isTrailingDrawdown,
      consistencyRule: data.consistencyRule,
      newsTrading: data.newsTrading,
      weekendHolding: data.weekendHolding,
      notes: data.notes ?? '',
      startDate: new Date(),
    }).returning()

    // Link selected trades to this account
    if (linkedTradeIds && linkedTradeIds.length > 0) {
      await db.update(trades)
        .set({ propFirmAccountId: account.id })
        .where(inArray(trades.id, linkedTradeIds))
    }

    return NextResponse.json({ success: true, account })
  } catch (error: any) {
    console.error('[propfirm account]', error)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}