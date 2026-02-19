// /* eslint-disable @typescript-eslint/no-explicit-any */
// // src/lib/tradovate/sync.ts
// import { db } from '../db'
// import { trades, tradovateAccounts } from '../db/schema'
// import { decrypt } from '../encryption'
// import { apiCall, renewToken } from './auth'
// import { groupFillsIntoTrades } from './transform'
// import { eq } from 'drizzle-orm'

// export async function syncAccount(accountId: string) {
//   const account = await db.query.tradovateAccounts.findFirst({
//     where: eq(tradovateAccounts.id, accountId),
//   })
//   if (!account || !account.accessTokenEncrypted) throw new Error('Account not found')

//   let token = decrypt(account.accessTokenEncrypted)

//   // Refresh token if expired or close to expiry
//   if (account.tokenExpiresAt && account.tokenExpiresAt < new Date()) {
//     const renewed = await renewToken(token, account.environment)
//     token = renewed.accessToken
//     // Update token in DB
//     await db.update(tradovateAccounts)
//       .set({
//         accessTokenEncrypted: encrypt(token),
//         tokenExpiresAt: new Date(renewed.expirationTime),
//       })
//       .where(eq(tradovateAccounts.id, accountId))
//   }

//   // Pull all fills from Tradovate
//   const fills = await apiCall<any[]>(
//     `fill/list?accountId=${account.tradovateAccountId}`,
//     token,
//     account.environment
//   )

//   // Group fills into complete trades (entry + exit)
//   const newTrades = groupFillsIntoTrades(fills, account.id, account.userId)

//   // Insert only trades we haven't seen before
//   let syncedCount = 0
//   for (const trade of newTrades) {
//     try {
//       await db.insert(trades)
//         .values(trade)
//         .onConflictDoNothing()  // skip if tradovateTradeId already exists
//       syncedCount++
//     } catch (e) { /* duplicate, skip */ }
//   }

//   // Update last sync timestamp
//   await db.update(tradovateAccounts)
//     .set({ lastSyncAt: new Date() })
//     .where(eq(tradovateAccounts.id, accountId))

//   return { synced: syncedCount, total: newTrades.length }
// }

// export async function syncAllAccounts() {
//   const accounts = await db.query.tradovateAccounts.findMany({
//     where: eq(tradovateAccounts.isActive, true),
//   })
  
//   const results = []
//   for (const account of accounts) {
//     try {
//       const result = await syncAccount(account.id)
//       results.push({ accountId: account.id, ...result, success: true })
//     } catch (error: any) {
//       results.push({ accountId: account.id, error: error.message, success: false })
//     }
//   }
//   return results
// }