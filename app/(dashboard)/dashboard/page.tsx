// app/(dashboard)/dashboard/page.tsx

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { trades, tradovateAccounts } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { FilteredDashboard } from '@/components/dashboard/FilteredDashboard'

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const allTrades = await db.query.trades.findMany({
    where: eq(trades.userId, session.user.id),
    orderBy: [desc(trades.exitTime)],
  })

  const tradovateAccount = await db.query.tradovateAccounts.findFirst({
    where: eq(tradovateAccounts.userId, session.user.id),
  })

  const isConnected = !!tradovateAccount

  return <FilteredDashboard allTrades={allTrades} isConnected={isConnected} />
}