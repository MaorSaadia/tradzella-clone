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
import { useConfirm } from '@/components/layout/ConfirmDialogProvider'

export function DangerSection() {
  const confirmAction = useConfirm()
  const router = useRouter()
  const [deletingTrades, setDeletingTrades] = useState(false)

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
              Irreversible actions — proceed with caution
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
