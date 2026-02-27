import type { Trade } from '@/lib/db/schema'
import { getTradeTotalPnl } from '@/lib/utils'

export type PartialTrade = {
  id: string
  qty: number
  exitPrice: number
  exitTime: Date | string
  pnl: number
}

export type ConsolidatedTrade = {
  key: string
  representative: Trade
  symbol: string
  side: Trade['side']
  entryPrice: number
  entryTime: Date | string
  avgExitPrice: number
  exitTime: Date | string
  qty: number
  pnl: number
  tags: string[]
  notes: string
  grade: Trade['grade']
  emotion: Trade['emotion']
  partials: PartialTrade[]
}

export function consolidateTrades(trades: Trade[]): ConsolidatedTrade[] {
  const groups = new Map<string, Trade[]>()
  for (const trade of trades) {
    const key = [
      trade.symbol,
      trade.side,
      Number(trade.entryPrice).toFixed(4),
      new Date(trade.entryTime).getTime().toString(),
    ].join('|')
    const existing = groups.get(key)
    if (existing) existing.push(trade)
    else groups.set(key, [trade])
  }

  return Array.from(groups.entries()).map(([key, groupedTrades]) => {
    const ordered = [...groupedTrades].sort(
      (a, b) => new Date(a.exitTime).getTime() - new Date(b.exitTime).getTime()
    )

    const representative =
      ordered.find(t => (t.notes?.trim()?.length ?? 0) > 0) ??
      ordered.find(t => (t.tags?.length ?? 0) > 0) ??
      ordered.find(t => !!t.screenshot) ??
      ordered[0]

    const qty = ordered.reduce((sum, t) => sum + t.qty, 0)
    const weightedExit = ordered.reduce((sum, t) => sum + Number(t.exitPrice) * t.qty, 0)
    const pnl = ordered.reduce((sum, t) => sum + getTradeTotalPnl(t), 0)
    const latestExit = ordered[ordered.length - 1]?.exitTime ?? representative.exitTime

    const tags = Array.from(
      new Set(ordered.flatMap(t => t.tags ?? []))
    )

    const notes = ordered
      .map(t => t.notes?.trim())
      .filter((n): n is string => !!n)
      .join(' | ')

    const grade =
      ordered.find(t => !!t.grade)?.grade ??
      representative.grade ??
      null

    const emotion =
      ordered.find(t => !!t.emotion)?.emotion ??
      representative.emotion ??
      null

    const partials: PartialTrade[] = ordered.map(t => ({
      id: t.id,
      qty: t.qty,
      exitPrice: Number(t.exitPrice),
      exitTime: t.exitTime,
      pnl: getTradeTotalPnl(t),
    }))

    return {
      key,
      representative,
      symbol: representative.symbol,
      side: representative.side,
      entryPrice: Number(representative.entryPrice),
      entryTime: representative.entryTime,
      avgExitPrice: qty > 0 ? weightedExit / qty : Number(representative.exitPrice),
      exitTime: latestExit,
      qty,
      pnl,
      tags,
      notes,
      grade,
      emotion,
      partials,
    }
  })
}

export function consolidatedTradeToTrade(trade: ConsolidatedTrade): Trade {
  const base = trade.representative
  return {
    ...base,
    tradovateTradeId: `consolidated-${base.id}`,
    qty: trade.qty,
    pnl: trade.pnl.toFixed(2),
    commission: '0',
    exitPrice: trade.avgExitPrice.toFixed(4),
    exitTime: trade.exitTime,
    tags: trade.tags,
    notes: trade.notes,
    grade: trade.grade,
    emotion: trade.emotion,
  }
}

export function consolidateTradesAsTrades(trades: Trade[]): Trade[] {
  return consolidateTrades(trades).map(consolidatedTradeToTrade)
}
