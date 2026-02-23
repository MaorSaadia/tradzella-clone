'use client'

// components/layout/AccountSwitcher.tsx

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronDown, Plus, LayoutGrid } from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useAccount, type AccountOption } from './AccountContext'

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-blue-500',
  passed: 'bg-emerald-500',
  failed: 'bg-red-500',
  paused: 'bg-yellow-500',
}

const STAGE_SHORT: Record<string, string> = {
  evaluation: 'Eval',
  phase2:     'P2',
  funded:     'Funded',
}

export function AccountSwitcher() {
  const router = useRouter()
  const { accounts, selected, setSelected } = useAccount()
  const [open, setOpen] = useState(false)

  const displayLabel = selected
    ? selected.label
    : 'All Accounts'

  const displayColor = selected?.firmColor ?? '#64748b'

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="gap-2 h-9 pl-3 pr-2.5 font-semibold text-sm min-w-40 max-w-55"
        >
          {/* Color dot */}
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: displayColor }}
          />

          {/* Label */}
          <span className="truncate flex-1 text-left">{displayLabel}</span>

          {selected && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 shrink-0">
              {STAGE_SHORT[selected.stage] ?? selected.stage}
            </Badge>
          )}

          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-64">

        {/* All Accounts */}
        <DropdownMenuItem
          onClick={() => { setSelected(null); setOpen(false) }}
          className="gap-2.5 py-2.5"
        >
          <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <LayoutGrid className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">All Accounts</p>
            <p className="text-[10px] text-muted-foreground">{accounts.length} accounts combined</p>
          </div>
          {!selected && <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
        </DropdownMenuItem>

        {accounts.length > 0 && <DropdownMenuSeparator />}

        {/* Group by firm */}
        {groupByFirm(accounts).map(({ firmName, firmColor, items }) => (
          <div key={firmName}>
            <DropdownMenuLabel className="text-[10px] text-muted-foreground px-2 py-1">
              {firmName}
            </DropdownMenuLabel>
            {items.map(account => (
              <DropdownMenuItem
                key={account.id}
                onClick={() => { setSelected(account); setOpen(false) }}
                className="gap-2.5 py-2 pl-3"
              >
                {/* Firm avatar */}
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black text-white shrink-0"
                  style={{ background: firmColor }}
                >
                  {firmName.slice(0, 2).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{account.label}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {/* Status dot */}
                    <div className={cn('w-1.5 h-1.5 rounded-full', STATUS_COLORS[account.status] ?? 'bg-muted')} />
                    <span className="text-[10px] text-muted-foreground capitalize">{account.status}</span>
                    <span className="text-[10px] text-muted-foreground">·</span>
                    <span className="text-[10px] text-muted-foreground">
                      ${Number(account.accountSize).toLocaleString()}
                    </span>
                  </div>
                </div>

                {selected?.id === account.id && (
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                )}
              </DropdownMenuItem>
            ))}
          </div>
        ))}

        <DropdownMenuSeparator />

        {/* Add new account */}
        <DropdownMenuItem
          onClick={() => { setOpen(false); router.push('/propfirms') }}
          className="gap-2 text-emerald-500 hover:text-emerald-400 font-semibold"
        >
          <Plus className="w-3.5 h-3.5" />
          Manage Prop Firms
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function groupByFirm(accounts: AccountOption[]) {
  const map: Record<string, { firmName: string; firmColor: string; items: AccountOption[] }> = {}
  accounts.forEach(a => {
    if (!map[a.firmName]) map[a.firmName] = { firmName: a.firmName, firmColor: a.firmColor, items: [] }
    map[a.firmName].items.push(a)
  })
  return Object.values(map)
}