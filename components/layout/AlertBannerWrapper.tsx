/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

// components/layout/AlertBannerWrapper.tsx
// Bridge: reads selected account from context, passes account details to AlertBanner

import { useAccount } from './AccountContext'
import { AlertBanner } from './AlertBanner'
import type { Trade } from '@/lib/db/schema'

interface Props {
  allTrades: Trade[]
  accountDetails: Record<string, any>
}

export function AlertBannerWrapper({ allTrades, accountDetails }: Props) {
  const { selected } = useAccount()
  const currentAccountDetails = selected ? accountDetails[selected.id] ?? null : null

  return <AlertBanner allTrades={allTrades} accountDetails={currentAccountDetails} />
}