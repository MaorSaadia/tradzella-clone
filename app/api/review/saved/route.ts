/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/review/saved/route.ts
// GET  — list all saved reviews for the user
// POST — save a new review (or overwrite same week)

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { weeklyReviews } from '@/lib/db/schema'
import { eq, desc, and, gte, lte } from 'drizzle-orm'

// ── GET — fetch all saved reviews ─────────────────────────
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const reviews = await db
    .select({
      id:              weeklyReviews.id,
      weekLabel:       weeklyReviews.weekLabel,
      weekStart:       weeklyReviews.weekStart,
      weekEnd:         weeklyReviews.weekEnd,
      overallScore:    weeklyReviews.overallScore,
      disciplineScore: weeklyReviews.disciplineScore,
      headline:        weeklyReviews.headline,
      tradeCount:      weeklyReviews.tradeCount,
      netPnl:          weeklyReviews.netPnl,
      createdAt:       weeklyReviews.createdAt,
    })
    .from(weeklyReviews)
    .where(eq(weeklyReviews.userId, session.user.id))
    .orderBy(desc(weeklyReviews.weekStart))

  return NextResponse.json(reviews)
}

// ── POST — save or overwrite a review ─────────────────────
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const {
      weekStart, weekEnd, weekLabel,
      overallScore, disciplineScore, headline,
      reviewData, tradeCount, netPnl,
    } = body

    if (!weekStart || !weekEnd || !reviewData) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const start = new Date(weekStart)
    const end   = new Date(weekEnd)

    // Check if a review for this exact week already exists
    const existing = await db
      .select({ id: weeklyReviews.id })
      .from(weeklyReviews)
      .where(
        and(
          eq(weeklyReviews.userId, session.user.id),
          gte(weeklyReviews.weekStart, start),
          lte(weeklyReviews.weekEnd, end),
        )
      )
      .limit(1)

    let saved

    if (existing.length > 0) {
      // Overwrite — update the existing row
      const [updated] = await db
        .update(weeklyReviews)
        .set({
          weekLabel, overallScore, disciplineScore, headline,
          reviewData, tradeCount, netPnl: netPnl?.toString(),
          updatedAt: new Date(),
        })
        .where(eq(weeklyReviews.id, existing[0].id))
        .returning()
      saved = updated
    } else {
      // New week — insert
      const [inserted] = await db
        .insert(weeklyReviews)
        .values({
          userId: session.user.id,
          weekStart: start,
          weekEnd: end,
          weekLabel,
          overallScore,
          disciplineScore,
          headline,
          reviewData,
          tradeCount,
          netPnl: netPnl?.toString(),
        })
        .returning()
      saved = inserted
    }

    return NextResponse.json(saved, { status: 201 })
  } catch (e: any) {
    console.error('Save review error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}