'use client'

// components/settings/DangerSection.tsx

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { toast } from 'sonner'
import { Trash2, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useConfirm } from '@/components/layout/ConfirmDialogProvider'

interface DangerSectionProps {
  firms: Array<{ id: string; name: string }>
  accounts: Array<{ id: string; accountLabel: string; firmName: string }>
}

export function DangerSection({ firms, accounts }: DangerSectionProps) {
  const confirmAction = useConfirm()
  const router = useRouter()
  const [deletingTrades, setDeletingTrades] = useState(false)
  const [deletingFirmTrades, setDeletingFirmTrades] = useState(false)
  const [deletingAccountTrades, setDeletingAccountTrades] = useState(false)
  const [selectedFirmId, setSelectedFirmId] = useState('')
  const [selectedAccountId, setSelectedAccountId] = useState('')

  async function handleDeleteTrades() {
    const confirmed = await confirmAction({
      title: 'Delete all trades?',
      description: 'This will permanently remove every trade from your journal and cannot be undone.',
      confirmText: 'Delete All',
    })
    if (!confirmed) return
    setDeletingTrades(true)
    try {
      const res = await fetch('/api/trades/all', { method: 'DELETE' })
      if (!res.ok) {
        toast.error('Failed to delete trades')
        return
      }
      toast.success('All trades deleted')
      router.refresh()
    } catch {
      toast.error('Network error')
    } finally {
      setDeletingTrades(false)
    }
  }

  async function handleDeleteTradesForFirm() {
    const firm = firms.find(f => f.id === selectedFirmId)
    if (!firm) return

    const confirmed = await confirmAction({
      title: `Delete trades for ${firm.name}?`,
      description: 'This will permanently remove all trades linked to this prop firm and cannot be undone.',
      confirmText: 'Delete Firm Trades',
    })
    if (!confirmed) return

    setDeletingFirmTrades(true)
    try {
      const res = await fetch(`/api/trades/propfirm/${firm.id}`, { method: 'DELETE' })
      if (!res.ok) {
        toast.error('Failed to delete firm trades')
        return
      }

      const data = await res.json()
      const deletedCount = typeof data?.deletedCount === 'number' ? data.deletedCount : 0
      toast.success(
        deletedCount > 0
          ? `Deleted ${deletedCount} trades from ${firm.name}`
          : `No trades found for ${firm.name}`
      )
      router.refresh()
    } catch {
      toast.error('Network error')
    } finally {
      setDeletingFirmTrades(false)
    }
  }

  async function handleDeleteAccountTradesById() {
    const account = accounts.find(a => a.id === selectedAccountId)
    if (!account) return

    const confirmed = await confirmAction({
      title: `Delete journal trades for ${account.accountLabel}?`,
      description: 'This permanently removes trades linked to this account, but keeps the prop firm and account records.',
      confirmText: 'Delete Trades',
    })
    if (!confirmed) return

    setDeletingAccountTrades(true)
    try {
      const res = await fetch(`/api/trades/account/${account.id}`, { method: 'DELETE' })
      if (!res.ok) {
        toast.error('Failed to delete account trades')
        return
      }

      const data = await res.json()
      const deletedCount = typeof data?.deletedCount === 'number' ? data.deletedCount : 0
      toast.success(
        deletedCount > 0
          ? `Deleted ${deletedCount} trades from ${account.accountLabel}`
          : `No trades found for ${account.accountLabel}`
      )
      router.refresh()
    } catch {
      toast.error('Network error')
    } finally {
      setDeletingAccountTrades(false)
    }
  }

  return (
    <Card className="border-red-500/20">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <div>
            <CardTitle className="text-base text-red-500">Danger Zone</CardTitle>
            <CardDescription className="text-xs">
              Irreversible actions - proceed with caution
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
          <div>
            <p className="text-sm font-semibold">Delete all trades</p>
            <p className="text-xs text-muted-foreground">
              Permanently remove all trades from your journal
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDeleteTrades}
            disabled={deletingTrades}
            className="text-red-500 border-red-500/30 hover:bg-red-500/10 shrink-0 ml-4"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            {deletingTrades ? 'Deleting...' : 'Delete All'}
          </Button>
        </div>

        <div className="p-3 rounded-lg bg-muted/30 space-y-3">
          <div>
            <p className="text-sm font-semibold">Delete trades by prop firm</p>
            <p className="text-xs text-muted-foreground">
              Remove only trades linked to one prop firm
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select value={selectedFirmId} onValueChange={setSelectedFirmId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={firms.length ? 'Select prop firm' : 'No prop firms available'} />
              </SelectTrigger>
              <SelectContent>
                {firms.map(firm => (
                  <SelectItem key={firm.id} value={firm.id}>
                    {firm.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteTradesForFirm}
              disabled={!selectedFirmId || deletingFirmTrades || firms.length === 0}
              className="text-red-500 border-red-500/30 hover:bg-red-500/10 shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              {deletingFirmTrades ? 'Deleting...' : 'Delete Firm Trades'}
            </Button>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-muted/30 space-y-3">
          <div>
            <p className="text-sm font-semibold">Delete journal by account ID</p>
            <p className="text-xs text-muted-foreground">
              Remove only trades linked to one specific account
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={accounts.length ? 'Select account' : 'No prop firm accounts available'} />
              </SelectTrigger>
              <SelectContent>
                {accounts.map(account => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.firmName} - {account.accountLabel} ({account.id.slice(0, 8)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteAccountTradesById}
              disabled={!selectedAccountId || deletingAccountTrades || accounts.length === 0}
              className="text-red-500 border-red-500/30 hover:bg-red-500/10 shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              {deletingAccountTrades ? 'Deleting...' : 'Delete Account Trades'}
            </Button>
          </div>
        </div>

        <Separator />

        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
          <div>
            <p className="text-sm font-semibold">Sign out</p>
            <p className="text-xs text-muted-foreground">
              Sign out of your MSFunded account
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="shrink-0 ml-4"
          >
            Sign Out
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
