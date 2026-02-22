// components/dashboard/StatsCards.tsx

import { Card, CardContent } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Target, AlertTriangle } from 'lucide-react'
import { formatCurrency, formatPercent, calcStats } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Trade } from '@/lib/db/schema'

interface StatsCardsProps {
  trades: Trade[]
}

export function StatsCards({ trades }: StatsCardsProps) {
  const stats = calcStats(trades)

  const cards = [
    {
      label: 'Net P&L',
      value: formatCurrency(stats.netPnl),
      sub: `${stats.totalTrades} total trades`,
      icon: stats.netPnl >= 0 ? TrendingUp : TrendingDown,
      positive: stats.netPnl >= 0,
      color: stats.netPnl >= 0 ? 'emerald' : 'red',
    },
    {
      label: 'Win Rate',
      value: formatPercent(stats.winRate),
      sub: `${stats.wins}W / ${stats.losses}L`,
      icon: Target,
      positive: stats.winRate >= 50,
      color: stats.winRate >= 50 ? 'blue' : 'orange',
    },
    {
      label: 'Profit Factor',
      value: stats.profitFactor === Infinity
        ? '∞'
        : stats.profitFactor.toFixed(2),
      sub: stats.profitFactor >= 1.5 ? 'Strong edge' : stats.profitFactor >= 1 ? 'Slight edge' : 'No edge',
      icon: TrendingUp,
      positive: stats.profitFactor >= 1,
      color: stats.profitFactor >= 1.5 ? 'emerald' : stats.profitFactor >= 1 ? 'yellow' : 'red',
    },
    {
      label: 'Max Drawdown',
      value: `-${formatCurrency(stats.maxDrawdown).replace('+', '')}`,
      sub: 'Peak to trough',
      icon: AlertTriangle,
      positive: false,
      color: 'red',
    },
  ]

  const colorMap = {
    emerald: {
      icon: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      bar: 'bg-emerald-500',
      value: 'text-emerald-500',
    },
    blue: {
      icon: 'text-blue-500',
      bg: 'bg-blue-500/10',
      bar: 'bg-blue-500',
      value: 'text-blue-500',
    },
    red: {
      icon: 'text-red-500',
      bg: 'bg-red-500/10',
      bar: 'bg-red-500',
      value: 'text-red-500',
    },
    yellow: {
      icon: 'text-yellow-500',
      bg: 'bg-yellow-500/10',
      bar: 'bg-yellow-500',
      value: 'text-yellow-500',
    },
    orange: {
      icon: 'text-orange-500',
      bg: 'bg-orange-500/10',
      bar: 'bg-orange-500',
      value: 'text-orange-500',
    },
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(card => {
        const colors = colorMap[card.color as keyof typeof colorMap]
        const Icon = card.icon

        return (
          <Card key={card.label} className="relative overflow-hidden">
            {/* Top accent bar */}
            <div className={cn('absolute top-0 left-0 right-0 h-0.5', colors.bar)} />

            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {card.label}
                </p>
                <div className={cn('p-1.5 rounded-md', colors.bg)}>
                  <Icon className={cn('w-3.5 h-3.5', colors.icon)} />
                </div>
              </div>

              <p className={cn('text-2xl font-black tracking-tight', colors.value)}>
                {card.value}
              </p>

              <p className="text-xs text-muted-foreground mt-1.5">
                {card.sub}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}