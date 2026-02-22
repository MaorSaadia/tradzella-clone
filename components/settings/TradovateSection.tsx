'use client'

// components/settings/TradovateSection.tsx

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  Unplug,
  TrendingUp,
  Clock,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ConnectModal } from '@/components/tradovate/ConnectModal'
import { formatDateTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { TradovateAccount } from '@/lib/db/schema'

interface TradovateSectionProps {
  account: TradovateAccount | null
}

export function TradovateSection({ account }: TradovateSectionProps) {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  const isConnected = !!account

  async function handleSync() {
    setSyncing(true)
    try {
      const res = await fetch('/api/tradovate/sync', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Sync failed')
        return
      }
      toast.success(data.message)
      router.refresh()
    } catch {
      toast.error('Network error')
    } finally {
      setSyncing(false)
    }
  }

  async function handleDisconnect() {
    if (!confirm('Disconnect Tradovate? Your existing trades will be kept.')) return
    setDisconnecting(true)
    try {
      const res = await fetch('/api/tradovate/disconnect', { method: 'DELETE' })
      if (!res.ok) {
        toast.error('Failed to disconnect')
        return
      }
      toast.success('Tradovate disconnected')
      router.refresh()
    } catch {
      toast.error('Network error')
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-500/15 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-base">Tradovate</CardTitle>
                <CardDescription className="text-xs">
                  Auto-sync trades every 30 minutes
                </CardDescription>
              </div>
            </div>

            {/* Connection status badge */}
            <Badge
              variant="outline"
              className={cn(
                'gap-1.5',
                isConnected
                  ? 'border-emerald-500/40 text-emerald-500 bg-emerald-500/5'
                  : 'border-red-500/40 text-red-500 bg-red-500/5'
              )}
            >
              {isConnected
                ? <><CheckCircle2 className="w-3 h-3" /> Connected</>
                : <><XCircle className="w-3 h-3" /> Not Connected</>
              }
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {isConnected ? (
            <>
              {/* Account details grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Account Name', value: account.accountName ?? '—' },
                  {
                    label: 'Environment',
                    value: account.environment?.toUpperCase() ?? '—',
                    highlight: account.environment === 'live' ? 'emerald' : 'blue',
                  },
                  {
                    label: 'Account ID',
                    value: account.tradovateAccountId?.toString() ?? '—',
                  },
                  {
                    label: 'Last Sync',
                    value: account.lastSyncAt
                      ? formatDateTime(account.lastSyncAt)
                      : 'Never',
                  },
                ].map(item => (
                  <div
                    key={item.label}
                    className="bg-muted/40 rounded-lg p-3"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      {item.label}
                    </p>
                    <p className={cn(
                      'text-sm font-semibold',
                      item.highlight === 'emerald' && 'text-emerald-500',
                      item.highlight === 'blue' && 'text-blue-500',
                    )}>
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Auto sync note */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2.5">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                Auto-syncing every 30 minutes via Vercel Cron.
                You can also sync manually anytime using the button above.
              </div>

              <Separator />

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSync}
                  disabled={syncing}
                  className="gap-2"
                >
                  <RefreshCw className={cn('w-3.5 h-3.5', syncing && 'animate-spin')} />
                  {syncing ? 'Syncing...' : 'Sync Now'}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setModalOpen(true)}
                  className="gap-2"
                >
                  Reconnect
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="gap-2 text-red-500 border-red-500/30 hover:bg-red-500/10 hover:text-red-400 ml-auto"
                >
                  <Unplug className="w-3.5 h-3.5" />
                  {disconnecting ? 'Disconnecting...' : 'Disconnect'}
                </Button>
              </div>
            </>
          ) : (
            /* Not connected state */
            <div className="text-center py-6 space-y-3">
              <p className="text-sm text-muted-foreground">
                Connect your Tradovate account to automatically sync trades from
                Apex, Leeloo, Earn2Trade, and other prop firms.
              </p>
              <Button
                onClick={() => setModalOpen(true)}
                className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold"
              >
                Connect Tradovate
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <ConnectModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  )
}