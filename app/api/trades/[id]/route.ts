/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/trades/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { trades } from '@/lib/db/schema'
import { normalizePlaybookIds } from '@/lib/playbooks'
import { eq, and } from 'drizzle-orm'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { id } = await params
    const body = await req.json()
    const {
      notes, tags, grade, emotion, screenshot,
      playbookId, playbookIds, isMistake,
      propFirmAccountId,
    } = body

    const normalizedPlaybookIds = playbookIds !== undefined
      ? normalizePlaybookIds(playbookIds)
      : undefined
    const normalizedSinglePlaybookId =
      playbookId !== undefined ? (typeof playbookId === 'string' && playbookId ? playbookId : null) : undefined
    const finalPlaybookIds = normalizedPlaybookIds
      ?? (normalizedSinglePlaybookId !== undefined
        ? (normalizedSinglePlaybookId ? [normalizedSinglePlaybookId] : [])
        : undefined)
    const finalPrimaryPlaybookId = finalPlaybookIds
      ? (finalPlaybookIds[0] ?? null)
      : normalizedSinglePlaybookId

    const [updated] = await db.update(trades)
      .set({
        ...(notes !== undefined && { notes }),
        ...(tags !== undefined && { tags }),
        ...(grade !== undefined && { grade }),
        ...(emotion !== undefined && { emotion }),
        ...(screenshot !== undefined && { screenshot }),
        ...(finalPlaybookIds !== undefined && { playbookIds: finalPlaybookIds }),
        ...(finalPrimaryPlaybookId !== undefined && { playbookId: finalPrimaryPlaybookId }),
        ...(isMistake !== undefined && { isMistake }),
        ...(propFirmAccountId !== undefined && { propFirmAccountId: propFirmAccountId || null }),
        updatedAt: new Date(),
      })
      .where(and(eq(trades.id, id), eq(trades.userId, session.user.id)))
      .returning()

    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(updated)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
