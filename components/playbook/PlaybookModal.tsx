/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

// components/playbook/PlaybookModal.tsx

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Plus, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

const EMOJIS = ['📈', '📉', '⚡', '🎯', '🔥', '💎', '🚀', '🎪', '🌊', '⚔️', '🏹', '🧠']
const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16']

// ICT = primary, Other = secondary
const CATEGORIES = {
  ict: ['MSS', 'CISD', 'SMT', 'Breaker Block', 'Silver Bullet', 'ICT Macros', 'FVG', 'OTE', 'Liquidity Sweep', 'Order Block', 'NWOG/NDOG', 'Power of 3', 'Judas Swing', 'Turtle Soup', 'Other ICT'],
  other: ['Momentum', 'Reversal', 'Breakout', 'VWAP', 'Scalp', 'Swing', 'News', 'Opening Range'],
}

// ── ICT Preset Strategies ────────────────────────────────
const ICT_PRESETS = [
  {
    name: 'MSS — Market Structure Shift',
    emoji: '⚔️', category: 'MSS', color: '#10b981',
    description: 'Trade the first displacement candle after a market structure shift, confirming a change in trend direction.',
    entryRules: [
      'Identify previous swing high/low being taken out',
      'Wait for a strong displacement candle breaking structure',
      'Enter on retracement into the FVG or OB left by displacement',
      'Confirm with higher timeframe bias aligned',
    ],
    exitRules: [
      'Target the opposing liquidity pool (prev high/low)',
      'Partial at 50% of the range, runner to full target',
      'Exit if price retraces back through the MSS level',
    ],
    riskRules: [
      'Stop below/above the displacement candle low/high',
      'Max 1% risk per trade',
      'No entry if spread is outside killzone',
    ],
  },
  {
    name: 'CISD — Change in State of Delivery',
    emoji: '🔥', category: 'CISD', color: '#3b82f6',
    description: 'Enter when price shifts from a delivery state (bullish/bearish) confirmed by a strong engulfing candle on the entry timeframe.',
    entryRules: [
      'HTF must show premium/discount alignment',
      'LTF shows CISD candle closing through previous swing',
      'Enter on retest of the CISD candle body',
      'Volume confirmation preferred',
    ],
    exitRules: [
      'Target next significant liquidity level',
      'Close partial at 1:1, let runner go to full draw',
      'Invalidate if CISD candle is fully overlapped',
    ],
    riskRules: [
      'Stop at the low/high of the CISD candle',
      'Skip if economic news within 15 mins',
      'Only trade during killzones',
    ],
  },
  {
    name: 'SMT Divergence',
    emoji: '🧠', category: 'SMT', color: '#8b5cf6',
    description: 'Trade when correlated pairs (NQ/ES or GU/EU) fail to confirm each others high or low, signaling smart money manipulation.',
    entryRules: [
      'Identify correlated instruments (NQ vs ES, GBP/USD vs EUR/USD)',
      'One makes a new high/low, the other does not',
      'Enter the diverging instrument in direction of HTF bias',
      'Confirm with a displacement candle on LTF',
    ],
    exitRules: [
      'Target the previous opposing liquidity',
      'Partial exit at 1.5R, trail the rest',
      'Exit if SMT closes and both instruments realign',
    ],
    riskRules: [
      'Stop beyond the manipulated swing',
      'Only valid during London or NY killzones',
      'Max 2 SMT setups per session',
    ],
  },
  {
    name: 'Breaker Block',
    emoji: '💎', category: 'Breaker Block', color: '#f59e0b',
    description: 'Failed order block that price has broken through, then retests from the other side as support/resistance.',
    entryRules: [
      'Identify the last up/down candle before a swing failure',
      'Price must fully displace through the order block',
      'Enter on retracement back into the breaker zone',
      'HTF must confirm the direction',
    ],
    exitRules: [
      'Target the liquidity pool that caused the original move',
      'Exit at 2R minimum, trail if momentum is strong',
      'Invalidate if price closes back inside the breaker',
    ],
    riskRules: [
      'Stop at the far end of the breaker block',
      'Avoid during news events',
      'Only valid on first retest of the breaker',
    ],
  },
  {
    name: 'Silver Bullet',
    emoji: '🎯', category: 'Silver Bullet', color: '#06b6d4',
    description: 'ICT Silver Bullet — trade the FVG formed during the 10-11am or 2-3pm NY killzone windows.',
    entryRules: [
      'Only trade between 10:00-11:00am or 2:00-3:00pm NY time',
      'Identify the displacement and FVG formed in the window',
      'Enter at 50% of the FVG (equilibrium)',
      'HTF draw must align with the entry direction',
    ],
    exitRules: [
      'Target the opposing liquidity from session high/low',
      'Close full position before window closes if no momentum',
      'Partial at 1R, runner to full draw on liquidity',
    ],
    riskRules: [
      'Only 1 Silver Bullet per window',
      'Stop below/above the FVG',
      'Skip if major news drops during the window',
    ],
  },
  {
    name: 'ICT Macros',
    emoji: '⚡', category: 'ICT Macros', color: '#ec4899',
    description: 'Trade the specific 20-minute macro windows where smart money consistently engineers moves to fill orders.',
    entryRules: [
      'Trade only during macro windows: 8:50, 9:50, 10:50, 11:50 (NY)',
      'Identify the sweep of liquidity at macro open',
      'Enter displacement into FVG after the sweep',
      'Confirm with session bias (AMD — Accumulation, Manipulation, Distribution)',
    ],
    exitRules: [
      'Target the draw established before macro',
      'Exit by end of the macro window (20 mins)',
      'Do not hold through next macro if trade not at target',
    ],
    riskRules: [
      'Max 1 trade per macro',
      'Hard exit after 20 minutes regardless',
      'Skip if previous macro resulted in a loss',
    ],
  },
  {
    name: 'FVG — Fair Value Gap',
    emoji: '🌊', category: 'FVG', color: '#84cc16',
    description: 'Enter on the retracement into an imbalance (3-candle FVG) in the direction of the HTF trend.',
    entryRules: [
      'Identify a 3-candle FVG with a clean gap between candle 1 high and candle 3 low',
      'Price must displace away from FVG first',
      'Enter at 50% (equilibrium) of the FVG on retracement',
      'HTF must be in premium/discount zone alignment',
    ],
    exitRules: [
      'Target the next FVG or liquidity pool',
      'Exit if price fully closes back into FVG without respect',
      'Trail stop to entry once at 1R',
    ],
    riskRules: [
      'Stop at the FVG low/high (opposite end)',
      'Only trade first two retests of an FVG',
      'Avoid FVGs formed during news spikes',
    ],
  },
  {
    name: 'Liquidity Sweep',
    emoji: '🏹', category: 'Liquidity Sweep', color: '#ef4444',
    description: 'Fade the stop-hunt move after price sweeps a key liquidity level and shows reversal displacement.',
    entryRules: [
      'Identify equal highs/lows or previous swing points as liquidity',
      'Wait for a wick or close beyond the level (the sweep)',
      'Enter on the return back through the swept level',
      'Confirm with a displacement or CISD candle',
    ],
    exitRules: [
      'Target the opposite side liquidity',
      'Exit at 2R if no displacement continuation',
      'Invalidate if price continues beyond sweep without return',
    ],
    riskRules: [
      'Stop beyond the sweep wick high/low',
      'Only trade in killzone hours',
      'One attempt per liquidity level',
    ],
  },
]

// ── Non-ICT Presets ──────────────────────────────────────
const OTHER_PRESETS = [
  {
    name: 'VWAP Reclaim Long',
    emoji: '📈', category: 'VWAP', color: '#10b981',
    description: 'Price dips below VWAP, reclaims it with volume, long entry on confirmation',
    entryRules: ['Price reclaims VWAP with above-average volume', 'Bullish candle close above VWAP', 'Market structure supports upside'],
    exitRules: ['Exit at previous high or resistance level', 'Exit if price loses VWAP again', 'Trail stop to VWAP on momentum'],
    riskRules: ['Max loss 0.5% of account per trade', 'No trades in first 5 minutes', 'Skip if spread is wide'],
  },
  {
    name: 'Opening Range Breakout',
    emoji: '🚀', category: 'Opening Range', color: '#3b82f6',
    description: 'Trade the breakout of the first 5/15/30 minute opening range',
    entryRules: ['Wait for full ORB candle to close outside range', 'Volume must be 1.5x average', 'Enter on first pullback to breakout level'],
    exitRules: ['Target = range height projected from breakout', 'Exit half at 1R, trail rest', 'Hard exit if price re-enters range'],
    riskRules: ['Stop below/above the range', 'Max 2 attempts per direction', 'Avoid if pre-market range is unusually large'],
  },
  {
    name: 'Reversal at Key Level',
    emoji: '🔥', category: 'Reversal', color: '#8b5cf6',
    description: 'Fade exhaustion moves at major support/resistance or VWAP extremes',
    entryRules: ['Price at major S/R, VWAP ±2SD, or prior day high/low', 'Momentum divergence visible', 'Rejection candle pattern (wick, engulf)'],
    exitRules: ['Target middle of range or VWAP', 'Quick exit if no follow-through in 5 mins', 'Scale out at each level'],
    riskRules: ['Tight stop above/below rejection wick', 'Small size — reversals are higher risk', 'No counter-trend trades in strong trends'],
  },
]

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSaved: () => void
  editPlaybook?: any
}

function RulesInput({ label, rules, onChange }: {
  label: string; rules: string[]; onChange: (rules: string[]) => void
}) {
  const [input, setInput] = useState('')
  function add() {
    if (!input.trim()) return
    onChange([...rules, input.trim()])
    setInput('')
  }
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="space-y-1.5 max-h-32 overflow-y-auto">
        {rules.map((rule, i) => (
          <div key={i} className="flex items-start gap-2 text-xs bg-muted/30 rounded-lg px-3 py-2 group">
            <span className="text-muted-foreground mt-0.5">✓</span>
            <span className="flex-1">{rule}</span>
            <button onClick={() => onChange(rules.filter((_, j) => j !== i))}
              className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 transition-opacity">
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder={`Add ${label.toLowerCase()} rule...`}
          className="text-xs h-8"
        />
        <Button type="button" variant="outline" size="sm" className="h-8 px-2 shrink-0" onClick={add}>
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  )
}

export function PlaybookModal({ open, onOpenChange, onSaved, editPlaybook }: Props) {
  const [name, setName] = useState(editPlaybook?.name ?? '')
  const [description, setDescription] = useState(editPlaybook?.description ?? '')
  const [category, setCategory] = useState(editPlaybook?.category ?? '')
  const [emoji, setEmoji] = useState(editPlaybook?.emoji ?? '📈')
  const [color, setColor] = useState(editPlaybook?.color ?? COLORS[0])
  const [entryRules, setEntryRules] = useState<string[]>(editPlaybook?.entryRules ?? [])
  const [exitRules, setExitRules] = useState<string[]>(editPlaybook?.exitRules ?? [])
  const [riskRules, setRiskRules] = useState<string[]>(editPlaybook?.riskRules ?? [])
  const [idealRR, setIdealRR] = useState(editPlaybook?.idealRR ?? '')
  const [maxLoss, setMaxLoss] = useState(editPlaybook?.maxLossPerTrade ?? '')
  const [loading, setLoading] = useState(false)
  const [presetTab, setPresetTab] = useState<'ict' | 'other'>('ict')

  function applyPreset(preset: typeof ICT_PRESETS[0]) {
    setName(preset.name); setDescription(preset.description)
    setCategory(preset.category); setEmoji(preset.emoji); setColor(preset.color)
    setEntryRules(preset.entryRules ?? []); setExitRules(preset.exitRules ?? []); setRiskRules(preset.riskRules ?? [])
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(editPlaybook ? `/api/playbooks/${editPlaybook.id}` : '/api/playbooks', {
        method: editPlaybook ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, description, category, emoji, color,
          entryRules, exitRules, riskRules,
          idealRR: idealRR ? Number(idealRR) : null,
          maxLossPerTrade: maxLoss ? Number(maxLoss) : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Failed'); return }
      toast.success(editPlaybook ? 'Strategy updated!' : `${name} strategy created!`)
      onSaved()
    } catch { toast.error('Network error') }
    finally { setLoading(false) }
  }

  // const allCategories = [...CATEGORIES.ict, ...CATEGORIES.other]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editPlaybook ? 'Edit Strategy' : 'Create Strategy'}</DialogTitle>
          <DialogDescription>Define your trading setup, rules, and ideal parameters</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-5">

          {/* Preset templates */}
          {!editPlaybook && (
            <div className="space-y-3">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                Quick Start Templates
              </Label>

              {/* Tab toggle */}
              <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
                <button type="button" onClick={() => setPresetTab('ict')}
                  className={cn('px-3 py-1.5 text-xs font-bold rounded-md transition-all',
                    presetTab === 'ict'
                      ? 'bg-emerald-500 text-black shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}>
                  ⚡ ICT Concepts
                </button>
                <button type="button" onClick={() => setPresetTab('other')}
                  className={cn('px-3 py-1.5 text-xs font-bold rounded-md transition-all',
                    presetTab === 'other'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}>
                  📊 Other Strategies
                </button>
              </div>

              {/* ICT presets */}
              {presetTab === 'ict' && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ICT_PRESETS.map(preset => (
                    <button key={preset.name} type="button" onClick={() => applyPreset(preset)}
                      className={cn(
                        'text-left rounded-lg border p-2.5 transition-all hover:border-emerald-500/40 hover:bg-emerald-500/5',
                        name === preset.name ? 'border-emerald-500 bg-emerald-500/10' : 'border-border'
                      )}>
                      <div className="text-base mb-1">{preset.emoji}</div>
                      <p className="text-xs font-bold leading-tight">{preset.category}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight line-clamp-2">{preset.name.replace(preset.category + ' — ', '').replace(preset.category, '').trim()}</p>
                    </button>
                  ))}
                </div>
              )}

              {/* Other presets */}
              {presetTab === 'other' && (
                <div className="grid grid-cols-3 gap-2">
                  {OTHER_PRESETS.map(preset => (
                    <button key={preset.name} type="button" onClick={() => applyPreset(preset)}
                      className={cn(
                        'text-left rounded-lg border p-2.5 transition-all hover:border-border/60 hover:bg-muted/30',
                        name === preset.name ? 'border-emerald-500 bg-emerald-500/10' : 'border-border'
                      )}>
                      <div className="text-base mb-1">{preset.emoji}</div>
                      <p className="text-xs font-bold">{preset.name}</p>
                      <p className="text-[10px] text-muted-foreground">{preset.category}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Name + emoji + color */}
          <div className="flex gap-3 items-start">
            <div className="space-y-1.5">
              <Label className="text-xs">Icon</Label>
              <div className="grid grid-cols-4 gap-1">
                {EMOJIS.map(e => (
                  <button key={e} type="button" onClick={() => setEmoji(e)}
                    className={cn('w-8 h-8 rounded-lg text-base flex items-center justify-center transition-all',
                      emoji === e ? 'bg-muted ring-2 ring-emerald-500' : 'hover:bg-muted'
                    )}>
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Strategy Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. MSS Long at NY Open" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Category</Label>
                  <select value={category} onChange={e => setCategory(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs">
                    <option value="">Select...</option>
                    <optgroup label="⚡ ICT Concepts">
                      {CATEGORIES.ict.map(c => <option key={c} value={c}>{c}</option>)}
                    </optgroup>
                    <optgroup label="📊 Other Strategies">
                      {CATEGORIES.other.map(c => <option key={c} value={c}>{c}</option>)}
                    </optgroup>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Color</Label>
                  <div className="flex gap-1.5 flex-wrap pt-1">
                    {COLORS.map(c => (
                      <button key={c} type="button" onClick={() => setColor(c)}
                        className={cn('w-6 h-6 rounded-full border-2 transition-all',
                          color === c ? 'border-white scale-110' : 'border-transparent'
                        )}
                        style={{ background: c }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Describe when and why this setup works..." className="text-sm min-h-16 resize-none" />
          </div>

          <Separator />

          {/* Rules builders */}
          <RulesInput label="Entry Rules" rules={entryRules} onChange={setEntryRules} />
          <RulesInput label="Exit Rules" rules={exitRules} onChange={setExitRules} />
          <RulesInput label="Risk Rules" rules={riskRules} onChange={setRiskRules} />

          <Separator />

          {/* Target params */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Target R:R Ratio</Label>
              <Input type="number" step="0.1" value={idealRR} onChange={e => setIdealRR(e.target.value)}
                placeholder="e.g. 2.0 (1:2 R:R)" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Max Loss Per Trade ($)</Label>
              <Input type="number" value={maxLoss} onChange={e => setMaxLoss(e.target.value)}
                placeholder="e.g. 150" />
            </div>
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading || !name}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-black font-bold">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : (editPlaybook ? 'Save Changes' : 'Create Strategy')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}