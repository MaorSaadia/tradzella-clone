/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/review/generate/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { trades, tradeMistakes, playbooks } from '@/lib/db/schema'
import { eq, and, gte, lte, desc } from 'drizzle-orm'

// ── Build the structured trade payload for Gemini ─────────
function buildTradePayload(weekTrades: any[], mistakes: any[], allPlaybooks: any[]) {
  const pnls = weekTrades.map(t => Number(t.pnl))
  const wins = weekTrades.filter(t => Number(t.pnl) > 0)
  const losses = weekTrades.filter(t => Number(t.pnl) < 0)
  const netPnl = pnls.reduce((s, p) => s + p, 0)
  const winRate = weekTrades.length ? (wins.length / weekTrades.length) * 100 : 0

  // Daily breakdown
  const dailyMap: Record<string, { pnl: number; trades: number; wins: number }> = {}
  weekTrades.forEach(t => {
    const day = new Date(t.exitTime).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
    if (!dailyMap[day]) dailyMap[day] = { pnl: 0, trades: 0, wins: 0 }
    dailyMap[day].pnl += Number(t.pnl)
    dailyMap[day].trades++
    if (Number(t.pnl) > 0) dailyMap[day].wins++
  })

  // Hourly breakdown
  const hourlyMap: Record<string, { pnl: number; trades: number }> = {}
  weekTrades.forEach(t => {
    const hour = new Date(t.entryTime).getHours()
    const label = `${hour}:00`
    if (!hourlyMap[label]) hourlyMap[label] = { pnl: 0, trades: 0 }
    hourlyMap[label].pnl += Number(t.pnl)
    hourlyMap[label].trades++
  })

  // Symbol breakdown
  const symbolMap: Record<string, { pnl: number; trades: number; wins: number }> = {}
  weekTrades.forEach(t => {
    if (!symbolMap[t.symbol]) symbolMap[t.symbol] = { pnl: 0, trades: 0, wins: 0 }
    symbolMap[t.symbol].pnl += Number(t.pnl)
    symbolMap[t.symbol].trades++
    if (Number(t.pnl) > 0) symbolMap[t.symbol].wins++
  })

  // Revenge trading detection: 3+ consecutive losses
  const sorted = [...weekTrades].sort((a, b) => new Date(a.exitTime).getTime() - new Date(b.exitTime).getTime())
  const streaks: string[] = []
  let lossStreak = 0
  sorted.forEach((t, i) => {
    if (Number(t.pnl) < 0) {
      lossStreak++
      if (lossStreak >= 3) {
        streaks.push(`${lossStreak} consecutive losses detected ending at trade ${i + 1} (${t.symbol}, ${new Date(t.exitTime).toLocaleTimeString()})`)
      }
    } else { lossStreak = 0 }
  })

  // Overtrading: days with >6 trades
  const overtradingDays = Object.entries(dailyMap)
    .filter(([, d]) => d.trades > 6)
    .map(([day, d]) => `${day}: ${d.trades} trades (${d.wins} wins, P&L: $${d.pnl.toFixed(2)})`)

  // Playbook performance
  const playbookPerf: Record<string, { pnl: number; trades: number; wins: number; name: string }> = {}
  weekTrades.forEach(t => {
    if (t.playbookId) {
      const pb = allPlaybooks.find((p: any) => p.id === t.playbookId)
      if (pb) {
        if (!playbookPerf[t.playbookId]) playbookPerf[t.playbookId] = { pnl: 0, trades: 0, wins: 0, name: pb.name }
        playbookPerf[t.playbookId].pnl += Number(t.pnl)
        playbookPerf[t.playbookId].trades++
        if (Number(t.pnl) > 0) playbookPerf[t.playbookId].wins++
      }
    }
  })

  // Mistake summary
  const mistakeCounts: Record<string, { count: number; pnl: number }> = {}
  mistakes.forEach(m => {
    const trade = weekTrades.find(t => t.id === m.tradeId)
    if (!mistakeCounts[m.mistakeType]) mistakeCounts[m.mistakeType] = { count: 0, pnl: 0 }
    mistakeCounts[m.mistakeType].count++
    mistakeCounts[m.mistakeType].pnl += trade ? Number(trade.pnl) : 0
  })

  // Grade distribution
  const grades: Record<string, number> = {}
  weekTrades.forEach(t => { if (t.grade) grades[t.grade] = (grades[t.grade] ?? 0) + 1 })

  // Emotion distribution
  const emotions: Record<string, number> = {}
  weekTrades.forEach(t => { if (t.emotion) emotions[t.emotion] = (emotions[t.emotion] ?? 0) + 1 })

  // Best and worst trades
  const bestTrade = sorted.reduce((best, t) => Number(t.pnl) > Number(best.pnl) ? t : best, sorted[0])
  const worstTrade = sorted.reduce((worst, t) => Number(t.pnl) < Number(worst.pnl) ? t : worst, sorted[0])

  // Size of wins vs losses
  const avgWin = wins.length ? wins.reduce((s, t) => s + Number(t.pnl), 0) / wins.length : 0
  const avgLoss = losses.length ? Math.abs(losses.reduce((s, t) => s + Number(t.pnl), 0) / losses.length) : 0

  return {
    summary: {
      totalTrades: weekTrades.length,
      netPnl: netPnl.toFixed(2),
      winRate: winRate.toFixed(1),
      wins: wins.length,
      losses: losses.length,
      avgWin: avgWin.toFixed(2),
      avgLoss: avgLoss.toFixed(2),
      rrRatio: avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : 'N/A',
      bestTrade: bestTrade ? { symbol: bestTrade.symbol, pnl: Number(bestTrade.pnl).toFixed(2), time: bestTrade.exitTime } : null,
      worstTrade: worstTrade ? { symbol: worstTrade.symbol, pnl: Number(worstTrade.pnl).toFixed(2), time: worstTrade.exitTime } : null,
      grades,
      emotions,
    },
    dailyBreakdown: Object.entries(dailyMap).map(([day, d]) => ({
      day, pnl: d.pnl.toFixed(2), trades: d.trades, winRate: ((d.wins / d.trades) * 100).toFixed(0)
    })),
    hourlyBreakdown: Object.entries(hourlyMap).sort().map(([hour, d]) => ({
      hour, pnl: d.pnl.toFixed(2), trades: d.trades
    })),
    symbolBreakdown: Object.entries(symbolMap).map(([symbol, d]) => ({
      symbol, pnl: d.pnl.toFixed(2), trades: d.trades, winRate: ((d.wins / d.trades) * 100).toFixed(0)
    })).sort((a, b) => Number(b.pnl) - Number(a.pnl)),
    psychologicalFlags: {
      revengeTradingInstances: streaks,
      overtradingDays,
      mistakeTrades: weekTrades.filter(t => t.isMistake).length,
      cleanTrades: weekTrades.filter(t => !t.isMistake).length,
    },
    mistakeBreakdown: Object.entries(mistakeCounts).map(([type, d]) => ({
      type: type.replace(/_/g, ' '), count: d.count, pnlImpact: d.pnl.toFixed(2)
    })),
    playbookPerformance: Object.values(playbookPerf).map(p => ({
      name: p.name, pnl: p.pnl.toFixed(2), trades: p.trades, winRate: ((p.wins / p.trades) * 100).toFixed(0)
    })),
    tradeList: sorted.map(t => ({
      symbol: t.symbol,
      side: t.side,
      pnl: Number(t.pnl).toFixed(2),
      entryTime: new Date(t.entryTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      exitTime: new Date(t.exitTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      day: new Date(t.exitTime).toLocaleDateString('en-US', { weekday: 'short' }),
      grade: t.grade ?? 'ungraded',
      emotion: t.emotion ?? 'not logged',
      isMistake: t.isMistake,
      notes: t.notes?.slice(0, 100) ?? '',
    })),
  }
}

// ── Gemini prompt ─────────────────────────────────────────
function buildPrompt(data: any, weekLabel: string): string {
  return `You are an elite prop firm trading coach reviewing a trader's week. Your tone is balanced — honest about problems but genuinely encouraging about strengths. You give specific, actionable insights based on real data — not generic advice.

Here is the trader's complete week of data for ${weekLabel}:

${JSON.stringify(data, null, 2)}

Write a comprehensive weekly trading review with EXACTLY this JSON structure (respond with valid JSON only, no markdown, no extra text):

{
  "weekLabel": "${weekLabel}",
  "overallScore": <number 1-100>,
  "headline": "<one punchy sentence summarizing the week — like a newspaper headline>",
  "performanceSummary": {
    "paragraph": "<2-3 sentences covering the key stats: P&L, win rate, R:R. Be specific with numbers.>",
    "highlights": ["<specific positive fact>", "<specific positive fact>"],
    "concerns": ["<specific concern with data>", "<specific concern with data>"]
  },
  "patternAnalysis": {
    "paragraph": "<2-3 sentences about time-of-day, symbol, and day-of-week patterns you found>",
    "bestTimeToTrade": "<specific time range where they perform best, with data>",
    "worstTimeToTrade": "<specific time range to avoid, with data>",
    "bestSymbol": "<symbol with best edge>",
    "keyInsights": ["<specific pattern insight>", "<specific pattern insight>", "<specific pattern insight>"]
  },
  "psychologicalAnalysis": {
    "paragraph": "<2-3 sentences on trading psychology — revenge trading, overtrading, emotional patterns>",
    "disciplineScore": <number 1-100>,
    "flags": ["<specific psychological flag with data>"],
    "strengths": ["<psychological strength observed>"]
  },
  "mistakeReview": {
    "paragraph": "<2 sentences summarizing the cost of mistakes this week>",
    "totalCost": "<dollar amount lost on mistake trades>",
    "topMistakes": ["<mistake type: X occurrences, cost $Y>"],
    "patternNote": "<one sentence about the pattern of mistakes>"
  },
  "nextWeekActionPlan": {
    "paragraph": "<2 sentences framing next week's focus areas>",
    "rules": [
      "<specific, concrete rule #1 — e.g. 'No trades after 11:30am — your afternoon win rate is only 32%'>",
      "<specific, concrete rule #2>",
      "<specific, concrete rule #3>",
      "<specific, concrete rule #4>",
      "<specific, concrete rule #5>"
    ],
    "focusSetup": "<the one setup to prioritize next week based on their data>",
    "avoidSetup": "<the one thing to strictly avoid>"
  },
  "coachClosing": "<2-3 sentences of personal closing message from the coach — reference a specific thing from their week, end on genuine encouragement>"
}

Rules:
- Reference specific numbers from the data everywhere
- If data is missing (no mistakes logged, no playbook), acknowledge it and still give useful insight
- Never give generic advice like "stick to your plan" — always tie it to their specific data
- The action plan rules must be concrete and data-backed
- Keep each section focused and tight — no padding`
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const GEMINI_KEY = process.env.GEMINI_API_KEY
  if (!GEMINI_KEY) return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 })

  try {
    const { weekStart, weekEnd } = await req.json()
    if (!weekStart || !weekEnd) return NextResponse.json({ error: 'weekStart and weekEnd required' }, { status: 400 })

    const start = new Date(weekStart)
    const end = new Date(weekEnd)

    // Fetch trades for the week
    const weekTrades = await db.query.trades.findMany({
      where: and(
        eq(trades.userId, session.user.id),
        gte(trades.exitTime, start),
        lte(trades.exitTime, end),
      ),
      orderBy: [desc(trades.exitTime)],
    })

    if (weekTrades.length === 0) {
      return NextResponse.json({ error: 'No trades found for this week' }, { status: 404 })
    }

    // Fetch mistakes for those trades
    const tradeIds = weekTrades.map(t => t.id)
    const allMistakes = await db.query.tradeMistakes.findMany({
      where: eq(tradeMistakes.userId, session.user.id),
    })
    const weekMistakes = allMistakes.filter(m => tradeIds.includes(m.tradeId))

    // Fetch playbooks
    const userPlaybooks = await db.query.playbooks.findMany({
      where: eq(playbooks.userId, session.user.id),
    })

    const payload = buildTradePayload(weekTrades, weekMistakes, userPlaybooks)
    const weekLabel = `${start.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
    const prompt = buildPrompt(payload, weekLabel)

    // ── Call Gemini Flash with streaming ─────────────────
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:streamGenerateContent?key=${GEMINI_KEY}&alt=sse`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096,
            responseMimeType: 'application/json',
          },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          ],
        }),
      }
    )

    if (!geminiRes.ok) {
      const err = await geminiRes.text()
      console.error('Gemini error:', err)
      return NextResponse.json({ error: 'Gemini API failed', details: err }, { status: 502 })
    }

    // Stream the response back to the client
    const stream = new ReadableStream({
      async start(controller) {
        const reader = geminiRes.body!.getReader()
        const decoder = new TextDecoder()

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value)
            const lines = chunk.split('\n').filter(l => l.startsWith('data: '))

            for (const line of lines) {
              const data = line.slice(6).trim()
              if (data === '[DONE]') continue
              try {
                const parsed = JSON.parse(data)
                const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
                if (text) controller.enqueue(new TextEncoder().encode(text))
              } catch { /* skip malformed chunks */ }
            }
          }
        } finally {
          controller.close()
          reader.releaseLock()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (err: any) {
    console.error('Review generation error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}