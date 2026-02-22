/* eslint-disable @typescript-eslint/no-explicit-any */
// app/(dashboard)/propfirms/page.tsx

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { propFirms, trades } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { PropFirmDashboard } from '@/components/propfirms/PropFirmDashboard'

export default async function PropFirmsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  // Use separate queries to avoid `with` relation issues
  const firms = await db.query.propFirms.findMany({
    where: eq(propFirms.userId, session.user.id),
    with: {
      accounts: true,
    },
  })

  const allTrades = await db.query.trades.findMany({
    where: eq(trades.userId, session.user.id),
    orderBy: [desc(trades.exitTime)],
  })

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Prop Firm Tracker</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Track your challenges, rules, and progress across all firms
        </p>
      </div>
      <PropFirmDashboard firms={firms as any} allTrades={allTrades} />
    </div>
  )
}