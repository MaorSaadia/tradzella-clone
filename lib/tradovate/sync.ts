/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-expressions */
// lib/tradovate/sync.ts

import { db } from '@/lib/db'
import { trades, tradovateAccounts } from '@/lib/db/schema'
import { encrypt, decrypt } from '@/lib/encryption'
import { tradovateRequest, renewToken, requestToken } from './auth'
import { groupFillsIntoTrades } from './transform'
import { eq } from 'drizzle-orm'
import type { TradovateFill } from '@/types'

export async function syncAccount(accountId: string): Promise<{
  synced: number
  skipped: number
  total: number
}> {
  const account = await db.query.tradovateAccounts.findFirst({
    where: eq(tradovateAccounts.id, accountId),
  })

  if (!account?.accessTokenEncrypted) {
    throw new Error('Account not found or not connected')
  }

  let token = decrypt(account.accessTokenEncrypted)
  const isExpired = !account.tokenExpiresAt || account.tokenExpiresAt <= new Date()

  if (isExpired) {
    console.log(`[sync] Token expired for account ${accountId}, renewing...`)
    try {
      // Try simple renewal first
      if (!account.environment) {
        throw new Error('Account environment not configured')
      }
      const renewed = await renewToken(token, account.environment)
      token = renewed.accessToken
      await db.update(tradovateAccounts).set({
        accessTokenEncrypted: encrypt(token),
        tokenExpiresAt: new Date(renewed.expirationTime),
      }).where(eq(tradovateAccounts.id, accountId))
    } catch {
      // Fall back to full re-auth with stored credentials + cid/secret
      if (
        account.usernameEncrypted &&
        account.passwordEncrypted &&
        account.cidEncrypted &&
        account.secretEncrypted &&
        account.environment
      ) {
        const username = decrypt(account.usernameEncrypted)
        const password = decrypt(account.passwordEncrypted)
        const cid = Number(decrypt(account.cidEncrypted))
        const sec = decrypt(account.secretEncrypted)

        const freshToken = await requestToken(username, password, account.environment, cid, sec)
        token = freshToken.accessToken

        await db.update(tradovateAccounts).set({
          accessTokenEncrypted: encrypt(token),
          tokenExpiresAt: new Date(freshToken.expirationTime),
        }).where(eq(tradovateAccounts.id, accountId))
      } else {
        throw new Error('Token expired and credentials missing — please reconnect in Settings')
      }
    }
  }

  // Pull fills from Tradovate
  if (!account.environment) {
    throw new Error('Account environment not configured')
  }

  const fills = await tradovateRequest<TradovateFill[]>(
    `fill/list?accountId=${account.tradovateAccountId}`,
    token,
    account.environment
  )

  if (!fills || fills.length === 0) {
    await db.update(tradovateAccounts)
      .set({ lastSyncAt: new Date() })
      .where(eq(tradovateAccounts.id, accountId))
    return { synced: 0, skipped: 0, total: 0 }
  }

  const newTrades = groupFillsIntoTrades(fills, accountId, account.userId)

  let synced = 0, skipped = 0
  for (const trade of newTrades) {
    try {
      const result = await db.insert(trades).values(trade).onConflictDoNothing()
      result.rowCount && result.rowCount > 0 ? synced++ : skipped++
    } catch (error: any) {
      console.error(`[sync] Error inserting trade for account ${accountId}:`, error.message)
      skipped++
    }
  }

  await db.update(tradovateAccounts)
    .set({ lastSyncAt: new Date() })
    .where(eq(tradovateAccounts.id, accountId))

  console.log(`[sync] Account ${accountId}: ${synced} new, ${skipped} skipped`)
  return { synced, skipped, total: newTrades.length }
}

export async function syncAllAccounts() {
  const accounts = await db.query.tradovateAccounts.findMany({
    where: eq(tradovateAccounts.isActive, true),
  })

  const results = []
  for (const account of accounts) {
    try {
      const result = await syncAccount(account.id)
      results.push({ accountId: account.id, ...result, success: true })
    } catch (error: any) {
      console.error(`[cron] Failed to sync ${account.id}:`, error.message)
      results.push({ accountId: account.id, error: error.message, success: false })
    }
  }
  return results
}