'use client'

// components/journal/FilteredJournal.tsx

import { useMemo } from 'react'
import { useAccount } from '@/components/layout/AccountContext'
import { TradeJournalClient } from './TradeJournalClient'
import type { Trade } from '@/lib/db/schema'
import { consolidateTrades } from '@/lib/consolidateTrades'
import { useJournalConsolidatePartials } from '@/lib/useJournalConsolidatePartials'

export function FilteredJournal({ allTrades }: { allTrades: Trade[] }) {
  const { selected } = useAccount()
  const { consolidatePartials, updateConsolidatePartials } = useJournalConsolidatePartials()

  const trades = useMemo(() => {
    if (!selected) return allTrades
    return allTrades.filter(t => t.propFirmAccountId === selected.id)
  }, [allTrades, selected])

  const displayCount = useMemo(() => {
    if (!consolidatePartials) return trades.length
    return consolidateTrades(trades).length
  }, [trades, consolidatePartials])

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Trade Journal</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {selected
            ? `${selected.firmName} - ${selected.label} - ${displayCount} trades`
            : `All accounts - ${displayCount} trades`
          }
          {' '} - click any row to add notes, tags and grade
        </p>
      </div>
      <TradeJournalClient
        trades={trades}
        consolidatePartials={consolidatePartials}
        onConsolidatePartialsChange={updateConsolidatePartials}
      />
    </div>
  )
}
