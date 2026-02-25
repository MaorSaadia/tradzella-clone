/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

// components/journal/TradeJournalClient.tsx

import { useState, useMemo } from 'react'
import {
  Search, ArrowUpDown,
  ArrowUp, ArrowDown, ChevronLeft, ChevronRight
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { TradeNoteModal } from './TradeNoteModal'
import { cn, formatCurrency, formatDateTime, calcStats, getTradeTotalPnl } from '@/lib/utils'
import type { Trade } from '@/lib/db/schema'

const PAGE_SIZE = 20

type SortKey = 'exitTime' | 'pnl' | 'symbol' | 'qty'
type SortDir = 'asc' | 'desc'

const GRADE_COLORS: Record<string, string> = {
  'A+': 'border-emerald-500/50 text-emerald-500 bg-emerald-500/10',
  'A':  'border-emerald-500/30 text-emerald-400 bg-emerald-500/5',
  'B':  'border-blue-500/40 text-blue-400 bg-blue-500/8',
  'C':  'border-yellow-500/40 text-yellow-500 bg-yellow-500/8',
  'D':  'border-red-500/40 text-red-400 bg-red-500/8',
}

const EMOTION_ICONS: Record<string, string> = {
  calm: '😌', fomo: '😰', revenge: '😤',
  confident: '💪', anxious: '😟', neutral: '😐',
}

interface Props { trades: Trade[] }

export function TradeJournalClient({ trades }: Props) {
  const [search, setSearch] = useState('')
  const [sideFilter, setSideFilter] = useState<'all' | 'long' | 'short'>('all')
  const [resultFilter, setResultFilter] = useState<'all' | 'win' | 'loss'>('all')
  const [symbolFilter, setSymbolFilter] = useState('all')
  const [sortKey, setSortKey] = useState<SortKey>('exitTime')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(1)
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null)
  const [localTrades, setLocalTrades] = useState<Trade[]>(trades)

  // Unique symbols for filter dropdown
  const symbols = useMemo(() =>
    ['all', ...Array.from(new Set(localTrades.map(t => t.symbol))).sort()],
    [localTrades]
  )

  // Filter + sort
  const filtered = useMemo(() => {
    const result = localTrades.filter(t => {
      const pnl = getTradeTotalPnl(t)
      if (sideFilter !== 'all' && t.side !== sideFilter) return false
      if (resultFilter === 'win' && pnl <= 0) return false
      if (resultFilter === 'loss' && pnl >= 0) return false
      if (symbolFilter !== 'all' && t.symbol !== symbolFilter) return false
      if (search) {
        const q = search.toLowerCase()
        if (!t.symbol.toLowerCase().includes(q) &&
            !t.notes?.toLowerCase().includes(q) &&
            !t.tags?.some(tag => tag.toLowerCase().includes(q))) return false
      }
      return true
    })

    result.sort((a, b) => {
      let av: any, bv: any
      switch (sortKey) {
        case 'exitTime': av = new Date(a.exitTime).getTime(); bv = new Date(b.exitTime).getTime(); break
        case 'pnl':      av = getTradeTotalPnl(a); bv = getTradeTotalPnl(b); break
        case 'symbol':   av = a.symbol; bv = b.symbol; break
        case 'qty':      av = a.qty; bv = b.qty; break
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [localTrades, sideFilter, resultFilter, symbolFilter, search, sortKey, sortDir])

  // Stats for filtered set
  const stats = useMemo(() => calcStats(filtered as any), [filtered])

  // Pagination
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
    setPage(1)
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />
    return sortDir === 'asc'
      ? <ArrowUp className="w-3 h-3 ml-1 text-emerald-500" />
      : <ArrowDown className="w-3 h-3 ml-1 text-emerald-500" />
  }

  // Called after saving note in modal — update local state instantly
  function handleTradeUpdated(updated: Trade) {
    setLocalTrades(prev => prev.map(t => t.id === updated.id ? updated : t))
    setSelectedTrade(updated)
  }

  const activeFilters = [
    sideFilter !== 'all' && sideFilter,
    resultFilter !== 'all' && resultFilter,
    symbolFilter !== 'all' && symbolFilter,
    search && `"${search}"`,
  ].filter(Boolean)

  return (
    <>
      {/* ── Filter bar ── */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search symbol, notes, tags..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="pl-9 h-9 text-sm"
          />
        </div>

        {/* Symbol */}
        <Select value={symbolFilter} onValueChange={v => { setSymbolFilter(v); setPage(1) }}>
          <SelectTrigger className="h-9 w-28 text-xs">
            <SelectValue placeholder="Symbol" />
          </SelectTrigger>
          <SelectContent>
            {symbols.map(s => (
              <SelectItem key={s} value={s} className="text-xs">
                {s === 'all' ? 'All Symbols' : s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Side */}
        <div className="flex rounded-lg border border-border overflow-hidden text-xs font-semibold">
          {(['all', 'long', 'short'] as const).map(s => (
            <button key={s} onClick={() => { setSideFilter(s); setPage(1) }}
              className={cn('px-3 h-9 capitalize transition-colors',
                sideFilter === s ? 'bg-emerald-500/10 text-emerald-500' : 'text-muted-foreground hover:text-foreground'
              )}>
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>

        {/* Result */}
        <div className="flex rounded-lg border border-border overflow-hidden text-xs font-semibold">
          {(['all', 'win', 'loss'] as const).map(r => (
            <button key={r} onClick={() => { setResultFilter(r); setPage(1) }}
              className={cn('px-3 h-9 capitalize transition-colors',
                resultFilter === r
                  ? r === 'win' ? 'bg-emerald-500/10 text-emerald-500'
                    : r === 'loss' ? 'bg-red-500/10 text-red-500'
                    : 'bg-emerald-500/10 text-emerald-500'
                  : 'text-muted-foreground hover:text-foreground'
              )}>
              {r === 'all' ? 'All' : r === 'win' ? 'Winners' : 'Losers'}
            </button>
          ))}
        </div>

        {/* Clear */}
        {activeFilters.length > 0 && (
          <Button variant="ghost" size="sm" className="h-9 text-xs text-muted-foreground"
            onClick={() => { setSearch(''); setSideFilter('all'); setResultFilter('all'); setSymbolFilter('all'); setPage(1) }}>
            Clear filters
          </Button>
        )}

        {/* Result count */}
        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} trade{filtered.length !== 1 ? 's' : ''}
          {activeFilters.length > 0 && ' (filtered)'}
        </span>
      </div>

      {/* ── Filtered stats strip ── */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total P/L', value: formatCurrency(stats.netPnl), color: stats.netPnl >= 0 ? 'text-emerald-500' : 'text-red-500' },
            { label: 'Win Rate', value: `${stats.winRate.toFixed(1)}%`, color: 'text-blue-500' },
            { label: 'Avg Win', value: `+$${stats.avgWin.toFixed(2)}`, color: 'text-emerald-500' },
            { label: 'Avg Loss', value: `-$${stats.avgLoss.toFixed(2)}`, color: 'text-red-500' },
          ].map(s => (
            <Card key={s.label} className="py-0">
              <CardContent className="p-3 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{s.label}</span>
                <span className={cn('text-sm font-bold tabular-nums', s.color)}>{s.value}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Table ── */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {[
                  { label: 'Date / Time', key: 'exitTime' as SortKey },
                  { label: 'Symbol',      key: 'symbol' as SortKey },
                  { label: 'Side',        key: null },
                  { label: 'Entry',       key: null },
                  { label: 'Exit',        key: null },
                  { label: 'Qty',         key: 'qty' as SortKey },
                  { label: 'P&L',         key: 'pnl' as SortKey },
                  { label: 'Grade',       key: null },
                  { label: 'Tags',        key: null },
                  { label: 'Notes',       key: null },
                ].map(col => (
                  <th key={col.label}
                    className={cn(
                      'text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap',
                      col.key && 'cursor-pointer select-none hover:text-foreground'
                    )}
                    onClick={() => col.key && toggleSort(col.key)}
                  >
                    <span className="flex items-center">
                      {col.label}
                      {col.key && <SortIcon col={col.key} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-16 text-sm text-muted-foreground">
                    {localTrades.length === 0
                      ? 'No trades yet — import a CSV to get started'
                      : 'No trades match your filters'}
                  </td>
                </tr>
              ) : (
                paginated.map(trade => {
                  const pnl = getTradeTotalPnl(trade)
                  const isWin = pnl > 0
                  return (
                    <tr
                      key={trade.id}
                      className="border-b border-border/50 hover:bg-accent/40 cursor-pointer transition-colors group"
                      onClick={() => setSelectedTrade(trade)}
                    >
                      {/* Date */}
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateTime(trade.exitTime)}
                      </td>

                      {/* Symbol */}
                      <td className="px-4 py-3">
                        <span className="text-sm font-bold">{trade.symbol}</span>
                      </td>

                      {/* Side */}
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={cn(
                          'text-[10px] px-1.5 py-0 h-4',
                          trade.side === 'long'
                            ? 'border-emerald-500/40 text-emerald-500'
                            : 'border-red-500/40 text-red-500'
                        )}>
                          {trade.side.toUpperCase()}
                        </Badge>
                      </td>

                      {/* Entry */}
                      <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                        {Number(trade.entryPrice).toFixed(2)}
                      </td>

                      {/* Exit */}
                      <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                        {Number(trade.exitPrice).toFixed(2)}
                      </td>

                      {/* Qty */}
                      <td className="px-4 py-3 text-xs text-center">{trade.qty}</td>

                      {/* P&L */}
                      <td className={cn(
                        'px-4 py-3 text-sm font-bold tabular-nums',
                        isWin ? 'text-emerald-500' : 'text-red-500'
                      )}>
                        {formatCurrency(pnl)}
                      </td>

                      {/* Grade */}
                      <td className="px-4 py-3">
                        {trade.grade ? (
                          <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', GRADE_COLORS[trade.grade])}>
                            {trade.grade}
                          </Badge>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/40 group-hover:text-muted-foreground transition-colors">
                            + grade
                          </span>
                        )}
                      </td>

                      {/* Tags */}
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {trade.tags && trade.tags.length > 0 ? (
                            trade.tags.slice(0, 2).map(tag => (
                              <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                                {tag}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-[10px] text-muted-foreground/40 group-hover:text-muted-foreground transition-colors">
                              + tags
                            </span>
                          )}
                          {trade.tags && trade.tags.length > 2 && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                              +{trade.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      </td>

                      {/* Notes preview */}
                      <td className="px-4 py-3 max-w-40">
                        {trade.emotion && (
                          <span className="mr-1">{EMOTION_ICONS[trade.emotion]}</span>
                        )}
                        {trade.notes ? (
                          <span className="text-xs text-muted-foreground truncate block max-w-35">
                            {trade.notes}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/40 group-hover:text-muted-foreground transition-colors">
                            + note
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-7 w-7"
                onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce<(number | '...')[]>((acc, p, i, arr) => {
                  if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('...')
                  acc.push(p)
                  return acc
                }, [])
                .map((p, i) => p === '...' ? (
                  <span key={`dots-${i}`} className="text-xs text-muted-foreground px-1">…</span>
                ) : (
                  <Button key={p} variant={page === p ? 'default' : 'outline'}
                    size="icon" className="h-7 w-7 text-xs"
                    onClick={() => setPage(p as number)}>
                    {p}
                  </Button>
                ))
              }
              <Button variant="outline" size="icon" className="h-7 w-7"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Note modal */}
      <TradeNoteModal
        trade={selectedTrade}
        onClose={() => setSelectedTrade(null)}
        onSaved={handleTradeUpdated}
      />
    </>
  )
}
