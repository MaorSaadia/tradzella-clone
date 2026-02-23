'use client'

// components/dashboard/FilteredDashboard.tsx

import { useMemo } from 'react'
import { useAccount } from '@/components/layout/AccountContext'
import { StatsCards } from './StatsCards'
import { PnLChart } from './PnLChart'
import { WinLossChart } from './WinLossChart'
import { RecentTrades } from './RecentTrades'
import { ConnectBanner } from './ConnectBanner'
import type { Trade } from '@/lib/db/schema'

interface Props {
  allTrades: Trade[]
  isConnected: boolean
}

export function FilteredDashboard({ allTrades, isConnected }: Props) {
  const { selected } = useAccount()

  // Filter trades based on selected account
  const trades = useMemo(() => {
    if (!selected) return allTrades
    return allTrades.filter(t => t.propFirmAccountId === selected.id)
  }, [allTrades, selected])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {selected
            ? `${selected.firmName} · ${selected.label}`
            : 'All accounts combined'
          }
        </p>
      </div>

      {!isConnected && trades.length === 0 && <ConnectBanner />}

      {/* Pass trades directly — StatsCards calls calcStats internally */}
      <StatsCards trades={trades} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PnLChart trades={trades} />
        </div>
        <WinLossChart trades={trades} />
      </div>

      <RecentTrades trades={trades} />
    </div>
  )
}