/* eslint-disable @typescript-eslint/no-explicit-any */
// ════════════════════════════════════════════════════════
// app/api/mistakes/route.ts
// ════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { tradeMistakes, trades } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { tradeId, mistakeType, description, severity } = await req.json()
    if (!tradeId || !mistakeType) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    // Mark the trade as a mistake
    await db.update(trades).set({ isMistake: true }).where(eq(trades.id, tradeId))

    const [mistake] = await db.insert(tradeMistakes).values({
      userId: session.user.id,
      tradeId,
      mistakeType,
      description: description ?? '',
      severity: severity ?? 2,
    }).returning()

    return NextResponse.json(mistake, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  await db.delete(tradeMistakes).where(eq(tradeMistakes.id, id))
  return NextResponse.json({ success: true })
}