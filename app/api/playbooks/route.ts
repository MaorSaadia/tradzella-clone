/* eslint-disable @typescript-eslint/no-explicit-any */
// ════════════════════════════════════════════════════════
// app/api/playbooks/route.ts  — GET list + POST create
// ════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { playbooks } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const data = await db.query.playbooks.findMany({
    where: eq(playbooks.userId, session.user.id),
    orderBy: [desc(playbooks.createdAt)],
  })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await req.json()
    const { name, description, category, emoji, color, entryRules, exitRules, riskRules, idealRR, maxLossPerTrade } = body
    if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })
    const [pb] = await db.insert(playbooks).values({
      userId: session.user.id,
      name: name.trim(), description, category, emoji, color,
      entryRules: entryRules ?? [],
      exitRules: exitRules ?? [],
      riskRules: riskRules ?? [],
      idealRR: idealRR?.toString() ?? null,
      maxLossPerTrade: maxLossPerTrade?.toString() ?? null,
    }).returning()
    return NextResponse.json(pb, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}