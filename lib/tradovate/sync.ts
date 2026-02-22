/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/tradovate/sync.ts

import { db } from '@/lib/db'
import { trades, tradovateAccounts } from '@/lib/db/schema'
import { encrypt, decrypt } from '@/lib/encryption'
import { tradovateRequest, renewToken } from './auth'
import { groupFillsIntoTrades } from './transform'
import { eq } from 'drizzle-orm'
import type { TradovateFill } from '@/types'

// ── Sync one account ──────────────────────────────────────
export async function syncAccount(accountId: string): Promise<{
  synced: number
  skipped: number
  total: number
}> {
  // 1. Get account from DB
  const account = await db.query.tradovateAccounts.findFirst({
    where: eq(tradovateAccounts.id, accountId),
  })

  if (!account?.accessTokenEncrypted) {
    throw new Error('Account not found or not connected')
  }

  // 2. Decrypt token and check expiry
  let token = decrypt(account.accessTokenEncrypted)
  const now = new Date()
  const expiresAt = account.tokenExpiresAt

  const isExpired = !expiresAt || expiresAt <= now

  if (isExpired) {
    console.log(`[sync] Token expired for account ${accountId}, renewing...`)
    if (!account.environment) {
      throw new Error('Account environment not set')
    }
    try {
      const renewed = await renewToken(token, account.environment)
      token = renewed.accessToken

      await db
        .update(tradovateAccounts)
        .set({
          accessTokenEncrypted: encrypt(token),
          tokenExpiresAt: new Date(renewed.expirationTime),
        })
        .where(eq(tradovateAccounts.id, accountId))
    } catch {
      // If renewal fails, re-authenticate with stored credentials
      if (account.usernameEncrypted && account.passwordEncrypted) {
        const { requestToken } = await import('./auth')
        const username = decrypt(account.usernameEncrypted)
        const password = decrypt(account.passwordEncrypted)
        const freshToken = await requestToken(username, password, account.environment)
        token = freshToken.accessToken

        await db
          .update(tradovateAccounts)
          .set({
            accessTokenEncrypted: encrypt(token),
            tokenExpiresAt: new Date(freshToken.expirationTime),
          })
          .where(eq(tradovateAccounts.id, accountId))
      } else {
        throw new Error('Token expired and no credentials stored for renewal')
      }
    }
  }

  // 3. Pull fills from Tradovate
  if (!account.environment) {
    throw new Error('Account environment not set')
  }

  const fills = await tradovateRequest<TradovateFill[]>(
    `fill/list?accountId=${account.tradovateAccountId}`,
    token,
    account.environment
  )

  if (!fills || fills.length === 0) {
    await db
      .update(tradovateAccounts)
      .set({ lastSyncAt: new Date() })
      .where(eq(tradovateAccounts.id, accountId))

    return { synced: 0, skipped: 0, total: 0 }
  }

  // 4. Group fills into trades
  const newTrades = groupFillsIntoTrades(fills, accountId, account.userId)

  // 5. Insert only trades we don't already have
  let synced = 0
  let skipped = 0

  for (const trade of newTrades) {
    try {
      const result = await db
        .insert(trades)
        .values(trade)
        .onConflictDoNothing()

      // onConflictDoNothing returns empty array if skipped
      if (result.rowCount && result.rowCount > 0) {
        synced++
      } else {
        skipped++
      }
    } catch (err) {
      console.error('[sync] Failed to insert trade:', err)
      skipped++
    }
  }

  // 6. Update last sync timestamp
  await db
    .update(tradovateAccounts)
    .set({ lastSyncAt: new Date() })
    .where(eq(tradovateAccounts.id, accountId))

  console.log(
    `[sync] Account ${accountId}: ${synced} new trades synced, ${skipped} skipped`
  )

  return { synced, skipped, total: newTrades.length }
}

// ── Sync ALL active accounts (called by cron) ─────────────
export async function syncAllAccounts() {
  const accounts = await db.query.tradovateAccounts.findMany({
    where: eq(tradovateAccounts.isActive, true),
  })

  console.log(`[cron] Syncing ${accounts.length} accounts...`)

  const results = []

  for (const account of accounts) {
    try {
      const result = await syncAccount(account.id)
      results.push({ accountId: account.id, ...result, success: true })
    } catch (error: any) {
      console.error(`[cron] Failed to sync account ${account.id}:`, error.message)
      results.push({
        accountId: account.id,
        error: error.message,
        success: false,
      })
    }
  }

  return results
}