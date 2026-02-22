// app/api/propfirms/accounts/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { propFirmAccounts } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

const patchSchema = z.object({
  status: z.enum(['active', 'passed', 'failed', 'paused']).optional(),
  stage: z.enum(['evaluation', 'phase2', 'funded', 'failed', 'passed']).optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const data = patchSchema.parse(body)

  const [updated] = await db.update(propFirmAccounts)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(propFirmAccounts.id, id), eq(propFirmAccounts.userId, session.user.id)))
    .returning()

  return NextResponse.json({ success: true, account: updated })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  await db.delete(propFirmAccounts).where(
    and(eq(propFirmAccounts.id, id), eq(propFirmAccounts.userId, session.user.id))
  )

  return NextResponse.json({ success: true })
}