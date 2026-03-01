'use client'

// components/propfirms/AddAccountModal.tsx

import { useState } from 'react'
import { getTradeTotalPnl } from '@/lib/utils'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import type { Trade } from '@/lib/db/schema'

// ── Prop firm presets ─────────────────────────────────────
const PROP_FIRMS = [
  {
    firm: 'Apex',
    accounts: [
      { label: 'Apex 25K Eval',    profitTarget: 1500,  maxDrawdown: 1500,  dailyLossLimit: 1000, hasDailyLimit: false,  minDays: 7,  maxDays: 0,  trailing: true,  consistency50: false  },
      { label: 'Apex 50K Eval',    profitTarget: 3000,  maxDrawdown: 2500,  dailyLossLimit: 1500, hasDailyLimit: false,  minDays: 7,  maxDays: 0,  trailing: true,  consistency50: false  },
      { label: 'Apex 100K Eval',   profitTarget: 6000,  maxDrawdown: 3000,  dailyLossLimit: 3000, hasDailyLimit: false,  minDays: 7,  maxDays: 0,  trailing: true,  consistency50: false  },
      { label: 'Apex 150K Eval',   profitTarget: 9000,  maxDrawdown: 4500,  dailyLossLimit: 4500, hasDailyLimit: false,  minDays: 7,  maxDays: 0,  trailing: true,  consistency50: false  },
      { label: 'Apex 300K Eval',   profitTarget: 20000,  maxDrawdown: 7000,  dailyLossLimit: 7000, hasDailyLimit: false, minDays: 7,  maxDays: 0,  trailing: true,  consistency50: false  },

    ],
  },
  {
    firm: 'TPT',
    accounts: [
      { label: 'TPT 50K Eval',     profitTarget: 3000,  maxDrawdown: 2000,  dailyLossLimit: 0,    hasDailyLimit: false, minDays: 0,  maxDays: 0,  trailing: true,  consistency50: false },
      { label: 'TPT 100K Eval',    profitTarget: 6000,  maxDrawdown: 3000,  dailyLossLimit: 0,    hasDailyLimit: false, minDays: 0,  maxDays: 0,  trailing: true,  consistency50: false },
      { label: 'TPT 150K Eval',    profitTarget: 9000,  maxDrawdown: 4500,  dailyLossLimit: 0,    hasDailyLimit: false, minDays: 0,  maxDays: 0,  trailing: true,  consistency50: false },
    ],
  },
  {
    firm: 'Lucid',
    accounts: [
      { label: 'Lucid 25K Eval',   profitTarget: 1500,  maxDrawdown: 1500,  dailyLossLimit: 750,  hasDailyLimit: true,  minDays: 5,  maxDays: 0,  trailing: false, consistency50: false },
      { label: 'Lucid 50K Eval',   profitTarget: 3000,  maxDrawdown: 2500,  dailyLossLimit: 1250, hasDailyLimit: true,  minDays: 5,  maxDays: 0,  trailing: false, consistency50: false },
      { label: 'Lucid 100K Eval',  profitTarget: 5000,  maxDrawdown: 4000,  dailyLossLimit: 2000, hasDailyLimit: true,  minDays: 5,  maxDays: 0,  trailing: false, consistency50: false },
    ],
  },
  {
    firm: 'Alpha',
    accounts: [
      { label: 'Alpha 50K Eval',   profitTarget: 3000,  maxDrawdown: 2500,  dailyLossLimit: 1500, hasDailyLimit: true,  minDays: 5,  maxDays: 0,  trailing: true,  consistency50: false },
      { label: 'Alpha 100K Eval',  profitTarget: 6000,  maxDrawdown: 4000,  dailyLossLimit: 2500, hasDailyLimit: true,  minDays: 5,  maxDays: 0,  trailing: true,  consistency50: false },
    ],
  },
  {
    firm: 'TopStep',
    accounts: [
      { label: 'TopStep 50K',      profitTarget: 3000,  maxDrawdown: 2000,  dailyLossLimit: 1000, hasDailyLimit: true,  minDays: 0,  maxDays: 0,  trailing: false, consistency50: true },
      { label: 'TopStep 100K',     profitTarget: 6000,  maxDrawdown: 3000,  dailyLossLimit: 2000, hasDailyLimit: true,  minDays: 0,  maxDays: 0,  trailing: false, consistency50: true },
      { label: 'TopStep 150K',     profitTarget: 9000,  maxDrawdown: 4500,  dailyLossLimit: 3000, hasDailyLimit: true,  minDays: 0,  maxDays: 0,  trailing: false, consistency50: true },
    ],
  },
  {
    firm: 'MFF',
    accounts: [
      { label: 'MFF 50K Eval',     profitTarget: 3000,  maxDrawdown: 2500,  dailyLossLimit: 0,    hasDailyLimit: false, minDays: 0,  maxDays: 0,  trailing: true,  consistency50: true },
      { label: 'MFF 100K Eval',    profitTarget: 6000,  maxDrawdown: 3500,  dailyLossLimit: 0,    hasDailyLimit: false, minDays: 0,  maxDays: 0,  trailing: true,  consistency50: true },
    ],
  },
  {
    firm: 'Tradeify',
    accounts: [
      { label: 'Tradeify 50K',     profitTarget: 3000,  maxDrawdown: 2500,  dailyLossLimit: 1250, hasDailyLimit: true,  minDays: 5,  maxDays: 0,  trailing: true,  consistency50: false },
      { label: 'Tradeify 100K',    profitTarget: 6000,  maxDrawdown: 4000,  dailyLossLimit: 2000, hasDailyLimit: true,  minDays: 5,  maxDays: 0,  trailing: true,  consistency50: false },
    ],
  },
  {
    firm: 'FTMO',
    accounts: [
      { label: 'FTMO 10K Phase1',  profitTarget: 1000,  maxDrawdown: 1000,  dailyLossLimit: 500,  hasDailyLimit: true,  minDays: 4,  maxDays: 30, trailing: false, consistency50: false },
      { label: 'FTMO 25K Phase1',  profitTarget: 2500,  maxDrawdown: 2500,  dailyLossLimit: 1250, hasDailyLimit: true,  minDays: 4,  maxDays: 30, trailing: false, consistency50: false },
      { label: 'FTMO 50K Phase1',  profitTarget: 5000,  maxDrawdown: 5000,  dailyLossLimit: 2500, hasDailyLimit: true,  minDays: 4,  maxDays: 30, trailing: false, consistency50: false },
      { label: 'FTMO 100K Phase1', profitTarget: 10000, maxDrawdown: 10000, dailyLossLimit: 5000, hasDailyLimit: true,  minDays: 4,  maxDays: 30, trailing: false, consistency50: false },
    ],
  },
  {
    firm: 'FundedNext',
    accounts: [
      { label: 'FundedNext 15K',   profitTarget: 1500,  maxDrawdown: 900,   dailyLossLimit: 450,  hasDailyLimit: true,  minDays: 5,  maxDays: 0,  trailing: false, consistency50: false },
      { label: 'FundedNext 25K',   profitTarget: 2500,  maxDrawdown: 1500,  dailyLossLimit: 750,  hasDailyLimit: true,  minDays: 5,  maxDays: 0,  trailing: false, consistency50: false },
      { label: 'FundedNext 50K',   profitTarget: 5000,  maxDrawdown: 3000,  dailyLossLimit: 1500, hasDailyLimit: true,  minDays: 5,  maxDays: 0,  trailing: false, consistency50: false },
      { label: 'FundedNext 100K',  profitTarget: 10000, maxDrawdown: 6000,  dailyLossLimit: 3000, hasDailyLimit: true,  minDays: 5,  maxDays: 0,  trailing: false, consistency50: false },
    ],
  },
]

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
  const [hasDailyLimit, setHasDailyLimit] = useState(true)
  const [dailyLossLimit, setDailyLossLimit] = useState('')
  const [minTradingDays, setMinTradingDays] = useState('')
  const [maxTradingDays, setMaxTradingDays] = useState('')
  const [isTrailingDD, setIsTrailingDD] = useState(false)
  const [consistency50, setConsistency50] = useState(false)
  const [consistencyRule, setConsistencyRule] = useState(false)
  const [newsTrading, setNewsTrading] = useState(true)
  const [weekendHolding, setWeekendHolding] = useState(false)
  const [notes, setNotes] = useState('')
  const [linkedTradeIds, setLinkedTradeIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedFirm, setSelectedFirm] = useState<string | null>(null)
  const [customFirmName, setCustomFirmName] = useState('')

  function applyPreset(preset: typeof PROP_FIRMS[0]['accounts'][0]) {
    setAccountLabel(preset.label)
    setProfitTarget(String(preset.profitTarget))
    setMaxDrawdown(String(preset.maxDrawdown))
    setHasDailyLimit(preset.hasDailyLimit)
    setDailyLossLimit(preset.hasDailyLimit && preset.dailyLossLimit > 0 ? String(preset.dailyLossLimit) : '')
    setMinTradingDays(preset.minDays > 0 ? String(preset.minDays) : '')
    setMaxTradingDays(preset.maxDays > 0 ? String(preset.maxDays) : '')
    setIsTrailingDD(preset.trailing)
    setConsistency50(preset.consistency50)
  }

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
          dailyLossLimit: hasDailyLimit && dailyLossLimit ? Number(dailyLossLimit) : null,
          minTradingDays: minTradingDays ? Number(minTradingDays) : null,
          maxTradingDays: maxTradingDays ? Number(maxTradingDays) : null,
          isTrailingDrawdown: isTrailingDD,
          consistencyRule50: consistency50,
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

          {/* ── Prop firm quick-fill ── */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
              Quick Fill — Select Your Prop Firm
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {PROP_FIRMS.map(f => (
                <button key={f.firm} type="button"
                  onClick={() => setSelectedFirm(selectedFirm === f.firm ? null : f.firm)}
                  className={cn(
                    'text-xs px-2.5 py-1.5 rounded-lg border font-semibold transition-all',
                    selectedFirm === f.firm
                      ? 'bg-emerald-500 text-black border-emerald-500'
                      : 'border-border text-muted-foreground hover:text-foreground hover:border-emerald-500/40 hover:bg-emerald-500/5'
                  )}>
                  {f.firm}
                </button>
              ))}
              {/* Custom / Other firm */}
              <button type="button"
                onClick={() => setSelectedFirm(selectedFirm === 'custom' ? null : 'custom')}
                className={cn(
                  'text-xs px-2.5 py-1.5 rounded-lg border font-semibold transition-all',
                  selectedFirm === 'custom'
                    ? 'bg-amber-500 text-black border-amber-500'
                    : 'border-dashed border-border text-muted-foreground hover:text-foreground hover:border-amber-500/40 hover:bg-amber-500/5'
                )}>
                + Other
              </button>
            </div>

            {/* Preset accounts for known firms */}
            {selectedFirm && selectedFirm !== 'custom' && (
              <div className="grid grid-cols-2 gap-1.5 pt-1 animate-in fade-in-0 slide-in-from-top-1 duration-200">
                {PROP_FIRMS.find(f => f.firm === selectedFirm)?.accounts.map(preset => (
                  <button key={preset.label} type="button" onClick={() => applyPreset(preset)}
                    className={cn(
                      'text-left rounded-xl border p-3 transition-all',
                      accountLabel === preset.label
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-border hover:border-emerald-500/40 hover:bg-emerald-500/5'
                    )}>
                    <p className="text-xs font-bold">{preset.label}</p>
                    <div className="flex flex-wrap gap-x-2 mt-1">
                      <span className="text-[10px] text-emerald-500">+${preset.profitTarget.toLocaleString()}</span>
                      <span className="text-[10px] text-red-400">DD ${preset.maxDrawdown.toLocaleString()}</span>
                      {!preset.hasDailyLimit && <span className="text-[10px] text-amber-400">No daily limit</span>}
                      {preset.consistency50 && <span className="text-[10px] text-purple-400">50% rule</span>}
                      {preset.trailing && <span className="text-[10px] text-blue-400">Trailing</span>}
                      {preset.minDays > 0 && <span className="text-[10px] text-muted-foreground">{preset.minDays} min days</span>}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Custom firm — just a name hint, fill rules manually below */}
            {selectedFirm === 'custom' && (
              <div className="pt-1 animate-in fade-in-0 slide-in-from-top-1 duration-200">
                <div className="rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 p-3 space-y-2">
                  <p className="text-xs font-semibold text-amber-500">Custom Prop Firm</p>
                  <p className="text-[10px] text-muted-foreground">
                    Fill in your firm&apos;s rules manually in the fields below. No presets — full control.
                  </p>
                  <Input
                    placeholder="Firm name (e.g. E8 Funding, Funded Engineer...)"
                    value={customFirmName}
                    onChange={e => {
                      setCustomFirmName(e.target.value)
                      setAccountLabel(e.target.value)
                    }}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            )}
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

          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Challenge Rules</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Profit Target ($)</Label>
              <Input type="number" value={profitTarget} onChange={e => setProfitTarget(e.target.value)} placeholder="e.g. 3000" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Max Drawdown ($)</Label>
              <Input type="number" value={maxDrawdown} onChange={e => setMaxDrawdown(e.target.value)} placeholder="e.g. 2500" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Min Trading Days</Label>
              <Input type="number" value={minTradingDays} onChange={e => setMinTradingDays(e.target.value)} placeholder="e.g. 7" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Max Trading Days</Label>
              <Input type="number" value={maxTradingDays} onChange={e => setMaxTradingDays(e.target.value)} placeholder="0 = unlimited" />
            </div>
          </div>

          {/* Daily Loss Limit — toggleable */}
          <div className="bg-muted/30 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold">Daily Loss Limit</p>
                <p className="text-[10px] text-muted-foreground">
                  {hasDailyLimit ? 'Max loss allowed in a single trading day' : 'This firm has no daily loss limit'}
                </p>
              </div>
              <Switch checked={hasDailyLimit} onCheckedChange={v => {
                setHasDailyLimit(v)
                if (!v) setDailyLossLimit('')
              }} />
            </div>
            {hasDailyLimit && (
              <Input type="number" value={dailyLossLimit} onChange={e => setDailyLossLimit(e.target.value)}
                placeholder="e.g. 1000" className="h-8 text-xs" />
            )}
          </div>

          {/* Other rule toggles */}
          <div className="space-y-3 bg-muted/30 rounded-xl p-4">
            {[
              { label: 'Trailing Drawdown', desc: 'Drawdown tracks your peak balance (Apex, TPT, MFF)', value: isTrailingDD, set: setIsTrailingDD },
              { label: '50% Consistency Rule', desc: 'Best single day ≤ 50% of profit target — can\'t pass in 1 day (Apex eval)', value: consistency50, set: setConsistency50 },
              { label: '30% Consistency Rule', desc: 'Best day must be ≤ 30% of total profit earned', value: consistencyRule, set: setConsistencyRule },
              { label: 'News Trading Allowed', desc: 'Can trade during high-impact news events', value: newsTrading, set: setNewsTrading },
              { label: 'Weekend Holding', desc: 'Positions can be held over the weekend', value: weekendHolding, set: setWeekendHolding },
            ].map(item => (
              <div key={item.label} className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-xs font-semibold">{item.label}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">{item.desc}</p>
                </div>
                <Switch checked={item.value} onCheckedChange={item.set} className="shrink-0 mt-0.5" />
              </div>
            ))}
          </div>

          <Separator />

          {/* Link trades */}
          {unlinkedTrades.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Link Trades ({linkedTradeIds.length} selected)
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Select trades to link to this account. Progress bars will use linked trades only.
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
                    <span className={`text-xs font-bold ml-auto ${getTradeTotalPnl(t) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {getTradeTotalPnl(t) >= 0 ? '+' : ''}${getTradeTotalPnl(t).toFixed(2)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(t.exitTime).toLocaleDateString()}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

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