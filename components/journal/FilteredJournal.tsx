'use client'

// components/journal/FilteredJournal.tsx

import { useMemo } from 'react'
import { useAccount } from '@/components/layout/AccountContext'
import { TradeJournalClient } from './TradeJournalClient'
import type { Trade } from '@/lib/db/schema'

export function FilteredJournal({ allTrades }: { allTrades: Trade[] }) {
  const { selected } = useAccount()

  const trades = useMemo(() => {
    if (!selected) return allTrades
    return allTrades.filter(t => t.propFirmAccountId === selected.id)
  }, [allTrades, selected])

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Trade Journal</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {selected
            ? `${selected.firmName} · ${selected.label} · ${trades.length} trades`
            : `All accounts · ${trades.length} trades`
          }
          {' '}· click any row to add notes, tags and grade
        </p>
      </div>
      <TradeJournalClient trades={trades} />
    </div>
  )
}