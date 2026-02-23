/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

// components/import/CSVImportClient.tsx

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Upload, FileText, CheckCircle2, AlertCircle,
  ArrowRight, RotateCcw, Loader2, Building2
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useAccount } from '@/components/layout/AccountContext'

interface ParsedTrade {
  symbol: string
  side: 'long' | 'short'
  entryPrice: number
  exitPrice: number
  qty: number
  pnl: number
  entryTime: string
  exitTime: string
  buyFillId: string
  sellFillId: string
}

function parseTradovateCSV(text: string): ParsedTrade[] {
  const lines = text.trim().split('\n').filter(l => l.trim())
  if (lines.length < 2) throw new Error('CSV appears to be empty')

  const header = lines[0].toLowerCase()
  if (!header.includes('buyfillid') && !header.includes('buyprice')) {
    throw new Error('Unrecognized CSV format. Please use the Tradovate Performance report.')
  }

  const trades: ParsedTrade[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].trim().split(',')
    if (cols.length < 12) continue

    const symbol    = cols[0]?.trim()
    const buyFillId = cols[4]?.trim()
    const sellFillId = cols[5]?.trim()
    const qty       = parseInt(cols[6]?.trim() ?? '0', 10)
    const buyPrice  = parseFloat(cols[7]?.trim() ?? '0')
    const sellPrice = parseFloat(cols[8]?.trim() ?? '0')
    const pnlRaw    = cols[9]?.trim() ?? '0'
    const boughtTs  = cols[10]?.trim() ?? ''
    const soldTs    = cols[11]?.trim() ?? ''

    if (!symbol || isNaN(buyPrice) || isNaN(sellPrice) || qty === 0) continue

    const pnl = parsePnl(pnlRaw)
    const buyTime = new Date(boughtTs).getTime()
    const sellTime = new Date(soldTs).getTime()

    let side: 'long' | 'short', entryPrice: number, exitPrice: number, entryTime: string, exitTime: string
    if (buyTime <= sellTime) {
      side = 'long'; entryPrice = buyPrice; exitPrice = sellPrice; entryTime = boughtTs; exitTime = soldTs
    } else {
      side = 'short'; entryPrice = sellPrice; exitPrice = buyPrice; entryTime = soldTs; exitTime = boughtTs
    }

    trades.push({
      symbol: cleanSymbol(symbol), side, entryPrice, exitPrice,
      qty, pnl, entryTime, exitTime, buyFillId, sellFillId,
    })
  }

  if (trades.length === 0) throw new Error('No valid trades found in CSV.')
  return trades
}

function parsePnl(raw: string): number {
  const isNegative = raw.includes('(')
  const cleaned = raw.replace(/[$(),]/g, '').trim()
  const value = parseFloat(cleaned)
  return isNegative ? -Math.abs(value) : Math.abs(value)
}

function cleanSymbol(raw: string): string {
  return raw.replace(/(H|M|U|Z)\d{1,2}$/, '').toUpperCase()
}

function toISOString(ts: string): string {
  if (!ts) return new Date().toISOString()
  const d = new Date(ts)
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString()
}

export function CSVImportClient() {
  const router = useRouter()
  const { accounts, selected } = useAccount()

  const [step, setStep] = useState<'upload' | 'assign' | 'preview' | 'done'>('upload')
  const [isDragging, setIsDragging] = useState(false)
  const [trades, setTrades] = useState<ParsedTrade[]>([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedCount, setSavedCount] = useState(0)

  // Account assignment — pre-select current context account
  const [assignedAccountId, setAssignedAccountId] = useState<string>(selected?.id ?? 'none')

  const processFile = useCallback((file: File) => {
    if (!file.name.endsWith('.csv')) { setError('Please upload a .csv file'); return }
    setError('')
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const parsed = parseTradovateCSV(e.target?.result as string)
        setTrades(parsed)
        setStep('assign')
      } catch (err: any) { setError(err.message) }
    }
    reader.readAsText(file)
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [processFile])

  async function handleSave() {
    setSaving(true)
    try {
      const payload = trades.map(t => ({
        symbol: t.symbol, side: t.side,
        entryPrice: t.entryPrice.toString(), exitPrice: t.exitPrice.toString(),
        qty: t.qty, pnl: t.pnl.toString(),
        entryTime: toISOString(t.entryTime), exitTime: toISOString(t.exitTime),
        tradovateTradeId: `csv-${t.buyFillId}-${t.sellFillId}`,
        propFirmAccountId: assignedAccountId === 'none' ? null : assignedAccountId,
      }))

      const res = await fetch('/api/trades/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trades: payload }),
      })

      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Import failed'); return }

      setSavedCount(data.imported)
      setStep('done')
      toast.success(`${data.imported} trades imported!`)
      router.refresh()
    } catch { toast.error('Network error') }
    finally { setSaving(false) }
  }

  function reset() {
    setStep('upload'); setTrades([]); setError(''); setSavedCount(0)
    setAssignedAccountId(selected?.id ?? 'none')
  }

  const wins = trades.filter(t => t.pnl > 0)
  const totalPnl = trades.reduce((s, t) => s + t.pnl, 0)
  const winRate = trades.length ? (wins.length / trades.length * 100).toFixed(1) : '0'

  return (
    <div className="space-y-4">
      {/* How-to guide */}
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardContent className="p-4">
          <p className="text-sm font-semibold mb-2">📋 How to export from Tradovate:</p>
          <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Open Tradovate → click your <strong className="text-foreground">account name</strong></li>
            <li>Go to <strong className="text-foreground">Performance</strong> tab</li>
            <li>Set date range → click <strong className="text-foreground">Export icon</strong></li>
          </ol>
        </CardContent>
      </Card>

      {/* ── STEP 1: Upload ── */}
      {step === 'upload' && (
        <Card>
          <CardContent className="p-6">
            <div
              className={cn(
                'border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer',
                isDragging ? 'border-emerald-500 bg-emerald-500/5' : 'border-border hover:border-emerald-500/50 hover:bg-accent/50'
              )}
              onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              onClick={() => document.getElementById('csv-input')?.click()}
            >
              <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4',
                isDragging ? 'bg-emerald-500/20' : 'bg-muted')}>
                <Upload className={cn('w-6 h-6', isDragging ? 'text-emerald-500' : 'text-muted-foreground')} />
              </div>
              <p className="text-base font-bold mb-1">{isDragging ? 'Drop it here!' : 'Drop your CSV here'}</p>
              <p className="text-sm text-muted-foreground mb-4">or click to browse</p>
              <Badge variant="outline" className="text-xs">Tradovate Performance.csv</Badge>
            </div>
            <input id="csv-input" type="file" accept=".csv" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f) }} />
            {error && (
              <div className="mt-4 flex items-start gap-2 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />{error}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── STEP 2: Assign to account ── */}
      {step === 'assign' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-500" />
              Assign to Prop Firm Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm text-muted-foreground">
              Found <strong className="text-foreground">{trades.length} trades</strong> in your CSV.
              Which prop firm account are these trades for?
            </p>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Prop Firm Account
              </Label>
              <Select value={assignedAccountId} onValueChange={setAssignedAccountId}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select an account..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="text-muted-foreground">No account (unassigned)</span>
                  </SelectItem>
                  {accounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-sm flex items-center justify-center text-[8px] font-black text-white"
                          style={{ background: acc.firmColor }}>
                          {acc.firmName.slice(0, 1)}
                        </div>
                        <span className="font-semibold">{acc.firmName}</span>
                        <span className="text-muted-foreground">·</span>
                        <span>{acc.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {assignedAccountId !== 'none' && (() => {
                const acc = accounts.find(a => a.id === assignedAccountId)
                if (!acc) return null
                return (
                  <div className="flex items-center gap-3 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black text-white"
                      style={{ background: acc.firmColor }}>
                      {acc.firmName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold">{acc.firmName} · {acc.label}</p>
                      <p className="text-xs text-muted-foreground capitalize">{acc.status} · {acc.stage} · ${acc.accountSize.toLocaleString()}</p>
                    </div>
                  </div>
                )
              })()}

              {accounts.length === 0 && (
                <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
                  No prop firm accounts yet.{' '}
                  <a href="/propfirms" className="text-emerald-500 hover:text-emerald-400 font-semibold">
                    Add one in Prop Firms →
                  </a>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={reset} className="flex-1">← Back</Button>
              <Button onClick={() => setStep('preview')}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-black font-bold">
                Continue to Preview <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── STEP 3: Preview ── */}
      {step === 'preview' && (
        <div className="space-y-4">
          {/* Assignment badge */}
          {assignedAccountId !== 'none' && (() => {
            const acc = accounts.find(a => a.id === assignedAccountId)
            if (!acc) return null
            return (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-3 py-2">
                <div className="w-3 h-3 rounded-sm" style={{ background: acc.firmColor }} />
                <span>Importing to <strong className="text-foreground">{acc.firmName} · {acc.label}</strong></span>
              </div>
            )
          })()}

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Trades', value: trades.length, color: 'text-foreground' },
              { label: 'Winners', value: wins.length, color: 'text-emerald-500' },
              { label: 'Losers', value: trades.length - wins.length, color: 'text-red-500' },
              { label: 'Total P&L', value: `${totalPnl >= 0 ? '+' : ''}$${Math.abs(totalPnl).toFixed(0)}`, color: totalPnl >= 0 ? 'text-emerald-500' : 'text-red-500' },
            ].map(s => (
              <Card key={s.label}>
                <CardContent className="p-4 text-center">
                  <p className={cn('text-xl font-black', s.color)}>{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Preview table */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{trades.length} trades parsed</CardTitle>
                <Badge variant="outline" className="text-emerald-500 border-emerald-500/30">{winRate}% win rate</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      {['Symbol', 'Side', 'Entry', 'Exit', 'Qty', 'P&L', 'Date'].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {trades.slice(0, 15).map((t, i) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-accent/30">
                        <td className="px-4 py-2.5 font-bold">{t.symbol}</td>
                        <td className="px-4 py-2.5">
                          <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0',
                            t.side === 'long' ? 'border-emerald-500/40 text-emerald-500' : 'border-red-500/40 text-red-500')}>
                            {t.side.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 font-mono">{t.entryPrice.toFixed(2)}</td>
                        <td className="px-4 py-2.5 font-mono">{t.exitPrice.toFixed(2)}</td>
                        <td className="px-4 py-2.5">{t.qty}</td>
                        <td className={cn('px-4 py-2.5 font-bold font-mono', t.pnl >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                          {t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">{t.entryTime.split(' ')[0]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {trades.length > 15 && (
                  <p className="text-xs text-muted-foreground text-center py-3">+{trades.length - 15} more not shown</p>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setStep('assign')} disabled={saving}>← Change Account</Button>
            <Button variant="outline" onClick={reset} disabled={saving}>
              <RotateCcw className="w-3.5 h-3.5 mr-2" />Start Over
            </Button>
            <Button onClick={handleSave} disabled={saving}
              className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold">
              {saving
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                : <>Import {trades.length} Trades <ArrowRight className="w-4 h-4 ml-2" /></>
              }
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 4: Done ── */}
      {step === 'done' && (
        <Card>
          <CardContent className="p-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-black mb-2">Import Complete!</h2>
            <p className="text-muted-foreground text-sm mb-6">
              <strong className="text-foreground">{savedCount}</strong> trades imported.
              {trades.length - savedCount > 0 && (
                <span className="block text-xs mt-1">({trades.length - savedCount} already existed and were skipped)</span>
              )}
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={reset}>
                <FileText className="w-3.5 h-3.5 mr-2" />Import Another
              </Button>
              <Button className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold"
                onClick={() => router.push('/dashboard')}>
                View Dashboard <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}