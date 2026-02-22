'use client'

// components/propfirms/AddAccountModal.tsx

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Info } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import type { Trade } from '@/lib/db/schema'

const PRESET_RULES: Record<string, {
  profitTarget: number; maxDrawdown: number; dailyLossLimit: number
  minTradingDays: number; maxTradingDays: number; isTrailingDrawdown: boolean
}> = {
  'Apex 50K Eval':  { profitTarget: 3000, maxDrawdown: 2500, dailyLossLimit: 1500, minTradingDays: 7, maxTradingDays: 0, isTrailingDrawdown: true },
  'Apex 100K Eval': { profitTarget: 6000, maxDrawdown: 3000, dailyLossLimit: 3000, minTradingDays: 7, maxTradingDays: 0, isTrailingDrawdown: true },
  'TopStep 50K':    { profitTarget: 3000, maxDrawdown: 2000, dailyLossLimit: 1000, minTradingDays: 0, maxTradingDays: 0, isTrailingDrawdown: false },
  'TopStep 100K':   { profitTarget: 6000, maxDrawdown: 3000, dailyLossLimit: 2000, minTradingDays: 0, maxTradingDays: 0, isTrailingDrawdown: false },
  'FTMO 25K':       { profitTarget: 2500, maxDrawdown: 2500, dailyLossLimit: 1250, minTradingDays: 4, maxTradingDays: 30, isTrailingDrawdown: false },
  'FTMO 100K':      { profitTarget: 10000, maxDrawdown: 10000, dailyLossLimit: 5000, minTradingDays: 4, maxTradingDays: 30, isTrailingDrawdown: false },
  'Custom':         { profitTarget: 0, maxDrawdown: 0, dailyLossLimit: 0, minTradingDays: 0, maxTradingDays: 0, isTrailingDrawdown: false },
}

interface Props {
  firmId: string | null
  onClose: () => void
  onSaved: () => void
  allTrades: Trade[]
}

export function AddAccountModal({ firmId, onClose, onSaved, allTrades }: Props) {
  const [accountLabel, setAccountLabel] = useState('')
  const [accountSize, setAccountSize] = useState('')
  const [stage, setStage] = useState('evaluation')
  const [profitTarget, setProfitTarget] = useState('')
  const [maxDrawdown, setMaxDrawdown] = useState('')
  const [dailyLossLimit, setDailyLossLimit] = useState('')
  const [minTradingDays, setMinTradingDays] = useState('')
  const [maxTradingDays, setMaxTradingDays] = useState('')
  const [isTrailingDD, setIsTrailingDD] = useState(false)
  const [consistencyRule, setConsistencyRule] = useState(false)
  const [newsTrading, setNewsTrading] = useState(true)
  const [weekendHolding, setWeekendHolding] = useState(false)
  const [notes, setNotes] = useState('')
  const [linkedTradeIds, setLinkedTradeIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  function applyPreset(key: string) {
    const p = PRESET_RULES[key]
    if (!p) return
    setProfitTarget(p.profitTarget > 0 ? String(p.profitTarget) : '')
    setMaxDrawdown(p.maxDrawdown > 0 ? String(p.maxDrawdown) : '')
    setDailyLossLimit(p.dailyLossLimit > 0 ? String(p.dailyLossLimit) : '')
    setMinTradingDays(p.minTradingDays > 0 ? String(p.minTradingDays) : '')
    setMaxTradingDays(p.maxTradingDays > 0 ? String(p.maxTradingDays) : '')
    setIsTrailingDD(p.isTrailingDrawdown)
  }

  // Unlinked trades (not yet assigned to any prop firm account)
  const unlinkedTrades = allTrades.filter(t => !t.propFirmAccountId)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!firmId) return
    setLoading(true)
    try {
      const res = await fetch('/api/propfirms/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firmId,
          accountLabel,
          accountSize: Number(accountSize),
          stage,
          profitTarget: profitTarget ? Number(profitTarget) : null,
          maxDrawdown: maxDrawdown ? Number(maxDrawdown) : null,
          dailyLossLimit: dailyLossLimit ? Number(dailyLossLimit) : null,
          minTradingDays: minTradingDays ? Number(minTradingDays) : null,
          maxTradingDays: maxTradingDays ? Number(maxTradingDays) : null,
          isTrailingDrawdown: isTrailingDD,
          consistencyRule,
          newsTrading,
          weekendHolding,
          notes,
          linkedTradeIds,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Failed'); return }
      toast.success('Account added!')
      onSaved()
    } catch { toast.error('Network error') }
    finally { setLoading(false) }
  }

  return (
    <Dialog open={!!firmId} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Challenge Account</DialogTitle>
          <DialogDescription>Set up rules and link your trades</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-5">

          {/* Quick preset */}
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
              Quick Fill Rules
            </Label>
            <div className="grid grid-cols-3 gap-1.5">
              {Object.keys(PRESET_RULES).map(key => (
                <button key={key} type="button" onClick={() => applyPreset(key)}
                  className="text-xs border border-border rounded-lg px-2 py-1.5 text-muted-foreground hover:text-foreground hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all font-semibold">
                  {key}
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Account basics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Account Label</Label>
              <Input value={accountLabel} onChange={e => setAccountLabel(e.target.value)}
                placeholder="e.g. 50K Eval #1" required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Account Size ($)</Label>
              <Input type="number" value={accountSize} onChange={e => setAccountSize(e.target.value)}
                placeholder="50000" required />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Challenge Stage</Label>
            <Select value={stage} onValueChange={setStage}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="evaluation">Evaluation (Phase 1)</SelectItem>
                <SelectItem value="phase2">Phase 2</SelectItem>
                <SelectItem value="funded">Funded Account</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Rules */}
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Challenge Rules</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Profit Target ($)</Label>
              <Input type="number" value={profitTarget} onChange={e => setProfitTarget(e.target.value)}
                placeholder="e.g. 3000" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Max Drawdown ($)</Label>
              <Input type="number" value={maxDrawdown} onChange={e => setMaxDrawdown(e.target.value)}
                placeholder="e.g. 2500" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Daily Loss Limit ($)</Label>
              <Input type="number" value={dailyLossLimit} onChange={e => setDailyLossLimit(e.target.value)}
                placeholder="e.g. 1000" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Min Trading Days</Label>
              <Input type="number" value={minTradingDays} onChange={e => setMinTradingDays(e.target.value)}
                placeholder="e.g. 7" />
            </div>
          </div>

          {/* Rule toggles */}
          <div className="space-y-3 bg-muted/30 rounded-xl p-4">
            {[
              { label: 'Trailing Drawdown', desc: 'Drawdown tracks your peak balance', value: isTrailingDD, set: setIsTrailingDD },
              { label: 'Consistency Rule', desc: 'Best day must be ≤ 30% of total profit', value: consistencyRule, set: setConsistencyRule },
              { label: 'News Trading Allowed', desc: 'Can trade around news events', value: newsTrading, set: setNewsTrading },
              { label: 'Weekend Holding', desc: 'Can hold positions over weekend', value: weekendHolding, set: setWeekendHolding },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold">{item.label}</p>
                  <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                </div>
                <Switch checked={item.value} onCheckedChange={item.set} />
              </div>
            ))}
          </div>

          <Separator />

          {/* Link trades */}
          {unlinkedTrades.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Link Trades ({linkedTradeIds.length} selected)
                </Label>
                <div className="group relative">
                  <Info className="w-3 h-3 text-muted-foreground" />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Select trades from your journal to link to this account. Progress bars will use linked trades only.
              </p>
              <div className="max-h-36 overflow-y-auto border border-border rounded-lg divide-y divide-border">
                <label className="flex items-center gap-2 px-3 py-2 hover:bg-accent/40 cursor-pointer bg-muted/30">
                  <input type="checkbox"
                    checked={linkedTradeIds.length === unlinkedTrades.length}
                    onChange={e => setLinkedTradeIds(e.target.checked ? unlinkedTrades.map(t => t.id) : [])}
                    className="rounded"
                  />
                  <span className="text-xs font-semibold">Select all ({unlinkedTrades.length} trades)</span>
                </label>
                {unlinkedTrades.slice(0, 50).map(t => (
                  <label key={t.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-accent/40 cursor-pointer">
                    <input type="checkbox"
                      checked={linkedTradeIds.includes(t.id)}
                      onChange={e => setLinkedTradeIds(prev =>
                        e.target.checked ? [...prev, t.id] : prev.filter(id => id !== t.id)
                      )}
                      className="rounded"
                    />
                    <span className="text-xs font-mono">{t.symbol}</span>
                    <span className={`text-xs font-bold ml-auto ${Number(t.pnl) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {Number(t.pnl) >= 0 ? '+' : ''}${Number(t.pnl).toFixed(2)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(t.exitTime).toLocaleDateString()}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs">Notes (optional)</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Any additional rules or reminders..." className="text-sm min-h-16 resize-none" />
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading || !accountLabel || !accountSize}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-black font-bold">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Adding...</> : 'Add Account'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}