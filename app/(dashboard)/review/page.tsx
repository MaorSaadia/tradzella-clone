/* eslint-disable @typescript-eslint/no-explicit-any */
// app/(dashboard)/review/page.tsx — passes propFirmAccountId for per-account filtering

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { trades, weeklyReviews } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { WeeklyReviewClient } from '@/components/review/WeeklyReviewClient'

interface Props {
  searchParams: Promise<{ accountId?: string }>
}

export default async function ReviewPage({ searchParams }: Props) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  // accountId comes from the global account switcher via URL search param
  // The layout/header should append ?accountId=xxx when navigating to /review
  // or you can read it from a cookie / server-side context — whatever your
  // AccountContext pattern uses. For simplicity we read it from searchParams.
  const resolvedSearchParams = await searchParams
  const propFirmAccountId = resolvedSearchParams?.accountId ?? null

  const [allTrades, savedReviews] = await Promise.all([
    db.query.trades.findMany({
      where: eq(trades.userId, session.user.id),
      orderBy: [desc(trades.exitTime)],
    }),
    db
      .select({
        id:                weeklyReviews.id,
        weekLabel:         weeklyReviews.weekLabel,
        weekStart:         weeklyReviews.weekStart,
        weekEnd:           weeklyReviews.weekEnd,
        overallScore:      weeklyReviews.overallScore,
        disciplineScore:   weeklyReviews.disciplineScore,
        headline:          weeklyReviews.headline,
        tradeCount:        weeklyReviews.tradeCount,
        netPnl:            weeklyReviews.netPnl,
        createdAt:         weeklyReviews.createdAt,
        reviewData:        weeklyReviews.reviewData,
        propFirmAccountId: weeklyReviews.propFirmAccountId,
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
        propFirmAccountId={propFirmAccountId}
      />
    </div>
  )
}
