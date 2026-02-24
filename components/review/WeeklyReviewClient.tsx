/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

// components/review/WeeklyReviewClient.tsx — v2 with persistence

import { useState, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Sparkles, Calendar, ChevronLeft, ChevronRight,
  TrendingUp, Brain, AlertTriangle, BarChart3,
  Target, Star, Loader2, Download, RefreshCw,
  CheckCircle2, XCircle, Zap, BookOpen, Trash2,
  Clock,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface ReviewData {
  weekLabel: string
  overallScore: number
  headline: string
  performanceSummary: { paragraph: string; highlights: string[]; concerns: string[] }
  patternAnalysis: { paragraph: string; bestTimeToTrade: string; worstTimeToTrade: string; bestSymbol: string; keyInsights: string[] }
  psychologicalAnalysis: { paragraph: string; disciplineScore: number; flags: string[]; strengths: string[] }
  mistakeReview: { paragraph: string; totalCost: string; topMistakes: string[]; patternNote: string }
  nextWeekActionPlan: { paragraph: string; rules: string[]; focusSetup: string; avoidSetup: string }
  coachClosing: string
}

interface SavedReview {
  id: string
  weekLabel: string
  weekStart: string | Date
  weekEnd: string | Date
  overallScore: number
  disciplineScore: number
  headline: string
  tradeCount: number | null
  netPnl: string | null
  createdAt: string | Date
  reviewData: ReviewData
}

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1))
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
function scoreColor(s: number) { return s >= 70 ? 'text-emerald-500' : s >= 45 ? 'text-yellow-500' : 'text-red-500' }
function scoreBg(s: number)    { return s >= 70 ? 'bg-emerald-500'   : s >= 45 ? 'bg-yellow-500'   : 'bg-red-500' }

function ScoreRing({ score, size = 90 }: { score: number; size?: number }) {
  const r  = (size - 14) / 2
  const c  = 2 * Math.PI * r
  const p  = (score / 100) * c
  const cl = score >= 70 ? '#10b981' : score >= 45 ? '#f59e0b' : '#ef4444'
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="7" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={cl} strokeWidth="7"
          strokeDasharray={`${p} ${c}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1.2s ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-black" style={{ color: cl }}>{score}</span>
        <span className="text-[9px] text-muted-foreground">/100</span>
      </div>
    </div>
  )
}

function SectionCard({ icon: Icon, title, color, children, delay = 0 }: {
  icon: any; title: string; color: string; children: React.ReactNode; delay?: number
}) {
  return (
    <Card className="relative overflow-hidden animate-in fade-in slide-in-from-bottom-3"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}>
      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: color }} />
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}20` }}>
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
    <div className={cn('flex items-start gap-2 text-xs rounded-lg px-3 py-2',
      positive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400')}>
      {positive ? <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" /> : <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
      {text}
    </div>
  )
}

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

function HistoryItem({ r, active, onClick, onDelete }: {
  r: SavedReview; active: boolean; onClick: () => void; onDelete: () => void
}) {
  return (
    <div onClick={onClick} className={cn(
      'group relative rounded-xl border p-3 cursor-pointer transition-all',
      active ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-border hover:border-border/80 hover:bg-accent/40'
    )}>
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
          <div className={cn('h-full rounded-full', scoreBg(r.overallScore))} style={{ width: `${r.overallScore}%` }} />
        </div>
        <span className={cn('text-[10px] font-black tabular-nums', scoreColor(r.overallScore))}>{r.overallScore}</span>
      </div>
      <p className="text-[11px] font-bold leading-tight mb-0.5 pr-4">{r.weekLabel}</p>
      <p className="text-[10px] text-muted-foreground line-clamp-2 leading-tight">{r.headline}</p>
      <div className="flex items-center gap-2 mt-2">
        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">{r.tradeCount ?? 0} trades</Badge>
        {r.netPnl && (
          <span className={cn('text-[10px] font-bold tabular-nums', Number(r.netPnl) >= 0 ? 'text-emerald-500' : 'text-red-500')}>
            {Number(r.netPnl) >= 0 ? '+' : ''}${Math.abs(Number(r.netPnl)).toFixed(0)}
          </span>
        )}
      </div>
      <button onClick={e => { e.stopPropagation(); onDelete() }}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-all p-1 rounded">
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  )
}

function ReviewBody({ review, streaming }: { review: ReviewData; streaming?: boolean }) {
  return (
    <div className="space-y-4">
      <Card className="relative overflow-hidden border-emerald-500/20">
        <div className="absolute inset-0 bg-linear-to-br from-emerald-500/5 to-transparent pointer-events-none" />
        <CardContent className="p-6">
          <div className="flex items-center gap-5">
            <ScoreRing score={review.overallScore} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-500">{review.weekLabel}</Badge>
                {streaming && <span className="inline-block w-0.5 h-4 bg-emerald-500 animate-pulse align-middle" />}
              </div>
              <h2 className="text-lg font-black leading-snug mb-2">{review.headline}</h2>
              <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">
                <span>Score: <strong className={scoreColor(review.overallScore)}>{review.overallScore}/100</strong></span>
                <span>Discipline: <strong className={scoreColor(review.psychologicalAnalysis?.disciplineScore)}>{review.psychologicalAnalysis?.disciplineScore}/100</strong></span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {review.performanceSummary && (
        <SectionCard icon={TrendingUp} title="Performance Summary" color="#10b981" delay={50}>
          <p className="text-sm text-muted-foreground leading-relaxed">{review.performanceSummary.paragraph}</p>
          <div className="grid gap-2">
            {review.performanceSummary.highlights?.map((h, i) => <Pill key={i} text={h} positive />)}
            {review.performanceSummary.concerns?.map((c, i) => <Pill key={i} text={c} positive={false} />)}
          </div>
        </SectionCard>
      )}

      {review.patternAnalysis && (
        <SectionCard icon={BarChart3} title="Pattern Analysis" color="#3b82f6" delay={100}>
          <p className="text-sm text-muted-foreground leading-relaxed">{review.patternAnalysis.paragraph}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: '✅ Best Time',   value: review.patternAnalysis.bestTimeToTrade,  cls: 'border-emerald-500/20 bg-emerald-500/5' },
              { label: '⛔ Avoid Time', value: review.patternAnalysis.worstTimeToTrade,  cls: 'border-red-500/20 bg-red-500/5' },
              { label: '🎯 Best Symbol', value: review.patternAnalysis.bestSymbol,        cls: 'border-blue-500/20 bg-blue-500/5' },
            ].map(item => (
              <div key={item.label} className={cn('rounded-xl border p-3', item.cls)}>
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
                  <Zap className="w-3.5 h-3.5 mt-0.5 text-blue-500 shrink-0" />{insight}
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      {review.psychologicalAnalysis && (
        <SectionCard icon={Brain} title="Psychological Analysis" color="#8b5cf6" delay={150}>
          <div className="flex items-center gap-4">
            <ScoreRing score={review.psychologicalAnalysis.disciplineScore} size={68} />
            <div className="flex-1">
              <p className="text-xs font-bold mb-1">Discipline Score</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{review.psychologicalAnalysis.paragraph}</p>
            </div>
          </div>
          <div className="grid gap-2">
            {review.psychologicalAnalysis.flags?.map((f, i) => <Pill key={i} text={f} positive={false} />)}
            {review.psychologicalAnalysis.strengths?.map((s, i) => <Pill key={i} text={s} positive />)}
          </div>
        </SectionCard>
      )}

      {review.mistakeReview && (
        <SectionCard icon={AlertTriangle} title="Mistake Review" color="#f59e0b" delay={200}>
          <p className="text-sm text-muted-foreground leading-relaxed">{review.mistakeReview.paragraph}</p>
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
                  <span className="text-amber-500 shrink-0">{i + 1}.</span>{m}
                </div>
              ))}
            </div>
          )}
          {review.mistakeReview.patternNote && (
            <p className="text-xs text-muted-foreground italic border-l-2 border-amber-500/40 pl-3">{review.mistakeReview.patternNote}</p>
          )}
        </SectionCard>
      )}

      {review.nextWeekActionPlan && (
        <SectionCard icon={Target} title="Next Week Action Plan" color="#10b981" delay={250}>
          <p className="text-sm text-muted-foreground leading-relaxed">{review.nextWeekActionPlan.paragraph}</p>
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Rules for next week</p>
            {review.nextWeekActionPlan.rules?.map((rule, i) => (
              <div key={i} className="flex items-start gap-3 bg-muted/30 rounded-xl px-4 py-3">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">{i + 1}</div>
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
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════
export function WeeklyReviewClient({
  tradeCount, initialSavedReviews = [],
}: {
  tradeCount: number
  earliestDate: string
  initialSavedReviews?: SavedReview[]
}) {
  const [selectedMonday, setSelectedMonday] = useState(() => getMondayOfWeek(new Date()))
  const [liveReview, setLiveReview]         = useState<ReviewData | null>(null)
  const [streaming, setStreaming]           = useState(false)
  const [done, setDone]                     = useState(false)
  const [savedReviews, setSavedReviews]     = useState<SavedReview[]>(initialSavedReviews)
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const sunday    = getSundayOfWeek(selectedMonday)
  const weekLabel = formatWeekLabel(selectedMonday)

  const displayReview: ReviewData | null = activeHistoryId
    ? (savedReviews.find(r => r.id === activeHistoryId)?.reviewData ?? null)
    : liveReview

  const isViewingHistory = !!activeHistoryId
  const isCurrentWeekSaved = savedReviews.some(r =>
    new Date(r.weekStart).getTime() === selectedMonday.getTime()
  )

  function goToWeek(monday: Date) {
    setSelectedMonday(monday)
    setLiveReview(null)
    setDone(false)
    setActiveHistoryId(null)
  }

  async function saveReview(reviewData: ReviewData, weekStart: Date, weekEnd: Date) {
    try {
      const res = await fetch('/api/review/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekStart: weekStart.toISOString(),
          weekEnd:   weekEnd.toISOString(),
          weekLabel: reviewData.weekLabel,
          overallScore: reviewData.overallScore,
          disciplineScore: reviewData.psychologicalAnalysis?.disciplineScore ?? 0,
          headline: reviewData.headline,
          reviewData,
          tradeCount: null,
          netPnl: null,
        }),
      })
      if (!res.ok) return
      const saved: SavedReview = await res.json()
      setSavedReviews(prev => {
        const idx = prev.findIndex(r => r.id === saved.id)
        if (idx >= 0) { const u = [...prev]; u[idx] = saved; return u }
        return [saved, ...prev]
      })
    } catch (e: any) {
      console.error('Auto-save failed:', e)
    }
  }

  async function deleteReview(id: string) {
    if (!confirm('Delete this review permanently?')) return
    try {
      await fetch(`/api/review/saved/${id}`, { method: 'DELETE' })
      setSavedReviews(prev => prev.filter(r => r.id !== id))
      if (activeHistoryId === id) setActiveHistoryId(null)
      toast.success('Review deleted')
    } catch { toast.error('Delete failed') }
  }

  const generate = useCallback(async () => {
    if (streaming) { abortRef.current?.abort(); return }
    setActiveHistoryId(null)
    setLiveReview(null)
    setDone(false)
    setStreaming(true)
    abortRef.current = new AbortController()

    try {
      const res = await fetch('/api/review/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortRef.current.signal,
        body: JSON.stringify({
          weekStart: selectedMonday.toISOString(),
          weekEnd:   sunday.toISOString(),
        }),
      })
      if (!res.ok) { toast.error((await res.json()).error ?? 'Failed'); return }

      const reader = res.body!.getReader()
      const dec    = new TextDecoder()
      let acc      = ''
      while (true) {
        const { done: d, value } = await reader.read()
        if (d) break
        acc += dec.decode(value)
        try { setLiveReview(JSON.parse(acc)) } catch {}
      }
      const parsed = JSON.parse(acc)
      setLiveReview(parsed)
      setDone(true)

      // Auto-save silently
      await saveReview(parsed, selectedMonday, sunday)
      toast.success('Review generated & saved to history!')
    } catch (err: any) {
      if (err.name !== 'AbortError') toast.error('Generation failed: ' + err.message)
    } finally {
      setStreaming(false)
    }
  }, [selectedMonday, sunday, streaming])

  function downloadReview() {
    if (!displayReview) return
    const r   = displayReview
    const txt = [
      'TRADZELLA WEEKLY REVIEW', r.weekLabel, `Overall Score: ${r.overallScore}/100`,
      '═'.repeat(50), '', r.headline, '',
      'PERFORMANCE SUMMARY', r.performanceSummary?.paragraph, '',
      ...(r.performanceSummary?.highlights?.map(h => `✓ ${h}`) ?? []), '',
      ...(r.performanceSummary?.concerns?.map(c => `⚠ ${c}`) ?? []), '',
      'PATTERN ANALYSIS', r.patternAnalysis?.paragraph,
      `Best time: ${r.patternAnalysis?.bestTimeToTrade}`,
      `Avoid: ${r.patternAnalysis?.worstTimeToTrade}`, '',
      'PSYCHOLOGICAL ANALYSIS',
      `Discipline Score: ${r.psychologicalAnalysis?.disciplineScore}/100`,
      r.psychologicalAnalysis?.paragraph, '',
      'MISTAKE REVIEW', r.mistakeReview?.paragraph,
      `Total cost: ${r.mistakeReview?.totalCost}`, '',
      'NEXT WEEK ACTION PLAN',
      ...(r.nextWeekActionPlan?.rules?.map((rule, i) => `${i + 1}. ${rule}`) ?? []), '',
      `Focus: ${r.nextWeekActionPlan?.focusSetup}`,
      `Avoid: ${r.nextWeekActionPlan?.avoidSetup}`, '',
      "COACH'S NOTE", r.coachClosing, '', 'Generated by TradZella',
    ].join('\n')

    const blob = new Blob([txt], { type: 'text/plain' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `tradzella-review-${r.weekLabel.replace(/[^a-z0-9]/gi, '-')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex gap-5 items-start">

      {/* ── History sidebar ── */}
      {savedReviews.length > 0 && (
        <div className="w-60 shrink-0 space-y-2">
          <div className="flex items-center gap-2 px-1 mb-3">
            <BookOpen className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-black uppercase tracking-wider">Saved Reviews</span>
            <Badge className="text-[9px] px-1.5 py-0 h-4 bg-emerald-500 text-black font-bold ml-auto">
              {savedReviews.length}
            </Badge>
          </div>
          <div className="space-y-2 max-h-[calc(100vh-180px)] overflow-y-auto">
            {savedReviews.map(r => (
              <HistoryItem
                key={r.id} r={r}
                active={activeHistoryId === r.id}
                onClick={() => {
                  setActiveHistoryId(prev => prev === r.id ? null : r.id)
                  setLiveReview(null)
                }}
                onDelete={() => deleteReview(r.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Main panel ── */}
      <div className="flex-1 min-w-0 space-y-5 pb-10">

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-emerald-500" />
              Weekly Review
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              AI coaching · auto-saved after every generation
            </p>
          </div>
          {displayReview && (
            <Button variant="outline" size="sm" onClick={downloadReview} className="gap-2 shrink-0">
              <Download className="w-3.5 h-3.5" /> Export
            </Button>
          )}
        </div>

        {/* Week selector — hide when viewing saved history */}
        {!isViewingHistory && (
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <Button variant="outline" size="icon" className="h-9 w-9 shrink-0"
                    onClick={() => goToWeek(new Date(selectedMonday.getTime() - 7 * 86400000))}
                    disabled={streaming}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <div className="flex-1 text-center">
                    <div className="flex items-center justify-center gap-2 mb-0.5">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                      <p className="text-sm font-bold">{weekLabel}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {sunday < new Date() ? 'Past week' : 'Current week'}
                      {isCurrentWeekSaved && <span className="text-emerald-500 ml-1.5 font-semibold">· saved ✓</span>}
                    </p>
                  </div>
                  <Button variant="outline" size="icon" className="h-9 w-9 shrink-0"
                    onClick={() => goToWeek(new Date(selectedMonday.getTime() + 7 * 86400000))}
                    disabled={streaming || getSundayOfWeek(new Date(selectedMonday.getTime() + 7 * 86400000)) > new Date()}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
                <Button onClick={generate} disabled={tradeCount === 0}
                  className={cn('gap-2 font-bold px-5 h-10 shrink-0',
                    streaming ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-emerald-500 hover:bg-emerald-600 text-black')}>
                  {streaming
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Stop</>
                    : liveReview
                      ? <><RefreshCw className="w-4 h-4" /> Regenerate</>
                      : <><Sparkles className="w-4 h-4" /> Generate</>}
                </Button>
              </div>
              {tradeCount === 0 && (
                <p className="text-xs text-center text-muted-foreground mt-2">Import trades first to generate a review</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* History breadcrumb */}
        {isViewingHistory && (
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setActiveHistoryId(null)} className="gap-2">
              <ChevronLeft className="w-3.5 h-3.5" /> Back to Generator
            </Button>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              {savedReviews.find(r => r.id === activeHistoryId)?.weekLabel}
            </div>
          </div>
        )}

        {/* Streaming loader */}
        {streaming && !liveReview && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-sm text-muted-foreground py-1">
              <div className="flex gap-1">
                {[0,1,2].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }} />
                ))}
              </div>
              Gemini is analyzing your trades...
            </div>
            <ReviewSkeleton />
          </div>
        )}

        {/* Review content */}
        {displayReview && <ReviewBody review={displayReview} streaming={streaming && !isViewingHistory} />}

        {/* Bottom actions */}
        {done && !isViewingHistory && (
          <div className="flex justify-center gap-3 pt-2 animate-in fade-in duration-500">
            <Button variant="outline" onClick={downloadReview} className="gap-2">
              <Download className="w-3.5 h-3.5" /> Download
            </Button>
            <Button variant="outline" onClick={generate} className="gap-2">
              <RefreshCw className="w-3.5 h-3.5" /> Regenerate
            </Button>
          </div>
        )}

        {/* Empty state */}
        {!displayReview && !streaming && (
          <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-2xl text-center">
            <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4 text-3xl">🤖</div>
            <h2 className="text-base font-black mb-2">
              {savedReviews.length > 0 ? 'Generate a new review or pick one from the sidebar' : 'Generate your first review'}
            </h2>
            <p className="text-sm text-muted-foreground max-w-sm mb-1">
              Pick a week, hit Generate — Gemini analyzes every trade and coaches you on what to fix.
            </p>
            <p className="text-xs text-emerald-500 font-semibold">
              Reviews auto-save and stay in your sidebar forever.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}