// app/(dashboard)/compare/page.tsx

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { propFirms, trades } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { MultiAccountComparison } from '@/components/compare/MultiAccountComparison'

export default async function ComparePage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const firms = await db.query.propFirms.findMany({
    where: eq(propFirms.userId, session.user.id),
    with: { accounts: true },
  })

  const allTrades = await db.query.trades.findMany({
    where: eq(trades.userId, session.user.id),
    orderBy: [desc(trades.exitTime)],
  })

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Account Comparison</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Side-by-side performance across all your prop firm accounts
        </p>
      </div>
      <MultiAccountComparison firms={firms} allTrades={allTrades} />
    </div>
  )
}