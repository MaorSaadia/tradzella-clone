/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

// components/propfirms/PropFirmCard.tsx

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Plus, ChevronDown, ChevronUp, Trash2,
  AlertTriangle, CheckCircle2, XCircle, Clock
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Progress } from '@/components/ui/progress'
import { useConfirm } from '@/components/layout/ConfirmDialogProvider'
import { cn, formatCurrency, calcTrailingDrawdown, getTradeTotalPnl } from '@/lib/utils'
import type { PropFirm, PropFirmAccount, Trade } from '@/lib/db/schema'

interface FirmWithAccounts extends PropFirm {
  accounts: PropFirmAccount[]
}

interface Props {
  firm: FirmWithAccounts
  allTrades: Trade[]
  onAddAccount: () => void
  onRefresh: () => void
}

const STAGE_LABELS: Record<string, string> = {
  evaluation: 'Evaluation', phase2: 'Phase 2',
  funded: 'Funded', failed: 'Failed', passed: 'Passed',
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  active:  { label: 'Active',  color: 'border-blue-500/40 text-blue-400 bg-blue-500/5',    icon: Clock },
  passed:  { label: 'Passed',  color: 'border-emerald-500/40 text-emerald-500 bg-emerald-500/5', icon: CheckCircle2 },
  failed:  { label: 'Failed',  color: 'border-red-500/40 text-red-500 bg-red-500/5',        icon: XCircle },
  paused:  { label: 'Paused',  color: 'border-yellow-500/40 text-yellow-500 bg-yellow-500/5', icon: Clock },
}

const FIRM_COLORS = [
  '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b',
  '#ef4444', '#06b6d4', '#ec4899', '#84cc16',
]

// Calculate live progress for one account
function calcProgress(account: PropFirmAccount, trades: Trade[]) {
  const accountTrades = trades.filter(t => t.propFirmAccountId === account.id)
  const pnl = accountTrades.reduce((s, t) => s + getTradeTotalPnl(t), 0)

  const tradingDays = new Set(
    accountTrades.map(t => new Date(t.exitTime).toDateString())
  ).size

  // Daily P&L map
  const dailyMap: Record<string, number> = {}
  accountTrades.forEach(t => {
    const day = new Date(t.exitTime).toDateString()
    dailyMap[day] = (dailyMap[day] ?? 0) + getTradeTotalPnl(t)
  })
  const worstDay = Math.min(...Object.values(dailyMap), 0)
  const bestDay = Math.max(...Object.values(dailyMap), 0)
  const {
    currentDrawdownUsed: trailingDrawdownUsed,
    peakBalance,
  } = calcTrailingDrawdown(accountTrades)
  const staticDrawdownUsed = Math.abs(Math.min(pnl, 0))
  const drawdownUsed = account.isTrailingDrawdown ? trailingDrawdownUsed : staticDrawdownUsed

  const profitTarget = Number(account.profitTarget ?? 0)
  const maxDD = Number(account.maxDrawdown ?? 0)
  const dailyLimit = Number(account.dailyLossLimit ?? 0)
  const minDays = account.minTradingDays ?? 0

  // Progress percentages
  const profitPct = profitTarget > 0 ? Math.min((pnl / profitTarget) * 100, 100) : 0
  const drawdownPct = maxDD > 0 ? Math.min((drawdownUsed / maxDD) * 100, 100) : 0
  const dailyLossPct = dailyLimit > 0 ? Math.min((Math.abs(Math.min(worstDay, 0)) / dailyLimit) * 100, 100) : 0
  const daysPct = minDays > 0 ? Math.min((tradingDays / minDays) * 100, 100) : 100

  // Alerts
  const isNearDD = drawdownPct >= 75
  const isNearDaily = dailyLossPct >= 75
  const hasPassedTarget = pnl >= profitTarget && profitTarget > 0
  const hasHitDDLimit = maxDD > 0 && drawdownUsed >= maxDD
  const remainingLossBeforeFail = maxDD > 0 ? Math.max(maxDD - drawdownUsed, 0) : 0

  return {
    pnl, tradingDays, worstDay, bestDay,
    trailingDrawdownUsed, staticDrawdownUsed, drawdownUsed, peakBalance,
    remainingLossBeforeFail,
    profitPct, drawdownPct, dailyLossPct, daysPct,
    isNearDD, isNearDaily, hasPassedTarget, hasHitDDLimit,
    tradeCount: accountTrades.length,
  }
}

export function PropFirmCard({ firm, allTrades, onAddAccount, onRefresh }: Props) {
  const confirmAction = useConfirm()
  const [expanded, setExpanded] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const color = firm.logoColor ?? FIRM_COLORS[0]

  async function handleDeleteAccount(accountId: string) {
    const confirmed = await confirmAction({
      title: 'Delete this account?',
      description: 'Linked trades will stay in your journal but be unlinked from this account.',
      confirmText: 'Delete Account',
    })
    if (!confirmed) return
    setDeletingId(accountId)
    try {
      const res = await fetch(`/api/propfirms/accounts/${accountId}`, { method: 'DELETE' })
      if (!res.ok) { toast.error('Failed to delete'); return }
      toast.success('Account deleted')
      onRefresh()
    } catch { toast.error('Network error') }
    finally { setDeletingId(null) }
  }

  async function handleUpdateStatus(accountId: string, status: string) {
    const res = await fetch(`/api/propfirms/accounts/${accountId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (!res.ok) { toast.error('Failed to update'); return }
    toast.success('Status updated')
    onRefresh()
  }

  async function handleDeleteFirm() {
    const confirmed = await confirmAction({
      title: `Delete ${firm.name}?`,
      description: 'All accounts under this firm will also be deleted.',
      confirmText: 'Delete Firm',
    })
    if (!confirmed) return
    const res = await fetch(`/api/propfirms/${firm.id}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('Failed to delete firm'); return }
    toast.success('Firm deleted')
    onRefresh()
  }

  return (
    <Card>
      {/* Firm header */}
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          {/* Logo avatar */}
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-black shrink-0"
            style={{ background: color }}>
            {(firm.shortName ?? firm.name).slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-black">{firm.name}</h2>
            <p className="text-xs text-muted-foreground">
              {firm.accounts.length} account{firm.accounts.length !== 1 ? 's' : ''}
              {' - '} {firm.accounts.filter(a => a.status === 'active').length} active
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onAddAccount} className="gap-1.5 text-xs h-8">
              <Plus className="w-3.5 h-3.5" /> Add Account
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-500/10"
              onClick={handleDeleteFirm}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8"
              onClick={() => setExpanded(e => !e)}>
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 space-y-4">
          {firm.accounts.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground border border-dashed border-border rounded-xl">
              No accounts yet -
              <button onClick={onAddAccount} className="text-emerald-500 hover:text-emerald-400 ml-1 font-semibold">
                add your first account
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {firm.accounts.map(account => {
                const progress = calcProgress(account, allTrades)
                const statusCfg = STATUS_CONFIG[account.status ?? 'active']
                const StatusIcon = statusCfg.icon

                return (
                  <div key={account.id}
                    className="border border-border rounded-xl p-4 space-y-4 relative overflow-hidden hover:border-border/80 transition-colors">

                    {/* Top accent */}
                    <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: color }} />

                    {/* Account header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-black">{account.accountLabel}</p>
                        <p className="text-xs text-muted-foreground">
                          ${Number(account.accountSize).toLocaleString()} {' - '} {STAGE_LABELS[account.stage ?? 'evaluation']}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Status badge - dropdown to change */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Badge variant="outline"
                              className={cn('gap-1 text-xs cursor-pointer select-none hover:opacity-80 transition-opacity', statusCfg.color)}>
                              <StatusIcon className="w-3 h-3" />
                              {statusCfg.label}
                              <ChevronDown className="w-2.5 h-2.5 ml-0.5 opacity-60" />
                            </Badge>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-36">
                            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                              const Icon = cfg.icon
                              return (
                                <DropdownMenuItem key={key}
                                  className={cn('gap-2 text-xs cursor-pointer',
                                    account.status === key ? 'font-bold' : ''
                                  )}
                                  onClick={() => handleUpdateStatus(account.id, key)}>
                                  <Icon className={cn('w-3.5 h-3.5', key === 'active' ? 'text-blue-400' : key === 'passed' ? 'text-emerald-500' : key === 'failed' ? 'text-red-500' : 'text-yellow-500')} />
                                  {cfg.label}
                                  {account.status === key && <span className="ml-auto text-emerald-500">OK</span>}
                                </DropdownMenuItem>
                              )
                            })}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500/60 hover:text-red-500 hover:bg-red-500/10"
                          disabled={deletingId === account.id}
                          onClick={() => handleDeleteAccount(account.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Alerts */}
                    {(progress.isNearDD || progress.isNearDaily || progress.hasHitDDLimit) && (
                      <div className={cn(
                        'flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold',
                        progress.hasHitDDLimit
                          ? 'bg-red-500/15 text-red-500 border border-red-500/30'
                          : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                      )}>
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        {progress.hasHitDDLimit
                          ? (account.isTrailingDrawdown
                              ? 'Trailing drawdown limit reached - account may be breached!'
                              : 'Max drawdown hit - account may be breached!')
                          : progress.isNearDD
                            ? `Near ${account.isTrailingDrawdown ? 'trailing' : 'max'} drawdown (${progress.drawdownPct.toFixed(0)}% used)`
                            : `Near daily loss limit (${progress.dailyLossPct.toFixed(0)}% used)`}
                      </div>
                    )}

                    {/* P&L summary */}
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        {
                          label: 'Net P&L',
                          value: formatCurrency(progress.pnl),
                          color: progress.pnl >= 0 ? 'text-emerald-500' : 'text-red-500'
                        },
                        {
                          label: 'Best Day',
                          value: `+$${progress.bestDay.toFixed(0)}`,
                          color: 'text-emerald-500'
                        },
                        {
                          label: 'Worst Day',
                          value: `$${progress.worstDay.toFixed(0)}`,
                          color: 'text-red-500'
                        },
                      ].map(s => (
                        <div key={s.label} className="bg-muted/30 rounded-lg p-2 text-center">
                          <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">{s.label}</p>
                          <p className={cn('text-xs font-black tabular-nums', s.color)}>{s.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Progress bars */}
                    <div className="space-y-3">

                      {/* Profit Target */}
                      {Number(account.profitTarget) > 0 && (
                        <div>
                          <div className="flex justify-between text-[10px] mb-1">
                            <span className="text-muted-foreground">Profit Target</span>
                            <span className={cn('font-bold', progress.pnl >= 0 ? 'text-emerald-500' : 'text-muted-foreground')}>
                              {formatCurrency(progress.pnl)} / {formatCurrency(Number(account.profitTarget))}
                            </span>
                          </div>
                          <Progress value={Math.max(0, progress.profitPct)} className="h-1.5"
                            style={{ '--progress-color': '#10b981' } as any} />
                        </div>
                      )}

                      {/* Max Drawdown */}
                      {Number(account.maxDrawdown) > 0 && (
                        <div>
                          <div className="flex justify-between text-[10px] mb-1">
                            <span className="text-muted-foreground">
                              Max Drawdown {account.isTrailingDrawdown ? '(trailing)' : '(static)'}
                            </span>
                            <span className={cn('font-bold',
                              progress.drawdownPct >= 75 ? 'text-red-500' : 'text-muted-foreground'
                            )}>
                              {formatCurrency(progress.drawdownUsed)} / {formatCurrency(Number(account.maxDrawdown))}
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn('h-full rounded-full transition-all',
                                progress.drawdownPct >= 90 ? 'bg-red-500'
                                  : progress.drawdownPct >= 75 ? 'bg-amber-500'
                                    : 'bg-blue-500'
                              )}
                              style={{ width: `${progress.drawdownPct}%` }}
                            />
                          </div>
                          {account.isTrailingDrawdown && progress.peakBalance > 0 && (
                            <p className="text-[9px] text-muted-foreground mt-1">
                              Peak: {formatCurrency(progress.peakBalance)}
                            </p>
                          )}
                          <p className={cn(
                            'text-[10px] mt-1 font-semibold',
                            progress.remainingLossBeforeFail <= Number(account.maxDrawdown) * 0.25
                              ? 'text-red-500'
                              : 'text-muted-foreground'
                          )}>
                            Remaining before fail: {formatCurrency(progress.remainingLossBeforeFail)}
                          </p>
                        </div>
                      )}

                      {/* Daily Loss */}
                      {Number(account.dailyLossLimit) > 0 && (
                        <div>
                          <div className="flex justify-between text-[10px] mb-1">
                            <span className="text-muted-foreground">Daily Loss Limit</span>
                            <span className={cn('font-bold',
                              progress.dailyLossPct >= 75 ? 'text-amber-500' : 'text-muted-foreground'
                            )}>
                              {formatCurrency(Math.abs(Math.min(progress.worstDay, 0)))} / {formatCurrency(Number(account.dailyLossLimit))}
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn('h-full rounded-full transition-all',
                                progress.dailyLossPct >= 90 ? 'bg-red-500'
                                  : progress.dailyLossPct >= 75 ? 'bg-amber-500'
                                    : 'bg-purple-500'
                              )}
                              style={{ width: `${progress.dailyLossPct}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Min Trading Days */}
                      {(account.minTradingDays ?? 0) > 0 && (
                        <div>
                          <div className="flex justify-between text-[10px] mb-1">
                            <span className="text-muted-foreground">Trading Days</span>
                            <span className="font-bold text-muted-foreground">
                              {progress.tradingDays} / {account.minTradingDays} min
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-emerald-500 transition-all"
                              style={{ width: `${progress.daysPct}%` }} />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border">
                      <span>{progress.tradeCount} trades linked</span>
                      <span>Started {new Date(account.startDate ?? account.createdAt!).toLocaleDateString()}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

