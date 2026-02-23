'use client'

// components/analytics/FilteredAnalytics.tsx

import { useMemo } from 'react'
import { useAccount } from '@/components/layout/AccountContext'
import { AnalyticsClient } from './AnalyticsClient'
import type { Trade } from '@/lib/db/schema'

export function FilteredAnalytics({ allTrades }: { allTrades: Trade[] }) {
  const { selected } = useAccount()

  const trades = useMemo(() => {
    if (!selected) return allTrades
    return allTrades.filter(t => t.propFirmAccountId === selected.id)
  }, [allTrades, selected])

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {selected
            ? `${selected.firmName} · ${selected.label}`
            : 'All accounts combined'
          }
        </p>
      </div>
      <AnalyticsClient trades={trades} />
    </div>
  )
}