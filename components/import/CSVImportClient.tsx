/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

// components/import/CSVImportClient.tsx

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Upload, FileText, CheckCircle2, AlertCircle,
  ArrowRight, RotateCcw, Loader2
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useAccount } from '@/components/layout/AccountContext'

// ── Parsed trade from CSV ─────────────────────────────────
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

// ── Parse the exact Tradovate Performance CSV format ──────
// Columns: symbol,_priceFormat,_priceFormatType,_tickSize,
//          buyFillId,sellFillId,qty,buyPrice,sellPrice,
//          pnl,boughtTimestamp,soldTimestamp,duration
function parseTradovateCSV(text: string): ParsedTrade[] {
  const lines = text.trim().split('\n').filter(l => l.trim())
  if (lines.length < 2) throw new Error('CSV appears to be empty')

  const header = lines[0].toLowerCase()
  if (!header.includes('buyfillid') && !header.includes('buyprice')) {
    throw new Error(
      'Unrecognized CSV format. Please use the Tradovate Performance report ' +
      '(Account → Performance → Export CSV).'
    )
  }

  const trades: ParsedTrade[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Split carefully — some fields may have commas inside
    const cols = line.split(',')
    if (cols.length < 12) continue

    const symbol      = cols[0]?.trim()
    const buyFillId   = cols[4]?.trim()
    const sellFillId  = cols[5]?.trim()
    const qty         = parseInt(cols[6]?.trim() ?? '0', 10)
    const buyPrice    = parseFloat(cols[7]?.trim() ?? '0')
    const sellPrice   = parseFloat(cols[8]?.trim() ?? '0')
    // PnL looks like "$20.50" or "$(5.50)" — strip formatting
    const pnlRaw      = cols[9]?.trim() ?? '0'
    const boughtTs    = cols[10]?.trim() ?? ''
    const soldTs      = cols[11]?.trim() ?? ''

    if (!symbol || isNaN(buyPrice) || isNaN(sellPrice) || qty === 0) continue

    // Parse PnL: $(5.50) → -5.50, $20.50 → 20.50
    const pnl = parsePnl(pnlRaw)

    // Determine side:
    // buyPrice is entry + soldTimestamp is exit → LONG
    // sellPrice is entry + boughtTimestamp is exit → SHORT
    // We detect by comparing timestamps: earlier timestamp = entry
    const buyTime  = parseTimestamp(boughtTs)
    const sellTime = parseTimestamp(soldTs)

    let side: 'long' | 'short'
    let entryPrice: number
    let exitPrice: number
    let entryTime: string
    let exitTime: string

    if (buyTime <= sellTime) {
      // Bought first → Long
      side = 'long'
      entryPrice = buyPrice
      exitPrice = sellPrice
      entryTime = boughtTs
      exitTime = soldTs
    } else {
      // Sold first → Short
      side = 'short'
      entryPrice = sellPrice
      exitPrice = buyPrice
      entryTime = soldTs
      exitTime = boughtTs
    }

    trades.push({
      symbol: cleanSymbol(symbol),
      side,
      entryPrice,
      exitPrice,
      qty,
      pnl,
      entryTime,
      exitTime,
      buyFillId,
      sellFillId,
    })
  }

  if (trades.length === 0) {
    throw new Error('No valid trades found in CSV. Make sure you exported the Performance report.')
  }

  return trades
}

function parsePnl(raw: string): number {
  // $(5.50) → -5.50
  // $20.50  → 20.50
  const isNegative = raw.includes('(')
  const cleaned = raw.replace(/[$(),]/g, '').trim()
  const value = parseFloat(cleaned)
  return isNegative ? -Math.abs(value) : Math.abs(value)
}

function parseTimestamp(ts: string): number {
  // Format: "02/03/2026 11:00:10"
  if (!ts) return 0
  return new Date(ts).getTime()
}

function cleanSymbol(raw: string): string {
  // MNQH6 → MNQ, ESH6 → ES, NQH6 → NQ
  return raw.replace(/(H|M|U|Z)\d{1,2}$/, '').toUpperCase()
}

function toISOString(ts: string): string {
  // "02/03/2026 11:00:10" → ISO string
  if (!ts) return new Date().toISOString()
  const d = new Date(ts)
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString()
}

// ── Main Component ────────────────────────────────────────
export function CSVImportClient() {
  const router = useRouter()
  const { selected } = useAccount()
  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload')
  const [totalFees, setTotalFees] = useState<string>('') // total fees from broker statement
  const [isDragging, setIsDragging] = useState(false)
  const [trades, setTrades] = useState<ParsedTrade[]>([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedCount, setSavedCount] = useState(0)

  const processFile = useCallback((file: File) => {
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a .csv file')
      return
    }

    setError('')
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const parsed = parseTradovateCSV(text)
        setTrades(parsed)
        setStep('preview')
      } catch (err: any) {
        setError(err.message)
      }
    }
    reader.readAsText(file)
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [processFile])

  async function handleSave() {
    setSaving(true)
    try {
      // Distribute total fees proportionally by contract qty across all trades
      const feesNum    = parseFloat(totalFees) || 0
      const totalQty   = trades.reduce((s, t) => s + t.qty, 0)
      const payload = trades.map(t => ({
        symbol: t.symbol,
        side: t.side,
        entryPrice: t.entryPrice.toString(),
        exitPrice: t.exitPrice.toString(),
        qty: t.qty,
        pnl: t.pnl.toString(),
        commission: totalQty > 0
          ? ((feesNum * t.qty) / totalQty).toFixed(2)
          : '0',
        entryTime: toISOString(t.entryTime),
        exitTime: toISOString(t.exitTime),
        tradovateTradeId: `csv-${t.buyFillId}-${t.sellFillId}`,
        propFirmAccountId: selected?.id ?? null,
      }))

      const res = await fetch('/api/trades/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trades: payload }),
      })

      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Import failed')
        return
      }

      setSavedCount(data.imported)
      setStep('done')
      toast.success(
        selected
          ? `${data.imported} trades imported${data.linked ? `, ${data.linked} linked` : ''}!`
          : `${data.imported} trades imported!`
      )
      router.refresh()
    } catch {
      toast.error('Network error — please try again')
    } finally {
      setSaving(false)
    }
  }

  function reset() {
    setStep('upload')
    setTrades([])
    setError('')
    setSavedCount(0)
  }

  // Stats for preview
  const wins = trades.filter(t => t.pnl > 0)
  const losses = trades.filter(t => t.pnl < 0)
  const winRate = trades.length ? (wins.length / trades.length * 100).toFixed(1) : '0'

  return (
    <div className="space-y-4">

      {/* How to export guide */}
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardContent className="p-4">
          <p className="text-sm font-semibold mb-2">📋 How to export from Tradovate:</p>
          <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Open Tradovate → click your <strong className="text-foreground">account name</strong> top right</li>
            <li>Go to <strong className="text-foreground">Performance</strong> tab</li>
            <li>Set your <strong className="text-foreground">date range</strong></li>
            <li>Click the <strong className="text-foreground">Export / Download icon</strong> (top right of the table)</li>
            <li>Upload the downloaded <strong className="text-foreground">Performance.csv</strong> here</li>
          </ol>
          {selected && (
            <p className="text-xs text-emerald-500 mt-3">
              New imports will be linked to: <strong>{selected.firmName} · {selected.label}</strong>
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── STEP 1: Upload ── */}
      {step === 'upload' && (
        <Card>
          <CardContent className="p-6">
            <div
              className={cn(
                'border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer',
                isDragging
                  ? 'border-emerald-500 bg-emerald-500/5'
                  : 'border-border hover:border-emerald-500/50 hover:bg-accent/50'
              )}
              onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              onClick={() => document.getElementById('csv-input')?.click()}
            >
              <div className={cn(
                'w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-colors',
                isDragging ? 'bg-emerald-500/20' : 'bg-muted'
              )}>
                <Upload className={cn('w-6 h-6', isDragging ? 'text-emerald-500' : 'text-muted-foreground')} />
              </div>
              <p className="text-base font-bold mb-1">
                {isDragging ? 'Drop it here!' : 'Drop your CSV here'}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                or click to browse your files
              </p>
              <Badge variant="outline" className="text-xs">
                Tradovate Performance.csv
              </Badge>
            </div>

            <input
              id="csv-input"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f) }}
            />

            {error && (
              <div className="mt-4 flex items-start gap-2 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                {error}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── STEP 2: Preview ── */}
      {step === 'preview' && (
        <div className="space-y-4">
          {/* Fees input + summary cards */}
          {(() => {
            const reportedPnl = trades.reduce((s, t) => s + t.pnl, 0)
            const feesNum    = parseFloat(totalFees) || 0
            const totalPnl    = reportedPnl - feesNum
            const summaryCards = [
              { label: 'Trades',   value: trades.length,  color: 'text-foreground' },
              { label: 'Winners',  value: wins.length,    color: 'text-emerald-500' },
              { label: 'Losers',   value: losses.length,  color: 'text-red-500' },
              {
                label: 'Total P/L',
                value: `${totalPnl >= 0 ? '+' : '-'}$${Math.abs(totalPnl).toFixed(2)}`,
                color: totalPnl >= 0 ? 'text-emerald-500' : 'text-red-500',
              },
            ]
            return (
              <>
                {/* Fees banner */}
                <Card className="border-amber-500/20 bg-amber-500/5">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-amber-500 mb-0.5">
                          💰 Trade Fees & Commissions <span className="font-normal text-muted-foreground">(optional)</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Enter the total fees from your broker statement (e.g. Tradovate → Account → Performance → &quot;Trade Fees & Comm.&quot;).
                          We&apos;ll subtract it from reported P/L to show your real Total P/L.
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm text-muted-foreground font-bold">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={totalFees}
                          onChange={e => setTotalFees(e.target.value)}
                          className="w-28 text-sm font-bold text-center bg-background border border-border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div className="text-right shrink-0 min-w-20">
                        <p className="text-[10px] text-muted-foreground">Reported P/L</p>
                        <p className={cn('text-sm font-black', reportedPnl >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                          {reportedPnl >= 0 ? '+' : '-'}${Math.abs(reportedPnl).toFixed(2)}
                        </p>
                        {feesNum > 0 && (
                          <>
                            <p className="text-[10px] text-muted-foreground mt-1">Total P/L</p>
                            <p className={cn('text-sm font-black', totalPnl >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                              {totalPnl >= 0 ? '+' : '-'}${Math.abs(totalPnl).toFixed(2)}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Summary cards */}
                <div className="grid grid-cols-4 gap-3">
                  {summaryCards.map(item => (
                    <Card key={item.label}>
                      <CardContent className="p-4 text-center">
                        <p className={cn('text-xl font-black', item.color)}>{item.value}</p>
                        <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )
          })()}

          {/* Preview table */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">
                  Preview — {trades.length} trades parsed
                </CardTitle>
                <Badge variant="outline" className="text-emerald-500 border-emerald-500/30">
                  {winRate}% win rate
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      {['Symbol', 'Side', 'Entry', 'Exit', 'Qty', 'P&L', 'Date'].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {trades.slice(0, 15).map((t, i) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-accent/30">
                        <td className="px-4 py-2.5 font-bold">{t.symbol}</td>
                        <td className="px-4 py-2.5">
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px] px-1.5 py-0',
                              t.side === 'long'
                                ? 'border-emerald-500/40 text-emerald-500'
                                : 'border-red-500/40 text-red-500'
                            )}
                          >
                            {t.side.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 font-mono">{t.entryPrice.toFixed(2)}</td>
                        <td className="px-4 py-2.5 font-mono">{t.exitPrice.toFixed(2)}</td>
                        <td className="px-4 py-2.5">{t.qty}</td>
                        <td className={cn(
                          'px-4 py-2.5 font-bold font-mono',
                          t.pnl >= 0 ? 'text-emerald-500' : 'text-red-500'
                        )}>
                          {t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {t.entryTime.split(' ')[0]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {trades.length > 15 && (
                  <p className="text-xs text-muted-foreground text-center py-3">
                    +{trades.length - 15} more trades not shown in preview
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={reset} disabled={saving}>
              <RotateCcw className="w-3.5 h-3.5 mr-2" />
              Start Over
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
              ) : (
                <>Import {trades.length} Trades <ArrowRight className="w-4 h-4 ml-2" /></>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Done ── */}
      {step === 'done' && (
        <Card>
          <CardContent className="p-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-black mb-2">Import Complete!</h2>
            <p className="text-muted-foreground text-sm mb-6">
              <strong className="text-foreground">{savedCount}</strong> trades have been added to your journal.
              {trades.length - savedCount > 0 && (
                <span className="block text-xs mt-1">
                  ({trades.length - savedCount} were already in your journal and skipped)
                </span>
              )}
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={reset}>
                <FileText className="w-3.5 h-3.5 mr-2" />
                Import Another File
              </Button>
              <Button
                className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold"
                onClick={() => router.push('/dashboard')}
              >
                View Dashboard <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
