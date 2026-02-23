/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

// components/propfirms/PropFirmCard.tsx

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Plus, ChevronDown, ChevronUp, Trash2,
  AlertTriangle, CheckCircle2, XCircle, Clock,
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn, formatCurrency, calcTrailingDrawdown } from '@/lib/utils'
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
  active:  { label: 'Active',  color: 'border-blue-500/40 text-blue-400 bg-blue-500/5',          icon: Clock },
  passed:  { label: 'Passed',  color: 'border-emerald-500/40 text-emerald-500 bg-emerald-500/5', icon: CheckCircle2 },
  failed:  { label: 'Failed',  color: 'border-red-500/40 text-red-500 bg-red-500/5',              icon: XCircle },
  paused:  { label: 'Paused',  color: 'border-yellow-500/40 text-yellow-500 bg-yellow-500/5',    icon: Clock },
}

// ── Calculate progress for one account ────────────────────
function calcProgress(account: PropFirmAccount, trades: Trade[]) {
  const accountTrades = trades.filter(t => t.propFirmAccountId === account.id)

  // Net closed P&L
  const pnl = accountTrades.reduce((s, t) => s + Number(t.pnl), 0)

  // Trading days
  const tradingDays = new Set(
    accountTrades.map(t => new Date(t.exitTime).toDateString())
  ).size

  // Daily P&L map (for daily loss limit)
  const dailyMap: Record<string, number> = {}
  accountTrades.forEach(t => {
    const day = new Date(t.exitTime).toDateString()
    dailyMap[day] = (dailyMap[day] ?? 0) + Number(t.pnl)
  })
  const dailyValues = Object.values(dailyMap)
  const worstDay = dailyValues.length ? Math.min(...dailyValues) : 0
  const bestDay = dailyValues.length ? Math.max(...dailyValues) : 0

  // ── Trailing drawdown (the real prop firm way) ────────────
  // Uses peak-tracking across sorted closed trades.
  // For Apex-style trailing DD: floor moves up as peak moves up.
  const {
    currentDrawdownUsed: trailingDrawdownUsed,
    maxTrailingDrawdown,
    peakBalance,
  } = calcTrailingDrawdown(accountTrades)

  const profitTarget = Number(account.profitTarget ?? 0)
  const maxDD = Number(account.maxDrawdown ?? 0)
  const dailyLimit = Number(account.dailyLossLimit ?? 0)
  const minDays = account.minTradingDays ?? 0

  // Progress percentages
  const profitPct = profitTarget > 0 ? Math.min(Math.max((pnl / profitTarget) * 100, 0), 100) : 0
  const drawdownPct = maxDD > 0 ? Math.min((trailingDrawdownUsed / maxDD) * 100, 100) : 0
  const dailyLossPct = dailyLimit > 0 ? Math.min((Math.abs(Math.min(worstDay, 0)) / dailyLimit) * 100, 100) : 0
  const daysPct = minDays > 0 ? Math.min((tradingDays / minDays) * 100, 100) : 100

  // Risk flags
  const isNearDD = drawdownPct >= 75
  const isNearDaily = dailyLossPct >= 75
  const hasHitDDLimit = maxDD > 0 && trailingDrawdownUsed >= maxDD
  const hasPassedTarget = profitTarget > 0 && pnl >= profitTarget

  return {
    pnl, tradingDays, worstDay, bestDay,
    trailingDrawdownUsed, maxTrailingDrawdown, peakBalance,
    profitPct, drawdownPct, dailyLossPct, daysPct,
    isNearDD, isNearDaily, hasHitDDLimit, hasPassedTarget,
    tradeCount: accountTrades.length,
  }
}

export function PropFirmCard({ firm, allTrades, onAddAccount, onRefresh }: Props) {
  const [expanded, setExpanded] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const color = firm.logoColor ?? '#10b981'

  async function handleDeleteAccount(accountId: string) {
    if (!confirm('Delete this account? Linked trades will be unlinked.')) return
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
    if (!confirm(`Delete ${firm.name} and all its accounts?`)) return
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
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-black shrink-0"
            style={{ background: color }}>
            {(firm.shortName ?? firm.name).slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-black">{firm.name}</h2>
            <p className="text-xs text-muted-foreground">
              {firm.accounts.length} account{firm.accounts.length !== 1 ? 's' : ''}
              · {firm.accounts.filter(a => a.status === 'active').length} active
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
              No accounts yet —
              <button onClick={onAddAccount} className="text-emerald-500 hover:text-emerald-400 ml-1 font-semibold">
                add your first account
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {firm.accounts.map(account => {
                const p = calcProgress(account, allTrades)
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
                          ${Number(account.accountSize).toLocaleString()} · {STAGE_LABELS[account.stage ?? 'evaluation']}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={cn('gap-1 text-xs cursor-pointer', statusCfg.color)}
                          onClick={() => {
                            const cycle: Record<string, string> = { active: 'passed', passed: 'failed', failed: 'paused', paused: 'active' }
                            handleUpdateStatus(account.id, cycle[account.status ?? 'active'])
                          }}>
                          <StatusIcon className="w-3 h-3" />
                          {statusCfg.label}
                        </Badge>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500/60 hover:text-red-500 hover:bg-red-500/10"
                          disabled={deletingId === account.id}
                          onClick={() => handleDeleteAccount(account.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Alert banners */}
                    {(p.hasHitDDLimit || p.isNearDD || p.isNearDaily) && (
                      <div className={cn(
                        'flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold',
                        p.hasHitDDLimit
                          ? 'bg-red-500/15 text-red-500 border border-red-500/30'
                          : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                      )}>
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        {p.hasHitDDLimit
                          ? '🚨 Trailing drawdown limit reached — account may be breached!'
                          : p.isNearDD
                            ? `⚠️ Near trailing drawdown limit (${p.drawdownPct.toFixed(0)}% used)`
                            : `⚠️ Near daily loss limit (${p.dailyLossPct.toFixed(0)}% used)`}
                      </div>
                    )}

                    {/* P&L summary strip */}
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: 'Net P&L',   value: formatCurrency(p.pnl),      color: p.pnl >= 0 ? 'text-emerald-500' : 'text-red-500' },
                        { label: 'Best Day',  value: `+$${p.bestDay.toFixed(0)}`, color: 'text-emerald-500' },
                        { label: 'Worst Day', value: `$${p.worstDay.toFixed(0)}`, color: 'text-red-500' },
                      ].map(s => (
                        <div key={s.label} className="bg-muted/30 rounded-lg p-2 text-center">
                          <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">{s.label}</p>
                          <p className={cn('text-xs font-black tabular-nums', s.color)}>{s.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* ── Progress bars ── */}
                    <div className="space-y-3">

                      {/* Profit Target */}
                      {Number(account.profitTarget) > 0 && (
                        <div>
                          <div className="flex justify-between text-[10px] mb-1">
                            <span className="text-muted-foreground">Profit Target</span>
                            <span className={cn('font-bold', p.pnl >= 0 ? 'text-emerald-500' : 'text-muted-foreground')}>
                              {formatCurrency(p.pnl)} / {formatCurrency(Number(account.profitTarget))}
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-emerald-500 transition-all"
                              style={{ width: `${Math.max(0, p.profitPct)}%` }} />
                          </div>
                        </div>
                      )}

                      {/* Trailing / Static Drawdown */}
                      {Number(account.maxDrawdown) > 0 && (
                        <div>
                          <div className="flex justify-between text-[10px] mb-1">
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">
                                Max Drawdown {account.isTrailingDrawdown ? '(trailing)' : '(static)'}
                              </span>
                              {account.isTrailingDrawdown && (
                                <span className="text-[8px] bg-blue-500/10 text-blue-400 px-1 rounded">
                                  floor moves up
                                </span>
                              )}
                            </div>
                            <span className={cn('font-bold tabular-nums',
                              p.drawdownPct >= 75 ? 'text-red-500' : 'text-muted-foreground'
                            )}>
                              {/* Show: current DD used / limit */}
                              {account.isTrailingDrawdown
                                ? `$${p.trailingDrawdownUsed.toFixed(2)} / $${Number(account.maxDrawdown).toFixed(2)}`
                                : `$${Math.abs(Math.min(p.pnl, 0)).toFixed(2)} / $${Number(account.maxDrawdown).toFixed(2)}`
                              }
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn('h-full rounded-full transition-all',
                                p.drawdownPct >= 90 ? 'bg-red-500'
                                  : p.drawdownPct >= 75 ? 'bg-amber-500'
                                    : 'bg-blue-500'
                              )}
                              style={{ width: `${p.drawdownPct}%` }}
                            />
                          </div>
                          {/* Trailing DD tooltip info */}
                          {account.isTrailingDrawdown && p.peakBalance > 0 && (
                            <p className="text-[9px] text-muted-foreground mt-0.5">
                              Peak: +${p.peakBalance.toFixed(2)} · Floor moved up by ${p.peakBalance.toFixed(2)}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Daily Loss Limit */}
                      {Number(account.dailyLossLimit) > 0 && (
                        <div>
                          <div className="flex justify-between text-[10px] mb-1">
                            <span className="text-muted-foreground">Daily Loss Limit (worst day)</span>
                            <span className={cn('font-bold tabular-nums',
                              p.dailyLossPct >= 75 ? 'text-amber-500' : 'text-muted-foreground'
                            )}>
                              ${Math.abs(Math.min(p.worstDay, 0)).toFixed(2)} / ${Number(account.dailyLossLimit).toFixed(2)}
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn('h-full rounded-full transition-all',
                                p.dailyLossPct >= 90 ? 'bg-red-500'
                                  : p.dailyLossPct >= 75 ? 'bg-amber-500'
                                    : 'bg-purple-500'
                              )}
                              style={{ width: `${p.dailyLossPct}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Min Trading Days */}
                      {(account.minTradingDays ?? 0) > 0 && (
                        <div>
                          <div className="flex justify-between text-[10px] mb-1">
                            <span className="text-muted-foreground">Trading Days</span>
                            <span className="font-bold text-muted-foreground tabular-nums">
                              {p.tradingDays} / {account.minTradingDays} min
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-emerald-500 transition-all"
                              style={{ width: `${p.daysPct}%` }} />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border">
                      <span>{p.tradeCount} trades linked</span>
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