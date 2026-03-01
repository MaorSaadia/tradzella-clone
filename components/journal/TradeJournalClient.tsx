/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

// components/journal/TradeJournalClient.tsx

import { Fragment, useEffect, useState, useMemo } from 'react'
import {
  Search, ArrowUpDown,
  ArrowUp, ArrowDown, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Upload
} from 'lucide-react'
import NextImage from 'next/image'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { TradeNoteModal } from './TradeNoteModal'
import { cn, formatCurrency, formatDateTime, calcStats, getTradeTotalPnl } from '@/lib/utils'
import type { Playbook, Trade } from '@/lib/db/schema'
import { getTradePlaybookIds } from '@/lib/playbooks'
import { consolidateTrades, type ConsolidatedTrade } from '@/lib/consolidateTrades'

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

interface Props {
  trades: Trade[]
  playbooks: Playbook[]
  consolidatePartials: boolean
  onConsolidatePartialsChange: (value: boolean) => void
}

export function TradeJournalClient({
  trades,
  playbooks,
  consolidatePartials,
  onConsolidatePartialsChange,
}: Props) {
  const [search, setSearch] = useState('')
  const [sideFilter, setSideFilter] = useState<'all' | 'long' | 'short'>('all')
  const [resultFilter, setResultFilter] = useState<'all' | 'win' | 'loss'>('all')
  const [symbolFilter, setSymbolFilter] = useState('all')
  const [strategyFilter, setStrategyFilter] = useState('all')
  const [sortKey, setSortKey] = useState<SortKey>('exitTime')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(1)
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null)
  const [selectedGroupTradeIds, setSelectedGroupTradeIds] = useState<string[]>([])
  const [draggingGroupKey, setDraggingGroupKey] = useState<string | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const [localTrades, setLocalTrades] = useState<Trade[]>(trades)

  useEffect(() => {
    setLocalTrades(trades)
  }, [trades])

  useEffect(() => {
    setExpandedGroups({})
    setPage(1)
  }, [consolidatePartials])

  const consolidatedTrades = useMemo<ConsolidatedTrade[]>(
    () => consolidateTrades(localTrades),
    [localTrades]
  )
  const playbookById = useMemo(
    () => new Map(playbooks.map(pb => [pb.id, pb] as const)),
    [playbooks]
  )

  // Unique symbols for filter dropdown
  const symbols = useMemo(() =>
    ['all', ...Array.from(new Set(
      (consolidatePartials ? consolidatedTrades : localTrades).map(t => t.symbol)
    )).sort()],
    [localTrades, consolidatedTrades, consolidatePartials]
  )

  // Filter + sort
  const filtered = useMemo(() => {
    const source = consolidatePartials ? consolidatedTrades : localTrades
    const result = source.filter(t => {
      const pnl = consolidatePartials ? (t as ConsolidatedTrade).pnl : getTradeTotalPnl(t as Trade)
      if (sideFilter !== 'all' && t.side !== sideFilter) return false
      if (resultFilter === 'win' && pnl <= 0) return false
      if (resultFilter === 'loss' && pnl >= 0) return false
      if (symbolFilter !== 'all' && t.symbol !== symbolFilter) return false
      if (strategyFilter !== 'all') {
        const strategyIds = consolidatePartials
          ? (t as ConsolidatedTrade).playbookIds
          : getTradePlaybookIds(t as Trade)
        if (strategyFilter === 'none' && strategyIds.length > 0) return false
        if (strategyFilter !== 'none' && !strategyIds.includes(strategyFilter)) return false
      }
      if (search) {
        const q = search.toLowerCase()
        const notes = (t.notes ?? '').toLowerCase()
        if (!t.symbol.toLowerCase().includes(q) &&
            !notes.includes(q) &&
            !t.tags?.some(tag => tag.toLowerCase().includes(q))) return false
      }
      return true
    })

    result.sort((a, b) => {
      let av: any, bv: any
      switch (sortKey) {
        case 'exitTime': av = new Date(a.exitTime).getTime(); bv = new Date(b.exitTime).getTime(); break
        case 'pnl':
          av = consolidatePartials ? (a as ConsolidatedTrade).pnl : getTradeTotalPnl(a as Trade)
          bv = consolidatePartials ? (b as ConsolidatedTrade).pnl : getTradeTotalPnl(b as Trade)
          break
        case 'symbol':   av = a.symbol; bv = b.symbol; break
        case 'qty':      av = a.qty; bv = b.qty; break
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [
    localTrades, consolidatedTrades, consolidatePartials, sideFilter,
    resultFilter, symbolFilter, strategyFilter, search, sortKey, sortDir
  ])

  // Stats for filtered set
  const stats = useMemo(() => {
    if (!consolidatePartials) return calcStats(filtered as Trade[])
    const consolidatedAsTrades = (filtered as ConsolidatedTrade[]).map(t => {
      const base = t.representative
      return {
        ...base,
        tradovateTradeId: `consolidated-${base.id}`,
        qty: t.qty,
        pnl: t.pnl.toFixed(2),
        commission: '0',
        exitPrice: t.avgExitPrice.toFixed(4),
        exitTime: t.exitTime,
        tags: t.tags,
        notes: t.notes,
        grade: t.grade,
        emotion: t.emotion,
        playbookIds: t.playbookIds,
        playbookId: t.playbookIds[0] ?? base.playbookId ?? null,
      } as Trade
    })
    return calcStats(consolidatedAsTrades)
  }, [filtered, consolidatePartials])

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
  async function handleTradeUpdated(updated: Trade) {
    const idsToSync = selectedGroupTradeIds.length > 0
      ? selectedGroupTradeIds
      : [updated.id]

    setLocalTrades(prev => prev.map(t => (
      idsToSync.includes(t.id)
        ? {
            ...t,
            notes: updated.notes,
            tags: updated.tags,
            grade: updated.grade,
            emotion: updated.emotion,
            screenshot: updated.screenshot,
            playbookIds: updated.playbookIds,
            playbookId: updated.playbookId,
          }
        : t
    )))

    const payload = {
      notes: updated.notes ?? '',
      tags: updated.tags ?? [],
      grade: updated.grade ?? null,
      emotion: updated.emotion ?? null,
      screenshot: updated.screenshot ?? null,
      playbookIds: getTradePlaybookIds(updated),
      playbookId: updated.playbookId ?? null,
    }

    const otherIds = idsToSync.filter(id => id !== updated.id)
    if (otherIds.length > 0) {
      await Promise.allSettled(
        otherIds.map(id => fetch(`/api/trades/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }))
      )
    }

    setSelectedTrade(updated)
  }

  function toggleGroupExpand(key: string) {
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }))
  }

  async function convertImageToDataUrl(file: File): Promise<string> {
    const objectUrl = URL.createObjectURL(file)
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new window.Image()
        image.onload = () => resolve(image)
        image.onerror = () => reject(new Error('Failed to read image'))
        image.src = objectUrl
      })

      const MAX_DIMENSION = 1600
      const ratio = Math.min(MAX_DIMENSION / img.width, MAX_DIMENSION / img.height, 1)
      const width = Math.max(1, Math.round(img.width * ratio))
      const height = Math.max(1, Math.round(img.height * ratio))

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Failed to prepare image canvas')
      ctx.drawImage(img, 0, 0, width, height)
      return canvas.toDataURL('image/jpeg', 0.82)
    } finally {
      URL.revokeObjectURL(objectUrl)
    }
  }

  async function processScreenshotFile(file: File): Promise<string | null> {
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file')
      return null
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image is too large. Max size is 10MB')
      return null
    }
    try {
      return await convertImageToDataUrl(file)
    } catch {
      toast.error('Failed to process screenshot')
      return null
    }
  }

  async function saveScreenshotForGroup(groupTradeIds: string[], screenshot: string | null) {
    setLocalTrades(prev => prev.map(t => (
      groupTradeIds.includes(t.id) ? { ...t, screenshot } : t
    )))

    const results = await Promise.allSettled(
      groupTradeIds.map(async id => {
        const res = await fetch(`/api/trades/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ screenshot }),
        })
        if (!res.ok) throw new Error('Failed')
      })
    )

    if (results.some(r => r.status === 'rejected')) {
      toast.error('Failed to save screenshot')
    } else {
      toast.success('Screenshot saved')
    }
  }

  async function handleDropScreenshot(
    e: React.DragEvent<HTMLDivElement>,
    groupKey: string,
    groupTradeIds: string[]
  ) {
    e.preventDefault()
    e.stopPropagation()
    setDraggingGroupKey(null)
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    const dataUrl = await processScreenshotFile(file)
    if (!dataUrl) return
    await saveScreenshotForGroup(groupTradeIds, dataUrl)
  }

  const activeFilters = [
    sideFilter !== 'all' && sideFilter,
    resultFilter !== 'all' && resultFilter,
    symbolFilter !== 'all' && symbolFilter,
    strategyFilter !== 'all' && (strategyFilter === 'none' ? 'no strategy' : (playbookById.get(strategyFilter)?.name ?? 'strategy')),
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

        {/* Strategy */}
        <Select value={strategyFilter} onValueChange={v => { setStrategyFilter(v); setPage(1) }}>
          <SelectTrigger className="h-9 w-40 text-xs">
            <SelectValue placeholder="Strategy" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Strategies</SelectItem>
            <SelectItem value="none" className="text-xs">No Strategy</SelectItem>
            {playbooks.map(pb => (
              <SelectItem key={pb.id} value={pb.id} className="text-xs">
                {pb.emoji} {pb.name}
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

        {/* Consolidate partials */}
        <div className="flex items-center gap-2 rounded-lg border border-border px-3 h-9">
          <Switch checked={consolidatePartials} onCheckedChange={onConsolidatePartialsChange} />
          <span className="text-xs font-semibold">Consolidate partials</span>
        </div>

        {/* Clear */}
        {activeFilters.length > 0 && (
          <Button variant="ghost" size="sm" className="h-9 text-xs text-muted-foreground"
            onClick={() => {
              setSearch('')
              setSideFilter('all')
              setResultFilter('all')
              setSymbolFilter('all')
              setStrategyFilter('all')
              setPage(1)
            }}>
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
                  { label: 'Strategies',  key: null },
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
                  <td colSpan={11} className="text-center py-16 text-sm text-muted-foreground">
                    {localTrades.length === 0
                      ? 'No trades yet — import a CSV to get started'
                      : 'No trades match your filters'}
                  </td>
                </tr>
              ) : (
                (paginated as Array<Trade | ConsolidatedTrade>).map(item => {
                  const isGrouped = consolidatePartials
                  const trade = isGrouped ? (item as ConsolidatedTrade).representative : (item as Trade)
                  const qty = isGrouped ? (item as ConsolidatedTrade).qty : trade.qty
                  const entryPrice = isGrouped ? (item as ConsolidatedTrade).entryPrice : Number(trade.entryPrice)
                  const exitPrice = isGrouped ? (item as ConsolidatedTrade).avgExitPrice : Number(trade.exitPrice)
                  const pnl = isGrouped ? (item as ConsolidatedTrade).pnl : getTradeTotalPnl(trade)
                  const exitTime = isGrouped ? (item as ConsolidatedTrade).exitTime : trade.exitTime
                  const tags = isGrouped ? (item as ConsolidatedTrade).tags : (trade.tags ?? [])
                  const notes = isGrouped ? (item as ConsolidatedTrade).notes : (trade.notes ?? '')
                  const grade = isGrouped ? (item as ConsolidatedTrade).grade : trade.grade
                  const emotion = isGrouped ? (item as ConsolidatedTrade).emotion : trade.emotion
                  const strategyIds = isGrouped
                    ? (item as ConsolidatedTrade).playbookIds
                    : getTradePlaybookIds(trade)
                  const groupKey = isGrouped ? (item as ConsolidatedTrade).key : null
                  const partials = isGrouped ? (item as ConsolidatedTrade).partials : []
                  const groupTradeIds = partials.map(p => p.id)
                  const groupScreenshot = isGrouped
                    ? (
                        groupTradeIds
                          .map(id => localTrades.find(t => t.id === id)?.screenshot)
                          .find((s): s is string => !!s) ?? trade.screenshot ?? ''
                      )
                    : (trade.screenshot ?? '')
                  const isExpanded = groupKey ? !!expandedGroups[groupKey] : false
                  const isWin = pnl > 0

                  return (
                    <Fragment key={groupKey ?? trade.id}>
                      <tr
                        className="border-b border-border/50 hover:bg-accent/40 transition-colors group"
                        onClick={() => {
                          if (isGrouped && groupKey) {
                            toggleGroupExpand(groupKey)
                          }
                        }}
                      >
                        {/* Date */}
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {isGrouped && groupKey && (
                            <button
                              onClick={e => {
                                e.stopPropagation()
                                toggleGroupExpand(groupKey)
                              }}
                              className="mr-1.5 inline-flex align-middle text-muted-foreground hover:text-foreground"
                              aria-label={isExpanded ? 'Collapse partials' : 'Expand partials'}
                            >
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          )}
                          {formatDateTime(exitTime)}
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
                          {entryPrice.toFixed(2)}
                        </td>

                        {/* Exit */}
                        <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                          {exitPrice.toFixed(2)}
                          {isGrouped && partials.length > 1 && (
                            <span className="block text-[10px] text-muted-foreground/70">
                              avg of {partials.length} partials
                            </span>
                          )}
                        </td>

                        {/* Qty */}
                        <td className="px-4 py-3 text-xs text-center">{qty}</td>

                        {/* P&L */}
                        <td className={cn(
                          'px-4 py-3 text-sm font-bold tabular-nums',
                          isWin ? 'text-emerald-500' : 'text-red-500'
                        )}>
                          {formatCurrency(pnl)}
                        </td>

                        {/* Grade */}
                        <td className="px-4 py-3">
                          {grade ? (
                            <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', GRADE_COLORS[grade])}>
                              {grade}
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
                            {tags.length > 0 ? (
                              tags.slice(0, 2).map(tag => (
                                <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                                  {tag}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-[10px] text-muted-foreground/40 group-hover:text-muted-foreground transition-colors">
                                + tags
                              </span>
                            )}
                            {tags.length > 2 && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                                +{tags.length - 2}
                              </Badge>
                            )}
                          </div>
                        </td>

                        {/* Strategies */}
                        <td className="px-4 py-3">
                          <div className="flex gap-1 flex-wrap">
                            {strategyIds.length > 0 ? (
                              strategyIds.slice(0, 2).map(id => {
                                const pb = playbookById.get(id)
                                if (!pb) return null
                                return (
                                  <Badge key={id} variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                                    {pb.emoji} {pb.name}
                                  </Badge>
                                )
                              })
                            ) : (
                              <span className="text-[10px] text-muted-foreground/40 group-hover:text-muted-foreground transition-colors">
                                + strategy
                              </span>
                            )}
                            {strategyIds.length > 2 && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                                +{strategyIds.length - 2}
                              </Badge>
                            )}
                          </div>
                        </td>

                        {/* Notes preview */}
                        <td className="px-4 py-3 max-w-40">
                          {emotion && (
                            <span className="mr-1">{EMOTION_ICONS[emotion]}</span>
                          )}
                          {notes ? (
                            <span className="text-xs text-muted-foreground truncate block max-w-35">
                              {notes}
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground/40 group-hover:text-muted-foreground transition-colors">
                              + note
                            </span>
                          )}
                        </td>
                      </tr>

                      {isGrouped && isExpanded && partials.length > 0 && (
                        <tr className="border-b border-border/50 bg-accent/20">
                          <td colSpan={11} className="px-4 py-3">
                            <div
                              className={cn(
                                'space-y-1.5 rounded-lg p-1.5 transition-colors',
                                draggingGroupKey === groupKey ? 'bg-emerald-500/10 ring-1 ring-emerald-500/40' : ''
                              )}
                              onDragEnter={e => {
                                e.preventDefault()
                                e.stopPropagation()
                                if (groupKey) setDraggingGroupKey(groupKey)
                              }}
                              onDragOver={e => {
                                e.preventDefault()
                                e.stopPropagation()
                              }}
                              onDragLeave={e => {
                                e.preventDefault()
                                e.stopPropagation()
                                if (groupKey && draggingGroupKey === groupKey) setDraggingGroupKey(null)
                              }}
                              onDrop={e => {
                                if (!groupKey) return
                                void handleDropScreenshot(e, groupKey, groupTradeIds)
                              }}
                            >
                              <div className="flex items-center justify-end gap-2">
                                <label className="inline-flex">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={async e => {
                                      const file = e.target.files?.[0]
                                      if (!file) return
                                      const dataUrl = await processScreenshotFile(file)
                                      if (!dataUrl) return
                                      await saveScreenshotForGroup(groupTradeIds, dataUrl)
                                      e.target.value = ''
                                    }}
                                  />
                                  <span className="inline-flex items-center gap-1 h-6 px-2.5 rounded-md border border-border text-[10px] font-semibold cursor-pointer hover:bg-accent">
                                    <Upload className="w-3 h-3" />
                                    {groupScreenshot ? 'Replace image' : 'Add image'}
                                  </span>
                                </label>
                                <span className="text-[10px] text-muted-foreground">or drag and drop</span>
                                {groupScreenshot && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 text-[10px] text-red-500 border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
                                    onClick={() => saveScreenshotForGroup(groupTradeIds, null)}
                                  >
                                    Remove image
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 text-[10px]"
                                  onClick={() => {
                                    setSelectedGroupTradeIds(groupTradeIds)
                                    setSelectedTrade(trade)
                                  }}
                                >
                                  Open note
                                </Button>
                              </div>
                              {groupScreenshot && (
                                <div className="rounded-lg border border-border bg-black/10 p-1.5 max-w-4xl mx-auto">
                                  <NextImage
                                    src={groupScreenshot}
                                    alt="Trade screenshot"
                                    width={1200}
                                    height={700}
                                    unoptimized
                                    className="w-full h-auto max-h-105 object-contain"
                                  />
                                </div>
                              )}
                              {!groupScreenshot && (
                                <div className="rounded-lg border border-dashed border-border/70 bg-background/40 px-3 py-7 text-center text-xs text-muted-foreground">
                                  Drop image here to upload
                                </div>
                              )}
                              {partials.map((partial, index) => (
                                <div
                                  key={partial.id}
                                  className="grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center text-xs px-2 py-1.5 rounded border border-border/50"
                                >
                                  <span className="text-muted-foreground">
                                    Partial {index + 1} - {formatDateTime(partial.exitTime)}
                                  </span>
                                  <span className="font-mono text-muted-foreground">
                                    Exit {partial.exitPrice.toFixed(2)}
                                  </span>
                                  <span>Qty {partial.qty}</span>
                                  <span className={cn(
                                    'font-semibold tabular-nums',
                                    partial.pnl >= 0 ? 'text-emerald-500' : 'text-red-500'
                                  )}>
                                    {formatCurrency(partial.pnl)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
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
        playbooks={playbooks}
        onClose={() => {
          setSelectedTrade(null)
          setSelectedGroupTradeIds([])
        }}
        onSaved={handleTradeUpdated}
      />
    </>
  )
}
