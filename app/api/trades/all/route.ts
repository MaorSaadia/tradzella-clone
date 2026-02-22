// app/api/trades/all/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { trades } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await db
    .delete(trades)
    .where(eq(trades.userId, session.user.id))

  return NextResponse.json({ success: true })
}