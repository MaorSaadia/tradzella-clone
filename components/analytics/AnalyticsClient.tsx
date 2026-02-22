/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

// components/analytics/AnalyticsClient.tsx

import { useMemo } from 'react'
import { useTheme } from 'next-themes'
import {
  BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell, ScatterChart, Scatter,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TradingCalendar } from './TradingCalendar'
import { calcStats, formatCurrency, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Trade } from '@/lib/db/schema'

interface Props { trades: Trade[] }

function ChartTooltip({ active, payload, label, formatter }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-xs">
      {label && <p className="text-muted-foreground mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-bold" style={{ color: p.color ?? p.fill }}>
          {formatter ? formatter(p.value, p.name) : `${p.name}: ${p.value}`}
        </p>
      ))}
    </div>
  )
}

export function AnalyticsClient({ trades }: Props) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const gridColor = isDark ? '#1e293b' : '#f1f5f9'
  const axisColor = '#64748b'

  const stats = useMemo(() => calcStats(trades as any), [trades])

  const dailyPnl = useMemo(() => {
    const map: Record<string, number> = {}
    trades.forEach(t => {
      const day = formatDate(t.exitTime)
      map[day] = (map[day] ?? 0) + Number(t.pnl)
    })
    let cum = 0
    return Object.entries(map)
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .map(([date, pnl]) => {
        cum += pnl
        return { date, dayPnl: Number(pnl.toFixed(2)), cumPnl: Number(cum.toFixed(2)) }
      })
  }, [trades])

  const distribution = useMemo(() => {
    if (!trades.length) return []
    const pnls = trades.map(t => Number(t.pnl))
    const min = Math.floor(Math.min(...pnls) / 50) * 50
    const max = Math.ceil(Math.max(...pnls) / 50) * 50
    const buckets: Record<string, { label: string; count: number; isWin: boolean }> = {}
    for (let b = min; b <= max; b += 50) {
      buckets[b] = { label: b < 0 ? `$${b}` : `+$${b}`, count: 0, isWin: b >= 0 }
    }
    pnls.forEach(p => {
      const bucket = Math.floor(p / 50) * 50
      if (buckets[bucket]) buckets[bucket].count++
    })
    return Object.values(buckets)
  }, [trades])

  const byDow = useMemo(() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const map: Record<number, { pnl: number; count: number }> = {}
    days.forEach((_, i) => { map[i] = { pnl: 0, count: 0 } })
    trades.forEach(t => {
      const dow = new Date(t.exitTime).getDay()
      map[dow].pnl += Number(t.pnl)
      map[dow].count++
    })
    return days.map((name, i) => ({
      day: name.slice(0, 3), pnl: Number(map[i].pnl.toFixed(2)), trades: map[i].count,
    })).filter(d => d.trades > 0)
  }, [trades])

  const byHour = useMemo(() => {
    const map: Record<number, { pnl: number; count: number }> = {}
    for (let h = 0; h < 24; h++) map[h] = { pnl: 0, count: 0 }
    trades.forEach(t => {
      const h = new Date(t.exitTime).getHours()
      map[h].pnl += Number(t.pnl); map[h].count++
    })
    return Object.entries(map).filter(([, v]) => v.count > 0)
      .map(([hour, v]) => ({ hour: `${hour.padStart(2, '0')}:00`, pnl: Number(v.pnl.toFixed(2)), trades: v.count }))
  }, [trades])

  const bySymbol = useMemo(() => {
    const map: Record<string, { pnl: number; count: number; wins: number }> = {}
    trades.forEach(t => {
      if (!map[t.symbol]) map[t.symbol] = { pnl: 0, count: 0, wins: 0 }
      map[t.symbol].pnl += Number(t.pnl); map[t.symbol].count++
      if (Number(t.pnl) > 0) map[t.symbol].wins++
    })
    return Object.entries(map).map(([symbol, v]) => ({
      symbol, pnl: Number(v.pnl.toFixed(2)), trades: v.count,
      winRate: Math.round((v.wins / v.count) * 100),
    })).sort((a, b) => b.pnl - a.pnl)
  }, [trades])

  const streaks = useMemo(() => {
    const sorted = [...trades].sort((a, b) => new Date(a.exitTime).getTime() - new Date(b.exitTime).getTime())
    let maxWin = 0, maxLoss = 0, curWin = 0, curLoss = 0
    sorted.forEach(t => {
      if (Number(t.pnl) > 0) { curWin++; curLoss = 0; maxWin = Math.max(maxWin, curWin) }
      else if (Number(t.pnl) < 0) { curLoss++; curWin = 0; maxLoss = Math.max(maxLoss, curLoss) }
    })
    return { maxWin, maxLoss }
  }, [trades])

  const scatter = useMemo(() =>
    trades.map(t => ({
      hour: new Date(t.entryTime).getHours() + new Date(t.entryTime).getMinutes() / 60,
      pnl: Number(t.pnl),
      symbol: t.symbol,
    })), [trades])

  if (!trades.length) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Import trades to see your analytics
      </div>
    )
  }

  return (
    <Tabs defaultValue="diary">
      <TabsList className="mb-6">
        <TabsTrigger value="diary">📅 Trading Diary</TabsTrigger>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="timing">Timing</TabsTrigger>
        <TabsTrigger value="symbols">Symbols</TabsTrigger>
      </TabsList>

      {/* ══════════════ DIARY TAB ══════════════ */}
      <TabsContent value="diary" className="space-y-4">
        <TradingCalendar trades={trades} />
      </TabsContent>

      {/* ══════════════ OVERVIEW TAB ══════════════ */}
      <TabsContent value="overview" className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Avg Win',     value: `+$${stats.avgWin.toFixed(2)}`,    color: 'text-emerald-500' },
            { label: 'Avg Loss',    value: `-$${stats.avgLoss.toFixed(2)}`,   color: 'text-red-500' },
            { label: 'Expectancy',  value: `$${stats.expectancy.toFixed(2)}`, color: stats.expectancy >= 0 ? 'text-emerald-500' : 'text-red-500' },
            { label: 'Risk:Reward', value: `1 : ${(stats.avgWin / (stats.avgLoss || 1)).toFixed(2)}`, color: 'text-blue-500' },
            { label: 'Best Trade',  value: `+$${stats.bestTrade.toFixed(2)}`, color: 'text-emerald-500' },
            { label: 'Worst Trade', value: `$${stats.worstTrade.toFixed(2)}`, color: 'text-red-500' },
            { label: 'Win Streak',  value: `${streaks.maxWin} trades`,        color: 'text-emerald-500' },
            { label: 'Loss Streak', value: `${streaks.maxLoss} trades`,       color: 'text-red-500' },
          ].map(m => (
            <Card key={m.label}>
              <CardContent className="p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{m.label}</p>
                <p className={cn('text-xl font-black tabular-nums', m.color)}>{m.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Daily P&L</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dailyPnl} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: axisColor }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: axisColor }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} width={52} />
                <Tooltip content={<ChartTooltip formatter={(v: number) => formatCurrency(v)} />} />
                <ReferenceLine y={0} stroke={axisColor} strokeDasharray="3 3" strokeOpacity={0.4} />
                <Bar dataKey="dayPnl" radius={[3, 3, 0, 0]} maxBarSize={32}>
                  {dailyPnl.map((e, i) => <Cell key={i} fill={e.dayPnl >= 0 ? '#10b981' : '#ef4444'} fillOpacity={0.85} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">P&L Distribution</CardTitle>
              <span className="text-xs text-muted-foreground">per $50 bucket</span>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={distribution} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: axisColor }} tickLine={false} axisLine={false} interval={2} />
                <YAxis tick={{ fontSize: 10, fill: axisColor }} tickLine={false} axisLine={false} width={28} />
                <Tooltip content={<ChartTooltip formatter={(v: number) => `${v} trades`} />} />
                <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={20}>
                  {distribution.map((e, i) => <Cell key={i} fill={e.isWin ? '#10b981' : '#ef4444'} fillOpacity={0.8} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ══════════════ TIMING TAB ══════════════ */}
      <TabsContent value="timing" className="space-y-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">P&L by Day of Week</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={byDow} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: axisColor }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: axisColor }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} width={52} />
                <Tooltip content={<ChartTooltip formatter={(v: number) => formatCurrency(v)} />} />
                <ReferenceLine y={0} stroke={axisColor} strokeDasharray="3 3" strokeOpacity={0.4} />
                <Bar dataKey="pnl" radius={[4, 4, 0, 0]} maxBarSize={48}>
                  {byDow.map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? '#10b981' : '#ef4444'} fillOpacity={0.85} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {byDow.length > 0 && (() => {
              const best = byDow.reduce((a, b) => a.pnl > b.pnl ? a : b)
              const worst = byDow.reduce((a, b) => a.pnl < b.pnl ? a : b)
              return (
                <div className="flex gap-3 mt-4">
                  <div className="flex-1 bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">Best Day</p>
                    <p className="text-sm font-black text-emerald-500">{best.day}</p>
                    <p className="text-xs text-emerald-500">{formatCurrency(best.pnl)}</p>
                  </div>
                  <div className="flex-1 bg-red-500/5 border border-red-500/20 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">Worst Day</p>
                    <p className="text-sm font-black text-red-500">{worst.day}</p>
                    <p className="text-xs text-red-500">{formatCurrency(worst.pnl)}</p>
                  </div>
                </div>
              )
            })()}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">P&L by Hour of Day</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={byHour} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: axisColor }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: axisColor }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} width={52} />
                <Tooltip content={<ChartTooltip formatter={(v: number) => formatCurrency(v)} />} />
                <ReferenceLine y={0} stroke={axisColor} strokeDasharray="3 3" strokeOpacity={0.4} />
                <Bar dataKey="pnl" radius={[3, 3, 0, 0]} maxBarSize={28}>
                  {byHour.map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? '#10b981' : '#ef4444'} fillOpacity={0.85} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Entry Time vs P&L</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <ScatterChart margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="hour" name="Hour" type="number" domain={[0, 24]}
                  tick={{ fontSize: 10, fill: axisColor }} tickLine={false} axisLine={false}
                  tickFormatter={v => `${Math.floor(v)}:00`} />
                <YAxis dataKey="pnl" name="P&L" type="number"
                  tick={{ fontSize: 10, fill: axisColor }} tickLine={false} axisLine={false}
                  tickFormatter={v => `$${v}`} width={52} />
                <ReferenceLine y={0} stroke={axisColor} strokeDasharray="3 3" strokeOpacity={0.4} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const d = payload[0]?.payload
                    return (
                      <div className="bg-card border border-border rounded-lg p-2 text-xs">
                        <p className="font-bold">{d?.symbol}</p>
                        <p className="text-muted-foreground">{Math.floor(d?.hour)}:00</p>
                        <p className={d?.pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}>{formatCurrency(d?.pnl)}</p>
                      </div>
                    )
                  }} />
                <Scatter data={scatter} shape={(props: any) => {
                  const { cx, cy, payload } = props
                  return <circle cx={cx} cy={cy} r={4} fill={payload.pnl >= 0 ? '#10b981' : '#ef4444'} fillOpacity={0.7} stroke="none" />
                }} />
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ══════════════ SYMBOLS TAB ══════════════ */}
      <TabsContent value="symbols" className="space-y-6">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Performance by Symbol</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {['Symbol', 'Trades', 'Win Rate', 'Net P&L', 'Avg P&L'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bySymbol.map(row => (
                  <tr key={row.symbol} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                    <td className="px-5 py-3 font-black">{row.symbol}</td>
                    <td className="px-5 py-3 text-muted-foreground">{row.trades}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${row.winRate}%` }} />
                        </div>
                        <span className={cn('text-xs font-bold', row.winRate >= 50 ? 'text-emerald-500' : 'text-red-500')}>
                          {row.winRate}%
                        </span>
                      </div>
                    </td>
                    <td className={cn('px-5 py-3 font-bold tabular-nums', row.pnl >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                      {formatCurrency(row.pnl)}
                    </td>
                    <td className={cn('px-5 py-3 text-xs tabular-nums', row.pnl / row.trades >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                      {formatCurrency(row.pnl / row.trades)}/trade
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Net P&L by Symbol</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={bySymbol} layout="vertical" margin={{ top: 4, right: 60, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: axisColor }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                <YAxis type="category" dataKey="symbol" tick={{ fontSize: 11, fill: axisColor, fontWeight: 700 }} tickLine={false} axisLine={false} width={36} />
                <Tooltip content={<ChartTooltip formatter={(v: number) => formatCurrency(v)} />} />
                <ReferenceLine x={0} stroke={axisColor} strokeDasharray="3 3" strokeOpacity={0.4} />
                <Bar dataKey="pnl" radius={[0, 4, 4, 0]} maxBarSize={28}
                  label={{ position: 'right', fontSize: 10, fill: axisColor, formatter: (v: any) => typeof v === 'number' ? `${v >= 0 ? '+' : ''}$${Math.abs(v).toFixed(0)}` : '' }}>
                  {bySymbol.map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? '#10b981' : '#ef4444'} fillOpacity={0.85} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}