/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/propfirms/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { propFirms } from '@/lib/db/schema'
import { z } from 'zod'

const firmSchema = z.object({
  name: z.string().min(1),
  shortName: z.string().optional(),
  logoColor: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const data = firmSchema.parse(body)

    const [firm] = await db.insert(propFirms).values({
      userId: session.user.id,
      ...data,
    }).returning()

    return NextResponse.json({ success: true, firm })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}