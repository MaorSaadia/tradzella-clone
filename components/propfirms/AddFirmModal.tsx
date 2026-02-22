'use client'

// components/propfirms/AddFirmModal.tsx

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const FIRM_COLORS = [
  '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b',
  '#ef4444', '#06b6d4', '#ec4899', '#84cc16',
]

const PRESET_FIRMS = [
  { name: 'Apex Trader Funding', short: 'Apex', color: '#3b82f6' },
  { name: 'TopStep', short: 'TS', color: '#10b981' },
  { name: 'FTMO', short: 'FTMO', color: '#8b5cf6' },
  { name: 'Earn2Trade', short: 'E2T', color: '#f59e0b' },
  { name: 'My Funded Futures', short: 'MFF', color: '#06b6d4' },
  { name: 'Leeloo Trading', short: 'Lee', color: '#ec4899' },
  { name: 'Funded Trading Plus', short: 'FTP', color: '#84cc16' },
  { name: 'Custom', short: '', color: '#64748b' },
]

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSaved: () => void
}

export function AddFirmModal({ open, onOpenChange, onSaved }: Props) {
  const [name, setName] = useState('')
  const [shortName, setShortName] = useState('')
  const [color, setColor] = useState(FIRM_COLORS[0])
  const [loading, setLoading] = useState(false)

  function selectPreset(preset: typeof PRESET_FIRMS[0]) {
    if (preset.name === 'Custom') { setName(''); setShortName(''); return }
    setName(preset.name)
    setShortName(preset.short)
    setColor(preset.color)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/propfirms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, shortName, logoColor: color }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Failed'); return }
      toast.success(`${name} added!`)
      setName(''); setShortName('')
      onSaved()
    } catch { toast.error('Network error') }
    finally { setLoading(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Prop Firm</DialogTitle>
          <DialogDescription>Choose a firm or add a custom one</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Preset buttons */}
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
              Quick Select
            </Label>
            <div className="grid grid-cols-4 gap-2">
              {PRESET_FIRMS.map(preset => (
                <button key={preset.name} type="button"
                  onClick={() => selectPreset(preset)}
                  className={cn(
                    'rounded-lg border px-2 py-2.5 text-xs font-bold transition-all text-center',
                    name === preset.name
                      ? 'border-2 border-emerald-500 bg-emerald-500/10 text-emerald-500'
                      : 'border-border text-muted-foreground hover:text-foreground hover:border-border/80'
                  )}
                >
                  {preset.name === 'Custom' ? '✏️ Custom' : preset.short}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="firm-name">Firm Name</Label>
            <Input id="firm-name" value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Apex Trader Funding" required />
          </div>

          {/* Short name + color */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="firm-short" className="text-xs">Short Name (2-4 chars)</Label>
              <Input id="firm-short" value={shortName} onChange={e => setShortName(e.target.value)}
                placeholder="e.g. Apex" maxLength={4} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Brand Color</Label>
              <div className="flex gap-1.5 flex-wrap">
                {FIRM_COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setColor(c)}
                    className={cn('w-6 h-6 rounded-full transition-all border-2',
                      color === c ? 'border-white scale-110' : 'border-transparent'
                    )}
                    style={{ background: c }} />
                ))}
              </div>
            </div>
          </div>

          {/* Preview */}
          {name && (
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-black"
                style={{ background: color }}>
                {(shortName || name).slice(0, 2).toUpperCase()}
              </div>
              <span className="text-sm font-bold">{name}</span>
            </div>
          )}

          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !name}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-black font-bold">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Adding...</> : 'Add Firm'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}