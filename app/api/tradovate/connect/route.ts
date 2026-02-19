// /app/api/tradovate/connect/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { tradovateAccounts } from '@/lib/db/schema'
import { requestToken } from '@/lib/tradovate/auth'
import { encrypt } from '@/lib/encryption'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { username, password, environment } = await req.json()

  // 1. Authenticate with Tradovate
  const tokenData = await requestToken(username, password, environment)
  if (!tokenData.accessToken) {
    return NextResponse.json({ error: 'Invalid Tradovate credentials' }, { status: 400 })
  }

  // 2. Get account list
  const accountsData = await fetch(
    `${environment === 'demo' 
      ? 'https://demo.tradovateapi.com/v1' 
      : 'https://live.tradovateapi.com/v1'}/account/list`,
    { headers: { Authorization: `Bearer ${tokenData.accessToken}` } }
  ).then(r => r.json())

  // 3. Save to database with encrypted credentials
  const account = await db.insert(tradovateAccounts).values({
    userId: session.user.id,
    tradovateUserId: tokenData.userId,
    tradovateAccountId: accountsData[0]?.id,
    accountName: accountsData[0]?.name,
    environment,
    accessTokenEncrypted: encrypt(tokenData.accessToken),
    tokenExpiresAt: new Date(tokenData.expirationTime),
    usernameEncrypted: encrypt(username),
    passwordEncrypted: encrypt(password),
  }).returning()

  return NextResponse.json({ success: true, accountId: account[0].id })
}