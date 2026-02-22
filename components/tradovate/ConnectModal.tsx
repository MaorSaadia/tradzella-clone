'use client'

// components/tradovate/ConnectModal.tsx

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, TrendingUp, Shield, Eye, EyeOff, ExternalLink } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface ConnectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Environment = 'demo' | 'live'

export function ConnectModal({ open, onOpenChange }: ConnectModalProps) {
  const router = useRouter()
  const [environment, setEnvironment] = useState<Environment>('demo')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [cid, setCid] = useState('')
  const [secret, setSecret] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/tradovate/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          cid: Number(cid),
          secret,
          environment,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? 'Connection failed')
        return
      }

      toast.success(`✅ Connected to ${data.account.accountName}!`)
      onOpenChange(false)
      resetForm()

      // Immediately trigger first sync
      toast.info('Syncing your trades...')
      const syncRes = await fetch('/api/tradovate/sync', { method: 'POST' })
      const syncData = await syncRes.json()
      if (syncRes.ok) toast.success(syncData.message)

      router.refresh()
    } catch {
      toast.error('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setUsername('')
    setPassword('')
    setCid('')
    setSecret('')
  }

  function handleClose(open: boolean) {
    if (!loading) { resetForm(); onOpenChange(open) }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <DialogTitle className="text-lg">Connect Tradovate</DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                Auto-sync your prop firm trades every 30 minutes
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* How to get API key */}
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 text-xs text-muted-foreground leading-relaxed">
          <p className="font-semibold text-foreground mb-1">📋 How to get your API Key:</p>
          <ol className="list-decimal list-inside space-y-0.5">
            <li>Log in to <strong className="text-foreground">tradovate.com</strong></li>
            <li>Go to <strong className="text-foreground">Settings → API Access</strong></li>
            <li>Click <strong className="text-foreground">New Key</strong> → copy CID &amp; Secret</li>
          </ol>
          <a
            href="https://trader.tradovate.com/#/account/api"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-blue-500 hover:text-blue-400 mt-2 font-medium"
          >
            Open Tradovate API Settings <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <form onSubmit={handleConnect} className="space-y-4">

          {/* Environment toggle */}
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
              Environment
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {(['demo', 'live'] as Environment[]).map(env => (
                <button
                  key={env}
                  type="button"
                  onClick={() => setEnvironment(env)}
                  className={cn(
                    'py-2.5 px-4 rounded-lg border text-sm font-semibold transition-all',
                    environment === env
                      ? env === 'demo'
                        ? 'bg-blue-500/10 border-blue-500/50 text-blue-500'
                        : 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500'
                      : 'border-border text-muted-foreground hover:border-border/80 hover:text-foreground'
                  )}
                >
                  {env === 'demo' ? '🧪 Demo / Sim' : '🟢 Live'}
                </button>
              ))}
            </div>
          </div>

          {/* Username + Password */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tv-username" className="text-xs">Username / Email</Label>
              <Input
                id="tv-username"
                type="text"
                placeholder="your@email.com"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                autoComplete="off"
                disabled={loading}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tv-password" className="text-xs">Password</Label>
              <div className="relative">
                <Input
                  id="tv-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="off"
                  disabled={loading}
                  className="pr-9"
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* CID + Secret */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tv-cid" className="text-xs">
                CID <span className="text-muted-foreground">(number from API settings)</span>
              </Label>
              <Input
                id="tv-cid"
                type="number"
                placeholder="e.g. 154"
                value={cid}
                onChange={e => setCid(e.target.value)}
                required
                autoComplete="off"
                disabled={loading}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tv-secret" className="text-xs">
                API Secret <span className="text-muted-foreground">(UUID)</span>
              </Label>
              <div className="relative">
                <Input
                  id="tv-secret"
                  type={showSecret ? 'text' : 'password'}
                  placeholder="xxxxxxxx-xxxx-..."
                  value={secret}
                  onChange={e => setSecret(e.target.value)}
                  required
                  autoComplete="off"
                  disabled={loading}
                  className="pr-9"
                />
                <button type="button" onClick={() => setShowSecret(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
                  {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Security note */}
          <div className="flex items-start gap-2.5 bg-muted/50 rounded-lg p-3">
            <Shield className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              All credentials are <strong className="text-foreground">encrypted with AES-256</strong> before
              storage. Never stored in plain text.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1"
              onClick={() => handleClose(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit"
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-black font-bold"
              disabled={loading || !username || !password || !cid || !secret}>
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Connecting...</>
              ) : 'Connect & Sync'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}