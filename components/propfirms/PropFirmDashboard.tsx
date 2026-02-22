'use client'

// components/propfirms/PropFirmDashboard.tsx

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PropFirmCard } from './PropFirmCard'
import { AddFirmModal } from './AddFirmModal'
import { AddAccountModal } from './AddAccountModal'
import type { PropFirm, PropFirmAccount, Trade } from '@/lib/db/schema'

interface FirmWithAccounts extends PropFirm {
  accounts: PropFirmAccount[]
}

interface Props {
  firms: FirmWithAccounts[]
  allTrades: Trade[]
}

export function PropFirmDashboard({ firms, allTrades }: Props) {
  const router = useRouter()
  const [addFirmOpen, setAddFirmOpen] = useState(false)
  const [addAccountFirmId, setAddAccountFirmId] = useState<string | null>(null)

  const totalActive = firms.reduce((s, f) =>
    s + f.accounts.filter(a => a.status === 'active').length, 0)
  const totalPassed = firms.reduce((s, f) =>
    s + f.accounts.filter(a => a.status === 'passed').length, 0)
  const totalFailed = firms.reduce((s, f) =>
    s + f.accounts.filter(a => a.status === 'failed').length, 0)

  return (
    <>
      {/* Summary strip */}
      {firms.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          {[
            { label: 'Firms', value: firms.length, color: 'text-foreground' },
            { label: 'Active Accounts', value: totalActive, color: 'text-blue-500' },
            { label: 'Passed', value: totalPassed, color: 'text-emerald-500' },
            { label: 'Failed', value: totalFailed, color: 'text-red-500' },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-xl px-5 py-3 flex items-center gap-3">
              <span className={`text-2xl font-black tabular-nums ${s.color}`}>{s.value}</span>
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
          ))}
          <Button
            onClick={() => setAddFirmOpen(true)}
            className="ml-auto bg-emerald-500 hover:bg-emerald-600 text-black font-bold"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Firm
          </Button>
        </div>
      )}

      {/* Empty state */}
      {firms.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-border rounded-2xl">
          <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-black mb-2">No prop firms yet</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm">
            Add your prop firms and challenge accounts to track rules, targets, and progress in one place.
          </p>
          <Button
            onClick={() => setAddFirmOpen(true)}
            className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Your First Firm
          </Button>
        </div>
      )}

      {/* Firm cards */}
      <div className="space-y-6">
        {firms.map(firm => (
          <PropFirmCard
            key={firm.id}
            firm={firm}
            allTrades={allTrades}
            onAddAccount={() => setAddAccountFirmId(firm.id)}
            onRefresh={() => router.refresh()}
          />
        ))}
      </div>

      {/* Modals */}
      <AddFirmModal
        open={addFirmOpen}
        onOpenChange={setAddFirmOpen}
        onSaved={() => { setAddFirmOpen(false); router.refresh() }}
      />
      <AddAccountModal
        firmId={addAccountFirmId}
        onClose={() => setAddAccountFirmId(null)}
        onSaved={() => { setAddAccountFirmId(null); router.refresh() }}
        allTrades={allTrades}
      />
    </>
  )
}