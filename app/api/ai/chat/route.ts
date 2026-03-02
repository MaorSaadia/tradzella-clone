// app/api/ai/chat/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { trades, tradeMistakes, playbooks, propFirmAccounts } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { getTradeTotalPnl } from '@/lib/utils'

// ── Build full trading context from DB ────────────────────
async function buildTradingContext(userId: string, propFirmAccountId?: string | null) {
  const allTrades = await db.query.trades.findMany({
    where: eq(trades.userId, userId),
    orderBy: [desc(trades.exitTime)],
  })

  const filtered = propFirmAccountId && propFirmAccountId !== 'all'
    ? allTrades.filter(t => t.propFirmAccountId === propFirmAccountId)
    : allTrades

  const allMistakes = await db.query.tradeMistakes.findMany({
    where: eq(tradeMistakes.userId, userId),
  })

  const allPlaybooks = await db.query.playbooks.findMany({
    where: eq(playbooks.userId, userId),
  })

  const accounts = await db.query.propFirmAccounts.findMany({
    where: eq(propFirmAccounts.userId, userId),
  })

  if (filtered.length === 0) return null

  // ── Core stats ──────────────────────────────────────────
  const pnls = filtered.map(t => getTradeTotalPnl(t))
  const wins = filtered.filter(t => getTradeTotalPnl(t) > 0)
  const losses = filtered.filter(t => getTradeTotalPnl(t) < 0)
  const netPnl = pnls.reduce((s, p) => s + p, 0)
  const winRate = (wins.length / filtered.length) * 100
  const avgWin = wins.length ? wins.reduce((s, t) => s + getTradeTotalPnl(t), 0) / wins.length : 0
  const avgLoss = losses.length ? Math.abs(losses.reduce((s, t) => s + getTradeTotalPnl(t), 0) / losses.length) : 0
  const totalCommissions = filtered.reduce((s, t) => s + Math.abs(Number(t.commission ?? 0)), 0)

  // ── Daily breakdown ─────────────────────────────────────
  const dailyMap: Record<string, { pnl: number; trades: number; wins: number; date: string }> = {}
  filtered.forEach(t => {
    const day = new Date(t.exitTime).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })
    if (!dailyMap[day]) dailyMap[day] = { pnl: 0, trades: 0, wins: 0, date: day }
    dailyMap[day].pnl += getTradeTotalPnl(t)
    dailyMap[day].trades++
    if (getTradeTotalPnl(t) > 0) dailyMap[day].wins++
  })
  const dailyStats = Object.values(dailyMap).sort((a, b) => b.pnl - a.pnl)
  const bestDay = dailyStats[0]
  const worstDay = dailyStats[dailyStats.length - 1]

  // ── Day of week ─────────────────────────────────────────
  const dowMap: Record<string, { pnl: number; trades: number; wins: number }> = {}
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  filtered.forEach(t => {
    const dow = DAYS[new Date(t.exitTime).getDay()]
    if (!dowMap[dow]) dowMap[dow] = { pnl: 0, trades: 0, wins: 0 }
    dowMap[dow].pnl += getTradeTotalPnl(t)
    dowMap[dow].trades++
    if (getTradeTotalPnl(t) > 0) dowMap[dow].wins++
  })

  // ── Hourly breakdown ────────────────────────────────────
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

  // ── Symbol breakdown ────────────────────────────────────
  const symbolMap: Record<string, { pnl: number; trades: number; wins: number }> = {}
  filtered.forEach(t => {
    if (!symbolMap[t.symbol]) symbolMap[t.symbol] = { pnl: 0, trades: 0, wins: 0 }
    symbolMap[t.symbol].pnl += getTradeTotalPnl(t)
    symbolMap[t.symbol].trades++
    if (getTradeTotalPnl(t) > 0) symbolMap[t.symbol].wins++
  })

  // ── Playbook stats ──────────────────────────────────────
  const playbookStats = allPlaybooks.map(pb => {
    const pbTrades = filtered.filter(t => t.playbookId === pb.id)
    const pbPnl = pbTrades.reduce((s, t) => s + getTradeTotalPnl(t), 0)
    const pbWins = pbTrades.filter(t => getTradeTotalPnl(t) > 0)
    return {
      name: pb.name,
      category: pb.category,
      trades: pbTrades.length,
      pnl: pbPnl,
      winRate: pbTrades.length ? (pbWins.length / pbTrades.length) * 100 : 0,
    }
  }).filter(p => p.trades > 0).sort((a, b) => b.pnl - a.pnl)

  // ── Mistake summary ─────────────────────────────────────
  const mistakeCounts: Record<string, number> = {}
  allMistakes.forEach(m => {
    mistakeCounts[m.mistakeType] = (mistakeCounts[m.mistakeType] ?? 0) + 1
  })
  const topMistakes = Object.entries(mistakeCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)

  // ── Consecutive loss detection ──────────────────────────
  const sorted = [...filtered].sort((a, b) => new Date(a.exitTime).getTime() - new Date(b.exitTime).getTime())
  let maxLossStreak = 0, curLossStreak = 0
  let maxWinStreak = 0, curWinStreak = 0
  sorted.forEach(t => {
    if (getTradeTotalPnl(t) < 0) { curLossStreak++; curWinStreak = 0; maxLossStreak = Math.max(maxLossStreak, curLossStreak) }
    else { curWinStreak++; curLossStreak = 0; maxWinStreak = Math.max(maxWinStreak, curWinStreak) }
  })

  // ── Recent 10 trades ────────────────────────────────────
  const recent10 = filtered.slice(0, 10).map(t => ({
    symbol: t.symbol, side: t.side,
    pnl: getTradeTotalPnl(t).toFixed(2),
    date: new Date(t.exitTime).toLocaleDateString(),
    time: new Date(t.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    grade: t.grade, isMistake: t.isMistake,
  }))

  return `
You are an expert trading coach and performance analyst for MSFunded — a prop firm trading journal.
You have full access to this trader's complete trading data. Answer questions conversationally, be specific with numbers, and give actionable advice.
Be direct and honest — if the data shows a problem, say so clearly but constructively.

═══════════════════════════════════════════
TRADER'S COMPLETE PERFORMANCE DATA
═══════════════════════════════════════════

OVERALL STATS (${filtered.length} total trades):
- Net P&L: $${netPnl.toFixed(2)}
- Gross P&L: $${(netPnl + totalCommissions).toFixed(2)}
- Total Commissions: $${totalCommissions.toFixed(2)}
- Win Rate: ${winRate.toFixed(1)}% (${wins.length}W / ${losses.length}L)
- Avg Win: $${avgWin.toFixed(2)}
- Avg Loss: $${avgLoss.toFixed(2)}
- R:R Ratio: 1:${avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : 'N/A'}
- Max Win Streak: ${maxWinStreak} trades
- Max Loss Streak: ${maxLossStreak} trades

BEST DAY: ${bestDay?.date} — $${bestDay?.pnl.toFixed(2)} (${bestDay?.trades} trades, ${bestDay?.wins} wins)
WORST DAY: ${worstDay?.date} — $${worstDay?.pnl.toFixed(2)} (${worstDay?.trades} trades, ${worstDay?.wins} wins)

BEST TRADING HOUR: ${bestHour?.[0]} — $${bestHour?.[1].pnl.toFixed(2)} avg (${bestHour?.[1].trades} trades)
WORST TRADING HOUR: ${worstHour?.[0]} — $${worstHour?.[1].pnl.toFixed(2)} avg (${worstHour?.[1].trades} trades)

DAY OF WEEK PERFORMANCE:
${Object.entries(dowMap).map(([day, d]) => `- ${day}: $${d.pnl.toFixed(2)} | ${d.trades} trades | ${d.trades ? ((d.wins/d.trades)*100).toFixed(0) : 0}% WR`).join('\n')}

SYMBOL PERFORMANCE:
${Object.entries(symbolMap).map(([sym, d]) => `- ${sym}: $${d.pnl.toFixed(2)} | ${d.trades} trades | ${((d.wins/d.trades)*100).toFixed(0)}% WR`).join('\n')}

STRATEGY (PLAYBOOK) PERFORMANCE:
${playbookStats.length > 0 ? playbookStats.map(p => `- ${p.name} (${p.category}): $${p.pnl.toFixed(2)} | ${p.trades} trades | ${p.winRate.toFixed(0)}% WR`).join('\n') : '- No playbook data yet'}

TOP MISTAKES LOGGED:
${topMistakes.length > 0 ? topMistakes.map(([type, count]) => `- ${type.replace(/_/g, ' ')}: ${count} times`).join('\n') : '- No mistakes logged yet'}

RECENT 10 TRADES:
${recent10.map(t => `- ${t.date} ${t.time} | ${t.symbol} ${t.side} | $${t.pnl} | ${t.grade ?? 'no grade'}${t.isMistake ? ' ⚠️ mistake' : ''}`).join('\n')}

PROP FIRM ACCOUNTS (${accounts.length}):
${accounts.map(a => `- ${a.accountLabel}: ${a.status} | Target $${a.profitTarget} | DD $${a.maxDrawdown}`).join('\n')}

═══════════════════════════════════════════
Answer the trader's question below using this data. Be specific, use their actual numbers.
Keep responses concise (3-6 sentences max unless they ask for detail).
Format numbers as currency where appropriate.
If you spot patterns or issues in their data that are relevant, mention them.
`
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { messages, propFirmAccountId } = await req.json()
  if (!messages?.length) return NextResponse.json({ error: 'No messages' }, { status: 400 })
  const GEMINI_KEY = process.env.GEMINI_API_KEY
  if (!GEMINI_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 })
  }

  const context = await buildTradingContext(session.user.id, propFirmAccountId)

  if (!context) {
    return NextResponse.json({
      reply: "You don't have any trades yet. Import your trades from the CSV import page, then come back and I can analyze your performance!"
    })
  }

  // Build message history for multi-turn conversation
  const systemPrompt = context
  const apiMessages = messages.map((m: { role: string; content: string }) => ({
    role: m.role,
    content: m.content,
  }))

  const geminiMessages = apiMessages.map((m: { role: string; content: string }) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

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
      contents: geminiMessages,
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 1024,
      },
    }),
    }
  )

  const data = await response.json()
  if (!response.ok) {
    console.error('[AI chat] Gemini API error:', data)
    return NextResponse.json(
      {
        error: data?.error?.message ?? 'AI request failed',
        provider: 'gemini',
      },
      { status: 502 }
    )
  }

  const reply = data?.candidates?.[0]?.content?.parts
    ?.map((p: { text?: string }) => p.text ?? '')
    .join('')
    .trim() || 'Sorry, I could not generate a response.'
  return NextResponse.json({ reply })
}
