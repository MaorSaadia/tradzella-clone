/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'

// components/analytics/TradingCalendar.tsx

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn, formatCurrency } from '@/lib/utils'
import type { Trade } from '@/lib/db/schema'

interface Props { trades: Trade[] }

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

interface DayData {
  pnl: number
  trades: number
  wins: number
  rMultiple: number
}

export function TradingCalendar({ trades }: Props) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [hovered, setHovered] = useState<number | null>(null)

  // Build day → data map for current month
  const dayMap = useMemo(() => {
    const map: Record<number, DayData> = {}
    trades.forEach(t => {
      const d = new Date(t.exitTime)
      if (d.getFullYear() !== year || d.getMonth() !== month) return
      const day = d.getDate()
      if (!map[day]) map[day] = { pnl: 0, trades: 0, wins: 0, rMultiple: 0 }
      map[day].pnl += Number(t.pnl)
      map[day].trades++
      if (Number(t.pnl) > 0) map[day].wins++
    })
    return map
  }, [trades, year, month])

  // Monthly stats
  const monthlyStats = useMemo(() => {
    const days = Object.values(dayMap)
    const pnl = days.reduce((s, d) => s + d.pnl, 0)
    const tradingDays = days.filter(d => d.trades > 0).length
    const greenDays = days.filter(d => d.pnl > 0).length
    const redDays = days.filter(d => d.pnl < 0).length
    return { pnl, tradingDays, greenDays, redDays }
  }, [dayMap])

  // Weekly P&L
  const weeklyStats = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const weeks: { pnl: number; days: number }[] = []
    let weekPnl = 0, weekDays = 0, currentWeek = 0

    for (let d = 1; d <= daysInMonth; d++) {
      const dow = (firstDay + d - 1) % 7
      if (dow === 0 && d > 1) {
        weeks.push({ pnl: weekPnl, days: weekDays })
        weekPnl = 0; weekDays = 0; currentWeek++
      }
      if (dayMap[d]) { weekPnl += dayMap[d].pnl; weekDays++ }
      if (d === daysInMonth) weeks.push({ pnl: weekPnl, days: weekDays })
    }
    return weeks
  }, [dayMap, year, month])

  // Calendar grid
  const firstDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null)
  const rows = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7))

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }
  function goToday() { setYear(today.getFullYear()); setMonth(today.getMonth()) }

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth()

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* Nav */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h2 className="text-base font-black w-44 text-center">
              {MONTHS[month]} {year}
            </h2>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            {!isCurrentMonth && (
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={goToday}>
                Today
              </Button>
            )}
          </div>

          {/* Monthly stats pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-muted/50 rounded-lg px-3 py-1.5 text-xs">
              <span className="text-muted-foreground">Monthly P&L</span>
              <span className={cn('font-black tabular-nums',
                monthlyStats.pnl >= 0 ? 'text-emerald-500' : 'text-red-500'
              )}>
                {monthlyStats.pnl >= 0 ? '+' : ''}${Math.abs(monthlyStats.pnl).toFixed(2)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-muted/50 rounded-lg px-3 py-1.5 text-xs">
              <Calendar className="w-3 h-3 text-muted-foreground" />
              <span className="text-muted-foreground">{monthlyStats.tradingDays} days traded</span>
            </div>
            <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5 text-xs">
              <span className="text-emerald-500 font-bold">{monthlyStats.greenDays}G</span>
              <span className="text-muted-foreground">/</span>
              <span className="text-red-500 font-bold">{monthlyStats.redDays}R</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="flex">

          {/* ── Calendar grid ── */}
          <div className="flex-1 min-w-0">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-border">
              {DAYS.map(d => (
                <div key={d} className={cn(
                  'text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-center py-2',
                  (d === 'Sun' || d === 'Sat') && 'text-muted-foreground/50'
                )}>
                  {d}
                </div>
              ))}
            </div>

            {/* Rows */}
            {rows.map((row, rowIdx) => (
              <div key={rowIdx} className="grid grid-cols-7 border-b border-border last:border-0">
                {row.map((day, colIdx) => {
                  if (!day) return (
                    <div key={colIdx} className="h-20 border-r border-border last:border-0 bg-muted/10" />
                  )

                  const data = dayMap[day]
                  const isToday = isCurrentMonth && day === today.getDate()
                  const isWeekend = colIdx === 0 || colIdx === 6
                  const pnl = data?.pnl ?? 0
                  const isGreen = pnl > 0
                  const isRed = pnl < 0
                  const winRate = data ? Math.round((data.wins / data.trades) * 100) : 0

                  return (
                    <div
                      key={colIdx}
                      className={cn(
                        'h-20 border-r border-border last:border-0 p-1.5 relative transition-all cursor-default',
                        isWeekend && !data && 'bg-muted/5',
                        data && isGreen && 'bg-emerald-500/5 hover:bg-emerald-500/10',
                        data && isRed && 'bg-red-500/5 hover:bg-red-500/10',
                        !data && !isWeekend && 'hover:bg-accent/30',
                        hovered === day && 'ring-1 ring-inset ring-emerald-500/30'
                      )}
                      onMouseEnter={() => setHovered(day)}
                      onMouseLeave={() => setHovered(null)}
                    >
                      {/* Day number */}
                      <div className={cn(
                        'text-[11px] font-bold w-5 h-5 flex items-center justify-center rounded-full',
                        isToday
                          ? 'bg-emerald-500 text-black'
                          : isWeekend
                            ? 'text-muted-foreground/50'
                            : 'text-muted-foreground'
                      )}>
                        {day}
                      </div>

                      {/* Trade data */}
                      {data && (
                        <div className="mt-0.5 space-y-0.5">
                          {/* P&L */}
                          <p className={cn(
                            'text-xs font-black tabular-nums leading-none',
                            isGreen ? 'text-emerald-500' : 'text-red-500'
                          )}>
                            {isGreen ? '+' : ''}{Math.abs(pnl) >= 1000
                              ? `$${(pnl / 1000).toFixed(1)}K`
                              : `$${pnl.toFixed(0)}`
                            }
                          </p>
                          {/* Trade count */}
                          <p className="text-[9px] text-muted-foreground leading-none">
                            {data.trades} trade{data.trades !== 1 ? 's' : ''}
                          </p>
                          {/* Win rate */}
                          <p className={cn(
                            'text-[9px] leading-none font-semibold',
                            winRate >= 50 ? 'text-emerald-500/70' : 'text-red-500/70'
                          )}>
                            {winRate}% wr
                          </p>

                          {/* Bottom accent bar */}
                          <div className={cn(
                            'absolute bottom-0 left-0 right-0 h-0.5',
                            isGreen ? 'bg-emerald-500' : 'bg-red-500'
                          )} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          {/* ── Weekly sidebar ── */}
          <div className="w-28 border-l border-border shrink-0">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-center py-2 border-b border-border">
              Weekly
            </div>
            {weeklyStats.map((week, i) => (
              <div
                key={i}
                className="h-20 border-b border-border last:border-0 flex flex-col items-center justify-center px-2 gap-0.5"
              >
                {week.days > 0 ? (
                  <>
                    <p className="text-[9px] text-muted-foreground">Week {i + 1}</p>
                    <p className={cn(
                      'text-xs font-black tabular-nums',
                      week.pnl >= 0 ? 'text-emerald-500' : 'text-red-500'
                    )}>
                      {week.pnl >= 0 ? '+' : ''}{Math.abs(week.pnl) >= 1000
                        ? `$${(week.pnl / 1000).toFixed(1)}K`
                        : `$${week.pnl.toFixed(0)}`
                      }
                    </p>
                    <p className="text-[9px] text-muted-foreground">{week.days} day{week.days !== 1 ? 's' : ''}</p>
                  </>
                ) : (
                  <p className="text-[9px] text-muted-foreground/40">—</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}