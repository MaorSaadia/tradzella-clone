// app/(dashboard)/settings/page.tsx

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { tradovateAccounts } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { TradovateSection } from '@/components/settings/TradovateSection'
import { AccountSection } from '@/components/settings/AccountSection'
import { DangerSection } from '@/components/settings/DangerSection'

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const account = await db.query.tradovateAccounts.findFirst({
    where: eq(tradovateAccounts.userId, session.user.id),
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

      {/* Account info */}
      <AccountSection user={session.user} />

      {/* Danger zone */}
      <DangerSection />
    </div>
  )
}