// app/(dashboard)/layout.tsx

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { propFirms } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { AccountProvider } from '@/components/layout/AccountContext'
import type { AccountOption } from '@/components/layout/AccountContext'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  // Load all prop firm accounts for the switcher
  const firms = await db.query.propFirms.findMany({
    where: eq(propFirms.userId, session.user.id),
    with: { accounts: true },
  })

  // Flatten into AccountOption list
  const accountOptions: AccountOption[] = []
  firms.forEach(firm => {
    firm.accounts.forEach(acc => {
      accountOptions.push({
        id: acc.id,
        label: acc.accountLabel,
        firmName: firm.shortName ?? firm.name,
        firmColor: firm.logoColor ?? '#10b981',
        status: acc.status ?? 'active',
        stage: acc.stage ?? 'evaluation',
        accountSize: Number(acc.accountSize),
      })
    })
  })

  return (
    <AccountProvider initialAccounts={accountOptions}>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar user={{ name: session.user.name, email: session.user.email }} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header user={{ name: session.user.name, email: session.user.email }} />
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </AccountProvider>
  )
}