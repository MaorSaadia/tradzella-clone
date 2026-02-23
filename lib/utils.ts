// lib/utils.ts

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Trade } from './db/schema'
import type { TradeStats } from '@/types'

// ── shadcn helper ──────────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ── Number formatters ──────────────────────────────────────
export function formatCurrency(value: number): string {
  const abs = Math.abs(value)
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(abs)
  return value >= 0 ? `+${formatted}` : `-${formatted}`
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

// ── Date formatters ────────────────────────────────────────
export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

// ── Trailing drawdown calculation ──────────────────────────
//
// Apex / most prop firms use TRAILING drawdown:
// The drawdown floor moves UP as your account peaks — even intra-trade.
//
// Since we only have closed trades (no tick data), we simulate the
// intra-trade peak using the BETTER of entry or exit price move.
//
// For a LONG trade:
//   - Unrealized peak = max(entry→exit favorable move)
//   - i.e. if price went higher before pulling back, we estimate
//     the intra-trade high as the exit price (conservative).
//     If the trade was a winner, the pnl IS the peak.
//     If the trade was a loser, the pnl was the peak too (it hit 0 max).
//
// More precisely with only closed data:
//   - Winner: intra-trade peak >= closed pnl  (we use closed pnl as minimum peak)
//   - Loser:  intra-trade peak could be 0 (never went positive) OR could have
//             gone positive then reversed. We conservatively assume peak = 0
//             for losses (worst case for trailing DD).
//
// This matches Apex's behaviour: the floor only moves up when you
// actually profit (close positive), not during losing trades.
//
export function calcTrailingDrawdown(trades: Trade[]): {
  maxTrailingDrawdown: number
  currentDrawdownUsed: number
  peakBalance: number
} {
  if (!trades.length) return { maxTrailingDrawdown: 0, currentDrawdownUsed: 0, peakBalance: 0 }

  const sorted = [...trades].sort(
    (a, b) => new Date(a.exitTime).getTime() - new Date(b.exitTime).getTime()
  )

  let runningBalance = 0
  let peakBalance = 0       // highest the account has ever been (closed basis)
  let maxTrailingDD = 0     // largest gap between peak and current balance

  sorted.forEach(trade => {
    const pnl = Number(trade.pnl)

    // After this trade closes, update running balance
    runningBalance += pnl

    // The intra-trade peak:
    // For winners: at minimum the trade peaked at runningBalance (after close)
    // For losers: the peak could be at runningBalance - pnl (entry point, if price never went positive)
    //             but since we don't have tick data, we conservatively use max(prev balance, new balance)
    const intraTradePeak = Math.max(peakBalance, runningBalance)
    
    // Update the overall peak the account has reached
    if (intraTradePeak > peakBalance) {
      peakBalance = intraTradePeak
    }

    // Trailing DD = how far we are below the peak right now
    const dd = peakBalance - runningBalance
    if (dd > maxTrailingDD) maxTrailingDD = dd
  })

  return {
    maxTrailingDrawdown: maxTrailingDD,
    currentDrawdownUsed: peakBalance - runningBalance,
    peakBalance,
  }
}

// ── Static (non-trailing) drawdown ────────────────────────
// Simple peak-to-trough on cumulative closed P&L
export function calcStaticDrawdown(trades: Trade[]): number {
  if (!trades.length) return 0
  const sorted = [...trades].sort(
    (a, b) => new Date(a.exitTime).getTime() - new Date(b.exitTime).getTime()
  )
  let peak = 0, running = 0, maxDD = 0
  sorted.forEach(t => {
    running += Number(t.pnl)
    if (running > peak) peak = running
    const dd = peak - running
    if (dd > maxDD) maxDD = dd
  })
  return maxDD
}

// ── Main stats calculator ──────────────────────────────────
export function calcStats(trades: Trade[]): TradeStats {
  if (!trades.length) {
    return {
      netPnl: 0, winRate: 0, profitFactor: 0, maxDrawdown: 0,
      totalTrades: 0, wins: 0, losses: 0, avgWin: 0,
      avgLoss: 0, expectancy: 0, bestTrade: 0, worstTrade: 0,
    }
  }

  const pnls = trades.map(t => Number(t.pnl))
  const wins = pnls.filter(p => p > 0)
  const losses = pnls.filter(p => p < 0)

  const netPnl = pnls.reduce((s, p) => s + p, 0)
  const grossWins = wins.reduce((s, p) => s + p, 0)
  const grossLosses = Math.abs(losses.reduce((s, p) => s + p, 0))

  const winRate = (wins.length / trades.length) * 100
  const profitFactor = grossLosses > 0 ? grossWins / grossLosses : grossWins > 0 ? Infinity : 0
  const avgWin = wins.length ? grossWins / wins.length : 0
  const avgLoss = losses.length ? grossLosses / losses.length : 0
  const expectancy = (winRate / 100) * avgWin - (1 - winRate / 100) * avgLoss

  // Use static drawdown for the main dashboard card (peak-to-trough on closed P&L)
  const maxDrawdown = calcStaticDrawdown(trades)

  return {
    netPnl,
    winRate,
    profitFactor,
    maxDrawdown,
    totalTrades: trades.length,
    wins: wins.length,
    losses: losses.length,
    avgWin,
    avgLoss,
    expectancy,
    bestTrade: Math.max(...pnls),
    worstTrade: Math.min(...pnls),
  }
}

// ── Symbol cleaner ─────────────────────────────────────────
export function cleanSymbol(raw: string): string {
  return raw
    .replace(/\s*(MAR|JUN|SEP|DEC)\s*\d+/gi, '')
    .replace(/(H|M|U|Z)\d{1,2}$/, '')
    .replace(/\s+\d{2}-\d{2}/, '')
    .replace(/^@/, '')
    .trim()
    .toUpperCase()
    .split(' ')[0]
}