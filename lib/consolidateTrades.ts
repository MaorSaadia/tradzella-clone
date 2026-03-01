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
  playbookIds: string[]
  notes: string
  grade: Trade['grade']
  emotion: Trade['emotion']
  partials: PartialTrade[]
}

export function consolidateTrades(trades: Trade[]): ConsolidatedTrade[] {
  const groups = buildTradeGroups(trades)

  return groups.map(({ key, trades: groupedTrades }) => {
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
    const playbookIds = Array.from(new Set(
      ordered.flatMap(t => {
        const fromArray = Array.isArray(t.playbookIds) ? t.playbookIds : []
        if (fromArray.length > 0) return fromArray
        return t.playbookId ? [t.playbookId] : []
      })
    ))

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
      playbookIds,
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
    playbookIds: trade.playbookIds,
    playbookId: trade.playbookIds[0] ?? base.playbookId ?? null,
    notes: trade.notes,
    grade: trade.grade,
    emotion: trade.emotion,
  }
}

export function consolidateTradesAsTrades(trades: Trade[]): Trade[] {
  return consolidateTrades(trades).map(consolidatedTradeToTrade)
}

function getEntryIdentity(trade: Trade): string {
  const tradeId = trade.tradovateTradeId ?? ''

  // CSV imports: csv-<entryFillId>-<exitFillId>
  if (tradeId.startsWith('csv-')) {
    const parts = tradeId.split('-')
    const buyFillId = parts[1]
    const sellFillId = parts[2]
    const entryFillId = trade.side === 'long' ? buyFillId : sellFillId
    if (entryFillId) return `entry-fill:${entryFillId}`
  }

  // Tradovate sync: <entryFillId>-<exitFillId>
  const syncMatch = tradeId.match(/^(\d+)-(\d+)$/)
  if (syncMatch?.[1]) return `entry-fill:${syncMatch[1]}`

  // Fallback for manually created trades
  return `entry-price:${Number(trade.entryPrice).toFixed(4)}|entry-time:${new Date(trade.entryTime).getTime()}`
}

function parseFillPair(tradeId: string): [string, string] | null {
  if (!tradeId) return null

  if (tradeId.startsWith('csv-')) {
    const parts = tradeId.split('-')
    const first = parts[1]
    const second = parts[2]
    if (first && second) return [first, second]
    return null
  }

  const syncMatch = tradeId.match(/^(\d+)-(\d+)$/)
  if (syncMatch?.[1] && syncMatch[2]) return [syncMatch[1], syncMatch[2]]

  return null
}

function buildTradeGroups(trades: Trade[]): Array<{ key: string; trades: Trade[] }> {
  const byBucket = new Map<string, Trade[]>()
  for (const trade of trades) {
    const bucket = `${trade.symbol}|${trade.side}`
    const list = byBucket.get(bucket)
    if (list) list.push(trade)
    else byBucket.set(bucket, [trade])
  }

  const groups: Array<{ key: string; trades: Trade[] }> = []

  for (const [bucket, bucketTrades] of byBucket.entries()) {
    const tradesWithPairs: Array<{ trade: Trade; pair: [string, string] }> = []
    const fallbackTrades: Trade[] = []

    for (const trade of bucketTrades) {
      const pair = parseFillPair(trade.tradovateTradeId ?? '')
      if (pair) tradesWithPairs.push({ trade, pair })
      else fallbackTrades.push(trade)
    }

    if (tradesWithPairs.length > 0) {
      const fillToTradeIndexes = new Map<string, number[]>()
      tradesWithPairs.forEach(({ pair }, index) => {
        for (const fillId of pair) {
          const existing = fillToTradeIndexes.get(fillId) ?? []
          existing.push(index)
          fillToTradeIndexes.set(fillId, existing)
        }
      })

      const visited = new Set<number>()
      for (let i = 0; i < tradesWithPairs.length; i++) {
        if (visited.has(i)) continue

        const stack = [i]
        visited.add(i)
        const componentIndexes: number[] = []
        const componentFillIds = new Set<string>()

        while (stack.length > 0) {
          const idx = stack.pop() as number
          componentIndexes.push(idx)
          const [fillA, fillB] = tradesWithPairs[idx].pair
          componentFillIds.add(fillA)
          componentFillIds.add(fillB)

          for (const fillId of [fillA, fillB]) {
            const linked = fillToTradeIndexes.get(fillId) ?? []
            for (const linkedIdx of linked) {
              if (!visited.has(linkedIdx)) {
                visited.add(linkedIdx)
                stack.push(linkedIdx)
              }
            }
          }
        }

        const componentTrades = componentIndexes.map(idx => tradesWithPairs[idx].trade)
        const sortedFillIds = Array.from(componentFillIds).sort()
        groups.push({
          key: `${bucket}|fills:${sortedFillIds.join(',')}`,
          trades: componentTrades,
        })
      }
    }

    const fallbackGroups = new Map<string, Trade[]>()
    for (const trade of fallbackTrades) {
      const fallbackKey = `${bucket}|${getEntryIdentity(trade)}`
      const existing = fallbackGroups.get(fallbackKey)
      if (existing) existing.push(trade)
      else fallbackGroups.set(fallbackKey, [trade])
    }

    for (const [key, groupedTrades] of fallbackGroups.entries()) {
      groups.push({ key, trades: groupedTrades })
    }
  }

  return groups
}
