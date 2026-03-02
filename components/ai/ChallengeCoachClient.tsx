/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

// components/ai/ChallengeCoachClient.tsx

import { useState, useCallback } from 'react'
import { useAccount } from '@/components/layout/AccountContext'
import {
  RefreshCw, AlertTriangle, 
  TrendingUp,  Shield, Target, Brain,
  Zap, Trophy, Clock, CalendarDays, Building2, ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

// ── Types ──────────────────────────────────────────────────
interface CoachData {
  headline: string
  status: 'on_track' | 'at_risk' | 'critical' | 'passed' | 'failed'
  progressInsight: string
  paceInsight: string
  drawdownInsight: string
  dailyLimitInsight: string | null
  consistencyInsight: string | null
  dowInsight: string
  topPriority: string
  warnings: string[]
  encouragement: string
}

interface AccountInfo {
  id: string; label: string; firmName: string; firmColor: string
  stage: string; status: string
  profitTarget: number; maxDrawdown: number; dailyLimit: number
  hasDailyLimit: boolean; isTrailing: boolean
  consistency50: boolean; consistency30: boolean
  minDays: number; maxDays: number
}

interface Metrics {
  netPnl: number; remaining: number; pctComplete: number
  wins: number; losses: number; winRate: number
  avgWin: number; avgLoss: number; tradingDays: number
  ddUsed: number; ddRemaining: number; ddPct: number
  bestDayPnl: number; worstDayPnl: number; bestDayPct: number
  tradesNeeded: number | null; daysNeeded: number | null
}

// ── Status config ──────────────────────────────────────────
const STATUS_CONFIG = {
  on_track: { label: 'On Track',  color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/30', dot: 'bg-emerald-500' },
  at_risk:  { label: 'At Risk',   color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/30',     dot: 'bg-amber-400'   },
  critical: { label: 'Critical',  color: 'text-red-500',     bg: 'bg-red-500/10 border-red-500/30',         dot: 'bg-red-500'     },
  passed:   { label: 'Passed! 🎉',color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/30', dot: 'bg-emerald-500' },
  failed:   { label: 'Failed',    color: 'text-red-500',     bg: 'bg-red-500/10 border-red-500/30',         dot: 'bg-red-500'     },
}

function fmt(n: number) {
  return n >= 0 ? `+$${n.toFixed(2)}` : `-$${Math.abs(n).toFixed(2)}`
}
function fmtAbs(n: number) { return `$${Math.abs(n).toFixed(2)}` }

// ── Account Picker ─────────────────────────────────────────
function AccountPicker({ selectedId, onSelect }: { selectedId: string | null; onSelect: (id: string) => void }) {
  const { accounts } = useAccount()
  const evalAccounts = accounts.filter(a => a.status === 'active' || a.status === 'passed')

  if (evalAccounts.length === 0) {
    return (
      <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl">
        <Building2 className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm font-semibold mb-1">No prop firm accounts</p>
        <p className="text-xs text-muted-foreground">Add a prop firm account first on the Prop Firms page.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Select an account to analyze:</p>
      <div className="grid grid-cols-1 gap-2">
        {evalAccounts.map(acc => (
          <button key={acc.id} onClick={() => onSelect(acc.id)}
            className={cn(
              'flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all text-left group',
              selectedId === acc.id
                ? 'border-emerald-500 bg-emerald-500/10'
                : 'border-border hover:border-emerald-500/40 hover:bg-emerald-500/5'
            )}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-black shrink-0"
              style={{ background: acc.firmColor }}>
              {acc.firmName.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{acc.label}</p>
              <p className="text-xs text-muted-foreground">{acc.firmName} · {acc.stage} · ${acc.accountSize.toLocaleString()}</p>
            </div>
            <div className={cn('w-2 h-2 rounded-full shrink-0',
              acc.status === 'active' ? 'bg-emerald-500' :
              acc.status === 'passed' ? 'bg-blue-400' : 'bg-muted-foreground'
            )} />
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-emerald-500 transition-colors shrink-0" />
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Insight Card ───────────────────────────────────────────
function InsightCard({ icon: Icon, label, text, color = 'text-muted-foreground', bg = 'bg-muted/30 border-border' }: {
  icon: any; label: string; text: string
  color?: string; bg?: string
}) {
  return (
    <div className={cn('rounded-xl border p-4 space-y-2', bg)}>
      <div className="flex items-center gap-2">
        <Icon className={cn('w-3.5 h-3.5 shrink-0', color)} />
        <p className={cn('text-[10px] font-bold uppercase tracking-wider', color + '/70')}>{label}</p>
      </div>
      <p className="text-xs text-foreground leading-relaxed">{text}</p>
    </div>
  )
}

// ── Skeleton ───────────────────────────────────────────────
function CoachSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-20 bg-muted/50 rounded-2xl" />
      <div className="grid grid-cols-3 gap-3">
        {[1,2,3].map(i => <div key={i} className="h-24 bg-muted/50 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[1,2,3,4].map(i => <div key={i} className="h-20 bg-muted/50 rounded-xl" />)}
      </div>
      <div className="h-16 bg-muted/50 rounded-xl" />
      <div className="h-16 bg-muted/50 rounded-xl" />
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────
export function ChallengeCoachClient() {
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [coach, setCoach] = useState<CoachData | null>(null)
  const [account, setAccount] = useState<AccountInfo | null>(null)
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const analyze = useCallback(async (accountId: string) => {
    setLoading(true)
    setError(null)
    setCoach(null)
    try {
      const res = await fetch('/api/ai/challenge-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error ?? 'Failed')
      setCoach(data.coach)
      setAccount(data.account)
      setMetrics(data.metrics)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  function handleSelect(id: string) {
    setSelectedAccountId(id)
    setCoach(null)
    analyze(id)
  }

  const statusCfg = coach ? STATUS_CONFIG[coach.status] : null

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h1 className="text-xl font-black tracking-tight">Challenge Coach</h1>
            <Badge className="bg-linear-to-r from-violet-500 to-emerald-500 text-white border-0 text-[10px]">AI</Badge>
          </div>
          <p className="text-sm text-muted-foreground">Real-time AI analysis of your prop firm challenge progress</p>
        </div>
        {coach && account && (
          <Button variant="outline" size="sm" onClick={() => analyze(account.id)} disabled={loading}
            className="gap-1.5 shrink-0">
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            Refresh
          </Button>
        )}
      </div>

      {/* ── Account picker (always visible, compact if result shown) ── */}
      {!coach && !loading && (
        <AccountPicker selectedId={selectedAccountId} onSelect={handleSelect} />
      )}

      {/* Account switcher badge (when result shown) */}
      {(coach || loading) && account && (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[9px] font-black shrink-0"
            style={{ background: account.firmColor }}>
            {account.firmName.slice(0, 2).toUpperCase()}
          </div>
          <p className="text-sm font-bold">{account.label}</p>
          <Badge variant="outline" className="text-[10px]">{account.stage}</Badge>
          <button onClick={() => { setCoach(null); setAccount(null); setSelectedAccountId(null) }}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors">
            Switch account
          </button>
        </div>
      )}

      {/* ── Loading ── */}
      {loading && <CoachSkeleton />}

      {/* ── Error ── */}
      {error && !loading && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-400 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* ── Results ── */}
      {coach && metrics && account && !loading && (
        <div className="space-y-4">

          {/* Status headline */}
          <div className={cn('rounded-2xl border px-5 py-4 flex items-center gap-4', statusCfg?.bg)}>
            <div className={cn('w-2.5 h-2.5 rounded-full shrink-0 animate-pulse', statusCfg?.dot)} />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={cn('text-xs font-bold uppercase tracking-wider', statusCfg?.color)}>{statusCfg?.label}</span>
              </div>
              <p className="text-sm font-semibold text-foreground">{coach.headline}</p>
            </div>
          </div>

          {/* Warnings */}
          {coach.warnings.length > 0 && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 space-y-2">
              {coach.warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-300">{w}</p>
                </div>
              ))}
            </div>
          )}

          {/* ── Progress bars ── */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Challenge Progress</p>

            {/* Profit target */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-emerald-500" />
                  Profit Target
                </span>
                <span className={cn('font-bold tabular-nums', metrics.netPnl >= 0 ? 'text-emerald-500' : 'text-red-400')}>
                  {fmt(metrics.netPnl)} / ${account.profitTarget.toLocaleString()}
                </span>
              </div>
              <Progress value={Math.max(0, metrics.pctComplete)} className="h-2" />
              <p className="text-[10px] text-muted-foreground">
                {metrics.pctComplete.toFixed(1)}% complete · ${metrics.remaining > 0 ? metrics.remaining.toFixed(2) : '0.00'} remaining
                {metrics.tradesNeeded && metrics.tradesNeeded > 0 && ` · ~${metrics.tradesNeeded} more wins at avg`}
              </p>
            </div>

            {/* Drawdown */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold flex items-center gap-1.5">
                  <Shield className={cn('w-3.5 h-3.5', metrics.ddPct >= 75 ? 'text-red-400' : metrics.ddPct >= 50 ? 'text-amber-400' : 'text-blue-400')} />
                  {account.isTrailing ? 'Trailing Drawdown' : 'Max Drawdown'}
                </span>
                <span className={cn('font-bold tabular-nums', metrics.ddPct >= 75 ? 'text-red-400' : metrics.ddPct >= 50 ? 'text-amber-400' : 'text-foreground')}>
                  ${metrics.ddUsed.toFixed(2)} / ${account.maxDrawdown.toLocaleString()}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className={cn('h-full rounded-full transition-all',
                  metrics.ddPct >= 75 ? 'bg-red-500' : metrics.ddPct >= 50 ? 'bg-amber-400' : 'bg-blue-400'
                )} style={{ width: `${Math.min(metrics.ddPct, 100)}%` }} />
              </div>
              <p className="text-[10px] text-muted-foreground">
                {metrics.ddPct.toFixed(1)}% used · ${metrics.ddRemaining.toFixed(2)} remaining
              </p>
            </div>

            {/* Daily limit (if applicable) */}
            {account.hasDailyLimit && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5 text-purple-400" />
                    Daily Loss Limit
                  </span>
                  <span className="font-bold tabular-nums text-foreground">
                    Worst day: {fmtAbs(metrics.worstDayPnl)} / ${account.dailyLimit.toLocaleString()}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className={cn('h-full rounded-full transition-all',
                    account.dailyLimit > 0 && Math.abs(Math.min(metrics.worstDayPnl, 0)) / account.dailyLimit >= 0.75
                      ? 'bg-red-500' : 'bg-purple-400'
                  )} style={{ width: `${account.dailyLimit > 0 ? Math.min((Math.abs(Math.min(metrics.worstDayPnl, 0)) / account.dailyLimit) * 100, 100) : 0}%` }} />
                </div>
              </div>
            )}

            {/* Consistency rule */}
            {(account.consistency50 || account.consistency30) && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-violet-400" />
                    {account.consistency50 ? '50% Consistency Rule' : '30% Consistency Rule'}
                  </span>
                  <span className={cn('font-bold tabular-nums', metrics.bestDayPct > (account.consistency50 ? 50 : 30) ? 'text-red-400' : 'text-foreground')}>
                    Best day: {metrics.bestDayPct.toFixed(1)}% of target
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className={cn('h-full rounded-full transition-all',
                    metrics.bestDayPct > (account.consistency50 ? 50 : 30) ? 'bg-red-500' : 'bg-violet-400'
                  )} style={{ width: `${Math.min(metrics.bestDayPct, 100)}%` }} />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Limit: {account.consistency50 ? '50%' : '30%'} · You&apos;re at {metrics.bestDayPct.toFixed(1)}%
                  {metrics.bestDayPct <= (account.consistency50 ? 50 : 30) ? ' ✓ Within limits' : ' ⚠️ Rule breached'}
                </p>
              </div>
            )}

            {/* Trading days */}
            {account.minDays > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    Min Trading Days
                  </span>
                  <span className="font-bold tabular-nums text-foreground">
                    {metrics.tradingDays} / {account.minDays} days
                  </span>
                </div>
                <Progress value={(metrics.tradingDays / account.minDays) * 100} className="h-2" />
                {metrics.daysNeeded !== null && metrics.daysNeeded > 0 && (
                  <p className="text-[10px] text-muted-foreground">{metrics.daysNeeded} more trading days needed</p>
                )}
              </div>
            )}
          </div>

          {/* ── AI Insights grid ── */}
          <div className="grid grid-cols-2 gap-3">
            <InsightCard icon={TrendingUp} label="Progress" text={coach.progressInsight}
              color="text-emerald-500" bg="bg-emerald-500/5 border-emerald-500/20" />
            <InsightCard icon={Zap} label="Pace" text={coach.paceInsight}
              color="text-blue-400" bg="bg-blue-500/5 border-blue-500/20" />
            <InsightCard icon={Shield} label="Drawdown" text={coach.drawdownInsight}
              color="text-amber-400" bg="bg-amber-500/5 border-amber-500/20" />
            <InsightCard icon={CalendarDays} label="Day of Week" text={coach.dowInsight}
              color="text-purple-400" bg="bg-purple-500/5 border-purple-500/20" />
            {coach.dailyLimitInsight && (
              <InsightCard icon={Shield} label="Daily Limit" text={coach.dailyLimitInsight}
                color="text-cyan-400" bg="bg-cyan-500/5 border-cyan-500/20" />
            )}
            {coach.consistencyInsight && (
              <InsightCard icon={Zap} label="Consistency Rule" text={coach.consistencyInsight}
                color="text-violet-400" bg="bg-violet-500/5 border-violet-500/20" />
            )}
          </div>

          {/* Top priority */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
              <Brain className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400/70 mb-1">Top Priority Right Now</p>
              <p className="text-sm text-foreground font-medium">{coach.topPriority}</p>
            </div>
          </div>

          {/* Encouragement */}
          <div className="rounded-xl border border-border bg-card px-5 py-4 text-center">
            <p className="text-sm font-black tracking-tight">{coach.encouragement}</p>
          </div>

          {/* Refresh */}
          <div className="flex justify-center pt-1">
            <button onClick={() => analyze(account.id)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <RefreshCw className="w-3 h-3" />
              Refresh analysis
            </button>
          </div>
        </div>
      )}
    </div>
  )
}