/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'

// components/playbook/MistakeTracker.tsx

import { useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, TrendingDown, Flame, CheckCircle2, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { cn, formatCurrency } from '@/lib/utils'
import type { Trade, TradeMistake } from '@/lib/db/schema'

const MISTAKE_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  fomo_entry:         { label: 'FOMO Entry',           emoji: '😰', color: 'text-orange-500' },
  revenge_trade:      { label: 'Revenge Trade',         emoji: '😤', color: 'text-red-500' },
  oversized_position: { label: 'Oversized Position',   emoji: '📦', color: 'text-yellow-500' },
  no_setup:           { label: 'No Clear Setup',        emoji: '❓', color: 'text-purple-500' },
  moved_stop:         { label: 'Moved Stop Loss',       emoji: '🚫', color: 'text-red-500' },
  held_through_news:  { label: 'Held Through News',     emoji: '📰', color: 'text-blue-500' },
  overtraded:         { label: 'Overtraded',            emoji: '🔁', color: 'text-amber-500' },
  early_exit:         { label: 'Early Exit',            emoji: '🏃', color: 'text-cyan-500' },
  late_exit:          { label: 'Late Exit',             emoji: '🐢', color: 'text-teal-500' },
  broke_daily_limit:  { label: 'Broke Daily Limit',    emoji: '⛔', color: 'text-red-600' },
  chased_price:       { label: 'Chased Price',          emoji: '🎯', color: 'text-pink-500' },
  custom:             { label: 'Other',                 emoji: '⚠️', color: 'text-muted-foreground' },
}

interface Props {
  allTrades: Trade[]
  allMistakes: TradeMistake[]
  mistakeSummary: { type: string; count: number; pnlImpact: number }[]
  totalPnlLoss: number
  onRefresh: () => void
}

interface LogMistakeModalProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  allTrades: Trade[]
  onSaved: () => void
}

function LogMistakeModal({ open, onOpenChange, allTrades, onSaved }: LogMistakeModalProps) {
  const [tradeId, setTradeId] = useState('')
  const [mistakeType, setMistakeType] = useState('')
  const [description, setDescription] = useState('')
  const [severity, setSeverity] = useState('2')
  const [loading, setLoading] = useState(false)

  const recentTrades = [...allTrades]
    .sort((a, b) => new Date(b.exitTime).getTime() - new Date(a.exitTime).getTime())
    .slice(0, 50)

  async function handleSave() {
    if (!tradeId || !mistakeType) { toast.error('Select a trade and mistake type'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/mistakes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tradeId, mistakeType, description, severity: Number(severity) }),
      })
      if (!res.ok) { toast.error('Failed to log mistake'); return }
      toast.success('Mistake logged — use it to improve!')
      onSaved()
      onOpenChange(false)
      setTradeId(''); setMistakeType(''); setDescription(''); setSeverity('2')
    } catch { toast.error('Network error') }
    finally { setLoading(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log a Mistake</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Trade</Label>
            <Select value={tradeId} onValueChange={setTradeId}>
              <SelectTrigger><SelectValue placeholder="Select trade..." /></SelectTrigger>
              <SelectContent>
                {recentTrades.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    <span className={cn('font-bold mr-2', Number(t.pnl) >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                      {Number(t.pnl) >= 0 ? '+' : ''}${Number(t.pnl).toFixed(2)}
                    </span>
                    {t.symbol} · {new Date(t.exitTime).toLocaleDateString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Mistake Type</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(MISTAKE_CONFIG).map(([key, cfg]) => (
                <button key={key} type="button" onClick={() => setMistakeType(key)}
                  className={cn(
                    'text-left rounded-lg border px-3 py-2 text-xs transition-all',
                    mistakeType === key
                      ? 'border-red-500 bg-red-500/10 text-foreground'
                      : 'border-border hover:border-red-500/40 text-muted-foreground'
                  )}>
                  {cfg.emoji} {cfg.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Severity</Label>
            <div className="flex gap-2">
              {[
                { v: '1', label: 'Minor', color: 'text-yellow-500 border-yellow-500/40' },
                { v: '2', label: 'Moderate', color: 'text-orange-500 border-orange-500/40' },
                { v: '3', label: 'Major', color: 'text-red-500 border-red-500/40' },
              ].map(s => (
                <button key={s.v} type="button" onClick={() => setSeverity(s.v)}
                  className={cn('flex-1 rounded-lg border py-2 text-xs font-semibold transition-all',
                    severity === s.v ? `${s.color} bg-current/10` : 'border-border text-muted-foreground hover:border-border/80'
                  )}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Notes (optional)</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="What happened? What will you do differently?" className="text-sm min-h-16 resize-none" />
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={loading}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold">
              Log Mistake
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function MistakeTracker({ allTrades, allMistakes, mistakeSummary, totalPnlLoss, onRefresh }: Props) {
  const [logOpen, setLogOpen] = useState(false)

  const mistakeTrades = allTrades.filter(t => t.isMistake)
  const cleanTrades = allTrades.filter(t => !t.isMistake)
  const mistakeRate = allTrades.length ? (mistakeTrades.length / allTrades.length) * 100 : 0

  const cleanWins = cleanTrades.filter(t => Number(t.pnl) > 0)
  const cleanWinRate = cleanTrades.length ? (cleanWins.length / cleanTrades.length) * 100 : 0
  const mistakeWins = mistakeTrades.filter(t => Number(t.pnl) > 0)
  const mistakeWinRate = mistakeTrades.length ? (mistakeWins.length / mistakeTrades.length) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Header action */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-black">Mistake Tracker</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Track rule violations and see the P&L cost of bad habits</p>
        </div>
        <Button onClick={() => setLogOpen(true)} variant="outline" className="gap-2 border-red-500/30 text-red-500 hover:bg-red-500/10">
          <AlertTriangle className="w-3.5 h-3.5" /> Log Mistake
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Mistake Trades', value: mistakeTrades.length, color: 'text-red-500', icon: AlertTriangle },
          { label: 'Mistake Rate', value: `${mistakeRate.toFixed(1)}%`, color: mistakeRate > 20 ? 'text-red-500' : 'text-yellow-500', icon: Flame },
          { label: 'P&L Lost to Mistakes', value: formatCurrency(totalPnlLoss), color: 'text-red-500', icon: TrendingDown },
          { label: 'Clean Win Rate', value: `${cleanWinRate.toFixed(1)}%`, color: cleanWinRate >= 50 ? 'text-emerald-500' : 'text-orange-500', icon: CheckCircle2 },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center shrink-0">
                <s.icon className={cn('w-4 h-4', s.color)} />
              </div>
              <div>
                <p className={cn('text-lg font-black', s.color)}>{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Clean vs mistake comparison */}
      {mistakeTrades.length > 0 && cleanTrades.length > 0 && (
        <Card className="border-amber-500/20 bg-amber-500/3">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Clean Trades vs Mistake Trades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              {[
                {
                  label: '✅ Clean Trades',
                  trades: cleanTrades.length,
                  winRate: cleanWinRate,
                  pnl: cleanTrades.reduce((s, t) => s + Number(t.pnl), 0),
                  color: 'emerald',
                },
                {
                  label: '❌ Mistake Trades',
                  trades: mistakeTrades.length,
                  winRate: mistakeWinRate,
                  pnl: mistakeTrades.reduce((s, t) => s + Number(t.pnl), 0),
                  color: 'red',
                },
              ].map(col => (
                <div key={col.label} className="space-y-3">
                  <p className="text-sm font-bold">{col.label}</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Trades</span>
                      <span className="font-bold">{col.trades}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Win Rate</span>
                      <span className={cn('font-bold', col.winRate >= 50 ? 'text-emerald-500' : 'text-red-500')}>
                        {col.winRate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Net P&L</span>
                      <span className={cn('font-bold tabular-nums', col.pnl >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                        {formatCurrency(col.pnl)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mistake breakdown */}
      {mistakeSummary.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl">
          <p className="text-4xl mb-3">🎯</p>
          <h3 className="text-base font-bold mb-1">No mistakes logged yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Track rule violations to see what&apos;s costing you money</p>
          <Button onClick={() => setLogOpen(true)} variant="outline" className="gap-2">
            <AlertTriangle className="w-3.5 h-3.5" /> Log Your First Mistake
          </Button>
        </div>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Most Common Mistakes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {mistakeSummary.map(m => {
              const cfg = MISTAKE_CONFIG[m.type] ?? MISTAKE_CONFIG.custom
              const maxCount = mistakeSummary[0]?.count ?? 1
              const pct = (m.count / maxCount) * 100
              return (
                <div key={m.type} className="flex items-center gap-3">
                  <span className="text-xl w-7 shrink-0">{cfg.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold">{cfg.label}</span>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">{m.count}×</span>
                        <span className={cn('font-bold tabular-nums', m.pnlImpact >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                          {formatCurrency(m.pnlImpact)}
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      <LogMistakeModal
        open={logOpen}
        onOpenChange={setLogOpen}
        allTrades={allTrades}
        onSaved={onRefresh}
      />
    </div>
  )
}