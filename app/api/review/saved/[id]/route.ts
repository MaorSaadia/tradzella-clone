// app/api/review/saved/[id]/route.ts — GET + DELETE + PATCH (reassign account)

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { weeklyReviews } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const [review] = await db
    .select()
    .from(weeklyReviews)
    .where(and(eq(weeklyReviews.id, id), eq(weeklyReviews.userId, session.user.id)))
    .limit(1)

  if (!review) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(review)
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const result = await db
    .delete(weeklyReviews)
    .where(and(eq(weeklyReviews.id, id), eq(weeklyReviews.userId, session.user.id)))
    .returning({ id: weeklyReviews.id })

  if (result.length === 0) {
    return NextResponse.json({ error: 'Not found or already deleted' }, { status: 404 })
  }

  return NextResponse.json({ success: true, id: result[0].id })
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { propFirmAccountId } = await req.json()

  const [updated] = await db
    .update(weeklyReviews)
    .set({ propFirmAccountId: propFirmAccountId ?? null, updatedAt: new Date() })
    .where(and(eq(weeklyReviews.id, id), eq(weeklyReviews.userId, session.user.id)))
    .returning()

  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(updated)
}