/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

// components/review/WeeklyReviewClient.tsx

import { useState, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Sparkles, Calendar, ChevronLeft, ChevronRight,
  TrendingUp, Brain, AlertTriangle, BarChart3,
  Target, Star, Loader2, Download, RefreshCw,
  CheckCircle2, XCircle, Zap,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────────
interface ReviewData {
  weekLabel: string
  overallScore: number
  headline: string
  performanceSummary: {
    paragraph: string
    highlights: string[]
    concerns: string[]
  }
  patternAnalysis: {
    paragraph: string
    bestTimeToTrade: string
    worstTimeToTrade: string
    bestSymbol: string
    keyInsights: string[]
  }
  psychologicalAnalysis: {
    paragraph: string
    disciplineScore: number
    flags: string[]
    strengths: string[]
  }
  mistakeReview: {
    paragraph: string
    totalCost: string
    topMistakes: string[]
    patternNote: string
  }
  nextWeekActionPlan: {
    paragraph: string
    rules: string[]
    focusSetup: string
    avoidSetup: string
  }
  coachClosing: string
}

// ── Week picker helpers ────────────────────────────────────
function getMondayOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function getSundayOfWeek(monday: Date): Date {
  const d = new Date(monday)
  d.setDate(d.getDate() + 6)
  d.setHours(23, 59, 59, 999)
  return d
}

function formatWeekLabel(monday: Date): string {
  const sunday = getSundayOfWeek(monday)
  return `${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
}

// ── Score ring ─────────────────────────────────────────────
function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const radius = (size - 16) / 2
  const circumference = 2 * Math.PI * radius
  const progress = (score / 100) * circumference
  const color = score >= 70 ? '#10b981' : score >= 45 ? '#f59e0b' : '#ef4444'

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
        <circle cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${progress} ${circumference}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1.5s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black" style={{ color }}>{score}</span>
        <span className="text-[9px] text-muted-foreground uppercase tracking-wider">/ 100</span>
      </div>
    </div>
  )
}

// ── Section components ─────────────────────────────────────
function SectionCard({
  icon: Icon, title, color, children, delay = 0
}: {
  icon: any; title: string; color: string; children: React.ReactNode; delay?: number
}) {
  return (
    <Card className="relative overflow-hidden animate-in fade-in slide-in-from-bottom-4"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}>
      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: color }} />
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: `${color}20` }}>
            <Icon className="w-3.5 h-3.5" style={{ color }} />
          </div>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  )
}

function Pill({ text, positive }: { text: string; positive: boolean }) {
  return (
    <div className={cn(
      'flex items-start gap-2 text-xs rounded-lg px-3 py-2',
      positive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
    )}>
      {positive
        ? <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        : <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
      {text}
    </div>
  )
}

// ── Streaming text display ─────────────────────────────────
function StreamingCursor() {
  return (
    <span className="inline-block w-0.5 h-4 bg-emerald-500 ml-0.5 animate-pulse align-middle" />
  )
}

// ── Loading skeleton ───────────────────────────────────────
function ReviewSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <div className="h-0.5 bg-muted animate-pulse" />
          <CardContent className="p-5 space-y-3">
            <div className="h-4 bg-muted rounded animate-pulse w-1/3" />
            <div className="h-3 bg-muted rounded animate-pulse w-full" />
            <div className="h-3 bg-muted rounded animate-pulse w-4/5" />
            <div className="h-3 bg-muted rounded animate-pulse w-3/5" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────
export function WeeklyReviewClient({ tradeCount, earliestDate }: {
  tradeCount: number
  earliestDate: string
}) {
  const [selectedMonday, setSelectedMonday] = useState(() => getMondayOfWeek(new Date()))
  const [review, setReview] = useState<ReviewData | null>(null)
  const [streaming, setStreaming] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [streamText, setStreamText] = useState('')
  const [done, setDone] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const weekLabel = formatWeekLabel(selectedMonday)
  const sunday = getSundayOfWeek(selectedMonday)
  const isPastWeek = sunday < new Date()
  const earliest = new Date(earliestDate)

  function prevWeek() {
    const d = new Date(selectedMonday)
    d.setDate(d.getDate() - 7)
    setSelectedMonday(d)
    setReview(null); setStreamText(''); setDone(false)
  }

  function nextWeek() {
    const d = new Date(selectedMonday)
    d.setDate(d.getDate() + 7)
    if (d <= new Date()) { setSelectedMonday(d); setReview(null); setStreamText(''); setDone(false) }
  }

  const generate = useCallback(async () => {
    if (streaming) { abortRef.current?.abort(); return }

    setStreaming(true); setReview(null); setStreamText(''); setDone(false)
    abortRef.current = new AbortController()

    try {
      const res = await fetch('/api/review/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortRef.current.signal,
        body: JSON.stringify({
          weekStart: selectedMonday.toISOString(),
          weekEnd: sunday.toISOString(),
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? 'Failed to generate review')
        return
      }

      // Stream the response
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done: streamDone, value } = await reader.read()
        if (streamDone) break
        const chunk = decoder.decode(value)
        accumulated += chunk
        setStreamText(accumulated)

        // Try to parse JSON as it comes in
        try {
          const parsed = JSON.parse(accumulated)
          setReview(parsed)
        } catch { /* not complete yet */ }
      }

      // Final parse
      try {
        const parsed = JSON.parse(accumulated)
        setReview(parsed)
        setDone(true)
        toast.success('Weekly review generated!')
      } catch {
        toast.error('Failed to parse review — try again')
      }

    } catch (err: any) {
      if (err.name !== 'AbortError') {
        toast.error('Generation failed: ' + err.message)
      }
    } finally {
      setStreaming(false)
    }
  }, [selectedMonday, sunday, streaming])

  function downloadReview() {
    if (!review) return
    const text = `TRADZELLA WEEKLY REVIEW
${review.weekLabel}
Overall Score: ${review.overallScore}/100
${'═'.repeat(50)}

${review.headline}

PERFORMANCE SUMMARY
${review.performanceSummary.paragraph}

Highlights:
${review.performanceSummary.highlights.map(h => `✓ ${h}`).join('\n')}

Concerns:
${review.performanceSummary.concerns.map(c => `⚠ ${c}`).join('\n')}

PATTERN ANALYSIS
${review.patternAnalysis.paragraph}
Best time: ${review.patternAnalysis.bestTimeToTrade}
Avoid: ${review.patternAnalysis.worstTimeToTrade}

PSYCHOLOGICAL ANALYSIS
Discipline Score: ${review.psychologicalAnalysis.disciplineScore}/100
${review.psychologicalAnalysis.paragraph}

MISTAKE REVIEW
${review.mistakeReview.paragraph}
Total cost: ${review.mistakeReview.totalCost}

NEXT WEEK ACTION PLAN
${review.nextWeekActionPlan.rules.map((r, i) => `${i + 1}. ${r}`).join('\n')}

Focus: ${review.nextWeekActionPlan.focusSetup}
Avoid: ${review.nextWeekActionPlan.avoidSetup}

COACH'S NOTE
${review.coachClosing}

Generated by TradZella`

    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tradzella-review-${review.weekLabel.replace(/[^a-z0-9]/gi, '-')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6 pb-10">

      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-emerald-500" />
            Weekly Review
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            AI-powered coaching powered by Gemini Flash
          </p>
        </div>
        {review && done && (
          <Button variant="outline" size="sm" onClick={downloadReview} className="gap-2">
            <Download className="w-3.5 h-3.5" /> Download
          </Button>
        )}
      </div>

      {/* Week selector + generate button */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row items-center gap-4">

            {/* Week navigation */}
            <div className="flex items-center gap-3 flex-1">
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={prevWeek}
                disabled={streaming || getMondayOfWeek(earliest) >= selectedMonday}>
                <ChevronLeft className="w-4 h-4" />
              </Button>

              <div className="flex-1 text-center">
                <div className="flex items-center justify-center gap-2 mb-0.5">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  <p className="text-sm font-bold">{weekLabel}</p>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {isPastWeek ? 'Past week — ready to analyze' : 'Current week — partial data'}
                </p>
              </div>

              <Button variant="outline" size="icon" className="h-9 w-9" onClick={nextWeek}
                disabled={streaming || getSundayOfWeek(new Date(selectedMonday.getTime() + 7 * 86400000)) > new Date()}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Generate button */}
            <Button
              onClick={generate}
              disabled={tradeCount === 0}
              className={cn(
                'gap-2 font-bold px-6 h-10 transition-all',
                streaming
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-black'
              )}
            >
              {streaming ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Stop</>
              ) : review ? (
                <><RefreshCw className="w-4 h-4" /> Regenerate</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Generate Review</>
              )}
            </Button>
          </div>

          {tradeCount === 0 && (
            <p className="text-xs text-center text-muted-foreground mt-3">
              Import some trades first to generate a review
            </p>
          )}
        </CardContent>
      </Card>

      {/* Streaming in progress */}
      {streaming && !review && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-sm text-muted-foreground py-2">
            <div className="flex gap-1">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce"
                  style={{ animationDelay: `${i * 150}ms` }} />
              ))}
            </div>
            Gemini is analyzing your {weekLabel} trades...
          </div>
          <ReviewSkeleton />
        </div>
      )}

      {/* Generated review */}
      {review && (
        <div className="space-y-4 animate-in fade-in duration-500">

          {/* Hero card — score + headline */}
          <Card className="relative overflow-hidden border-emerald-500/20">
            <div className="absolute inset-0 bg-linear-to-br from-emerald-500/5 to-transparent pointer-events-none" />
            <CardContent className="p-6">
              <div className="flex items-center gap-6">
                <ScoreRing score={review.overallScore} size={100} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-500">
                      {review.weekLabel}
                    </Badge>
                    {streaming && <StreamingCursor />}
                  </div>
                  <h2 className="text-xl font-black leading-tight mb-2">{review.headline}</h2>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>Overall Score: <strong className={cn(
                      review.overallScore >= 70 ? 'text-emerald-500' :
                        review.overallScore >= 45 ? 'text-yellow-500' : 'text-red-500'
                    )}>{review.overallScore}/100</strong></span>
                    <span>Discipline: <strong className={cn(
                      review.psychologicalAnalysis?.disciplineScore >= 70 ? 'text-emerald-500' :
                        review.psychologicalAnalysis?.disciplineScore >= 45 ? 'text-yellow-500' : 'text-red-500'
                    )}>{review.psychologicalAnalysis?.disciplineScore}/100</strong></span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Summary */}
          {review.performanceSummary && (
            <SectionCard icon={TrendingUp} title="Performance Summary" color="#10b981" delay={100}>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {review.performanceSummary.paragraph}
              </p>
              <div className="grid grid-cols-1 gap-2">
                {review.performanceSummary.highlights?.map((h, i) => (
                  <Pill key={i} text={h} positive={true} />
                ))}
                {review.performanceSummary.concerns?.map((c, i) => (
                  <Pill key={i} text={c} positive={false} />
                ))}
              </div>
            </SectionCard>
          )}

          {/* Pattern Analysis */}
          {review.patternAnalysis && (
            <SectionCard icon={BarChart3} title="Pattern Analysis" color="#3b82f6" delay={200}>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {review.patternAnalysis.paragraph}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: '✅ Best Time', value: review.patternAnalysis.bestTimeToTrade, color: 'border-emerald-500/20 bg-emerald-500/5' },
                  { label: '⛔ Avoid Time', value: review.patternAnalysis.worstTimeToTrade, color: 'border-red-500/20 bg-red-500/5' },
                  { label: '🎯 Best Symbol', value: review.patternAnalysis.bestSymbol, color: 'border-blue-500/20 bg-blue-500/5' },
                ].map(item => (
                  <div key={item.label} className={cn('rounded-xl border p-3', item.color)}>
                    <p className="text-[10px] text-muted-foreground mb-1">{item.label}</p>
                    <p className="text-xs font-bold">{item.value}</p>
                  </div>
                ))}
              </div>
              {review.patternAnalysis.keyInsights?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Key Insights</p>
                  {review.patternAnalysis.keyInsights.map((insight, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Zap className="w-3.5 h-3.5 mt-0.5 text-blue-500 shrink-0" />
                      {insight}
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          )}

          {/* Psychological Analysis */}
          {review.psychologicalAnalysis && (
            <SectionCard icon={Brain} title="Psychological Analysis" color="#8b5cf6" delay={300}>
              <div className="flex items-center gap-4">
                <ScoreRing score={review.psychologicalAnalysis.disciplineScore} size={72} />
                <div className="flex-1">
                  <p className="text-xs font-bold mb-0.5">Discipline Score</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {review.psychologicalAnalysis.paragraph}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {review.psychologicalAnalysis.flags?.map((flag, i) => (
                  <Pill key={i} text={flag} positive={false} />
                ))}
                {review.psychologicalAnalysis.strengths?.map((s, i) => (
                  <Pill key={i} text={s} positive={true} />
                ))}
              </div>
            </SectionCard>
          )}

          {/* Mistake Review */}
          {review.mistakeReview && (
            <SectionCard icon={AlertTriangle} title="Mistake Review" color="#f59e0b" delay={400}>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {review.mistakeReview.paragraph}
              </p>
              {review.mistakeReview.totalCost && (
                <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Total cost of mistakes this week</p>
                    <p className="text-sm font-black text-red-500">{review.mistakeReview.totalCost}</p>
                  </div>
                </div>
              )}
              {review.mistakeReview.topMistakes?.length > 0 && (
                <div className="space-y-1.5">
                  {review.mistakeReview.topMistakes.map((m, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs bg-muted/30 rounded-lg px-3 py-2">
                      <span className="text-amber-500 shrink-0">{i + 1}.</span>
                      {m}
                    </div>
                  ))}
                </div>
              )}
              {review.mistakeReview.patternNote && (
                <p className="text-xs text-muted-foreground italic border-l-2 border-amber-500/40 pl-3">
                  {review.mistakeReview.patternNote}
                </p>
              )}
            </SectionCard>
          )}

          {/* Next Week Action Plan */}
          {review.nextWeekActionPlan && (
            <SectionCard icon={Target} title="Next Week Action Plan" color="#10b981" delay={500}>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {review.nextWeekActionPlan.paragraph}
              </p>

              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Rules for next week</p>
                {review.nextWeekActionPlan.rules?.map((rule, i) => (
                  <div key={i} className="flex items-start gap-3 bg-muted/30 rounded-xl px-4 py-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <p className="text-xs leading-relaxed">{rule}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                  <p className="text-[10px] text-muted-foreground mb-1">🎯 Focus Setup</p>
                  <p className="text-xs font-bold">{review.nextWeekActionPlan.focusSetup}</p>
                </div>
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
                  <p className="text-[10px] text-muted-foreground mb-1">🚫 Strictly Avoid</p>
                  <p className="text-xs font-bold">{review.nextWeekActionPlan.avoidSetup}</p>
                </div>
              </div>
            </SectionCard>
          )}

          {/* Coach's Closing */}
          {review.coachClosing && (
            <Card className="border-emerald-500/20 bg-linear-to-br from-emerald-500/5 to-transparent">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <Star className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-emerald-500 mb-2 uppercase tracking-wider">From Your Coach</p>
                    <p className="text-sm text-foreground leading-relaxed italic">{review.coachClosing}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Download + regenerate */}
          {done && (
            <div className="flex justify-center gap-3 pt-2 animate-in fade-in duration-500">
              <Button variant="outline" onClick={downloadReview} className="gap-2">
                <Download className="w-3.5 h-3.5" /> Download Review
              </Button>
              <Button variant="outline" onClick={generate} className="gap-2">
                <RefreshCw className="w-3.5 h-3.5" /> Regenerate
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}