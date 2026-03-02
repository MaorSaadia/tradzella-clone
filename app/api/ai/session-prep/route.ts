// app/api/ai/session-prep/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { trades, tradeMistakes, playbooks, propFirmAccounts } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { getTradeTotalPnl } from '@/lib/utils'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const GEMINI_KEY = process.env.GEMINI_API_KEY
  if (!GEMINI_KEY) return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 })

  const { propFirmAccountId } = await req.json().catch(() => ({}))
  const userId = session.user.id

  // ── Fetch data ─────────────────────────────────────────
  const allTrades = await db.query.trades.findMany({
    where: eq(trades.userId, userId),
    orderBy: [desc(trades.exitTime)],
  })

  const filtered = propFirmAccountId && propFirmAccountId !== 'all'
    ? allTrades.filter(t => t.propFirmAccountId === propFirmAccountId)
    : allTrades

  if (filtered.length === 0) {
    return NextResponse.json({
      prep: null,
      error: 'No trades found. Import your trades first.'
    })
  }

  const allMistakes = await db.query.tradeMistakes.findMany({
    where: eq(tradeMistakes.userId, userId),
  })

  const allPlaybooks = await db.query.playbooks.findMany({
    where: eq(playbooks.userId, userId),
  })

  const accounts = await db.query.propFirmAccounts.findMany({
    where: eq(propFirmAccounts.userId, userId),
  })

  // ── Recent 14 days vs all-time ─────────────────────────
  const now = new Date()
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const recent14 = filtered.filter(t => new Date(t.exitTime) >= fourteenDaysAgo)
  const recent7 = filtered.filter(t => new Date(t.exitTime) >= sevenDaysAgo)

  // ── All-time stats ─────────────────────────────────────
  const allWins = filtered.filter(t => getTradeTotalPnl(t) > 0)
//   const allLosses = filtered.filter(t => getTradeTotalPnl(t) < 0)
  const allWinRate = (allWins.length / filtered.length) * 100
  const allNetPnl = filtered.reduce((s, t) => s + getTradeTotalPnl(t), 0)

  // ── Recent 14d stats ───────────────────────────────────
  const recentWins = recent14.filter(t => getTradeTotalPnl(t) > 0)
  const recentLosses = recent14.filter(t => getTradeTotalPnl(t) < 0)
  const recentWinRate = recent14.length ? (recentWins.length / recent14.length) * 100 : 0
  const recentNetPnl = recent14.reduce((s, t) => s + getTradeTotalPnl(t), 0)
  const recentAvgWin = recentWins.length ? recentWins.reduce((s, t) => s + getTradeTotalPnl(t), 0) / recentWins.length : 0
  const recentAvgLoss = recentLosses.length ? Math.abs(recentLosses.reduce((s, t) => s + getTradeTotalPnl(t), 0) / recentLosses.length) : 0

  // Trend: improving or declining?
  const trend = recentWinRate > allWinRate ? 'improving' : recentWinRate < allWinRate - 5 ? 'declining' : 'stable'

  // ── Day of week performance (all time) ─────────────────
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const dowMap: Record<string, { pnl: number; trades: number; wins: number }> = {}
  filtered.forEach(t => {
    const dow = DAYS[new Date(t.exitTime).getDay()]
    if (!dowMap[dow]) dowMap[dow] = { pnl: 0, trades: 0, wins: 0 }
    dowMap[dow].pnl += getTradeTotalPnl(t)
    dowMap[dow].trades++
    if (getTradeTotalPnl(t) > 0) dowMap[dow].wins++
  })
  const dowSorted = Object.entries(dowMap)
    .filter(([, d]) => d.trades >= 3)
    .sort((a, b) => b[1].pnl - a[1].pnl)
  const bestDow = dowSorted[0]
  const worstDow = dowSorted[dowSorted.length - 1]
  const todayDow = DAYS[now.getDay()]
  const todayStats = dowMap[todayDow]

  // ── Hourly performance ─────────────────────────────────
  const hourlyMap: Record<string, { pnl: number; trades: number }> = {}
  filtered.forEach(t => {
    const h = new Date(t.entryTime).getHours()
    const label = `${h.toString().padStart(2, '0')}:00`
    if (!hourlyMap[label]) hourlyMap[label] = { pnl: 0, trades: 0 }
    hourlyMap[label].pnl += getTradeTotalPnl(t)
    hourlyMap[label].trades++
  })
  const bestHour = Object.entries(hourlyMap).sort((a, b) => b[1].pnl - a[1].pnl)[0]
  const worstHour = Object.entries(hourlyMap).sort((a, b) => a[1].pnl - b[1].pnl)[0]

  // ── Playbook performance (recent 14d vs all-time) ──────
  const playbookStats = allPlaybooks.map(pb => {
    const pbAll = filtered.filter(t => t.playbookId === pb.id)
    const pbRecent = recent14.filter(t => t.playbookId === pb.id)
    const allPnl = pbAll.reduce((s, t) => s + getTradeTotalPnl(t), 0)
    const allWr = pbAll.length ? pbAll.filter(t => getTradeTotalPnl(t) > 0).length / pbAll.length * 100 : 0
    const recentPnl = pbRecent.reduce((s, t) => s + getTradeTotalPnl(t), 0)
    const recentWr = pbRecent.length ? pbRecent.filter(t => getTradeTotalPnl(t) > 0).length / pbRecent.length * 100 : 0
    return { name: pb.name, category: pb.category, allPnl, allWr, recentPnl, recentWr, allTrades: pbAll.length, recentTrades: pbRecent.length }
  }).filter(p => p.allTrades >= 3)

  const workingSetups = playbookStats.filter(p => p.recentTrades >= 2 && p.recentWr >= 55).sort((a, b) => b.recentPnl - a.recentPnl)
  const struggleSetups = playbookStats.filter(p => p.recentTrades >= 2 && p.recentWr < 45).sort((a, b) => a.recentPnl - b.recentPnl)

  // ── Mistake patterns (recent 14d) ──────────────────────
  const recentMistakeIds = new Set(recent14.filter(t => t.isMistake).map(t => t.id))
  const recentMistakeList = allMistakes.filter(m => recentMistakeIds.has(m.tradeId))
  const mistakeCounts: Record<string, number> = {}
  recentMistakeList.forEach(m => {
    mistakeCounts[m.mistakeType] = (mistakeCounts[m.mistakeType] ?? 0) + 1
  })
  const topMistakes = Object.entries(mistakeCounts).sort((a, b) => b[1] - a[1]).slice(0, 4)

  // ── Consecutive loss streaks lately ────────────────────
  const sorted7 = [...recent7].sort((a, b) => new Date(a.exitTime).getTime() - new Date(b.exitTime).getTime())
  let curStreak = 0, maxStreak = 0
  sorted7.forEach(t => {
    if (getTradeTotalPnl(t) < 0) { curStreak++; maxStreak = Math.max(maxStreak, curStreak) }
    else curStreak = 0
  })

  // ── Prop firm status ───────────────────────────────────
  const activeAccounts = accounts.filter(a => a.status === 'active')
  const focusAccount = propFirmAccountId
    ? accounts.find(a => a.id === propFirmAccountId)
    : activeAccounts[0] ?? null

  let accountContext = ''
  if (focusAccount) {
    const accTrades = filtered.filter(t => t.propFirmAccountId === focusAccount.id)
    const accPnl = accTrades.reduce((s, t) => s + getTradeTotalPnl(t), 0)
    const target = Number(focusAccount.profitTarget ?? 0)
    const dd = Number(focusAccount.maxDrawdown ?? 0)
    const dailyLimit = Number(focusAccount.dailyLossLimit ?? 0)
    const remaining = target - accPnl
    accountContext = `
ACTIVE PROP FIRM ACCOUNT: ${focusAccount.accountLabel}
- Current P&L: $${accPnl.toFixed(2)} / Target: $${target.toFixed(2)} (${target > 0 ? ((accPnl / target) * 100).toFixed(1) : 0}% there)
- Remaining to pass: $${remaining.toFixed(2)}
- Max Drawdown: $${dd.toFixed(2)}
- Daily Loss Limit: ${dailyLimit > 0 ? `$${dailyLimit.toFixed(2)}` : 'No limit'}
- Status: ${focusAccount.status} | Stage: ${focusAccount.stage}`
  }

  // ── Build AI prompt ─────────────────────────────────────
  const todayFormatted = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  const timeFormatted = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })

  const systemPrompt = `You are an elite trading performance coach generating a personalized pre-market session prep for a futures trader. 
Be specific, direct, and motivating. Use their actual numbers. Keep each section tight — 2-4 sentences max per section.
Today is ${todayFormatted} at ${timeFormatted}.

Return ONLY a valid JSON object with exactly this structure (no markdown, no backticks, no preamble):
{
  "greeting": "short personalized good morning message mentioning today is ${todayDow}",
  "momentum": {
    "label": "Current Momentum",
    "status": "hot|warm|cold",
    "summary": "2-3 sentences about their recent 14-day performance trend vs all-time. Be specific with win rates and P&L numbers."
  },
  "todayForecast": {
    "label": "Today's Forecast",
    "signal": "green|yellow|red",
    "summary": "Based on their historical ${todayDow} performance, tell them what to expect today. Include actual numbers if available."
  },
  "workingSetups": {
    "label": "What's Working",
    "items": ["array of 2-3 specific setups/strategies currently performing well with brief reason"]
  },
  "avoidSetups": {
    "label": "What to Avoid",
    "items": ["array of 1-3 setups or behaviors to avoid today based on recent struggles"]
  },
  "mentalFocus": {
    "label": "Mental Focus",
    "reminder": "One powerful, specific mental reminder based on their most repeated mistake pattern. Make it personal and actionable."
  },
  "riskReminder": {
    "label": "Risk Rules",
    "rules": ["array of 2-3 specific risk rules they should remember today based on their patterns"]
  },
  "affirmation": "One short, punchy closing motivational line tailored to their situation"
}`

  const userPrompt = `Generate my session prep using this data:

TODAY: ${todayFormatted} (${todayDow})

RECENT 14-DAY PERFORMANCE:
- Trades: ${recent14.length} | Net P&L: $${recentNetPnl.toFixed(2)}
- Win Rate: ${recentWinRate.toFixed(1)}% (${recentWins.length}W/${recentLosses.length}L)
- Avg Win: $${recentAvgWin.toFixed(2)} | Avg Loss: $${recentAvgLoss.toFixed(2)}
- Trend vs all-time: ${trend} (all-time WR: ${allWinRate.toFixed(1)}%)
- Max loss streak this week: ${maxStreak} consecutive losses

ALL-TIME STATS (${filtered.length} trades):
- Net P&L: $${allNetPnl.toFixed(2)} | Win Rate: ${allWinRate.toFixed(1)}%

DAY OF WEEK — ${todayDow} historically:
${todayStats ? `- ${todayStats.trades} trades | $${todayStats.pnl.toFixed(2)} P&L | ${((todayStats.wins / todayStats.trades) * 100).toFixed(0)}% WR` : '- No data for today yet'}
Best day: ${bestDow ? `${bestDow[0]} ($${bestDow[1].pnl.toFixed(2)}, ${((bestDow[1].wins / bestDow[1].trades) * 100).toFixed(0)}% WR)` : 'N/A'}
Worst day: ${worstDow ? `${worstDow[0]} ($${worstDow[1].pnl.toFixed(2)}, ${((worstDow[1].wins / worstDow[1].trades) * 100).toFixed(0)}% WR)` : 'N/A'}

BEST TRADING HOURS: ${bestHour ? `${bestHour[0]} ($${bestHour[1].pnl.toFixed(2)}, ${bestHour[1].trades} trades)` : 'N/A'}
WORST TRADING HOURS: ${worstHour ? `${worstHour[0]} ($${worstHour[1].pnl.toFixed(2)}, ${worstHour[1].trades} trades)` : 'N/A'}

SETUPS WORKING LATELY (last 14d):
${workingSetups.length > 0 ? workingSetups.map(p => `- ${p.name}: ${p.recentWr.toFixed(0)}% WR, $${p.recentPnl.toFixed(2)} in ${p.recentTrades} trades`).join('\n') : '- No standout setups recently'}

SETUPS STRUGGLING LATELY (last 14d):
${struggleSetups.length > 0 ? struggleSetups.map(p => `- ${p.name}: ${p.recentWr.toFixed(0)}% WR, $${p.recentPnl.toFixed(2)} in ${p.recentTrades} trades`).join('\n') : '- No struggling setups'}

TOP MISTAKES (last 14 days):
${topMistakes.length > 0 ? topMistakes.map(([type, count]) => `- ${type.replace(/_/g, ' ')}: ${count} times`).join('\n') : '- No mistakes logged recently'}

${accountContext}

Generate the session prep JSON now.`

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
          maxOutputTokens: 1200,
          responseMimeType: 'application/json',
        },
      }),
    }
  )

  const data = await response.json()
  if (!response.ok) {
    console.error('[session-prep] Gemini API error:', data)
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
    const prep = JSON.parse(clean)
    return NextResponse.json({ prep, generatedAt: now.toISOString() })
  } catch {
    console.error('[session-prep] JSON parse error:', raw)
    return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
  }
}
