/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

// components/compare/MultiAccountComparison.tsx

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn, formatCurrency, calcTrailingDrawdown } from '@/lib/utils'
import { Trophy, AlertTriangle, Shield } from 'lucide-react'
import {
  ResponsiveContainer, Tooltip, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Legend
} from 'recharts'
import type { PropFirm, PropFirmAccount, Trade } from '@/lib/db/schema'

interface FirmWithAccounts extends PropFirm {
  accounts: PropFirmAccount[]
}

interface AccountMetrics {
  account: PropFirmAccount
  firm: PropFirm
  trades: Trade[]
  netPnl: number
  winRate: number
  profitFactor: number
  tradingDays: number
  trailingDrawdownUsed: number
  peakBalance: number
  worstDay: number
  bestDay: number
  tradeCount: number
  profitTargetPct: number
  drawdownUsedPct: number
  healthScore: number // 0-100
}

function calcAccountMetrics(account: PropFirmAccount, firm: PropFirm, allTrades: Trade[]): AccountMetrics {
  const accountTrades = allTrades.filter(t => t.propFirmAccountId === account.id)
  const pnls = accountTrades.map(t => Number(t.pnl))
  const wins = pnls.filter(p => p > 0)
  const losses = pnls.filter(p => p < 0)

  const netPnl = pnls.reduce((s, p) => s + p, 0)
  const winRate = accountTrades.length ? (wins.length / accountTrades.length) * 100 : 0
  const grossWins = wins.reduce((s, p) => s + p, 0)
  const grossLosses = Math.abs(losses.reduce((s, p) => s + p, 0))
  const profitFactor = grossLosses > 0 ? grossWins / grossLosses : wins.length > 0 ? Infinity : 0

  const tradingDays = new Set(accountTrades.map(t => new Date(t.exitTime).toDateString())).size

  const dailyMap: Record<string, number> = {}
  accountTrades.forEach(t => {
    const day = new Date(t.exitTime).toDateString()
    dailyMap[day] = (dailyMap[day] ?? 0) + Number(t.pnl)
  })
  const dailyValues = Object.values(dailyMap)
  const worstDay = dailyValues.length ? Math.min(...dailyValues) : 0
  const bestDay = dailyValues.length ? Math.max(...dailyValues) : 0

  const { currentDrawdownUsed: trailingDrawdownUsed, peakBalance } = calcTrailingDrawdown(accountTrades)

  const profitTarget = Number(account.profitTarget ?? 0)
  const maxDD = Number(account.maxDrawdown ?? 0)

  const profitTargetPct = profitTarget > 0 ? Math.min((netPnl / profitTarget) * 100, 100) : 0
  const drawdownUsedPct = maxDD > 0 ? Math.min((trailingDrawdownUsed / maxDD) * 100, 100) : 0

  // Health score: weighted combination of key metrics
  const healthScore = Math.round(
    Math.max(0, Math.min(100,
      (profitTargetPct > 0 ? 25 : 0) +            // making progress
      (winRate / 100 * 25) +                        // win rate up to 25pts
      (Math.max(0, 100 - drawdownUsedPct) / 100 * 30) + // drawdown safety up to 30pts
      (profitFactor >= 1 ? Math.min(profitFactor / 2 * 20, 20) : 0) // profit factor up to 20pts
    ))
  )

  return {
    account, firm, trades: accountTrades,
    netPnl, winRate, profitFactor, tradingDays,
    trailingDrawdownUsed, peakBalance,
    worstDay, bestDay, tradeCount: accountTrades.length,
    profitTargetPct, drawdownUsedPct, healthScore,
  }
}

const HEALTH_COLOR = (score: number) =>
  score >= 70 ? 'text-emerald-500' : score >= 40 ? 'text-yellow-500' : 'text-red-500'

const HEALTH_BG = (score: number) =>
  score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-yellow-500' : 'bg-red-500'

export function MultiAccountComparison({ firms, allTrades }: { firms: FirmWithAccounts[]; allTrades: Trade[] }) {
  const metrics = useMemo(() => {
    const all: AccountMetrics[] = []
    firms.forEach(firm => {
      firm.accounts.forEach(acc => {
        all.push(calcAccountMetrics(acc, firm, allTrades))
      })
    })
    return all.sort((a, b) => b.healthScore - a.healthScore)
  }, [firms, allTrades])

  // Cumulative PnL over time for each account (for the chart)
  const chartData = useMemo(() => {
    const allDates = new Set<string>()
    const accountSeries: Record<string, Record<string, number>> = {}

    metrics.forEach(m => {
      const sorted = [...m.trades].sort((a, b) =>
        new Date(a.exitTime).getTime() - new Date(b.exitTime).getTime()
      )
      let running = 0
      accountSeries[m.account.id] = {}
      sorted.forEach(t => {
        running += Number(t.pnl)
        const date = new Date(t.exitTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        allDates.add(date)
        accountSeries[m.account.id][date] = running
      })
    })

    return Array.from(allDates).map(date => {
      const point: any = { date }
      metrics.forEach(m => {
        point[m.account.accountLabel] = accountSeries[m.account.id][date] ?? null
      })
      return point
    })
  }, [metrics])

  const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4']

  if (metrics.length === 0) {
    return (
      <div className="text-center py-20 border-2 border-dashed border-border rounded-2xl">
        <Shield className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
        <h3 className="text-base font-bold mb-1">No accounts to compare</h3>
        <p className="text-sm text-muted-foreground">Add prop firm accounts and link trades to see the comparison.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Health overview strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {metrics.map((m, i) => (
          <Card key={m.account.id} className={cn(
            'relative overflow-hidden',
            i === 0 && 'ring-1 ring-emerald-500/30'
          )}>
            <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: m.firm.logoColor ?? '#10b981' }} />
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs font-bold truncate max-w-25">{m.account.accountLabel}</p>
                  <p className="text-[10px] text-muted-foreground">{m.firm.shortName ?? m.firm.name}</p>
                </div>
                {i === 0 && <Trophy className="w-3.5 h-3.5 text-yellow-500 shrink-0" />}
              </div>

              {/* Health score */}
              <div className="mb-3">
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-muted-foreground">Health Score</span>
                  <span className={cn('font-black', HEALTH_COLOR(m.healthScore))}>{m.healthScore}/100</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className={cn('h-full rounded-full transition-all', HEALTH_BG(m.healthScore))}
                    style={{ width: `${m.healthScore}%` }} />
                </div>
              </div>

              <div className={cn('text-lg font-black tabular-nums', m.netPnl >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                {m.netPnl >= 0 ? '+' : ''}${Math.abs(m.netPnl).toFixed(0)}
              </div>
              <p className="text-[10px] text-muted-foreground">Net P&L · {m.tradeCount} trades</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="cards">
        <TabsList>
          <TabsTrigger value="cards">Card View</TabsTrigger>
          <TabsTrigger value="table">Table View</TabsTrigger>
          <TabsTrigger value="chart">P&L Chart</TabsTrigger>
        </TabsList>

        {/* ── CARD VIEW ── */}
        <TabsContent value="cards" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {metrics.map((m) => (
              <Card key={m.account.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-black shrink-0"
                      style={{ background: m.firm.logoColor ?? '#10b981' }}>
                      {(m.firm.shortName ?? m.firm.name).slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-black">{m.account.accountLabel}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">
                        {m.firm.name} · {m.account.stage} · ${Number(m.account.accountSize).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={cn('text-base font-black tabular-nums', m.netPnl >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                        {m.netPnl >= 0 ? '+' : ''}${Math.abs(m.netPnl).toFixed(0)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Net P&L</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  {/* Stats grid */}
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { l: 'Trades', v: m.tradeCount, c: 'text-foreground' },
                      { l: 'Win Rate', v: `${m.winRate.toFixed(0)}%`, c: m.winRate >= 50 ? 'text-emerald-500' : 'text-red-500' },
                      { l: 'Best Day', v: `+$${m.bestDay.toFixed(0)}`, c: 'text-emerald-500' },
                      { l: 'Worst Day', v: `$${m.worstDay.toFixed(0)}`, c: 'text-red-500' },
                    ].map(s => (
                      <div key={s.l} className="bg-muted/30 rounded-lg p-2 text-center">
                        <p className={cn('text-xs font-black', s.c)}>{s.v}</p>
                        <p className="text-[9px] text-muted-foreground">{s.l}</p>
                      </div>
                    ))}
                  </div>

                  {/* Progress bars */}
                  {Number(m.account.profitTarget) > 0 && (
                    <div>
                      <div className="flex justify-between text-[10px] mb-1">
                        <span className="text-muted-foreground">Profit Target</span>
                        <span className="font-bold text-emerald-500">{m.profitTargetPct.toFixed(0)}%</span>
                      </div>
                      <div className="h-1 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.max(0, m.profitTargetPct)}%` }} />
                      </div>
                    </div>
                  )}
                  {Number(m.account.maxDrawdown) > 0 && (
                    <div>
                      <div className="flex justify-between text-[10px] mb-1">
                        <span className="text-muted-foreground">Drawdown Used</span>
                        <span className={cn('font-bold', m.drawdownUsedPct >= 75 ? 'text-red-500' : 'text-muted-foreground')}>
                          {m.drawdownUsedPct.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-1 bg-muted rounded-full overflow-hidden">
                        <div className={cn('h-full rounded-full', m.drawdownUsedPct >= 75 ? 'bg-red-500' : 'bg-blue-500')}
                          style={{ width: `${m.drawdownUsedPct}%` }} />
                      </div>
                    </div>
                  )}

                  {/* Alerts */}
                  {m.drawdownUsedPct >= 75 && (
                    <div className="flex items-center gap-2 text-[11px] text-red-500 bg-red-500/10 rounded-lg px-3 py-2 border border-red-500/20">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      Drawdown at {m.drawdownUsedPct.toFixed(0)}% — trade carefully!
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── TABLE VIEW ── */}
        <TabsContent value="table" className="mt-4">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {['Account', 'Firm', 'Stage', 'Trades', 'Win Rate', 'Net P&L', 'Profit Factor', 'DD Used', 'Health'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((m, i) => (
                    <tr key={m.account.id} className="border-b border-border/50 hover:bg-accent/30">
                      <td className="px-4 py-3 font-bold text-xs">
                        {i === 0 && <Trophy className="w-3 h-3 text-yellow-500 inline mr-1" />}
                        {m.account.accountLabel}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{m.firm.shortName ?? m.firm.name}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-[9px] capitalize">{m.account.stage}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs">{m.tradeCount}</td>
                      <td className={cn('px-4 py-3 text-xs font-bold', m.winRate >= 50 ? 'text-emerald-500' : 'text-red-500')}>
                        {m.winRate.toFixed(1)}%
                      </td>
                      <td className={cn('px-4 py-3 text-xs font-bold tabular-nums', m.netPnl >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                        {formatCurrency(m.netPnl)}
                      </td>
                      <td className={cn('px-4 py-3 text-xs font-bold', m.profitFactor >= 1 ? 'text-emerald-500' : 'text-red-500')}>
                        {m.profitFactor === Infinity ? '∞' : m.profitFactor.toFixed(2)}
                      </td>
                      <td className={cn('px-4 py-3 text-xs font-bold', m.drawdownUsedPct >= 75 ? 'text-red-500' : 'text-muted-foreground')}>
                        {m.drawdownUsedPct.toFixed(0)}%
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={cn('h-full rounded-full', HEALTH_BG(m.healthScore))}
                              style={{ width: `${m.healthScore}%` }} />
                          </div>
                          <span className={cn('text-xs font-bold', HEALTH_COLOR(m.healthScore))}>{m.healthScore}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── P&L CHART ── */}
        <TabsContent value="chart" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Cumulative P&L — All Accounts</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">No trade data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false}
                      tickFormatter={v => `$${v}`} width={55} />
                    <Tooltip
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }}
                      formatter={(v: any) => [`$${Number(v).toFixed(2)}`, '']}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {metrics.map((m, i) => (
                      <Line key={m.account.id}
                        type="monotone"
                        dataKey={m.account.accountLabel}
                        stroke={COLORS[i % COLORS.length]}
                        strokeWidth={2}
                        dot={false}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}