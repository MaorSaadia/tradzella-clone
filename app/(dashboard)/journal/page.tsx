// app/(dashboard)/journal/page.tsx

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { trades } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { TradeJournalClient } from '@/components/journal/TradeJournalClient'

export default async function JournalPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const userTrades = await db.query.trades.findMany({
    where: eq(trades.userId, session.user.id),
    orderBy: [desc(trades.exitTime)],
  })

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Trade Journal</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {userTrades.length} trades · click any row to add notes, tags and grade
        </p>
      </div>
      <TradeJournalClient trades={userTrades} />
    </div>
  )
}