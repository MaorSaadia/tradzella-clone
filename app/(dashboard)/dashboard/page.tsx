// app/(dashboard)/dashboard/page.tsx

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { trades, tradovateAccounts } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { StatsCards } from '@/components/dashboard/StatsCards'
import { PnLChart } from '@/components/dashboard/PnLChart'
import { WinLossChart, SymbolChart } from '@/components/dashboard/WinLossChart'
import { RecentTrades } from '@/components/dashboard/RecentTrades'
import { ConnectBanner } from '@/components/dashboard/ConnectBanner'
import { formatDateTime } from '@/lib/utils'

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  // Fetch user's trades — newest first
  const userTrades = await db.query.trades.findMany({
    where: eq(trades.userId, session.user.id),
    orderBy: [desc(trades.exitTime)],
  })

  // Check if Tradovate is connected
  const connectedAccount = await db.query.tradovateAccounts.findFirst({
    where: eq(tradovateAccounts.userId, session.user.id),
  })

  const isConnected = !!connectedAccount
  const lastSync = connectedAccount?.lastSyncAt

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* Page title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isConnected
              ? `${connectedAccount.accountName ?? 'Account'} · ${connectedAccount.environment?.toUpperCase() ?? 'Unknown'} · Last sync: ${lastSync ? formatDateTime(lastSync) : 'Never'}`
              : 'Connect your Tradovate account to start syncing trades'
            }
          </p>
        </div>
      </div>

      {/* Connect prompt if not connected */}
      {!isConnected && <ConnectBanner />}

      {/* Stats */}
      <StatsCards trades={userTrades} />

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <PnLChart trades={userTrades} />
        </div>
        <WinLossChart trades={userTrades} />
      </div>

      {/* Symbol breakdown */}
      <SymbolChart trades={userTrades} />

      {/* Recent trades */}
      <RecentTrades trades={userTrades} />
    </div>
  )
}