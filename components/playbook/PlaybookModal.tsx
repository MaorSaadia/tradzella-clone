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
const CATEGORIES = ['Momentum', 'Reversal', 'Breakout', 'VWAP', 'Scalp', 'Swing', 'News', 'Opening Range']

const PRESET_STRATEGIES = [
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

  function applyPreset(preset: typeof PRESET_STRATEGIES[0]) {
    setName(preset.name); setDescription(preset.description)
    setCategory(preset.category); setEmoji(preset.emoji); setColor(preset.color)
    setEntryRules(preset.entryRules); setExitRules(preset.exitRules); setRiskRules(preset.riskRules)
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
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
                Quick Start Templates
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {PRESET_STRATEGIES.map(preset => (
                  <button key={preset.name} type="button" onClick={() => applyPreset(preset)}
                    className={cn(
                      'text-left rounded-lg border p-2.5 transition-all hover:border-emerald-500/40 hover:bg-emerald-500/5',
                      name === preset.name ? 'border-emerald-500 bg-emerald-500/10' : 'border-border'
                    )}>
                    <div className="text-base mb-1">{preset.emoji}</div>
                    <p className="text-xs font-bold">{preset.name}</p>
                    <p className="text-[10px] text-muted-foreground">{preset.category}</p>
                  </button>
                ))}
              </div>
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
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. VWAP Reclaim Long" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Category</Label>
                  <select value={category} onChange={e => setCategory(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs">
                    <option value="">Select...</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
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