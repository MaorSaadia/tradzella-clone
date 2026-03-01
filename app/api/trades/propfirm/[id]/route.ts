import { NextRequest, NextResponse } from 'next/server'
import { and, eq, inArray } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { propFirmAccounts, trades } from '@/lib/db/schema'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: firmId } = await params

  const accountRows = await db
    .select({ id: propFirmAccounts.id })
    .from(propFirmAccounts)
    .where(
      and(
        eq(propFirmAccounts.userId, session.user.id),
        eq(propFirmAccounts.propFirmId, firmId)
      )
    )

  const accountIds = accountRows.map(row => row.id)
  if (accountIds.length === 0) {
    return NextResponse.json({ success: true, deletedCount: 0 })
  }

  const deleted = await db
    .delete(trades)
    .where(
      and(
        eq(trades.userId, session.user.id),
        inArray(trades.propFirmAccountId, accountIds)
      )
    )
    .returning({ id: trades.id })

  return NextResponse.json({ success: true, deletedCount: deleted.length })
}
