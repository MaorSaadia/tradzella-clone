// app/(dashboard)/playbook/page.tsx

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { playbooks, trades, tradeMistakes } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { PlaybookClient } from '@/components/playbook/PlaybookClient'

export default async function PlaybookPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const userPlaybooks = await db.query.playbooks.findMany({
    where: eq(playbooks.userId, session.user.id),
    orderBy: [desc(playbooks.createdAt)],
  })

  const allTrades = await db.query.trades.findMany({
    where: eq(trades.userId, session.user.id),
    orderBy: [desc(trades.exitTime)],
  })

  const allMistakes = await db.query.tradeMistakes.findMany({
    where: eq(tradeMistakes.userId, session.user.id),
  })

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Playbook</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Define your setups, track which strategies actually make money
        </p>
      </div>
      <PlaybookClient
        playbooks={userPlaybooks}
        allTrades={allTrades}
        allMistakes={allMistakes}
      />
    </div>
  )
}