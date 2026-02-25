'use client'

// components/playbook/PlaybookDetailPanel.tsx

import { useState } from 'react'
import { toast } from 'sonner'
import { X, Edit2, Trash2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PlaybookModal } from './PlaybookModal'
import { cn, formatCurrency, getTradeTotalPnl } from '@/lib/utils'
import type { Playbook, Trade } from '@/lib/db/schema'

interface Props {
  playbook: Playbook
  trades: Trade[]
  onClose: () => void
  onRefresh: () => void
}

export function PlaybookDetailPanel({ playbook, trades, onClose, onRefresh }: Props) {
  const [editOpen, setEditOpen] = useState(false)

  const pnls = trades.map(getTradeTotalPnl)
  const wins = pnls.filter(p => p > 0)
  const losses = pnls.filter(p => p < 0)
  const netPnl = pnls.reduce((s, p) => s + p, 0)
  const winRate = trades.length ? (wins.length / trades.length) * 100 : 0
  const avgWin = wins.length ? wins.reduce((s, p) => s + p, 0) / wins.length : 0
  const avgLoss = losses.length ? Math.abs(losses.reduce((s, p) => s + p, 0) / losses.length) : 0

  async function handleDelete() {
    if (!confirm(`Delete "${playbook.name}"? Trades will be unlinked.`)) return
    const res = await fetch(`/api/playbooks/${playbook.id}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('Failed to delete'); return }
    toast.success('Strategy deleted')
    onRefresh()
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-card border-l border-border z-50 overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-start gap-3 p-5 border-b border-border sticky top-0 bg-card">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
            style={{ background: `${playbook.color}20` }}>
            {playbook.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-black">{playbook.name}</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              {playbook.category && <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">{playbook.category}</Badge>}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditOpen(true)}>
              <Edit2 className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-500/10" onClick={handleDelete}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Description */}
          {playbook.description && (
            <p className="text-sm text-muted-foreground">{playbook.description}</p>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Total P/L', value: formatCurrency(netPnl), color: netPnl >= 0 ? 'text-emerald-500' : 'text-red-500' },
              { label: 'Win Rate', value: `${winRate.toFixed(1)}%`, color: winRate >= 50 ? 'text-emerald-500' : 'text-red-500' },
              { label: 'Avg Win', value: `+$${avgWin.toFixed(2)}`, color: 'text-emerald-500' },
              { label: 'Avg Loss', value: `-$${avgLoss.toFixed(2)}`, color: 'text-red-500' },
            ].map(s => (
              <div key={s.label} className="bg-muted/30 rounded-xl p-3">
                <p className={cn('text-lg font-black tabular-nums', s.color)}>{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Rules sections */}
          {[
            { label: '🟢 Entry Rules', rules: playbook.entryRules as string[] },
            { label: '🔴 Exit Rules', rules: playbook.exitRules as string[] },
            { label: '⚠️ Risk Rules', rules: playbook.riskRules as string[] },
          ].map(section => section.rules?.length > 0 && (
            <div key={section.label}>
              <p className="text-xs font-semibold mb-2">{section.label}</p>
              <div className="space-y-1.5">
                {section.rules.map((rule, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="w-3 h-3 mt-0.5 text-emerald-500/60 shrink-0" />
                    {rule}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Parameters */}
          {(playbook.idealRR || playbook.maxLossPerTrade) && (
            <div className="bg-muted/30 rounded-xl p-4 grid grid-cols-2 gap-3">
              {playbook.idealRR && (
                <div>
                  <p className="text-[10px] text-muted-foreground">Target R:R</p>
                  <p className="text-sm font-black">1 : {Number(playbook.idealRR).toFixed(1)}</p>
                </div>
              )}
              {playbook.maxLossPerTrade && (
                <div>
                  <p className="text-[10px] text-muted-foreground">Max Loss/Trade</p>
                  <p className="text-sm font-black text-red-500">-${Number(playbook.maxLossPerTrade).toFixed(2)}</p>
                </div>
              )}
            </div>
          )}

          {/* Recent trades */}
          {trades.length > 0 && (
            <div>
              <p className="text-xs font-semibold mb-2">Recent Trades ({trades.length})</p>
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {trades.slice(0, 20).map(t => (
                  <div key={t.id} className="flex items-center gap-2 text-xs py-1.5 border-b border-border/50">
                    <span className={cn('font-bold', getTradeTotalPnl(t) >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                      {getTradeTotalPnl(t) >= 0 ? '+' : ''}${getTradeTotalPnl(t).toFixed(2)}
                    </span>
                    <span className="text-muted-foreground">{t.symbol}</span>
                    <Badge variant="outline" className={cn('text-[9px] px-1 py-0 h-4',
                      t.side === 'long' ? 'border-emerald-500/30 text-emerald-500' : 'border-red-500/30 text-red-500'
                    )}>
                      {t.side}
                    </Badge>
                    <span className="ml-auto text-muted-foreground">
                      {new Date(t.exitTime).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <PlaybookModal
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={() => { setEditOpen(false); onRefresh() }}
        editPlaybook={playbook}
      />
    </>
  )
}
