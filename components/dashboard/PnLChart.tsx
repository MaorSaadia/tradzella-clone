/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/immutability */
'use client'

// components/dashboard/PnLChart.tsx

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatDate, getTradeTotalPnl } from '@/lib/utils'
import { useTheme } from 'next-themes'
import type { Trade } from '@/lib/db/schema'

interface PnLChartProps {
  trades: Trade[]
}

export function PnLChart({ trades }: PnLChartProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  // Build cumulative P&L data points
  const sorted = [...trades].sort(
    (a, b) => new Date(a.exitTime).getTime() - new Date(b.exitTime).getTime()
  )

  let cumulative = 0
  const data = sorted.map(trade => {
    const tradePnl = getTradeTotalPnl(trade)
    cumulative += tradePnl
    return {
      date: formatDate(trade.exitTime),
      pnl: Number(cumulative.toFixed(2)),
      tradePnl: Number(tradePnl.toFixed(2)),
    }
  })

  const isPositive = cumulative >= 0
  const color = isPositive ? '#10b981' : '#ef4444'

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className={`text-sm font-bold ${payload[0].value >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
          {formatCurrency(payload[0].value)}
        </p>
        <p className="text-xs text-muted-foreground">
          Trade: {formatCurrency(payload[0].payload.tradePnl)}
        </p>
      </div>
    )
  }

  if (trades.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Cumulative P&L</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-52 text-muted-foreground text-sm">
          No trades yet — connect Tradovate and sync to see your curve
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Cumulative P&L</CardTitle>
          <span className={`text-sm font-bold ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
            {formatCurrency(cumulative)}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={isDark ? '#1e293b' : '#f1f5f9'}
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: '#64748b' }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#64748b' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => `$${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v}`}
              width={52}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="#64748b" strokeDasharray="3 3" strokeOpacity={0.5} />
            <Area
              type="monotone"
              dataKey="pnl"
              stroke={color}
              strokeWidth={2}
              fill="url(#pnlGradient)"
              dot={false}
              activeDot={{ r: 4, fill: color, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
