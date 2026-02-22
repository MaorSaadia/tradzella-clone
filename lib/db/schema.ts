// lib/db/schema.ts
// ADD these two lines inside tradovateAccounts table (after passwordEncrypted)

// cidEncrypted: text('cid_encrypted'),
// secretEncrypted: text('secret_encrypted'),

// Full updated tradovateAccounts table:

import {
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  timestamp,
  json,
  boolean,
  pgEnum,
} from 'drizzle-orm/pg-core'

export const sideEnum = pgEnum('side', ['long', 'short'])
export const envEnum = pgEnum('environment', ['demo', 'live'])
export const gradeEnum = pgEnum('grade', ['A+', 'A', 'B', 'C', 'D'])
export const emotionEnum = pgEnum('emotion', ['calm', 'fomo', 'revenge', 'confident', 'anxious', 'neutral'])

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  name: text('name'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const tradovateAccounts = pgTable('tradovate_accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  tradovateUserId: integer('tradovate_user_id'),
  tradovateAccountId: integer('tradovate_account_id'),
  accountName: text('account_name'),
  environment: envEnum('environment').default('demo'),

  accessTokenEncrypted: text('access_token_encrypted'),
  tokenExpiresAt: timestamp('token_expires_at'),
  usernameEncrypted: text('username_encrypted'),
  passwordEncrypted: text('password_encrypted'),
  cidEncrypted: text('cid_encrypted'),         // ← NEW
  secretEncrypted: text('secret_encrypted'),   // ← NEW

  lastSyncAt: timestamp('last_sync_at'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
})

export const trades = pgTable('trades', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tradovateAccountId: uuid('tradovate_account_id')
    .references(() => tradovateAccounts.id),

  tradovateTradeId: text('tradovate_trade_id').unique(),

  symbol: text('symbol').notNull(),
  side: sideEnum('side').notNull(),
  entryPrice: numeric('entry_price', { precision: 12, scale: 4 }).notNull(),
  exitPrice: numeric('exit_price', { precision: 12, scale: 4 }).notNull(),
  qty: integer('qty').notNull(),
  pnl: numeric('pnl', { precision: 12, scale: 2 }).notNull(),
  commission: numeric('commission', { precision: 8, scale: 2 }).default('0'),

  entryTime: timestamp('entry_time').notNull(),
  exitTime: timestamp('exit_time').notNull(),

  tags: json('tags').$type<string[]>().default([]),
  notes: text('notes').default(''),
  grade: gradeEnum('grade'),
  emotion: emotionEnum('emotion'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type TradovateAccount = typeof tradovateAccounts.$inferSelect
export type NewTradovateAccount = typeof tradovateAccounts.$inferInsert
export type Trade = typeof trades.$inferSelect
export type NewTrade = typeof trades.$inferInsert