/* eslint-disable react-hooks/set-state-in-effect */
'use client'

// components/layout/AlertBanner.tsx
// Displays a dismissible warning bar when approaching prop firm limits

import { useState, useEffect } from 'react'
import { AlertTriangle, X, Bell } from 'lucide-react'
import { cn, calcTrailingDrawdown, getTradeTotalPnl } from '@/lib/utils'
import { useAccount } from './AccountContext'
import type { PropFirmAccount, Trade } from '@/lib/db/schema'

interface Alert {
  id: string
  type: 'daily_limit' | 'drawdown' | 'target_hit' | 'approaching_max_days'
  severity: 'warning' | 'danger' | 'success'
  message: string
}

function buildAlerts(account: PropFirmAccount | null, trades: Trade[]): Alert[] {
  if (!account) return []
  const alerts: Alert[] = []

  const accountTrades = trades.filter(t => t.propFirmAccountId === account.id)
  const pnl = accountTrades.reduce((s, t) => s + getTradeTotalPnl(t), 0)

  // Daily P&L
  const today = new Date().toDateString()
  const todayPnl = accountTrades
    .filter(t => new Date(t.exitTime).toDateString() === today)
    .reduce((s, t) => s + getTradeTotalPnl(t), 0)

  const dailyLimit = Number(account.dailyLossLimit ?? 0)
  if (dailyLimit > 0 && todayPnl < 0) {
    const dailyUsedPct = (Math.abs(todayPnl) / dailyLimit) * 100
    if (dailyUsedPct >= 90) {
      alerts.push({
        id: 'daily_danger',
        type: 'daily_limit',
        severity: 'danger',
        message: `🚨 Daily loss at ${dailyUsedPct.toFixed(0)}% of limit — $${Math.abs(todayPnl).toFixed(0)} / $${dailyLimit}. Stop trading today!`,
      })
    } else if (dailyUsedPct >= 70) {
      alerts.push({
        id: 'daily_warn',
        type: 'daily_limit',
        severity: 'warning',
        message: `⚠️ Approaching daily loss limit — $${Math.abs(todayPnl).toFixed(0)} of $${dailyLimit} used (${dailyUsedPct.toFixed(0)}%)`,
      })
    }
  }

  // Trailing drawdown
  const { currentDrawdownUsed } = calcTrailingDrawdown(accountTrades)
  const maxDD = Number(account.maxDrawdown ?? 0)
  if (maxDD > 0) {
    const ddPct = (currentDrawdownUsed / maxDD) * 100
    if (ddPct >= 90) {
      alerts.push({
        id: 'dd_danger',
        type: 'drawdown',
        severity: 'danger',
        message: `🚨 Trailing drawdown at ${ddPct.toFixed(0)}% — $${currentDrawdownUsed.toFixed(0)} of $${maxDD} used!`,
      })
    } else if (ddPct >= 75) {
      alerts.push({
        id: 'dd_warn',
        type: 'drawdown',
        severity: 'warning',
        message: `⚠️ Trailing drawdown at ${ddPct.toFixed(0)}% — be careful. $${(maxDD - currentDrawdownUsed).toFixed(0)} remaining.`,
      })
    }
  }

  // Profit target hit!
  const profitTarget = Number(account.profitTarget ?? 0)
  if (profitTarget > 0 && pnl >= profitTarget) {
    alerts.push({
      id: 'target_hit',
      type: 'target_hit',
      severity: 'success',
      message: `🎉 Profit target reached! +$${pnl.toFixed(2)} — consider requesting your evaluation results.`,
    })
  }

  // Max trading days
  const tradingDays = new Set(accountTrades.map(t => new Date(t.exitTime).toDateString())).size
  const maxDays = account.maxTradingDays ?? 0
  if (maxDays > 0 && tradingDays >= maxDays - 2) {
    alerts.push({
      id: 'max_days',
      type: 'approaching_max_days',
      severity: 'warning',
      message: `📅 ${maxDays - tradingDays} trading day(s) remaining in your evaluation window.`,
    })
  }

  return alerts
}

interface Props {
  allTrades: Trade[]
  accountDetails: PropFirmAccount | null
}

export function AlertBanner({ allTrades, accountDetails }: Props) {
  const { selected } = useAccount()
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [notifEnabled, setNotifEnabled] = useState(false)

  const alerts = buildAlerts(accountDetails, allTrades)
  const visible = alerts.filter(a => !dismissed.has(a.id))

  // Browser notifications
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'granted') {
      setNotifEnabled(true)
    }
  }, [])

  async function requestNotifications() {
    if (!('Notification' in window)) return
    const perm = await Notification.requestPermission()
    if (perm === 'granted') {
      setNotifEnabled(true)
      // Fire any active danger alerts as notifications
      alerts.filter(a => a.severity === 'danger').forEach(a => {
        new Notification('MSFunded Alert', { body: a.message, icon: '/icon-192.png' })
      })
    }
  }

  if (!selected || visible.length === 0) return null

  return (
    <div className="space-y-1">
      {visible.map(alert => (
        <div
          key={alert.id}
          className={cn(
            'flex items-center gap-3 px-4 py-2.5 text-xs font-semibold',
            alert.severity === 'danger' && 'bg-red-500/15 text-red-400 border-b border-red-500/20',
            alert.severity === 'warning' && 'bg-amber-500/10 text-amber-400 border-b border-amber-500/15',
            alert.severity === 'success' && 'bg-emerald-500/10 text-emerald-400 border-b border-emerald-500/15',
          )}
        >
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span className="flex-1">{alert.message}</span>

          {!notifEnabled && alert.severity === 'danger' && (
            <button
              onClick={requestNotifications}
              className="flex items-center gap-1 text-[10px] opacity-70 hover:opacity-100"
            >
              <Bell className="w-3 h-3" /> Enable notifications
            </button>
          )}

          <button onClick={() => setDismissed(p => new Set([...p, alert.id]))}
            className="opacity-50 hover:opacity-100 ml-2">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}
