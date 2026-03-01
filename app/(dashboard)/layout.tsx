/* eslint-disable @typescript-eslint/no-explicit-any */
// app/(dashboard)/layout.tsx — FINAL VERSION with AlertBanner

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { propFirms, trades } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { AccountProvider } from '@/components/layout/AccountContext'
import { AlertBannerWrapper } from '@/components/layout/AlertBannerWrapper'
import type { AccountOption } from '@/components/layout/AccountContext'
import { getTradeTotalPnl } from '@/lib/utils'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const firms = await db.query.propFirms.findMany({
    where: eq(propFirms.userId, session.user.id),
    with: { accounts: true },
  })

  const allTrades = await db.query.trades.findMany({
    where: eq(trades.userId, session.user.id),
    orderBy: [desc(trades.exitTime)],
  })

  // Build account options for the switcher
  const accountOptions: AccountOption[] = []
  const accountDetails: Record<string, any> = {}
  const accountPnl: Record<string, number> = {}

  allTrades.forEach(trade => {
    if (!trade.propFirmAccountId) return
    accountPnl[trade.propFirmAccountId] = (accountPnl[trade.propFirmAccountId] ?? 0) + getTradeTotalPnl(trade)
  })

  firms.forEach(firm => {
    firm.accounts.forEach(acc => {
      const accountSize = Number(acc.accountSize)
      const currentBalance = accountSize + (accountPnl[acc.id] ?? 0)
      accountOptions.push({
        id: acc.id,
        label: acc.accountLabel,
        firmName: firm.shortName ?? firm.name,
        firmColor: firm.logoColor ?? '#10b981',
        status: acc.status ?? 'active',
        stage: acc.stage ?? 'evaluation',
        accountSize,
        currentBalance,
      })
      accountDetails[acc.id] = acc
    })
  })

  return (
    <AccountProvider initialAccounts={accountOptions}>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar user={{ name: session.user.name, email: session.user.email }} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header user={{ name: session.user.name, email: session.user.email }} />
          {/* Alert banner below header — only shows when limits are near */}
          <AlertBannerWrapper allTrades={allTrades} accountDetails={accountDetails} />
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </AccountProvider>
  )
}
