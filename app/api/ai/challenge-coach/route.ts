/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/ai/challenge-coach/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { trades, propFirms, propFirmAccounts } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { getTradeTotalPnl } from '@/lib/utils'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const GEMINI_KEY = process.env.GEMINI_API_KEY
  if (!GEMINI_KEY) return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 })

  const { accountId } = await req.json().catch(() => ({}))
  const userId = session.user.id

  // ── Load account ───────────────────────────────────────
  const account = accountId
    ? await db.query.propFirmAccounts.findFirst({
        where: eq(propFirmAccounts.id, accountId),
      })
    : null

  if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

  const firm = await db.query.propFirms.findFirst({
    where: eq(propFirms.id, account.propFirmId),
  })

  // ── Load trades for this account ───────────────────────
  const allTrades = await db.query.trades.findMany({
    where: eq(trades.userId, userId),
    orderBy: [desc(trades.exitTime)],
  })
  const accTrades = allTrades.filter(t => t.propFirmAccountId === accountId)

  // ── Core numbers ───────────────────────────────────────
  const profitTarget = Number(account.profitTarget ?? 0)
  const maxDrawdown  = Number(account.maxDrawdown ?? 0)
  const dailyLimit   = Number(account.dailyLossLimit ?? 0)
  const hasDailyLimit = dailyLimit > 0
  const isTrailing   = account.isTrailingDrawdown ?? false
  const consistency50 = (account as any).consistencyRule50 ?? false
  const consistency30 = account.consistencyRule ?? false
  const minDays      = account.minTradingDays ?? 0
  const maxDays      = account.maxTradingDays ?? 0

  const netPnl = accTrades.reduce((s, t) => s + getTradeTotalPnl(t), 0)
  const wins   = accTrades.filter(t => getTradeTotalPnl(t) > 0)
  const losses = accTrades.filter(t => getTradeTotalPnl(t) < 0)
  const winRate = accTrades.length ? (wins.length / accTrades.length) * 100 : 0
  const avgWin  = wins.length ? wins.reduce((s, t) => s + getTradeTotalPnl(t), 0) / wins.length : 0
  const avgLoss = losses.length ? Math.abs(losses.reduce((s, t) => s + getTradeTotalPnl(t), 0) / losses.length) : 0

  // ── Daily breakdown ────────────────────────────────────
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const dailyMap: Record<string, { pnl: number; trades: number; wins: number; dow: string }> = {}
  accTrades.forEach(t => {
    const d = new Date(t.exitTime)
    const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    if (!dailyMap[key]) dailyMap[key] = { pnl: 0, trades: 0, wins: 0, dow: DAYS[d.getDay()] }
    dailyMap[key].pnl += getTradeTotalPnl(t)
    dailyMap[key].trades++
    if (getTradeTotalPnl(t) > 0) dailyMap[key].wins++
  })
  const dailyValues = Object.entries(dailyMap)
  const tradingDays = dailyValues.length
  const worstDayPnl = dailyValues.length ? Math.min(...dailyValues.map(([, d]) => d.pnl)) : 0
  const bestDayPnl  = dailyValues.length ? Math.max(...dailyValues.map(([, d]) => d.pnl)) : 0
  const worstDayEntry = dailyValues.find(([, d]) => d.pnl === worstDayPnl)
  const bestDayEntry  = dailyValues.find(([, d]) => d.pnl === bestDayPnl)

  // ── Day of week tendencies ─────────────────────────────
  const dowMap: Record<string, { pnl: number; days: number }> = {}
  dailyValues.forEach(([, d]) => {
    if (!dowMap[d.dow]) dowMap[d.dow] = { pnl: 0, days: 0 }
    dowMap[d.dow].pnl += d.pnl
    dowMap[d.dow].days++
  })
  const worstDow = Object.entries(dowMap).filter(([, d]) => d.days >= 2).sort((a, b) => a[1].pnl - b[1].pnl)[0]
  const bestDow  = Object.entries(dowMap).filter(([, d]) => d.days >= 2).sort((a, b) => b[1].pnl - a[1].pnl)[0]

  // ── Trailing drawdown peak ─────────────────────────────
  let peakBalance = 0
  let trailingDDUsed = 0
  if (isTrailing) {
    let running = 0
    accTrades.slice().reverse().forEach(t => {
      running += getTradeTotalPnl(t)
      peakBalance = Math.max(peakBalance, running)
    })
    trailingDDUsed = peakBalance - netPnl
  }
  const ddUsed = isTrailing ? trailingDDUsed : Math.abs(Math.min(netPnl, 0))
  const ddRemaining = maxDrawdown - ddUsed

  // ── Consistency rule checks ────────────────────────────
  const bestDayPct = profitTarget > 0 ? (bestDayPnl / profitTarget) * 100 : 0
  const consistency50Breach = consistency50 && bestDayPct > 50
  const consistency30Breach = consistency30 && bestDayPct > 30

  // ── Progress metrics ───────────────────────────────────
  const remaining = profitTarget - netPnl
  const pctComplete = profitTarget > 0 ? Math.min((netPnl / profitTarget) * 100, 100) : 0
  const tradesNeeded = avgWin > 0 ? Math.ceil(remaining / avgWin) : null
  const daysNeeded = minDays > 0 ? Math.max(0, minDays - tradingDays) : null

  // ── Recent 5 trades ────────────────────────────────────
  const recent5 = accTrades.slice(0, 5).map(t => ({
    symbol: t.symbol, pnl: getTradeTotalPnl(t).toFixed(2),
    date: new Date(t.exitTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }))

  // ── Build AI prompt ────────────────────────────────────
  const now = new Date()
  const todayDow = DAYS[now.getDay()]

  const systemPrompt = `You are an elite prop firm trading coach. Analyze this trader's challenge account and give precise, number-driven coaching advice.
Be direct and specific. Use their exact numbers. Keep each insight to 1-2 sentences max.
Return ONLY a valid JSON object, no markdown, no backticks:
{
  "headline": "one-line status summary like a coach talking to a trader",
  "status": "on_track|at_risk|critical|passed|failed",
  "progressInsight": "specific sentence about where they are in the challenge with exact dollar amounts and percentages",
  "paceInsight": "specific sentence about their pace - trades needed, days needed, at current avg win rate",
  "drawdownInsight": "specific sentence about their drawdown situation - how much room they have left, any patterns",
  "dailyLimitInsight": "${hasDailyLimit ? 'specific sentence about daily loss limit usage and worst day vs limit' : 'null - this account has no daily loss limit'}",
  "consistencyInsight": "${(consistency50 || consistency30) ? 'specific sentence about consistency rule status with their best day percentage vs the rule' : 'null - no consistency rule on this account'}",
  "dowInsight": "specific sentence about their best and worst days of week on this account",
  "topPriority": "the single most important thing they should focus on right now to pass this challenge",
  "warnings": ["array of 0-3 specific warnings if any rules are close to being breached or patterns are concerning"],
  "encouragement": "one punchy, honest encouraging line based on their actual progress"
}`

  const userPrompt = `Analyze this prop firm challenge:

FIRM: ${firm?.name ?? 'Unknown'} | ACCOUNT: ${account.accountLabel}
STAGE: ${account.stage} | STATUS: ${account.status}

CHALLENGE RULES:
- Profit Target: $${profitTarget.toLocaleString()}
- Max Drawdown: $${maxDrawdown.toLocaleString()} (${isTrailing ? 'TRAILING' : 'static'})
- Daily Loss Limit: ${hasDailyLimit ? `$${dailyLimit.toLocaleString()}` : 'NONE'}
- Min Trading Days: ${minDays > 0 ? minDays : 'None'}
- Max Trading Days: ${maxDays > 0 ? maxDays : 'Unlimited'}
- 50% Consistency Rule: ${consistency50 ? 'YES — best day cannot exceed 50% of target' : 'No'}
- 30% Consistency Rule: ${consistency30 ? 'YES — best day cannot exceed 30% of total profit' : 'No'}
- News Trading: ${account.newsTrading ? 'Allowed' : 'NOT allowed'}

CURRENT PROGRESS:
- Net P&L: $${netPnl.toFixed(2)} (${pctComplete.toFixed(1)}% of target)
- Remaining to target: $${remaining.toFixed(2)}
- Trading days completed: ${tradingDays}${minDays > 0 ? ` / ${minDays} required (${daysNeeded} more needed)` : ''}
- Trades: ${accTrades.length} total (${wins.length}W / ${losses.length}L)
- Win Rate: ${winRate.toFixed(1)}%
- Avg Win: $${avgWin.toFixed(2)} | Avg Loss: $${avgLoss.toFixed(2)}
- Estimated trades to pass (at avg win): ${tradesNeeded ?? 'N/A'}

DRAWDOWN:
- DD Used: $${ddUsed.toFixed(2)} of $${maxDrawdown.toFixed(2)} (${maxDrawdown > 0 ? ((ddUsed / maxDrawdown) * 100).toFixed(1) : 0}% used)
- DD Remaining: $${ddRemaining.toFixed(2)}
${isTrailing ? `- Peak balance reached: $${peakBalance.toFixed(2)} (trailing from here)` : ''}

DAILY PERFORMANCE:
- Best day: ${bestDayEntry ? `${bestDayEntry[0]} (${bestDayEntry[1].dow}) +$${bestDayPnl.toFixed(2)}` : 'N/A'}
- Worst day: ${worstDayEntry ? `${worstDayEntry[0]} (${worstDayEntry[1].dow}) $${worstDayPnl.toFixed(2)}` : 'N/A'}
${hasDailyLimit ? `- Daily limit usage: worst day $${Math.abs(worstDayPnl).toFixed(2)} vs limit $${dailyLimit.toFixed(2)} (${dailyLimit > 0 ? ((Math.abs(Math.min(worstDayPnl, 0)) / dailyLimit) * 100).toFixed(0) : 0}% of limit)` : ''}

CONSISTENCY RULES:
- Best single day: $${bestDayPnl.toFixed(2)} (${bestDayPct.toFixed(1)}% of profit target)
${consistency50 ? `- 50% rule status: ${consistency50Breach ? '⚠️ BREACH — best day exceeds 50% of target!' : `OK — best day is ${bestDayPct.toFixed(1)}% of target (limit: 50%)`}` : ''}
${consistency30 ? `- 30% rule status: ${consistency30Breach ? '⚠️ BREACH — best day exceeds 30% of total profit!' : 'OK'}` : ''}

DAY OF WEEK PATTERNS:
- Best DOW: ${bestDow ? `${bestDow[0]} ($${bestDow[1].pnl.toFixed(2)} over ${bestDow[1].days} days)` : 'N/A'}
- Worst DOW: ${worstDow ? `${worstDow[0]} ($${worstDow[1].pnl.toFixed(2)} over ${worstDow[1].days} days)` : 'N/A'}
- Today is: ${todayDow}

RECENT 5 TRADES:
${recent5.map(t => `- ${t.date} | ${t.symbol} | $${t.pnl}`).join('\n')}

Generate the challenge coaching JSON now.`

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: userPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 1000,
          responseMimeType: 'application/json',
        },
      }),
    }
  )

  const data = await response.json()
  if (!response.ok) {
    console.error('[challenge-coach] Gemini API error:', data)
    return NextResponse.json(
      { error: data?.error?.message ?? 'AI request failed', provider: 'gemini' },
      { status: 502 }
    )
  }

  const raw = data?.candidates?.[0]?.content?.parts
    ?.map((p: { text?: string }) => p.text ?? '')
    .join('')
    .trim() ?? ''
  try {
    const clean = raw.replace(/```json|```/g, '').trim()
    const coach = JSON.parse(clean)
    return NextResponse.json({
      coach,
      account: {
        id: account.id,
        label: account.accountLabel,
        firmName: firm?.name ?? '',
        firmColor: firm?.logoColor ?? '#10b981',
        stage: account.stage,
        status: account.status,
        profitTarget, maxDrawdown, dailyLimit,
        hasDailyLimit, isTrailing, consistency50, consistency30,
        minDays, maxDays,
      },
      metrics: {
        netPnl, remaining, pctComplete,
        wins: wins.length, losses: losses.length, winRate,
        avgWin, avgLoss, tradingDays,
        ddUsed, ddRemaining, ddPct: maxDrawdown > 0 ? (ddUsed / maxDrawdown) * 100 : 0,
        bestDayPnl, worstDayPnl, bestDayPct,
        tradesNeeded, daysNeeded,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
  }
}
