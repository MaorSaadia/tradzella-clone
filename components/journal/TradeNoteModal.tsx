'use client'

// components/journal/TradeNoteModal.tsx

import { useState, useEffect, useRef } from 'react'
import NextImage from 'next/image'
import { toast } from 'sonner'
import { Loader2, Upload, Trash2 } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { cn, formatCurrency, formatDateTime, getTradeTotalPnl } from '@/lib/utils'
import type { Playbook, Trade } from '@/lib/db/schema'
import { getTradePlaybookIds } from '@/lib/playbooks'

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
  playbooks: Playbook[]
  onClose: () => void
  onSaved: (updated: Trade) => void
}

export function TradeNoteModal({ trade, playbooks, onClose, onSaved }: Props) {
  const [grade, setGrade] = useState<string>('')
  const [emotion, setEmotion] = useState<string>('')
  const [tags, setTags] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [playbookIds, setPlaybookIds] = useState<string[]>([])
  const [screenshot, setScreenshot] = useState('')
  const [isDraggingScreenshot, setIsDraggingScreenshot] = useState(false)
  const [saving, setSaving] = useState(false)
  const dragDepth = useRef(0)

  async function convertImageToDataUrl(file: File): Promise<string> {
    const objectUrl = URL.createObjectURL(file)
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new window.Image()
        image.onload = () => resolve(image)
        image.onerror = () => reject(new Error('Failed to read image'))
        image.src = objectUrl
      })

      const MAX_DIMENSION = 1600
      const ratio = Math.min(MAX_DIMENSION / img.width, MAX_DIMENSION / img.height, 1)
      const width = Math.max(1, Math.round(img.width * ratio))
      const height = Math.max(1, Math.round(img.height * ratio))

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Failed to prepare image canvas')
      ctx.drawImage(img, 0, 0, width, height)

      return canvas.toDataURL('image/jpeg', 0.82)
    } finally {
      URL.revokeObjectURL(objectUrl)
    }
  }

  async function handleScreenshotChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    await processScreenshotFile(file)
    event.target.value = ''
  }

  async function processScreenshotFile(file: File) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image is too large. Max size is 10MB')
      return
    }

    try {
      const dataUrl = await convertImageToDataUrl(file)
      setScreenshot(dataUrl)
    } catch {
      toast.error('Failed to process screenshot')
    }
  }

  function onScreenshotDragEnter(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    dragDepth.current += 1
    setIsDraggingScreenshot(true)
  }

  function onScreenshotDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
  }

  function onScreenshotDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    dragDepth.current = Math.max(0, dragDepth.current - 1)
    if (dragDepth.current === 0) setIsDraggingScreenshot(false)
  }

  async function onScreenshotDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    dragDepth.current = 0
    setIsDraggingScreenshot(false)
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    await processScreenshotFile(file)
  }

  // Populate fields when trade changes
  useEffect(() => {
    if (trade) {
      setGrade(trade.grade ?? '')
      setEmotion(trade.emotion ?? '')
      setTags(trade.tags ?? [])
      setNotes(trade.notes ?? '')
      setPlaybookIds(getTradePlaybookIds(trade))
      setScreenshot(trade.screenshot ?? '')
    }
  }, [trade])

  function togglePlaybook(id: string) {
    setPlaybookIds(prev => (
      prev.includes(id)
        ? prev.filter(item => item !== id)
        : [...prev, id]
    ))
  }

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
          playbookIds,
          screenshot: screenshot || null,
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
      <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto">
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
            Strategies
          </p>
          <div className="flex flex-wrap gap-1.5">
            {playbooks.map(pb => {
              const selected = playbookIds.includes(pb.id)
              return (
                <button
                  key={pb.id}
                  type="button"
                  onClick={() => togglePlaybook(pb.id)}
                  className={cn(
                    'px-2.5 py-1 rounded-md border text-xs font-semibold transition-all',
                    selected
                      ? 'border-blue-500/50 bg-blue-500/10 text-blue-400'
                      : 'border-border text-muted-foreground hover:border-border/80 hover:text-foreground'
                  )}
                >
                  {selected ? 'Selected ' : ''}{pb.emoji} {pb.name}
                </button>
              )
            })}
            {playbooks.length === 0 && (
              <span className="text-xs text-muted-foreground">No strategies created yet</span>
            )}
          </div>
        </div>

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

        {/* Screenshot */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Trade Screenshot
          </p>
          <div
            className={cn(
              'space-y-3 rounded-xl border-2 border-dashed p-3 transition-colors',
              isDraggingScreenshot
                ? 'border-emerald-500 bg-emerald-500/10'
                : 'border-border/70 bg-muted/20'
            )}
            onDragEnter={onScreenshotDragEnter}
            onDragOver={onScreenshotDragOver}
            onDragLeave={onScreenshotDragLeave}
            onDrop={onScreenshotDrop}
          >
            <div className="flex gap-2">
              <label className="inline-flex">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleScreenshotChange}
                />
                <span className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border text-xs font-semibold cursor-pointer hover:bg-accent">
                  <Upload className="w-3.5 h-3.5" />
                  {screenshot ? 'Replace screenshot' : 'Upload screenshot'}
                </span>
              </label>
              <span className="text-xs text-muted-foreground self-center">
                or drag and drop
              </span>
              {screenshot && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs text-red-500 border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
                  onClick={() => setScreenshot('')}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Remove
                </Button>
              )}
            </div>
            {screenshot && (
              <div className="rounded-lg border border-border overflow-hidden max-h-[520px] min-h-[260px] bg-black/10">
                <NextImage
                  src={screenshot}
                  alt="Trade screenshot"
                  width={1200}
                  height={700}
                  unoptimized
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            {!screenshot && (
              <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-8 text-center text-xs text-muted-foreground">
                Drop an image here or click Upload screenshot
              </div>
            )}
          </div>
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
