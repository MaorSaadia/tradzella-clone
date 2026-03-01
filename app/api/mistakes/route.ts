/* eslint-disable @typescript-eslint/no-explicit-any */
// ════════════════════════════════════════════════════════
// app/api/mistakes/route.ts
// ════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { tradeMistakes, trades } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'

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
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'Missing mistake id' }, { status: 400 })

    const mistake = await db.query.tradeMistakes.findFirst({
      where: and(eq(tradeMistakes.id, id), eq(tradeMistakes.userId, session.user.id)),
    })
    if (!mistake) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await db.delete(tradeMistakes)
      .where(and(eq(tradeMistakes.id, id), eq(tradeMistakes.userId, session.user.id)))

    const stillHasMistakes = await db.query.tradeMistakes.findFirst({
      where: and(
        eq(tradeMistakes.tradeId, mistake.tradeId),
        eq(tradeMistakes.userId, session.user.id)
      ),
    })

    if (!stillHasMistakes) {
      await db.update(trades)
        .set({ isMistake: false, updatedAt: new Date() })
        .where(and(eq(trades.id, mistake.tradeId), eq(trades.userId, session.user.id)))
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
