'use client'

// components/journal/TradeNoteModal.tsx

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { cn, formatCurrency, formatDateTime, getTradeTotalPnl } from '@/lib/utils'
import type { Trade } from '@/lib/db/schema'

// ── Config ────────────────────────────────────────────────
const GRADES = ['A+', 'A', 'B', 'C', 'D'] as const
const EMOTIONS = [
  { value: 'calm',      label: '😌 Calm' },
  { value: 'confident', label: '💪 Confident' },
  { value: 'neutral',   label: '😐 Neutral' },
  { value: 'anxious',   label: '😟 Anxious' },
  { value: 'fomo',      label: '😰 FOMO' },
  { value: 'revenge',   label: '😤 Revenge' },
] as const

const PRESET_TAGS = [
  'Breakout', 'Reversal', 'Momentum', 'VWAP', 'Gap Fill',
  'Trend', 'Scalp', 'News Play', 'A+ Setup', 'Mistake',
  'Overtraded', 'Early Entry', 'Late Entry', 'Perfect', 'FOMO Entry',
]

const GRADE_STYLES: Record<string, string> = {
  'A+': 'border-emerald-500 bg-emerald-500/15 text-emerald-500',
  'A':  'border-emerald-400 bg-emerald-400/10 text-emerald-400',
  'B':  'border-blue-400 bg-blue-400/10 text-blue-400',
  'C':  'border-yellow-500 bg-yellow-500/10 text-yellow-500',
  'D':  'border-red-500 bg-red-500/10 text-red-500',
}

interface Props {
  trade: Trade | null
  onClose: () => void
  onSaved: (updated: Trade) => void
}

export function TradeNoteModal({ trade, onClose, onSaved }: Props) {
  const [grade, setGrade] = useState<string>('')
  const [emotion, setEmotion] = useState<string>('')
  const [tags, setTags] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // Populate fields when trade changes
  useEffect(() => {
    if (trade) {
      setGrade(trade.grade ?? '')
      setEmotion(trade.emotion ?? '')
      setTags(trade.tags ?? [])
      setNotes(trade.notes ?? '')
    }
  }, [trade])

  function toggleTag(tag: string) {
    setTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  async function handleSave() {
    if (!trade) return
    setSaving(true)
    try {
      const res = await fetch(`/api/trades/${trade.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grade: grade || null,
          emotion: emotion || null,
          tags,
          notes,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? 'Save failed')
        return
      }

      const updated = await res.json()
      toast.success('Trade note saved!')
      onSaved(updated)
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  if (!trade) return null

  const pnl = getTradeTotalPnl(trade)
  const isWin = pnl > 0

  return (
    <Dialog open={!!trade} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {/* Trade summary in header */}
            <span className="text-base font-black">{trade.symbol}</span>
            <Badge variant="outline" className={cn(
              'text-xs',
              trade.side === 'long'
                ? 'border-emerald-500/40 text-emerald-500'
                : 'border-red-500/40 text-red-500'
            )}>
              {trade.side.toUpperCase()}
            </Badge>
            <span className={cn(
              'ml-auto text-lg font-black tabular-nums',
              isWin ? 'text-emerald-500' : 'text-red-500'
            )}>
              {formatCurrency(pnl)}
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Trade details strip */}
        <div className="grid grid-cols-3 gap-2 text-xs bg-muted/40 rounded-lg p-3">
          <div>
            <p className="text-muted-foreground mb-0.5">Entry</p>
            <p className="font-mono font-semibold">{Number(trade.entryPrice).toFixed(2)}</p>
          </div>
          <div className="flex items-center gap-1 justify-center">
            <div>
              <p className="text-muted-foreground mb-0.5">Exit</p>
              <p className="font-mono font-semibold">{Number(trade.exitPrice).toFixed(2)}</p>
            </div>
          </div>
          <div>
            <p className="text-muted-foreground mb-0.5">Qty / Time</p>
            <p className="font-semibold">{trade.qty} · {formatDateTime(trade.exitTime)}</p>
          </div>
        </div>

        <Separator />

        {/* ── Grade ── */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Setup Grade
          </p>
          <div className="flex gap-2">
            {GRADES.map(g => (
              <button
                key={g}
                onClick={() => setGrade(grade === g ? '' : g)}
                className={cn(
                  'flex-1 py-2 rounded-lg border text-sm font-bold transition-all',
                  grade === g
                    ? GRADE_STYLES[g]
                    : 'border-border text-muted-foreground hover:border-border/80 hover:text-foreground'
                )}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* ── Emotion ── */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Emotional State
          </p>
          <div className="grid grid-cols-3 gap-2">
            {EMOTIONS.map(e => (
              <button
                key={e.value}
                onClick={() => setEmotion(emotion === e.value ? '' : e.value)}
                className={cn(
                  'py-2 px-3 rounded-lg border text-xs font-semibold transition-all text-left',
                  emotion === e.value
                    ? 'border-blue-500/50 bg-blue-500/10 text-blue-400'
                    : 'border-border text-muted-foreground hover:border-border/80 hover:text-foreground'
                )}
              >
                {e.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Tags ── */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Tags
          </p>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_TAGS.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={cn(
                  'px-2.5 py-1 rounded-md border text-xs font-semibold transition-all',
                  tags.includes(tag)
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-500'
                    : 'border-border text-muted-foreground hover:border-border/80 hover:text-foreground'
                )}
              >
                {tags.includes(tag) && '✓ '}{tag}
              </button>
            ))}
          </div>
        </div>

        {/* ── Notes ── */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Notes
          </p>
          <Textarea
            placeholder="What was your thesis? What did you do well? What would you do differently?"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="min-h-24 text-sm resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-black font-bold"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
            ) : (
              'Save Note'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
