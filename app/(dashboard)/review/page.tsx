// app/(dashboard)/review/page.tsx

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { trades } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { WeeklyReviewClient } from '@/components/review/WeeklyReviewClient'

export default async function ReviewPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  // Get the earliest and latest trade dates so we know what weeks are available
  const allTrades = await db.query.trades.findMany({
    where: eq(trades.userId, session.user.id),
    orderBy: [desc(trades.exitTime)],
  })

  const tradeCount = allTrades.length
  const earliestDate = allTrades.length
    ? new Date(allTrades[allTrades.length - 1].exitTime)
    : new Date()

  return (
    <div className="max-w-4xl mx-auto">
      <WeeklyReviewClient
        tradeCount={tradeCount}
        earliestDate={earliestDate.toISOString()}
      />
    </div>
  )
}