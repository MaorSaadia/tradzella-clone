/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/playbooks/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { playbooks, trades } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await req.json()
    const { name, description, category, emoji, color, entryRules, exitRules, riskRules, idealRR, maxLossPerTrade, status } = body
    const [pb] = await db.update(playbooks)
      .set({
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(category !== undefined && { category }),
        ...(emoji && { emoji }),
        ...(color && { color }),
        ...(entryRules && { entryRules }),
        ...(exitRules && { exitRules }),
        ...(riskRules && { riskRules }),
        ...(idealRR !== undefined && { idealRR: idealRR?.toString() ?? null }),
        ...(maxLossPerTrade !== undefined && { maxLossPerTrade: maxLossPerTrade?.toString() ?? null }),
        ...(status && { status }),
        updatedAt: new Date(),
      })
      .where(and(eq(playbooks.id, params.id), eq(playbooks.userId, session.user.id)))
      .returning()
    if (!pb) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(pb)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // Unlink trades
  await db.update(trades)
    .set({ playbookId: null })
    .where(eq(trades.playbookId, params.id))
  await db.delete(playbooks)
    .where(and(eq(playbooks.id, params.id), eq(playbooks.userId, session.user.id)))
  return NextResponse.json({ success: true })
}