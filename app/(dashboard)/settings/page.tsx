// app/(dashboard)/settings/page.tsx

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { propFirmAccounts, propFirms, tradovateAccounts } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { TradovateSection } from '@/components/settings/TradovateSection'
import { JournalSection } from '@/components/settings/JournalSection'
import { AccountSection } from '@/components/settings/AccountSection'
import { DangerSection } from '@/components/settings/DangerSection'

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const account = await db.query.tradovateAccounts.findFirst({
    where: eq(tradovateAccounts.userId, session.user.id),
  })
  const firms = await db.query.propFirms.findMany({
    where: eq(propFirms.userId, session.user.id),
    columns: {
      id: true,
      name: true,
    },
  })
  const accounts = await db.query.propFirmAccounts.findMany({
    where: eq(propFirmAccounts.userId, session.user.id),
    columns: {
      id: true,
      accountLabel: true,
    },
    with: {
      propFirm: {
        columns: {
          name: true,
        },
      },
    },
  })

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your account and broker connections
        </p>
      </div>

      {/* Tradovate connection */}
      <TradovateSection account={account ?? null} />

      {/* Journal preferences */}
      <JournalSection />

      {/* Account info */}
      <AccountSection user={session.user} />

      {/* Danger zone */}
      <DangerSection
        firms={firms}
        accounts={accounts.map(account => ({
          id: account.id,
          accountLabel: account.accountLabel,
          firmName: account.propFirm?.name ?? 'Unknown Firm',
        }))}
      />
    </div>
  )
}
