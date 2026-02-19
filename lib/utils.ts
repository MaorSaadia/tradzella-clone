// lib/utils.ts

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Trade } from './db/schema'

export interface TradeStats {
  netPnl: number
  winRate: number
  profitFactor: number
  maxDrawdown: number
  totalTrades: number
  wins: number
  losses: number
  avgWin: number
  avgLoss: number
  expectancy: number
  bestTrade: number
  worstTrade: number
}

// ── shadcn helper (already added by shadcn init, but keep it here) ──
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

// ── Date formatters ───────────────────────────────────────
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

// ── Trade analytics ───────────────────────────────────────
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
  const profitFactor = grossLosses > 0 ? grossWins / grossLosses : Infinity
  const avgWin = wins.length ? grossWins / wins.length : 0
  const avgLoss = losses.length ? grossLosses / losses.length : 0
  const expectancy = (winRate / 100) * avgWin - (1 - winRate / 100) * avgLoss

  // Max drawdown
  let peak = 0, running = 0, maxDrawdown = 0
  pnls.forEach(p => {
    running += p
    if (running > peak) peak = running
    const dd = peak - running
    if (dd > maxDrawdown) maxDrawdown = dd
  })

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

// ── Symbol cleaner (strips contract month codes) ──────────
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