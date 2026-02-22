// app/api/propfirms/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { propFirms } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  await db.delete(propFirms).where(
    and(eq(propFirms.id, id), eq(propFirms.userId, session.user.id))
  )

  return NextResponse.json({ success: true })
}