// app/(dashboard)/analytics/page.tsx

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { trades } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { FilteredAnalytics } from '@/components/analytics/FilteredAnalytics'

export default async function AnalyticsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const allTrades = await db.query.trades.findMany({
    where: eq(trades.userId, session.user.id),
    orderBy: [desc(trades.exitTime)],
  })

  return <FilteredAnalytics allTrades={allTrades} />
}