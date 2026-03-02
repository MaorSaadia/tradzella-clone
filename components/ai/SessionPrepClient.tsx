/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

// components/ai/SessionPrepClient.tsx

import { useState, useCallback } from 'react'
import { useAccount } from '@/components/layout/AccountContext'
import {
  Sparkles, RefreshCw, TrendingUp, TrendingDown,
  Sun, AlertTriangle, CheckCircle2, Brain, Shield,
 Zap, ChevronDown, Building2, CheckCircle,
 Flame
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

// ── Types ──────────────────────────────────────────────────
interface PrepData {
  greeting: string
  momentum: { label: string; status: 'hot' | 'warm' | 'cold'; summary: string }
  todayForecast: { label: string; signal: 'green' | 'yellow' | 'red'; summary: string }
  workingSetups: { label: string; items: string[] }
  avoidSetups: { label: string; items: string[] }
  mentalFocus: { label: string; reminder: string }
  riskReminder: { label: string; rules: string[] }
  affirmation: string
}

// ── Config maps ────────────────────────────────────────────
const MOMENTUM_CONFIG = {
  hot:  { color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: Flame,         label: 'Hot Streak 🔥' },
  warm: { color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20',     icon: TrendingUp,    label: 'Warming Up' },
  cold: { color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20',       icon: TrendingDown,  label: 'Cool Period' },
}

const SIGNAL_CONFIG = {
  green:  { color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20', dot: 'bg-emerald-500', label: 'Go Day',       icon: CheckCircle2 },
  yellow: { color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20',     dot: 'bg-amber-400',   label: 'Caution Day',  icon: AlertTriangle },
  red:    { color: 'text-red-500',     bg: 'bg-red-500/10 border-red-500/20',         dot: 'bg-red-500',     label: 'Careful Day',  icon: Shield },
}

// ── Account Selector ───────────────────────────────────────
function AccountSelector({ selectedId, onSelect }: { selectedId: string | null; onSelect: (id: string | null) => void }) {
  const { accounts } = useAccount()
  const [open, setOpen] = useState(false)
  const selected = accounts.find(a => a.id === selectedId) ?? null
  if (accounts.length === 0) return null

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card hover:border-emerald-500/40 transition-all text-xs font-semibold">
        <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="max-w-30 truncate">{selected ? selected.label : 'All Accounts'}</span>
        {selected && <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: selected.firmColor }} />}
        <ChevronDown className="w-3 h-3 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-52 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
          <button onClick={() => { onSelect(null); setOpen(false) }}
            className={cn('w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold hover:bg-accent transition-colors',
              !selectedId ? 'text-emerald-500' : 'text-foreground')}>
            <Sparkles className="w-3.5 h-3.5" />
            <span className="flex-1 text-left">All Accounts</span>
            {!selectedId && <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />}
          </button>
          <div className="border-t border-border">
            {accounts.map(acc => (
              <button key={acc.id} onClick={() => { onSelect(acc.id); setOpen(false) }}
                className={cn('w-full flex items-center gap-2 px-3 py-2.5 text-xs hover:bg-accent transition-colors',
                  selectedId === acc.id ? 'bg-emerald-500/5' : '')}>
                <div className="w-5 h-5 rounded-md flex items-center justify-center text-[8px] font-black text-white shrink-0"
                  style={{ background: acc.firmColor }}>
                  {acc.firmName.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="font-semibold truncate">{acc.label}</p>
                  <p className="text-[10px] text-muted-foreground">{acc.firmName}</p>
                </div>
                {selectedId === acc.id && <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Skeleton loader ────────────────────────────────────────
function PrepSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-16 bg-muted/50 rounded-2xl" />
      <div className="grid grid-cols-2 gap-4">
        <div className="h-32 bg-muted/50 rounded-2xl" />
        <div className="h-32 bg-muted/50 rounded-2xl" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="h-36 bg-muted/50 rounded-2xl" />
        <div className="h-36 bg-muted/50 rounded-2xl" />
      </div>
      <div className="h-24 bg-muted/50 rounded-2xl" />
      <div className="h-28 bg-muted/50 rounded-2xl" />
    </div>
  )
}

// ── Main component ─────────────────────────────────────────
export function SessionPrepClient() {
  const [prep, setPrep] = useState<PrepData | null>(null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [focusAccountId, setFocusAccountId] = useState<string | null>(null)

  const now = new Date()
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  const generate = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/session-prep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propFirmAccountId: focusAccountId }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error ?? 'Failed')
      setPrep(data.prep)
      setGeneratedAt(data.generatedAt)
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [focusAccountId])

  const momentum = prep ? MOMENTUM_CONFIG[prep.momentum.status] : null
  const signal = prep ? SIGNAL_CONFIG[prep.todayForecast.signal] : null

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sun className="w-5 h-5 text-amber-400" />
            <h1 className="text-xl font-black tracking-tight">Session Prep</h1>
            <Badge className="bg-linear-to-r from-violet-500 to-emerald-500 text-white border-0 text-[10px]">AI</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{dateStr} · {timeStr}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <AccountSelector selectedId={focusAccountId} onSelect={(id) => { setFocusAccountId(id); setPrep(null) }} />
          <Button
            onClick={generate}
            disabled={loading}
            className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold gap-2"
          >
            {loading
              ? <><RefreshCw className="w-4 h-4 animate-spin" /> Generating...</>
              : prep
                ? <><RefreshCw className="w-4 h-4" /> Regenerate</>
                : <><Sparkles className="w-4 h-4" /> Generate Prep</>
            }
          </Button>
        </div>
      </div>

      {/* ── Loading ── */}
      {loading && <PrepSkeleton />}

      {/* ── Error ── */}
      {error && !loading && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-400 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* ── Empty state ── */}
      {!prep && !loading && !error && (
        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-border rounded-2xl">
          <div className="relative mb-5">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Sun className="w-7 h-7 text-amber-400" />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-emerald-500" />
            </div>
          </div>
          <h2 className="text-lg font-black mb-2">Ready for your morning briefing?</h2>
          <p className="text-sm text-muted-foreground max-w-sm mb-6 leading-relaxed">
            One click generates a personalized session prep based on your last 14 days of trading data — weak spots, hot setups, mental reminders, and today&apos;s forecast.
          </p>
          <Button onClick={generate} size="lg"
            className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold gap-2">
            <Sparkles className="w-4 h-4" />
            Generate Today&apos;s Prep
          </Button>
        </div>
      )}

      {/* ── Prep content ── */}
      {prep && !loading && (
        <div className="space-y-4">

          {/* Greeting banner */}
          <div className="rounded-2xl border border-border bg-linear-to-r from-card to-muted/20 px-5 py-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Sun className="w-5 h-5 text-amber-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold leading-snug">{prep.greeting}</p>
              {generatedAt && (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Generated at {new Date(generatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
          </div>

          {/* Row 1: Momentum + Today's Forecast */}
          <div className="grid grid-cols-2 gap-4">

            {/* Momentum */}
            {momentum && (
              <div className={cn('rounded-2xl border p-5 space-y-3', momentum.bg)}>
                <div className="flex items-center gap-2">
                  <momentum.icon className={cn('w-4 h-4', momentum.color)} />
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{prep.momentum.label}</p>
                </div>
                <p className={cn('text-sm font-black', momentum.color)}>{momentum.label}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{prep.momentum.summary}</p>
              </div>
            )}

            {/* Today's forecast */}
            {signal && (
              <div className={cn('rounded-2xl border p-5 space-y-3', signal.bg)}>
                <div className="flex items-center gap-2">
                  <div className={cn('w-2.5 h-2.5 rounded-full animate-pulse', signal.dot)} />
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{prep.todayForecast.label}</p>
                </div>
                <div className="flex items-center gap-2">
                  <signal.icon className={cn('w-4 h-4', signal.color)} />
                  <p className={cn('text-sm font-black', signal.color)}>{signal.label}</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{prep.todayForecast.summary}</p>
              </div>
            )}
          </div>

          {/* Row 2: Working setups + Avoid */}
          <div className="grid grid-cols-2 gap-4">

            {/* What's working */}
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-500" />
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-500/70">{prep.workingSetups.label}</p>
              </div>
              <div className="space-y-2">
                {prep.workingSetups.items.map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-foreground leading-snug">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* What to avoid */}
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <p className="text-xs font-bold uppercase tracking-wider text-red-400/70">{prep.avoidSetups.label}</p>
              </div>
              <div className="space-y-2">
                {prep.avoidSetups.items.map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-3.5 h-3.5 shrink-0 mt-0.5 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    </div>
                    <p className="text-xs text-foreground leading-snug">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Mental focus */}
          <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-violet-400" />
              <p className="text-xs font-bold uppercase tracking-wider text-violet-400/70">{prep.mentalFocus.label}</p>
            </div>
            <p className="text-sm text-foreground leading-relaxed font-medium">&quot;{prep.mentalFocus.reminder}&quot;</p>
          </div>

          {/* Risk rules */}
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-400" />
              <p className="text-xs font-bold uppercase tracking-wider text-amber-400/70">{prep.riskReminder.label}</p>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {prep.riskReminder.rules.map((rule, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-md bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[9px] font-black text-amber-500">{i + 1}</span>
                  </div>
                  <p className="text-xs text-foreground leading-snug">{rule}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Affirmation */}
          <div className="rounded-2xl border border-border bg-card px-6 py-4 text-center">
            <p className="text-sm font-black text-foreground tracking-tight">{prep.affirmation}</p>
          </div>

          {/* Regenerate footer */}
          <div className="flex items-center justify-center pt-2">
            <button onClick={generate}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <RefreshCw className="w-3 h-3" />
              Regenerate prep
            </button>
          </div>
        </div>
      )}
    </div>
  )
}