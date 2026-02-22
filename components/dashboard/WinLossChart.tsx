/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/static-components */
'use client'

// components/dashboard/WinLossChart.tsx

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { calcStats, formatCurrency } from '@/lib/utils'
import { useTheme } from 'next-themes'
import type { Trade } from '@/lib/db/schema'

interface ChartsProps {
  trades: Trade[]
}

// ── Win / Loss Donut ──────────────────────────────────────
export function WinLossChart({ trades }: ChartsProps) {
  const stats = calcStats(trades)

  const data = [
    { name: 'Wins', value: stats.wins, color: '#10b981' },
    { name: 'Losses', value: stats.losses, color: '#ef4444' },
    { name: 'Breakeven', value: stats.totalTrades - stats.wins - stats.losses, color: '#64748b' },
  ].filter(d => d.value > 0)

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="text-sm font-semibold" style={{ color: payload[0].payload.color }}>
          {payload[0].name}
        </p>
        <p className="text-xs text-muted-foreground">{payload[0].value} trades</p>
      </div>
    )
  }

  if (trades.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Win / Loss</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-52 text-muted-foreground text-sm">
          No data yet
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Win / Loss</CardTitle>
          <span className="text-xs text-muted-foreground">
            {stats.winRate.toFixed(1)}% win rate
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={75}
              paddingAngle={3}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.color} strokeWidth={0} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="flex justify-center gap-4 mt-1">
          {data.map(item => (
            <div key={item.name} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
              <span className="text-xs text-muted-foreground">
                {item.name} ({item.value})
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ── P&L by Symbol Bar Chart ───────────────────────────────
export function SymbolChart({ trades }: ChartsProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  // Aggregate P&L by symbol
  const symbolMap: Record<string, number> = {}
  trades.forEach(t => {
    symbolMap[t.symbol] = (symbolMap[t.symbol] ?? 0) + Number(t.pnl)
  })

  const data = Object.entries(symbolMap)
    .map(([symbol, pnl]) => ({ symbol, pnl: Number(pnl.toFixed(2)) }))
    .sort((a, b) => b.pnl - a.pnl)

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="text-sm font-semibold">{payload[0].payload.symbol}</p>
        <p className={`text-sm font-bold ${payload[0].value >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
          {formatCurrency(payload[0].value)}
        </p>
      </div>
    )
  }

  if (trades.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">P&L by Symbol</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-40 text-muted-foreground text-sm">
          No data yet
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">P&L by Symbol</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={isDark ? '#1e293b' : '#f1f5f9'}
              vertical={false}
            />
            <XAxis
              dataKey="symbol"
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#64748b' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => `$${v}`}
              width={52}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="pnl"
              radius={[4, 4, 0, 0]}
              maxBarSize={48}
              // Color each bar by P&L sign
              fill="#10b981"
              label={false}
            >
              {data.map((entry, index) => (
                <Cell
                  key={index}
                  fill={entry.pnl >= 0 ? '#10b981' : '#ef4444'}
                  fillOpacity={0.85}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}