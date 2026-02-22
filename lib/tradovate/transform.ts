// lib/tradovate/transform.ts

import type { TradovateFill } from '@/types'
import type { NewTrade } from '@/lib/db/schema'
import { cleanSymbol } from '@/lib/utils'

// ── Tick values per symbol ($ per full point) ─────────────
const TICK_VALUES: Record<string, number> = {
  NQ: 20,    // $20 per point
  MNQ: 2,    // $2 per point
  ES: 50,    // $50 per point
  MES: 5,    // $5 per point
  CL: 1000,  // $10 per tick = $1000 per point
  MCL: 100,
  GC: 100,   // $10 per tick = $100 per point
  MGC: 10,
  RTY: 50,
  M2K: 5,
  YM: 5,
  MYM: 0.5,
  ZB: 1000,
  ZN: 1000,
  ZF: 1000,
  SI: 5000,
  HG: 250,
}

function getPointValue(symbol: string): number {
  const clean = cleanSymbol(symbol)
  return TICK_VALUES[clean] ?? 1
}

// ── Group raw fills into complete trades ──────────────────
// Tradovate gives us individual fills (buy/sell events).
// We need to pair them up into entry + exit trades.
export function groupFillsIntoTrades(
  fills: TradovateFill[],
  tradovateAccountId: string,
  userId: string
): NewTrade[] {
  if (!fills || fills.length === 0) return []

  // Sort by timestamp ascending
  const sorted = [...fills].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )

  // Group fills by contractId
  const byContract: Record<number, TradovateFill[]> = {}
  for (const fill of sorted) {
    if (!byContract[fill.contractId]) byContract[fill.contractId] = []
    byContract[fill.contractId].push(fill)
  }

  const trades: NewTrade[] = []

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for (const [contractId, contractFills] of Object.entries(byContract)) {
    let openQty = 0
    let entryFill: TradovateFill | null = null
    let entryPrice = 0
    let entryTime: Date | null = null

    for (const fill of contractFills) {
      const isBuy = fill.action === 'Buy'
      const qty = fill.qty

      if (openQty === 0) {
        // Opening a new position
        entryFill = fill
        entryPrice = fill.price
        entryTime = new Date(fill.timestamp)
        openQty = isBuy ? qty : -qty
      } else {
        const isClosing = (openQty > 0 && !isBuy) || (openQty < 0 && isBuy)

        if (isClosing) {
          // Closing the position
          const exitPrice = fill.price
          const exitTime = new Date(fill.timestamp)
          const isLong = openQty > 0
          const closedQty = Math.min(Math.abs(openQty), qty)
          const pointValue = getPointValue(fill.contractId.toString())

          const rawPnl = isLong
            ? (exitPrice - entryPrice) * closedQty * pointValue
            : (entryPrice - exitPrice) * closedQty * pointValue

          const commission =
            (entryFill?.buyerCommission ?? 0) +
            (entryFill?.sellerCommission ?? 0) +
            (fill.buyerCommission ?? 0) +
            (fill.sellerCommission ?? 0)

          const pnl = rawPnl - commission

          trades.push({
            userId,
            tradovateAccountId,
            // Unique ID to prevent duplicates on re-sync
            tradovateTradeId: `${entryFill!.id}-${fill.id}`,
            symbol: cleanSymbol(fill.contractId.toString()),
            side: isLong ? 'long' : 'short',
            entryPrice: entryPrice.toString(),
            exitPrice: exitPrice.toString(),
            qty: closedQty,
            pnl: pnl.toFixed(2),
            commission: commission.toFixed(2),
            entryTime: entryTime!,
            exitTime,
            tags: [],
            notes: '',
          })

          openQty += isBuy ? qty : -qty
          if (openQty === 0) {
            entryFill = null
            entryPrice = 0
            entryTime = null
          }
        } else {
          // Adding to position (scaling in)
          const totalQty = Math.abs(openQty) + qty
          entryPrice =
            (entryPrice * Math.abs(openQty) + fill.price * qty) / totalQty
          openQty += isBuy ? qty : -qty
        }
      }
    }
  }

  return trades
}