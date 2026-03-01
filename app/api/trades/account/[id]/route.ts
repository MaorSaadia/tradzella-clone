import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { trades } from '@/lib/db/schema'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: accountId } = await params

  const deleted = await db
    .delete(trades)
    .where(
      and(
        eq(trades.userId, session.user.id),
        eq(trades.propFirmAccountId, accountId)
      )
    )
    .returning({ id: trades.id })

  return NextResponse.json({ success: true, deletedCount: deleted.length })
}
