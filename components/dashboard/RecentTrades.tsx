// components/dashboard/RecentTrades.tsx

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency, formatDateTime, getTradeTotalPnl } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Trade } from '@/lib/db/schema'

interface RecentTradesProps {
  trades: Trade[]
}

export function RecentTrades({ trades }: RecentTradesProps) {
  const recent = trades.slice(0, 8)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Recent Trades</CardTitle>
          <Button variant="ghost" size="sm" asChild className="text-xs text-muted-foreground h-7">
            <Link href="/journal">
              View all <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {recent.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            No trades yet — sync your Tradovate account to get started
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recent.map(trade => {
              const pnl = getTradeTotalPnl(trade)
              const isWin = pnl > 0
              return (
                <div
                  key={trade.id}
                  className="flex items-center justify-between px-6 py-3 hover:bg-accent/50 transition-colors"
                >
                  {/* Symbol + side */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      'w-1.5 h-8 rounded-full shrink-0',
                      isWin ? 'bg-emerald-500' : 'bg-red-500'
                    )} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{trade.symbol}</span>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] px-1.5 py-0 h-4',
                            trade.side === 'long'
                              ? 'border-emerald-500/40 text-emerald-500'
                              : 'border-red-500/40 text-red-500'
                          )}
                        >
                          {trade.side.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(trade.exitTime)}
                      </p>
                    </div>
                  </div>

                  {/* Entry → Exit */}
                  <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
                    <span>{Number(trade.entryPrice).toFixed(2)}</span>
                    <ArrowRight className="w-3 h-3" />
                    <span>{Number(trade.exitPrice).toFixed(2)}</span>
                    <span className="ml-1">× {trade.qty}</span>
                  </div>

                  {/* P&L */}
                  <span className={cn(
                    'text-sm font-bold tabular-nums',
                    isWin ? 'text-emerald-500' : 'text-red-500'
                  )}>
                    {formatCurrency(pnl)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
