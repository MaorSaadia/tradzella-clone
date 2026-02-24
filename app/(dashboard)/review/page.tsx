/* eslint-disable @typescript-eslint/no-explicit-any */
// app/(dashboard)/review/page.tsx — UPDATED with saved reviews

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { trades, weeklyReviews } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { WeeklyReviewClient } from '@/components/review/WeeklyReviewClient'

export default async function ReviewPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const [allTrades, savedReviews] = await Promise.all([
    db.query.trades.findMany({
      where: eq(trades.userId, session.user.id),
      orderBy: [desc(trades.exitTime)],
    }),
    db
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
        reviewData:      weeklyReviews.reviewData,
      })
      .from(weeklyReviews)
      .where(eq(weeklyReviews.userId, session.user.id))
      .orderBy(desc(weeklyReviews.weekStart)),
  ])

  const tradeCount = allTrades.length
  const earliestDate = allTrades.length
    ? new Date(allTrades[allTrades.length - 1].exitTime)
    : new Date()

  return (
    <div className="max-w-5xl mx-auto">
      <WeeklyReviewClient
        tradeCount={tradeCount}
        earliestDate={earliestDate.toISOString()}
        initialSavedReviews={savedReviews as any}
      />
    </div>
  )
}