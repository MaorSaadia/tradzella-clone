// Addition to your Settings page — Gemini API Key section
// Add this card inside your existing settings layout

// ── Gemini API Key Card ────────────────────────────────────
// components/settings/GeminiSettings.tsx

'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Sparkles, Eye, EyeOff, ExternalLink, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface Props {
  hasKey: boolean
}

export function GeminiSettings({ hasKey }: Props) {
  const [key, setKey] = useState('')
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!key.trim()) { toast.error('Enter an API key'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/settings/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key }),
      })
      if (!res.ok) { toast.error('Failed to save'); return }
      toast.success('Gemini API key saved!')
      setKey('')
    } catch { toast.error('Network error') }
    finally { setSaving(false) }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <div className="w-7 h-7 bg-violet-500/20 rounded-lg flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-violet-500" />
          </div>
          AI Weekly Review — Gemini API
        </CardTitle>
        <CardDescription className="text-xs">
          Connect Gemini Flash to enable AI-powered weekly coaching reviews.
          The free tier gives you 15 requests/minute — plenty for weekly reviews.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">

        {hasKey && (
          <div className="flex items-center gap-2 text-xs text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            Gemini API key configured — Weekly Review is active
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-xs">{hasKey ? 'Replace API Key' : 'Gemini API Key'}</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={show ? 'text' : 'password'}
                value={key}
                onChange={e => setKey(e.target.value)}
                placeholder="AIza..."
                className="pr-9 font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => setShow(s => !s)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <Button onClick={handleSave} disabled={saving || !key.trim()} className="shrink-0 bg-violet-500 hover:bg-violet-600 text-white">
              Save Key
            </Button>
          </div>
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>How to get your free key:</p>
          <ol className="list-decimal list-inside space-y-0.5 pl-1">
            <li>Go to <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer"
              className="text-violet-400 hover:text-violet-300 inline-flex items-center gap-0.5">
              Google AI Studio <ExternalLink className="w-2.5 h-2.5" />
            </a></li>
            <li>Click &quot;Create API Key&quot;</li>
            <li>Copy and paste it above</li>
          </ol>
          <p className="text-[10px] text-muted-foreground/70 mt-2">
            Free tier: 15 req/min, 1M tokens/day — more than enough for weekly reviews.
            Your key is encrypted and stored securely.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}