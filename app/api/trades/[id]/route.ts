/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/trades/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { trades } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

const patchSchema = z.object({
  grade: z.enum(['A+', 'A', 'B', 'C', 'D']).nullable().optional(),
  emotion: z.enum(['calm', 'fomo', 'revenge', 'confident', 'anxious', 'neutral']).nullable().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await req.json()
    const data = patchSchema.parse(body)

    const [updated] = await db
      .update(trades)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(trades.id, id),
          eq(trades.userId, session.user.id) // ensure user owns this trade
        )
      )
      .returning()

    if (!updated) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, trade: updated })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    console.error('[trade patch] Error:', error.message)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}