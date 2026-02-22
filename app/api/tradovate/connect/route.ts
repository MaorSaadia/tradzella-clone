// app/api/tradovate/connect/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { tradovateAccounts } from '@/lib/db/schema'
import { requestToken, getAccounts } from '@/lib/tradovate/auth'
import { encrypt } from '@/lib/encryption'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

const connectSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  environment: z.enum(['demo', 'live']),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { username, password, environment } = connectSchema.parse(body)

    // 1. Authenticate with Tradovate
    const tokenData = await requestToken(username, password, environment)

    // 2. Get account list
    const accountList = await getAccounts(tokenData.accessToken, environment)

    if (!accountList || accountList.length === 0) {
      return NextResponse.json(
        { error: 'No accounts found for this Tradovate login' },
        { status: 400 }
      )
    }

    // Use first account (most prop firms give one account per login)
    const tradovateAccount = accountList[0]

    // 3. Check if already connected — update instead of duplicate
    const existing = await db.query.tradovateAccounts.findFirst({
      where: and(
        eq(tradovateAccounts.userId, session.user.id),
        eq(tradovateAccounts.environment, environment)
      ),
    })

    const accountData = {
      userId: session.user.id,
      tradovateUserId: tokenData.userId,
      tradovateAccountId: tradovateAccount.id,
      accountName: tradovateAccount.name,
      environment,
      accessTokenEncrypted: encrypt(tokenData.accessToken),
      tokenExpiresAt: new Date(tokenData.expirationTime),
      usernameEncrypted: encrypt(username),
      passwordEncrypted: encrypt(password),
      isActive: true,
    }

    let savedAccount

    if (existing) {
      // Update existing connection
      const [updated] = await db
        .update(tradovateAccounts)
        .set(accountData)
        .where(eq(tradovateAccounts.id, existing.id))
        .returning()
      savedAccount = updated
    } else {
      // Create new connection
      const [created] = await db
        .insert(tradovateAccounts)
        .values(accountData)
        .returning()
      savedAccount = created
    }

    return NextResponse.json({
      success: true,
      account: {
        id: savedAccount.id,
        accountName: savedAccount.accountName,
        environment: savedAccount.environment,
        tradovateAccountId: savedAccount.tradovateAccountId,
      },
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }

    console.error('[connect] Error:', error.message)
    return NextResponse.json(
      { error: error.message || 'Connection failed' },
      { status: 500 }
    )
  }
}