import type { Trade } from '@/lib/db/schema'

export function normalizePlaybookIds(input: unknown): string[] {
  if (!Array.isArray(input)) return []
  return Array.from(
    new Set(
      input.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    )
  )
}

export function getTradePlaybookIds(trade: Pick<Trade, 'playbookId' | 'playbookIds'>): string[] {
  const fromArray = normalizePlaybookIds(trade.playbookIds)
  if (fromArray.length > 0) return fromArray
  return trade.playbookId ? [trade.playbookId] : []
}

export function getPrimaryPlaybookId(trade: Pick<Trade, 'playbookId' | 'playbookIds'>): string | null {
  const ids = getTradePlaybookIds(trade)
  return ids[0] ?? null
}
