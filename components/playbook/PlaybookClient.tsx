/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

// components/playbook/PlaybookClient.tsx

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, BookOpen, 
  Target, AlertTriangle, BarChart3, 
  Trophy
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn, formatCurrency , getTradeTotalPnl, } from '@/lib/utils'
import { PlaybookModal } from './PlaybookModal'
import { PlaybookDetailPanel } from './PlaybookDetailPanel'
import { MistakeTracker } from './MistakeTracker'
import type { Playbook, Trade, TradeMistake } from '@/lib/db/schema'

interface Props {
  playbooks: Playbook[]
  allTrades: Trade[]
  allMistakes: TradeMistake[]
}

// const MISTAKE_LABELS: Record<string, { label: string; emoji: string }> = {
//   fomo_entry:        { label: 'FOMO Entry',          emoji: '😰' },
//   revenge_trade:     { label: 'Revenge Trade',        emoji: '😤' },
//   oversized_position:{ label: 'Oversized Position',  emoji: '📦' },
//   no_setup:          { label: 'No Clear Setup',       emoji: '❓' },
//   moved_stop:        { label: 'Moved Stop Loss',      emoji: '🚫' },
//   held_through_news: { label: 'Held Through News',    emoji: '📰' },
//   overtraded:        { label: 'Overtraded',           emoji: '🔁' },
//   early_exit:        { label: 'Early Exit',           emoji: '🏃' },
//   late_exit:         { label: 'Late Exit',            emoji: '🐢' },
//   broke_daily_limit: { label: 'Broke Daily Limit',   emoji: '⛔' },
//   chased_price:      { label: 'Chased Price',         emoji: '🎯' },
//   custom:            { label: 'Other Mistake',        emoji: '⚠️' },
// }

export function PlaybookClient({ playbooks, allTrades, allMistakes }: Props) {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedPlaybook, setSelectedPlaybook] = useState<Playbook | null>(null)

  // ── Per-playbook stats ─────────────────────────────────
  const playbookStats = useMemo(() => {
    return playbooks.map(pb => {
      const pbTrades = allTrades.filter(t => t.playbookId === pb.id)
      const pnls = pbTrades.map(t => getTradeTotalPnl(t))
      const wins = pnls.filter(p => p > 0)
      const losses = pnls.filter(p => p < 0)
      const netPnl = pnls.reduce((s, p) => s + p, 0)
      const winRate = pbTrades.length ? (wins.length / pbTrades.length) * 100 : 0
      const avgWin = wins.length ? wins.reduce((s, p) => s + p, 0) / wins.length : 0
      const avgLoss = losses.length ? Math.abs(losses.reduce((s, p) => s + p, 0) / losses.length) : 0
      const rr = avgLoss > 0 ? avgWin / avgLoss : 0
      return { ...pb, pbTrades, netPnl, winRate, avgWin, avgLoss, rr, totalTrades: pbTrades.length }
    }).sort((a, b) => b.netPnl - a.netPnl)
  }, [playbooks, allTrades])

  // ── Overall mistake summary ────────────────────────────
  const mistakeSummary = useMemo(() => {
    const counts: Record<string, { count: number; pnlImpact: number }> = {}
    allMistakes.forEach(m => {
      const trade = allTrades.find(t => t.id === m.tradeId)
      if (!counts[m.mistakeType]) counts[m.mistakeType] = { count: 0, pnlImpact: 0 }
      counts[m.mistakeType].count++
      counts[m.mistakeType].pnlImpact += trade ? getTradeTotalPnl(trade) : 0
    })
    return Object.entries(counts)
      .map(([type, data]) => ({ type, ...data }))
      .sort((a, b) => b.count - a.count)
  }, [allMistakes, allTrades])

  const totalMistakePnlLoss = mistakeSummary.reduce((s, m) => s + Math.min(m.pnlImpact, 0), 0)
  const mistakeTrades = allTrades.filter(t => t.isMistake).length
  const cleanTrades = allTrades.filter(t => !t.isMistake && t.playbookId)
  const cleanWinRate = cleanTrades.length
    ? (cleanTrades.filter(t => getTradeTotalPnl(t) > 0).length / cleanTrades.length) * 100
    : 0

  return (
    <>
      <Tabs defaultValue="strategies">
        <TabsList className="mb-6">
          <TabsTrigger value="strategies" className="gap-2">
            <BookOpen className="w-3.5 h-3.5" /> Strategies
          </TabsTrigger>
          <TabsTrigger value="mistakes" className="gap-2">
            <AlertTriangle className="w-3.5 h-3.5" /> Mistake Tracker
          </TabsTrigger>
          <TabsTrigger value="comparison" className="gap-2">
            <BarChart3 className="w-3.5 h-3.5" /> Strategy Comparison
          </TabsTrigger>
        </TabsList>

        {/* ══ STRATEGIES TAB ══ */}
        <TabsContent value="strategies" className="space-y-6">

          {/* Summary strip */}
          {playbooks.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'Strategies', value: playbooks.length, color: 'text-foreground', icon: BookOpen },
                { label: 'Best Setup', value: playbookStats[0]?.name ?? '—', color: 'text-emerald-500', icon: Trophy },
                { label: 'Mistake Trades', value: `${mistakeTrades}`, color: 'text-red-500', icon: AlertTriangle },
                { label: 'Clean Win Rate', value: `${cleanWinRate.toFixed(1)}%`, color: cleanWinRate >= 50 ? 'text-emerald-500' : 'text-red-500', icon: Target },
              ].map(s => (
                <Card key={s.label}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center shrink-0">
                      <s.icon className={cn('w-4 h-4', s.color)} />
                    </div>
                    <div className="min-w-0">
                      <p className={cn('text-lg font-black truncate', s.color)}>{s.value}</p>
                      <p className="text-[10px] text-muted-foreground">{s.label}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Strategy cards grid */}
          {playbooks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-2xl text-center">
              <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4 text-2xl">📋</div>
              <h2 className="text-lg font-black mb-2">No strategies yet</h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                Define your ICT setups — MSS, CISD, Silver Bullet, Breaker Block, FVG — then link trades to see which concepts actually perform for you.
              </p>
              <Button onClick={() => setModalOpen(true)}
                className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold">
                <Plus className="w-4 h-4 mr-2" /> Create First Strategy
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {playbookStats.map(pb => (
                  <PlaybookCard
                    key={pb.id}
                    playbook={pb}
                    stats={pb}
                    onClick={() => setSelectedPlaybook(pb)}
                  />
                ))}
                {/* Add new card */}
                <button
                  onClick={() => setModalOpen(true)}
                  className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all group min-h-50"
                >
                  <Plus className="w-8 h-8 group-hover:text-emerald-500 transition-colors" />
                  <span className="text-sm font-semibold">Add Strategy</span>
                </button>
              </div>
            </>
          )}
        </TabsContent>

        {/* ══ MISTAKE TRACKER TAB ══ */}
        <TabsContent value="mistakes">
          <MistakeTracker
            allTrades={allTrades}
            allMistakes={allMistakes}
            mistakeSummary={mistakeSummary}
            totalPnlLoss={totalMistakePnlLoss}
            onRefresh={() => router.refresh()}
          />
        </TabsContent>

        {/* ══ STRATEGY COMPARISON TAB ══ */}
        <TabsContent value="comparison" className="space-y-4">
          {playbookStats.length < 2 ? (
            <div className="text-center py-16 text-muted-foreground">
              <BarChart3 className="w-8 h-8 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Add at least 2 strategies and link some trades to compare them.</p>
            </div>
          ) : (
            <>
              {/* Comparison table */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Strategy Performance Comparison</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          {['Strategy', 'Trades', 'Win Rate', 'Net P&L', 'Avg Win', 'Avg Loss', 'R:R'].map(h => (
                            <th key={h} className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {playbookStats.map((pb, i) => (
                          <tr key={pb.id} className={cn(
                            'border-b border-border/50 hover:bg-accent/30 cursor-pointer transition-colors',
                            i === 0 && 'bg-emerald-500/3'
                          )} onClick={() => setSelectedPlaybook(pb)}>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                {i === 0 && <Trophy className="w-3.5 h-3.5 text-yellow-500" />}
                                <span className="text-sm font-semibold">{pb.emoji} {pb.name}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3 text-muted-foreground">{pb.totalTrades}</td>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pb.winRate}%` }} />
                                </div>
                                <span className={cn('text-xs font-bold', pb.winRate >= 50 ? 'text-emerald-500' : 'text-red-500')}>
                                  {pb.winRate.toFixed(1)}%
                                </span>
                              </div>
                            </td>
                            <td className={cn('px-5 py-3 font-bold tabular-nums', pb.netPnl >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                              {formatCurrency(pb.netPnl)}
                            </td>
                            <td className="px-5 py-3 text-emerald-500 text-xs tabular-nums font-semibold">
                              +${pb.avgWin.toFixed(2)}
                            </td>
                            <td className="px-5 py-3 text-red-500 text-xs tabular-nums font-semibold">
                              -${pb.avgLoss.toFixed(2)}
                            </td>
                            <td className={cn('px-5 py-3 text-xs font-bold tabular-nums', pb.rr >= 1 ? 'text-emerald-500' : 'text-red-500')}>
                              1 : {pb.rr.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Visual bars */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-sm">Net P&L by Strategy</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {playbookStats.map(pb => {
                      const maxPnl = Math.max(...playbookStats.map(p => Math.abs(p.netPnl)))
                      const pct = maxPnl > 0 ? (Math.abs(pb.netPnl) / maxPnl) * 100 : 0
                      return (
                        <div key={pb.id} className="flex items-center gap-3">
                          <div className="w-28 text-xs font-semibold truncate">{pb.emoji} {pb.name}</div>
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn('h-full rounded-full transition-all', pb.netPnl >= 0 ? 'bg-emerald-500' : 'bg-red-500')}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className={cn('text-xs font-bold tabular-nums w-20 text-right', pb.netPnl >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                            {formatCurrency(pb.netPnl)}
                          </div>
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-sm">Win Rate by Strategy</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {playbookStats.map(pb => (
                      <div key={pb.id} className="flex items-center gap-3">
                        <div className="w-28 text-xs font-semibold truncate">{pb.emoji} {pb.name}</div>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn('h-full rounded-full transition-all', pb.winRate >= 50 ? 'bg-emerald-500' : 'bg-red-500')}
                            style={{ width: `${pb.winRate}%` }}
                          />
                        </div>
                        <div className={cn('text-xs font-bold tabular-nums w-12 text-right', pb.winRate >= 50 ? 'text-emerald-500' : 'text-red-500')}>
                          {pb.winRate.toFixed(0)}%
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <PlaybookModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSaved={() => { setModalOpen(false); router.refresh() }}
      />

      {selectedPlaybook && (
        <PlaybookDetailPanel
          playbook={selectedPlaybook}
          trades={allTrades.filter(t => t.playbookId === selectedPlaybook.id)}
          onClose={() => setSelectedPlaybook(null)}
          onRefresh={() => { setSelectedPlaybook(null); router.refresh() }}
        />
      )}
    </>
  )
}

// ── PlaybookCard ───────────────────────────────────────────
function PlaybookCard({ playbook, stats, onClick }: {
  playbook: Playbook
  stats: any
  onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      className="border border-border rounded-xl p-5 cursor-pointer hover:border-border/60 hover:shadow-md transition-all relative overflow-hidden group"
    >
      {/* Color top bar */}
      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: playbook.color ?? '#10b981' }} />

      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
          style={{ background: `${playbook.color}20` }}>
          {playbook.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black truncate">{playbook.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {playbook.category && (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">{playbook.category}</Badge>
            )}
            <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0 h-4',
              playbook.status === 'active' ? 'text-emerald-500 border-emerald-500/30' : 'text-muted-foreground'
            )}>
              {playbook.status}
            </Badge>
          </div>
        </div>
        <div className={cn('text-sm font-black tabular-nums', stats.netPnl >= 0 ? 'text-emerald-500' : 'text-red-500')}>
          {stats.netPnl >= 0 ? '+' : ''}${Math.abs(stats.netPnl).toFixed(0)}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: 'Trades', value: stats.totalTrades, color: 'text-foreground' },
          { label: 'Win Rate', value: `${stats.winRate.toFixed(0)}%`, color: stats.winRate >= 50 ? 'text-emerald-500' : 'text-red-500' },
          { label: 'R:R', value: `1:${stats.rr.toFixed(1)}`, color: stats.rr >= 1 ? 'text-emerald-500' : 'text-red-500' },
        ].map(s => (
          <div key={s.label} className="text-center bg-muted/30 rounded-lg py-2">
            <p className={cn('text-sm font-black', s.color)}>{s.value}</p>
            <p className="text-[9px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Win rate bar */}
      <div className="h-1 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${stats.winRate}%`, background: playbook.color ?? '#10b981' }}
        />
      </div>

      {/* Description preview */}
      {playbook.description && (
        <p className="text-[11px] text-muted-foreground mt-3 line-clamp-2">{playbook.description}</p>
      )}
    </div>
  )
}