'use client'

// components/dashboard/FilteredDashboard.tsx

import { useMemo } from 'react'
import { useAccount } from '@/components/layout/AccountContext'
import { StatsCards } from './StatsCards'
import { PnLChart } from './PnLChart'
import { WinLossChart } from './WinLossChart'
import { RecentTrades } from './RecentTrades'
import { ConnectBanner } from './ConnectBanner'
import { Switch } from '@/components/ui/switch'
import type { Trade } from '@/lib/db/schema'
import { consolidateTradesAsTrades } from '@/lib/consolidateTrades'
import { useJournalConsolidatePartials } from '@/lib/useJournalConsolidatePartials'

interface Props {
  allTrades: Trade[]
  isConnected: boolean
}

export function FilteredDashboard({ allTrades, isConnected }: Props) {
  const { selected } = useAccount()
  const { consolidatePartials, updateConsolidatePartials } = useJournalConsolidatePartials()

  const trades = useMemo(() => {
    if (!selected) return allTrades
    return allTrades.filter(t => t.propFirmAccountId === selected.id)
  }, [allTrades, selected])

  const displayTrades = useMemo(() => {
    if (!consolidatePartials) return trades
    return consolidateTradesAsTrades(trades)
  }, [trades, consolidatePartials])

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
        <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border px-3 h-9">
          <Switch checked={consolidatePartials} onCheckedChange={updateConsolidatePartials} />
          <span className="text-xs font-semibold">Consolidate partials</span>
        </div>
      </div>

      {selected && displayTrades.length === 0 && allTrades.length > 0 && (
        <div className="text-xs rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-500 px-3 py-2">
          No trades are linked to this account yet. Switch to <strong>All Accounts</strong> or re-import while this account is selected.
        </div>
      )}

      {!isConnected && displayTrades.length === 0 && <ConnectBanner />}

      {/* Pass trades directly, StatsCards calls calcStats internally */}
      <StatsCards trades={displayTrades} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PnLChart trades={displayTrades} />
        </div>
        <WinLossChart trades={displayTrades} />
      </div>

      <RecentTrades trades={displayTrades} />
    </div>
  )
}
