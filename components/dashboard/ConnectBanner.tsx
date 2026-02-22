// components/dashboard/ConnectBanner.tsx

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Zap } from 'lucide-react'

export function ConnectBanner() {
  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
      <div className="w-10 h-10 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
        <Zap className="w-5 h-5 text-emerald-500" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold">Connect your Tradovate account</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Auto-sync your prop firm trades every 30 minutes — no manual CSV uploads needed
        </p>
      </div>
      <Button asChild size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold shrink-0">
        <Link href="/settings">Connect Now</Link>
      </Button>
    </div>
  )
}