'use client'

import { SlidersHorizontal } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { useJournalConsolidatePartials } from '@/lib/useJournalConsolidatePartials'

export function JournalSection() {
  const { consolidatePartials, updateConsolidatePartials } = useJournalConsolidatePartials()

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center">
            <SlidersHorizontal className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <CardTitle className="text-base">Journal</CardTitle>
            <CardDescription className="text-xs">Display preferences for trade journal</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
          <div>
            <p className="text-sm font-semibold">Consolidate partials</p>
            <p className="text-xs text-muted-foreground">
              Merge partial exits into one trade across Journal, Dashboard, and Analytics.
            </p>
          </div>
          <Switch
            checked={consolidatePartials}
            onCheckedChange={updateConsolidatePartials}
          />
        </div>
      </CardContent>
    </Card>
  )
}
